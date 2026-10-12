const {test, before, after, beforeEach, afterEach}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');

let server,browser,page,errors;
const code='DEMO-1-0002';
const secondSheet='00000000-0000-0000-0000-000000000002';

before(async()=>{
  server=spawn(process.execPath,[path.join(__dirname,'../tools/design-preview.cjs')],{
    env:{...process.env,IBTA_PREVIEW_PORT:'4221'},stdio:['ignore','pipe','inherit']
  });
  await new Promise((resolve,reject)=>{
    server.stdout.once('data',resolve);
    server.once('error',reject);
    server.once('exit',status=>reject(Error('Preview exited '+status)));
  });
  browser=await chromium.launch({headless:true,channel:'msedge'});
});
after(async()=>{await browser?.close();server?.kill();});
beforeEach(async()=>{
  page=await browser.newPage();errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:4221/');
  await page.locator('#app').waitFor({state:'visible',timeout:10000});
  await saved();
});
afterEach(async()=>{try{assert.deepEqual(errors,[]);}finally{await page?.close();}});

async function saved(){
  await page.waitForFunction(()=>document.getElementById('sheet-status').textContent==='تم الحفظ');
}
async function seedSheet(location){
  await page.evaluate(({code,secondSheet,location})=>{
    const trainee=Array(20).fill('');trainee[0]=code;trainee[2]='متدرب تجريبي';
    previewSheets.set('demo-admin',{cells:location==='current'?[trainee]:[],version:1});
    if(location==='other')previewSheets.set('demo-admin:'+secondSheet,{cells:[trainee],version:1,sheet_name:'Other'});
    state.codeUseTimes={[code]:'12:30'};
  },{code,secondSheet,location});
  await page.locator('#sheet-reload').click();await saved();
  await page.locator('nav.tabs [data-tab=codes]').click();
}
async function unmark(button){
  await page.locator('.code-row[data-code="'+code+'"]').getByRole('button',{name:'إلغاء العلامة',exact:true}).click();
  await page.locator('#app-modal-'+button).click();
}

async function switchAccount(nextUser){
  await page.evaluate(({code,nextUser})=>{
    Trainees.reset();Cloud.userId=()=>nextUser;
    state={...state,usedCodes:{[code]:'13/10/2026'},codeUseTimes:{[code]:'15:00'}};
    renderCodeGrid();
  },{code,nextUser});
}

// Regression: a rejected worksheet save used to free the voucher and report success.
for(const location of ['current','other'])test('failed '+location+' worksheet save retains the usage mark, then retries durably',async()=>{
  await seedSheet(location);
  await page.evaluate(()=>window.previewSaveError='NETWORK');
  await unmark('confirm');
  await page.waitForFunction(()=>document.getElementById('toast').textContent.includes('تعذر إزالة الكود'));
  const sheetKey=location==='current'?'demo-admin':'demo-admin:'+secondSheet;
  assert.deepEqual(await page.evaluate(({code,sheetKey})=>({
    used:!!state.usedCodes[code],time:state.codeUseTimes[code],persisted:previewSheets.get(sheetKey).cells[0][0]
  }),{code,sheetKey}),{used:true,time:'12:30',persisted:code});
  await page.evaluate(()=>window.previewSaveError='');
  await unmark('confirm');
  await page.waitForFunction(code=>!state.usedCodes[code],code);
  assert.equal(await page.evaluate(key=>previewSheets.get(key).cells[0][0],sheetKey),'');
  assert.equal(await page.evaluate(code=>state.codeUseTimes[code],code),undefined);
});

test('unmark only retains the trainee code without requiring a worksheet save',async()=>{
  await seedSheet('current');
  await page.evaluate(()=>window.previewSaveError='NETWORK');
  await unmark('alt');
  await page.waitForFunction(code=>!state.usedCodes[code],code);
  assert.equal(await page.evaluate(()=>previewSheets.get('demo-admin').cells[0][0]),code);
});

test('a code absent from worksheets can still be unmarked',async()=>{
  await seedSheet('missing');
  await unmark('confirm');
  await page.waitForFunction(code=>!state.usedCodes[code],code);
  assert.match(await page.locator('#toast').textContent(),/الكود غير موجود/);
});

// Regression: the previous account's delayed removal must not save the new session's vouchers.
for(const phase of ['read','save'])for(const nextUser of ['demo-admin','new-account']){
  test('account changes during worksheet '+phase+' do not unmark vouchers after signing in as '+nextUser,async()=>{
    await seedSheet('other');
    await page.evaluate(({phase,secondSheet})=>{
      window.savedVouchers=[];
      Cloud.persist=async()=>{savedVouchers.push({owner:Cloud.userId(),codes:{...state.usedCodes}});return true;};
      const boundary=phase==='read'?'readTrainees':'saveTrainees',original=Cloud[boundary];
      Cloud[boundary]=async(...args)=>{
        if(args[phase==='read'?1:4]!==secondSheet)return original(...args);
        window.removalPending=true;
        await new Promise(resolve=>window.completeRemoval=resolve);
        try{return await original(...args);}
        finally{setTimeout(()=>window.removalSettled=true,0);}
      };
    },{phase,secondSheet});
    await unmark('confirm');
    await page.waitForFunction(()=>window.removalPending);
    await switchAccount(nextUser);
    await page.evaluate(()=>completeRemoval());
    await page.waitForFunction(()=>window.removalSettled);
    assert.deepEqual(await page.evaluate(code=>({
      used:state.usedCodes[code],time:state.codeUseTimes[code],savedVouchers
    }),code),{used:'13/10/2026',time:'15:00',savedVouchers:[]});
    if(phase==='read')assert.equal(await page.evaluate(sheet=>previewSheets.get('demo-admin:'+sheet).cells[0][0],secondSheet),code,'No new sheet write starts after the session changes');
  });
}

test('account changes while confirmation is open cancel unmark only',async()=>{
  await seedSheet('current');
  await page.locator('.code-row[data-code="'+code+'"]').getByRole('button',{name:'إلغاء العلامة',exact:true}).click();
  await switchAccount('new-account');
  await page.locator('#app-modal-alt').click();
  assert.equal(await page.evaluate(code=>state.usedCodes[code],code),'13/10/2026');
});
