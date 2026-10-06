const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..');
let server,browser,origin;

// Only the third-party SDK and clipboard are replaced; Cloud and all UI modules run unchanged.
function installBoundaryFixtures(){
  const clone=value=>JSON.parse(JSON.stringify(value));
  const user={id:'ui-admin',email:'ui@example.invalid',user_metadata:{}};
  const db=window.uiTestDatabase={settings:{id:1,version:1,payload:{
    categoryOrder:['Foundation'],codeCategories:['Foundation-100'],keycodeOrder:{},
    keycodes:['FIRST','SECOND','THIRD'].map(code=>({code,title:code,lang:'Arabic',category:'Foundation'})),
    credentials:{account:'UI-ACCOUNT',password:'UI-PASSWORD'},links:{}
  }},codes:[{code:'UI-VOUCHER',category:'Foundation-100',notes:'',used_on:null,used_by:null,version:1}],
  members:[{...user,user_id:user.id,active:true,role:'admin'}],sheets:{},saveError:''};
  window.uiTestCopies=[];
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>window.uiTestCopies.push(text)}});
  const client={auth:{getSession:async()=>({data:{session:{user,access_token:'header.'+btoa(JSON.stringify({amr:[{method:'password',timestamp:Math.floor(Date.now()/1000)}]}))+'.signature'}}}),onAuthStateChange(){},signOut:async()=>({})},
    from(table){
      const filters=[];
      const records=()=>{
        const tables={ibta_settings:[db.settings],ibta_codes:db.codes,ibta_members:db.members,ibta_supervisor_stock:[],ibta_trainee_sheets:Object.entries(db.sheets).map(([owner_id,sheet])=>({owner_id,...sheet}))};
        if(!Object.hasOwn(tables,table))throw Error('Unexpected table: '+table);
        return tables[table].filter(row=>filters.every(([key,value])=>row[key]===value));
      };
      return {select(){return this;},eq(key,value){filters.push([key,value]);return this;},order(){return this;},
        single:async()=>({data:clone(records()[0])}),maybeSingle:async()=>({data:clone(records()[0]||null)}),
        range:async(from,to)=>({data:clone(records().slice(from,to+1))}),then(resolve,reject){return Promise.resolve({data:clone(records())}).then(resolve,reject);}};
    },
    async rpc(name,args){
      if(name==='ibta_apply_changes'){
        if(args.settings_version!==db.settings.version)return {error:{message:'CONFLICT'}};
        if(args.settings_payload){db.settings.payload=clone(args.settings_payload);db.settings.version++;}
        return {};
      }
      if(name==='ibta_claim_code'){
        const row=db.codes.find(row=>row.code===args.target_code&&row.version===args.expected_version&&!row.used_on);
        if(!row)return {data:[]};
        Object.assign(row,{used_on:args.use_date,used_by:user.id,version:row.version+1});return {data:[clone(row)]};
      }
      if(name==='ibta_save_trainee_sheet_formatted'){
        if(db.saveError)return {error:{message:db.saveError}};
        const old=db.sheets[args.target_owner]||{version:0};
        if(old.version!==args.expected_version)return {error:{message:'CONFLICT'}};
        db.sheets[args.target_owner]={cells:clone(args.new_cells),format:clone(args.new_format),version:old.version+1};
        return {data:old.version+1};
      }
      if(name==='ibta_inventory_delivery_status')return {data:{enabled:false,provider:'web',time:'16:59'}};
      throw Error('Unexpected RPC: '+name);
    }
  };
  window.supabase={createClient:()=>client};
}

before(async()=>{
  const assets=new Set(fs.readdirSync(root).filter(name=>/\.(js|css)$/.test(name)));
  server=http.createServer((req,res)=>{
    const name=new URL(req.url,'http://localhost').pathname.slice(1);
    if(!name){
      const html=fs.readFileSync(path.join(root,'trainflow.html'),'utf8').replace(/<script src="https:\/\/cdn.jsdelivr.net[^>]+><\/script>/,'<script src="supabase-test-sdk.js"></script>');
      res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);
    }else if(name==='supabase-test-sdk.js'){
      res.setHeader('Content-Type','text/javascript');res.end('('+installBoundaryFixtures.toString()+')();');
    }else if(assets.has(name)){
      res.setHeader('Content-Type',name.endsWith('.css')?'text/css':'text/javascript');res.end(fs.readFileSync(path.join(root,name)));
    }else{res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true,channel:'msedge'});
});
after(async()=>{await browser?.close();await new Promise(resolve=>server?server.close(resolve):resolve());});

async function openWorkspace(t,options={}){
  const context=await browser.newContext({viewport:{width:1440,height:1000},...options});
  t.after(()=>context.close());
  // Prevent every production/external request, including fonts and third-party libraries.
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const page=await context.newPage();
  require('./sheet-toolbar-helper.cjs')(page);
  await page.goto(origin);
  await page.waitForFunction(()=>!document.getElementById('app').hidden&&!document.getElementById('app').classList.contains('workspace-restoring'));
  return page;
}
async function navigate(page,panel){
  const button=page.locator('nav.tabs button[data-tab="'+panel+'"]');
  if(!await button.isVisible())await page.locator('#sidebar-toggle').click();
  await button.click();
}

test('keyboard copying claims a voucher once and leaves selection controls independent',{timeout:30000},async t=>{
  const page=await openWorkspace(t);
  await navigate(page,'keycodes');
  await page.getByRole('button',{name:'نسخ الكود FIRST',exact:true}).focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>uiTestCopies.length===1);
  assert.deepEqual(await page.evaluate(()=>uiTestCopies),['FIRST']);
  await navigate(page,'codes');
  await page.getByRole('checkbox',{name:'تحديد الكود UI-VOUCHER',exact:true}).check();
  assert.equal(await page.evaluate(()=>uiTestDatabase.codes[0].used_on),null);
  const copy=page.getByRole('button',{name:'نسخ الكود UI-VOUCHER',exact:true});
  await copy.focus();await page.keyboard.press('Space');
  await page.waitForFunction(()=>uiTestCopies.length===2&&!document.getElementById('app').inert);
  assert.deepEqual(await page.evaluate(()=>uiTestCopies),['FIRST','UI-VOUCHER']);
  assert.ok(await page.evaluate(()=>uiTestDatabase.codes[0].used_on));
  assert.equal(await page.getByRole('textbox',{name:'ملاحظات الكود UI-VOUCHER',exact:true}).count(),1);
  await navigate(page,'prometric');
  for(const [id,text] of [['cred-account','UI-ACCOUNT'],['cred-password','UI-PASSWORD']]){
    await page.locator('#'+id).focus();await page.keyboard.press('Enter');
    await page.waitForFunction(text=>uiTestCopies.at(-1)===text,text);
  }
});

test('keyboard exam ordering persists and cannot move past either boundary',{timeout:30000},async t=>{
  const page=await openWorkspace(t);await navigate(page,'keycodes');
  const rows=page.locator('.kc-row');
  assert.equal(await rows.first().locator('.kc-exam-order').first().isDisabled(),true);
  assert.equal(await rows.last().locator('.kc-exam-order').last().isDisabled(),true);
  await page.getByRole('button',{name:'تحريك لأعلى: SECOND',exact:true}).focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelector('.kc-row').dataset.keycode==='SECOND'&&!document.getElementById('app').inert);
  assert.equal(await page.locator(':focus').textContent(),'SECOND');
  await page.evaluate(()=>Cloud.refresh());
  assert.deepEqual(await rows.evaluateAll(rows=>rows.map(row=>row.dataset.keycode)),['SECOND','FIRST','THIRD']);
  assert.equal(await rows.first().locator('.kc-exam-order').first().isDisabled(),true);
});

test('settings arrow navigation follows the visual direction in both languages',{timeout:30000},async t=>{
  const page=await openWorkspace(t);await navigate(page,'settings');
  for(const [language,nextKey,previousKey] of [['ar','ArrowLeft','ArrowRight'],['en','ArrowRight','ArrowLeft']]){
    if(await page.locator('html').getAttribute('lang')!==language)await page.locator('#lang-btn').click();
    await page.locator('#settings-tab-profile').click();await page.keyboard.press(nextKey);
    assert.equal(await page.locator('#settings-tab-data').getAttribute('aria-selected'),'true');
    assert.equal(await page.locator(':focus').getAttribute('id'),'settings-tab-data');
    await page.keyboard.press(previousKey);
    assert.equal(await page.locator('#settings-tab-profile').getAttribute('aria-selected'),'true');
  }
});

test('language switching translates saved and failed status without discarding the sheet draft',{timeout:30000},async t=>{
  const page=await openWorkspace(t);
  await page.waitForFunction(()=>document.getElementById('sheet-status').textContent==='تم الحفظ');
  await page.locator('#lang-btn').click();assert.equal(await page.locator('#sheet-status').textContent(),'Saved');
  await page.evaluate(()=>{uiTestDatabase.saveError='CONFLICT';});
  const cell=page.locator('td[data-v="0"][data-col="0"]');
  await cell.dblclick();await page.keyboard.insertText('RETAINED-DRAFT');await page.keyboard.press('Tab');
  await page.locator('#sheet-save').click();
  await page.waitForFunction(()=>document.getElementById('sheet-status').dataset.error==='true');
  assert.match(await page.locator('#sheet-status').textContent(),/Another window/);
  await page.locator('#lang-btn').click();
  assert.match(await page.locator('#sheet-status').textContent(),/تم تعديل الجدول/);
  assert.equal(await cell.textContent(),'RETAINED-DRAFT');assert.equal(await page.evaluate(()=>Trainees.hasDraft()),true);
  assert.equal(await page.locator('#sheet-status').getAttribute('data-error'),'true');
  await page.evaluate(()=>{uiTestDatabase.saveError='';});await page.locator('#sheet-save').click();
  await page.waitForFunction(()=>!Trainees.hasDraft());
  assert.equal(await page.locator('#sheet-status').textContent(),'تم الحفظ');
});

test('long mobile notifications stay readable and skip navigation reaches the main content',{timeout:30000},async t=>{
  const page=await openWorkspace(t,{viewport:{width:390,height:844},reducedMotion:'reduce'});
  await page.locator('.skip-link').focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator(':focus').getAttribute('id'),'workspace-main');
  await page.evaluate(()=>showToast('CODE-'.repeat(37)));
  const toast=page.locator('#toast');
  const box=await toast.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=390,'The full notification fits the viewport');
  assert.ok(await toast.evaluate(el=>el.scrollWidth<=el.clientWidth),'The code wraps inside the notification');
  assert.equal(await toast.getAttribute('role'),'status');assert.equal(await toast.getAttribute('aria-live'),'polite');
  assert.equal(await toast.evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
  assert.equal(await page.locator('#panel-trainees').evaluate(el=>getComputedStyle(el).animationName),'none');
  await page.waitForTimeout(1600);
  assert.equal(await toast.evaluate(el=>el.classList.contains('show')),true,'Notification remains readable beyond the old 1.4-second timeout');
});
