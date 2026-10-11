const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const path=require('node:path'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');

(async()=>{
  const next=process.env.TRAINFLOW_REPORTS_NEXT==='1';
  const server=spawn(process.execPath,next?[require.resolve('next/dist/bin/next'),'start','-p','4198']:[path.join(__dirname,'../tools/design-preview.cjs')],{env:{...process.env,IBTA_PREVIEW_PORT:'4198'},stdio:['ignore','pipe','inherit']});
  let browser;
  try{
    await new Promise((resolve,reject)=>{server.stdout.on('data',chunk=>{if(!next||chunk.toString().includes('Ready'))resolve();});server.once('error',reject);});
    browser=await chromium.launch({headless:true,channel:'msedge'});
    const page=await browser.newPage({viewport:{width:1366,height:900}}),errors=[],requests=[],popups=[];
    page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>requests.push(request.url()));page.on('popup',popup=>popups.push(popup));
    if(next){
      const source=fs.readFileSync(path.join(__dirname,'../tools/design-preview.cjs'),'utf8'),mock=vm.runInNewContext(source.match(/const mock=(\x60[^]*?\x60);/)[1]);
      await page.route('**/workspace/cloud.js*',route=>route.fulfill({contentType:'text/javascript',body:mock}));
      await page.route('https://cdn.jsdelivr.net/**',route=>route.fulfill({contentType:'text/javascript',body:'window.supabase={};'}));
    }
    await page.goto('http://localhost:4198');await page.locator('#app').waitFor({state:'visible'});
    await page.locator('#trainees-tab').click();
    await page.waitForFunction(()=>document.getElementById('sheet-status').textContent==='تم الحفظ');
    await page.evaluate(()=>{
      const passed=Array(20).fill('');
      Object.assign(passed,{0:'PASS-VOUCHER',1:'trainee@example.invalid',2:'اسم "المتدرب"\nالسطر الثاني\tتكملة',3:'<img src=x onerror=alert(1)>',4:'001234',5:'050123',6:'Organization',7:'Leadership',8:'06/10/2026',9:'PRIVATE USER',10:'PRIVATE PASSWORD',11:'ناجح',12:'001122',19:'آخر عمود'});
      const record=(code,result)=>{const row=[...passed];row[0]=code;row[11]=result;return row;};
      previewSheets.set('demo-admin',{cells:[passed,record('FAIL-VOUCHER','راسب'),record('NO-RESULT',''),record('OTHER-OWNER','ناجح'),record('OTHER-DAY','ناجح'),record('UNUSED','ناجح'),[]],format:{headers:{19:'ملاحظات التقرير'}},version:1});
      previewCodes.push(
        {code:'PASS-VOUCHER',owner_id:'demo-admin',used_at:'2026-10-04T21:30:00Z'},
        {code:'FAIL-VOUCHER',owner_id:'demo-admin',used_on:'05/10/2026'},
        {code:'NO-RESULT',owner_id:'demo-admin',used_on:'05/10/2026'},
        {code:'OTHER-OWNER',owner_id:'demo-user',used_on:'05/10/2026'},
        {code:'OTHER-DAY',owner_id:'demo-admin',used_at:'2026-10-05T21:30:00Z'},
        {code:'UNUSED',owner_id:'demo-admin',used_on:null},
      );
      Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.reportCopiedText=text;}}});
      document.execCommand=()=>false;
    });
    await page.locator('#sheet-reload').click();await page.waitForFunction(()=>document.getElementById('sheet-status').textContent==='تم الحفظ');
    const panel=page.locator('#sheet-report-panel'),status=panel.locator('p');
    await panel.locator('[data-field=date]').fill('2026-10-05');
    await panel.locator('[data-action=operations]').click();
    const defaultOperations=await page.evaluate(()=>TraineeData.parse(window.reportCopiedText));
    assert.equal(defaultOperations.length,3,'Daily operations exclude unused codes, other owners and other Riyadh dates');
    assert.equal(defaultOperations[0].length,10);assert.equal(defaultOperations[0][0],'PASS-VOUCHER','Copy has no header row');
    assert.equal(defaultOperations[0][2],'اسم "المتدرب"\nالسطر الثاني\tتكملة','Multiline/tab/quoted cells survive TSV');
    assert.equal(defaultOperations[0][4],'001234');assert.equal(defaultOperations[0][8],'06/10/2026','Copy preserves the exam-date cell');
    assert.doesNotMatch(await page.evaluate(()=>window.reportCopiedText),/PRIVATE USER|PRIVATE PASSWORD/);
    await panel.locator('[data-action=success]').click();
    assert.deepEqual(await page.evaluate(()=>TraineeData.parse(window.reportCopiedText)),[['PASS-VOUCHER','اسم "المتدرب"\nالسطر الثاني\tتكملة','06/10/2026','ناجح']]);
    assert.match(await status.textContent(),/تم نسخ 1 صف/);

    await page.locator('nav.tabs [data-tab=settings]').click();await page.locator('#settings-tab-reports').click();
    assert.equal(await page.locator('#settings-report-bridge').count(),0);assert.equal(await page.locator('#settings-report-guide').count(),0);
    assert.equal(await page.locator('#settings-report-operations input').count(),20);
    assert.match(await page.locator('#settings-report-operations label').last().textContent(),/T — ملاحظات التقرير/);
    const chosen={operations:[3,12,19],success:[0,2,11]};
    for(const [kind,columns]of Object.entries(chosen)){
      const checkboxes=page.locator('#settings-report-'+kind+' input[type=checkbox]');
      for(let column=0;column<20;column++)await checkboxes.nth(column).setChecked(columns.includes(column));
    }
    await page.locator('#settings-report-save').click();await page.waitForFunction(()=>document.getElementById('settings-report-status').textContent.includes('تم حفظ'));
    await page.screenshot({path:path.join(__dirname,'../artifacts/report-copy-columns.png')});
    await page.locator('#trainees-tab').click();
    await panel.locator('[data-action=operations]').click();
    assert.deepEqual(await page.evaluate(()=>TraineeData.parse(window.reportCopiedText)),Array(3).fill(['<img src=x onerror=alert(1)>','001122','آخر عمود']),'Only the selected operations columns are copied');
    await panel.locator('[data-action=success]').click();
    const successfulCopy=await page.evaluate(()=>window.reportCopiedText);
    assert.deepEqual(await page.evaluate(()=>TraineeData.parse(window.reportCopiedText)),[['PASS-VOUCHER','اسم "المتدرب"\nالسطر الثاني\tتكملة','ناجح']],'Successful report has its own column selection');
    assert.equal(await page.locator('#sheet-report-preview-root').count(),0);
    assert.equal(popups.length,0);assert.equal(requests.some(url=>url.includes('script.google.com')),false);

    for(const clipboardState of ['rejected','unavailable']){
      await page.evaluate(state=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:state==='unavailable'?undefined:{writeText:async()=>{throw new DOMException('Denied','NotAllowedError');}}});},clipboardState);
      await panel.locator('[data-action=success]').click();assert.match(await status.textContent(),/تعذر نسخ/);
    }
    await panel.locator('[data-field=date]').fill('2026-09-01');await panel.locator('[data-action=operations]').click();
    assert.match(await status.textContent(),/لا توجد بيانات/);assert.equal(await page.evaluate(()=>window.reportCopiedText),successfulCopy,'Empty/failed copies leave the clipboard intact');
    await page.locator('#sheet-expanded').click();assert.equal(await panel.locator('[data-action=success]').isVisible(),true,'Copy controls remain accessible in expanded mode');await page.locator('#sheet-expanded-close').click();

    await page.locator('nav.tabs [data-tab=settings]').click();await page.locator('#settings-tab-reports').click();
    for(const column of chosen.operations)await page.locator('#settings-report-operations input[value="'+column+'"]').uncheck();
    await page.locator('#settings-report-save').click();assert.match(await page.locator('#settings-report-status').textContent(),/عمودًا واحدًا/);
    assert.deepEqual(await page.evaluate(()=>Cloud.reportColumns()),chosen,'An empty column selection cannot overwrite saved preferences');
    await page.reload();await page.locator('#app').waitFor({state:'visible'});await page.locator('nav.tabs [data-tab=settings]').click();await page.locator('#settings-tab-reports').click();
    for(const [kind,columns]of Object.entries(chosen))assert.deepEqual(await page.locator('#settings-report-'+kind+' input:checked').evaluateAll(inputs=>inputs.map(input=>Number(input.value))),columns,'Column choices survive reload');
    await page.evaluate(()=>{currentLang='en';applyLanguage();});
    assert.equal(await page.locator('#settings-report-save').textContent(),'Save report columns');
    await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:path.join(__dirname,'../artifacts/report-copy-columns-mobile.png')});
    await page.locator('#trainees-tab').click();assert.equal(await panel.locator('[data-action=operations]').textContent(),'Copy operations report');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.deepEqual(errors,[]);
    console.log('PASS: direct daily report copying, independent account column choices, passed filtering, Riyadh dates, raw multiline values, no preview/upload, clipboard failures, expanded/mobile layout and reload.');
  }finally{await browser?.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
