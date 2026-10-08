const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path=require('node:path');
const {Window}=require('happy-dom'),React=require('react');
const domWindow=new Window({url:'http://localhost',settings:{disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});
const document=domWindow.document;
const html=require('../tools/workspace-source.cjs').renderDocument({inlineRuntime:true});
document.documentElement.innerHTML=html.replace(/<script[^>]*>[\s\S]*?<\/script>/g,'');
global.window=domWindow;global.document=document;global.FormData=domWindow.FormData;
const views=require('../tools/workspace-source.cjs').loadTsx(path.join(__dirname,'../client/workspace-views.tsx')).WorkspaceViews;
let eventPrototype=Object.getPrototypeOf(document.createElement('button'));while(!Object.hasOwn(eventPrototype,'addEventListener'))eventPrototype=Object.getPrototypeOf(eventPrototype);
const nativeListen=eventPrototype.addEventListener;
eventPrototype.addEventListener=function(event,listener,...args){this.listeners||={};this.listeners[event]=listener;return nativeListen.call(this,event,listener,...args);};
const els=new Proxy({}, {get:(_,id)=>document.getElementById(id)}),storage=new Map(),events=[];
const documentListeners={};const documentListen=document.addEventListener.bind(document);
document.addEventListener=(event,listener,...args)=>{documentListeners[event]=listener;return documentListen(event,listener,...args);};
const fire=async(element,type)=>{global.IS_REACT_ACT_ENVIRONMENT=true;try{await React.act(async()=>{element.dispatchEvent(new domWindow.Event(type,{bubbles:true,cancelable:true}));});}finally{delete global.IS_REACT_ACT_ENVIRONMENT;}};
const db={settings:{id:1,version:1,payload:{keycodes:[],categoryOrder:['Foundation'],codeCategories:['Foundation-100'],keycodeOrder:{},keycodeOverrides:{},dateColors:{},credentials:{account:'test-account',password:'test-password'},links:{zoom:'https://us02web.zoom.us/j/demo',prometric:'https://tcnet1.prometric.com/Login.aspx?demo=1'}}},codes:[{code:'TEST',category:'Foundation-100',notes:'',used_on:null,used_by:null,version:1}],stock:[],members:[{email:'test@example.invalid',role:'admin',active:true,user_id:'user-1'},{email:'member@example.invalid',role:'operator',active:true,user_id:null}]};
const clone=x=>JSON.parse(JSON.stringify(x));
const backupBlobs=[];db.traineeSheets=[];
db.auditEvents=[{id:'audit-1',actor:'user-1',action:'UPDATE',entity:'ibta_codes',record_key:'TEST',happened_at:'2026-10-07T09:00:00Z'}];
let conflict=false,clipboardFails=false,codeReads=0;
const authUser={id:'user-1',email:'test@example.invalid',user_metadata:{}};
const windowListeners={};let authListener,signOuts=0;
let releaseInitialSession,firstSessionRead=true,sessionReadError=false;
const initialSessionRead=new Promise(resolve=>{releaseInitialSession=resolve;});
const accessToken='header.'+Buffer.from(JSON.stringify({amr:[{method:'password',timestamp:Math.floor(Date.now()/1000)}]})).toString('base64url')+'.signature';
let membersReadError=false;
const client={
  auth:{getSession:async()=>{if(firstSessionRead){firstSessionRead=false;await initialSessionRead;}return sessionReadError?{error:Error('NETWORK')}:{data:{session:{user:clone(authUser),access_token:accessToken}}};},onAuthStateChange(fn){authListener=fn;},signOut:async()=>{signOuts++;authListener?.('SIGNED_OUT',null);return {};},updateUser:async args=>{events.push({name:'auth_update',args:clone(args)});if(args.data)authUser.user_metadata={...authUser.user_metadata,...args.data};return {data:{user:clone(authUser)}};}},
  from(table){
    if(table==='ibta_trainee_sheets'){const filters=[];const selected=()=>db.traineeSheets.filter(row=>filters.every(([key,value])=>row[key]===value));return {select(){return this;},eq(key,value){filters.push([key,value]);return this;},order(){return this;},maybeSingle:async()=>({data:clone(selected()[0]||null)}),then(resolve,reject){return Promise.resolve({data:clone(selected()),error:null}).then(resolve,reject);},range:async(from,to)=>({data:clone(selected().slice(from,to+1)),error:null})};}
    if(table==='ibta_audit')return {select(){return this;},order(){return this;},limit:async()=>({data:clone(db.auditEvents)})};
    if(table==='ibta_supervisor_stock')return {select:async()=>({data:clone(db.stock),error:null})};
    if(table==='ibta_members'){
      let filter;
      return {select(){return this;},eq(field,value){filter=[field,value];return this;},
        maybeSingle:async()=>({data:clone(db.members.find(row=>row[filter?.[0]]===filter?.[1]) || null)}),
        order:async()=>membersReadError?{error:Error('NETWORK')}:{data:clone(db.members)},
        insert:async row=>{db.members.push(clone(row));return {error:null};},
        update(changes){return {eq:async(field,value)=>{const row=db.members.find(item=>item[field]===value);Object.assign(row,changes);return {error:null};}};}
      };
    }
    return {select(){return this;},eq(){return this;},order(){return this;},single:async()=>({data:clone(db.settings)}),range:async()=>{codeReads++;return {data:clone(db.codes)};}};
  },
  async rpc(name,args){
    events.push({name,args:clone(args)});
    if(conflict)return {error:{message:'CONFLICT: reload required'}};
    if(name==='ibta_assign_codes'){
      for(const item of args.items){const row=db.codes.find(r=>r.code===item.code);assert.equal(row.version,item.version);row.owner_id=args.target_owner;row.version++;}return {};
    }
    if(name==='ibta_change_supervisor_stock'){
      let row=db.stock.find(item=>item.category===args.target_category);
      if(args.mode==='opening'){
        if(row)return {error:{message:'CONFLICT: stock already initialized'}};
        row={category:args.target_category,remaining:args.quantity};db.stock.push(row);
      }else{
        if(!row)return {error:{message:'IBTA_STOCK_NOT_SET'}};
        row.remaining=args.mode==='replenishment'?row.remaining+args.quantity:args.quantity;
      }
      return {data:row.remaining};
    }
    if(name==='ibta_import_codes'){
      let added=0;
      for(const code of args.new_codes)if(!db.codes.some(row=>row.code.toLowerCase()===code.toLowerCase())){
        const stock=db.stock.find(item=>item.category===args.target_category);
        if(!stock || stock.remaining<1)return {error:{message:stock?'IBTA_STOCK_INSUFFICIENT':'IBTA_STOCK_NOT_SET'}};
        stock.remaining--;
        db.codes.push({code,category:args.target_category,notes:'',used_on:null,used_by:null,version:1});added++;
      }
      return {data:added};
    }
    if(name==='ibta_restore_backup'){
      if(args.expected_version!==db.settings.version)return {error:{message:'CONFLICT: reload required'}};
      db.settings.payload=clone(args.backup.settings);db.settings.version++;
      db.codes=clone(args.backup.codes).map(row=>({...row,version:1000000}));
      if(args.backup.supervisorStock)db.stock=clone(args.backup.supervisorStock);
      if(args.backup.traineeSheets)db.traineeSheets=clone(args.backup.traineeSheets);
      return {};
    }
    if(name==='ibta_set_voucher_trainee_name'){const row=db.codes.find(r=>r.code===args.target_code&&r.version===args.expected_version);if(!row)return {error:{message:'CONFLICT'}};row.trainee_name=args.trainee_name;row.version++;return {data:row.version};}
    if(name==='ibta_claim_code'||name==='ibta_claim_trainee_voucher'){
      const row=db.codes.find(r=>r.code===args.target_code&&r.version===args.expected_version&&!r.used_on);
      if(!row)return {data:[]};row.used_on=args.use_date;if(name==='ibta_claim_trainee_voucher')row.trainee_name=args.trainee_name;row.used_at='2026-09-30T09:45:00.000Z';row.used_by='user-1';row.version++;return {data:[clone(row)]};
    }
    for(const c of args.changes){
      if(c.op==='update'){const r=db.codes.find(r=>r.code===c.code);assert.equal(c.version,r.version);r.notes=c.notes;r.used_on=c.used_on;r.version++;}
      if(c.op==='insert'){
        const stock=db.stock.find(item=>item.category===c.category);
        if(!stock || stock.remaining<1)return {error:{message:stock?'IBTA_STOCK_INSUFFICIENT':'IBTA_STOCK_NOT_SET'}};
        stock.remaining--;db.codes.push({...c,version:1});
      }
      if(c.op==='delete')db.codes=db.codes.filter(r=>r.code!==c.code);
      if(c.op==='replace'){
        const r=db.codes.find(r=>r.code===c.code);assert.equal(c.version,r.version);
        r.code=c.new_code;r.category=c.new_category;r.notes=c.notes;
        if(r.used_on!==c.used_on)r.used_by=c.used_on?'user-1':null;
        r.used_on=c.used_on;r.version++;
      }
    }
    if(args.settings_payload){db.settings.payload=clone(args.settings_payload);db.settings.version++;}
    return {};
  }
};
const ctx=vm.createContext({document,URL,Blob,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},sessionStorage:{},window:{WorkspaceViews:views,matchMedia:()=>({matches:false}),URL:{createObjectURL(blob){backupBlobs.push(blob);return 'blob:backup-test';},revokeObjectURL(){}},supabase:{createClient:()=>client},addEventListener(name,fn){windowListeners[name]=fn;}},navigator:{clipboard:{writeText:async text=>{if(clipboardFails)throw Error('denied');events.push({name:'clipboard',text});}}},setInterval(){},setTimeout(){},clearTimeout(){},confirm:()=>true,location:{reload(){}}});
ctx.atob=atob;
ctx.matchMedia=domWindow.matchMedia.bind(domWindow);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../session-policy.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../cloud.js'),'utf8'),ctx);
assert.match(html,/family=Cairo/);
assert.match(html,/--ui-font:'Cairo'/);
assert.match(html,/#auth-box\{font-family:var\(--ui-font\)/);
assert(!/Tajawal|Calibri/.test(Array.from(document.querySelectorAll('style,link[href*=fonts]')).map(element=>element.textContent+(element.getAttribute('href')||'')).join('')));
assert.match(html,/id="prometric-login-card"[^>]*>\s*<div[^>]*data-i18n="prometricLoginLink"/);
assert(html.indexOf('id="prometric-login-card"')<html.indexOf('id="cred-account"'));
assert.match(html,/\.cred-value,\.resource-value\{[^}]*font-size:16px;[^}]*font-weight:600/);
assert(!html.includes('id="remaining-summary-details"'));
assert(!html.includes('id="inventory-grid"'));
assert(html.indexOf('id="panel-inventory"')<html.indexOf('id="settings-pane-inventory"'));
assert(html.indexOf('id="settings-pane-inventory"')<html.indexOf('id="inventory-admin"'));
assert.match(html,/<details class="report-card" id="daily-used-details">/);
assert.match(html,/#daily-used-results\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
for(const tab of ['profile','data','prometric','inventory','extensions','reports','sync']){
  assert(html.includes(`id="settings-tab-${tab}"`));
  assert(html.includes(`id="settings-pane-${tab}"`));
}
assert(!html.includes('id="autochain-toggle"'));assert(!html.includes('id="settings-tab-preferences"'));assert(!html.includes('id="signed-in"'));assert(!html.includes('id="refresh-data"'));
assert(!html.includes('id="copy-prometric-link"'));
for(const [,script] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))vm.runInContext(script,ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../ops-ui.js'),'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
assert.equal(run("validBackup({format:'ibta-ops-backup',settings:{categoryOrder:[],codeCategories:[],keycodes:[]},codes:[{code:'A',category:'Foundation-100'}]})"),true);
assert.equal(run("validBackup({format:'trainflow-backup',settings:{categoryOrder:[],codeCategories:[],keycodes:[]},codes:[{code:'A',category:'Foundation-100'}]})"),true);
assert.equal(run("validBackup({format:'foreign-backup',settings:{categoryOrder:[],codeCategories:[],keycodes:[]},codes:[{code:'A',category:'Foundation-100'}]})"),false);
assert.equal(run("validBackup({settings:{},codes:[{code:'A',category:'X'}]})"),false);
assert.equal(run("validBackup({settings:{categoryOrder:[],codeCategories:[],keycodes:[]},codes:[],traineeSheets:[{owner_id:'00000000-0000-0000-0000-000000000001',cells:[Array(500).fill('')],format:{styles:{'0:499':{bold:true}}}}]})"),true,'Backups accept custom trainee columns and their formatting');
assert.equal(run("validBackup({settings:{categoryOrder:[],codeCategories:[],keycodes:[]},codes:[],traineeSheets:[{owner_id:'00000000-0000-0000-0000-000000000001',cells:[Array(501).fill('')]}]})"),false,'Import keeps the column limit');
assert.equal(run("validBackup({settings:{categoryOrder:[],codeCategories:[],keycodes:[]},codes:[{code:'A',category:'X'},{code:'a',category:'X'}]})"),false);
assert.deepEqual(JSON.parse(run("JSON.stringify(parseCodeFile('Code\\nNEW-A\\nNEW-A\\nTEST\\n,BAD'))")),{codes:['NEW-A','TEST'],duplicates:1,invalid:1});
const englishKeys=JSON.parse(run('JSON.stringify(Object.keys(TRANSLATIONS.en))'));
const arabicKeys=JSON.parse(run('JSON.stringify(Object.keys(TRANSLATIONS.ar))'));
assert.deepEqual(englishKeys.sort(),arabicKeys.sort());
const usedKeys=[...html.matchAll(/data-i18n="([^"]+)"|\bt\('([^']+)'\)/g),
  ...fs.readFileSync(path.join(__dirname,'../cloud.js'),'utf8').matchAll(/\bt\('([^']+)'\)/g)]
  .map(match=>match[1] || match[2] || match[3]);
for(const key of usedKeys) assert(englishKeys.includes(key),`Missing translation: ${key}`);
(async()=>{
  assert.equal(els['auth-box'].hidden,true,'Login stays hidden while session restoration is pending');
  assert.equal(els['startup-screen'].hidden,false);
  assert.match(html,/<section id="auth-box"[^>]* hidden(?:="")?>/);
  releaseInitialSession();
  await new Promise(setImmediate);
  assert.equal(els['auth-box'].hidden,true);assert.equal(els.app.hidden,false);
  assert.equal(els['startup-screen'].hidden,true,'Restored sessions go directly to the app');
  assert.equal(els['settings-tab-data'].hidden,false);
  els['settings-tab-data'].listeners.click();
  assert.equal(els['settings-pane-data'].hidden,false);
  assert.equal(els['settings-pane-profile'].hidden,true);
  els['settings-tab-data'].listeners.keydown({key:'ArrowLeft',preventDefault(){}});
  assert.equal(els['settings-pane-prometric'].hidden,false,'ArrowLeft advances to the next tab in Arabic');
  els['settings-tab-profile'].listeners.click();
  assert.equal(els['settings-pane-profile'].hidden,false);
  assert.equal(els['account-menu-email'].textContent,'test@example.invalid');
  assert.equal((await run('Cloud.listMembers()')).length,2);
  await run("Cloud.updateMember('member@example.invalid','copy_only',false)");
  assert.equal(db.members[1].role,'copy_only');
  assert.equal(db.members[1].active,false);
  assert.equal(els['account-avatar'].textContent,'T');
  els['account-menu-btn'].listeners.click();
  assert.equal(els['account-menu-popover'].hidden,false);
  assert.equal(els['account-menu-btn'].getAttribute('aria-expanded'),'true');
  documentListeners.keydown({key:'Escape'});
  assert.equal(els['account-menu-popover'].hidden,true);
  assert.equal(els['cred-account-val'].textContent,'test-account');
  await run('renderAuditList()');assert.match(els['audit-list'].textContent,/TEST/);
  db.auditEvents.push({actor:'user-1',action:'UPDATE',entity:'ibta_trainee_sheets',record_key:'user-1:00000000-0000-0000-0000-000000000001',happened_at:'2026-10-07T09:00:00Z'},{actor:'user-1',action:'UPDATE',entity:'ibta_settings',record_key:'1',happened_at:'2026-10-07T09:00:00Z'});
  await run('renderAuditList()');assert.match(els['audit-list'].textContent,/تعديل جدول المتدربين «Sheet 1» · صاحب الجدول: test@example.invalid/);assert.doesNotMatch(els['audit-list'].textContent,/00000000-0000-0000-0000-000000000001|ibta_trainee_sheets/);
  run("currentLang='en'");await run('renderAuditList()');assert.match(els['audit-list'].textContent,/Updated trainee worksheet «Sheet 1» · Owner: test@example.invalid/);run("currentLang='ar'");
  membersReadError=true;await run('renderAuditList()');assert.equal(els['audit-list'].textContent,run("t('genericError')"));
  membersReadError=false;await run('renderAuditList()');assert.match(els['audit-list'].textContent,/TEST/,'A failed audit read can recover without losing the React region');
  assert.match(els['cloud-status'].textContent,/متصل/);
  els['inventory-category'].value='Foundation-100';
  assert.match(els['inventory-current-balance'].textContent,/لم يُحدد/);
  assert.equal(els['inventory-stock-list'].children.length,1);
  assert.equal(els['inventory-stock-list'].children[0].children[1].textContent,'لم يُحدد');
  assert.equal(els['inventory-add-purchased'].disabled,true);
  els['inventory-current-quantity'].value='150';
  await els['inventory-set-current'].listeners.click();
  assert.equal(db.stock[0].remaining,150);
  assert.match(els['inventory-current-balance'].textContent,/150/);
  assert.equal(els['inventory-stock-list'].children[0].children[1].textContent,'150');
  assert.equal(els['inventory-add-purchased'].disabled,false);
  els['inventory-purchased-quantity'].value='50';
  await els['inventory-add-purchased'].listeners.click();
  assert.equal(db.stock[0].remaining,200);
  els['inventory-current-quantity'].value='190';
  await els['inventory-set-current'].listeners.click();
  assert.equal(db.stock[0].remaining,190);
  els['inventory-purchased-quantity'].value='10';
  await els['inventory-add-purchased'].listeners.click();
  assert.equal(db.stock[0].remaining,200);
  assert.equal(els['inventory-copy-message'].disabled,false);
  await els['inventory-copy-message'].listeners.click();
  assert.deepEqual(Array.from(els['inventory-message'].querySelectorAll('section'),section=>section.textContent),[
    'الأكواد معاياFoundation: 1','الأكواد مع المشرفFoundation: 200','إجمالي الأكوادFoundation: 201الإجمالي الكلي: 201'
  ]);
  assert.match(events.findLast(event=>event.name==='clipboard').text,/الأكواد معايا\nFoundation: 1\n\nالأكواد مع المشرف\nFoundation: 200\n\nإجمالي الأكواد\nFoundation: 201/);
  els['daily-used-details'].open=true;
  els['daily-used-details'].listeners.toggle();
  assert.equal(els['daily-used-panel'].hidden,false);
  run('toggleLanguage()');
  assert.equal(els['account-menu-email'].textContent,'test@example.invalid');
  assert.equal(els['cloud-status'].textContent,'Saved to the database');
  assert.equal(els['auth-password'].placeholder,'Enter your password');
  assert.equal(JSON.parse(storage.get('ibta_ui_preferences')).uiLang,'en');
  run('toggleLanguage()');
  assert.match(els['cloud-status'].textContent,/حفظ/);
  els['add-codes-input'].value='unsaved code';
  const readsBeforeRefresh=codeReads;
  assert.equal(await run('Cloud.refresh(true)'),false);
  assert.equal(codeReads,readsBeforeRefresh);
  els['add-codes-input'].value='';
  assert.equal(await run('Cloud.refresh(true)'),true);
  assert.equal(codeReads,readsBeforeRefresh+1);
  assert.equal(await run('Cloud.refresh(true)'),false);
  assert.equal(codeReads,readsBeforeRefresh+1);
  run("state.codeNotes.TEST='hello'");assert.equal(await run('saveState()'),true);assert.equal(db.codes[0].notes,'hello');
  await run("Cloud.copyCode('TEST')");assert.equal(db.codes[0].used_by,'user-1');
  assert.equal(db.codes[0].used_at,'2026-09-30T09:45:00.000Z');
  assert.equal(Array.from(els['code-grid'].children).find(row=>row.dataset.code).children[3].textContent,run('todayStr()')+' 12:45');
  assert(events.findIndex(e=>e.name==='ibta_claim_code')<events.findIndex(e=>e.name==='clipboard'&&e.text==='TEST'));
  conflict=true;run("state.codeNotes.TEST='stale'");assert.equal(await run('saveState()'),false);assert.equal(run('state.codeNotes.TEST'),'hello');conflict=false;
  db.codes.push({code:'FAIL-COPY',category:'Foundation-100',notes:'',used_on:null,used_by:null,version:1});await run('Cloud.refresh()');
  clipboardFails=true;assert.equal(await run("Cloud.copyCode('FAIL-COPY')"),false);assert.equal(db.codes.find(r=>r.code==='FAIL-COPY').used_by,'user-1');
  assert.match(els['cloud-status'].textContent,/تم حجز/);
  assert(!storage.has('ibta_ops_state_v4'));
  const count=events.length;const row=Array.from(els['code-grid'].children).find(row=>row.dataset.code);await fire(row.querySelector('.col-check input'),'click');assert.equal(events.length,count);
  db.settings.payload.dateColors={'27/09/2026':'#FFC000','28/09/2026':'#FFC000'};
  db.codes.push({code:'PREVIOUS-DAY',category:'Foundation-100',notes:'',used_on:'27/09/2026',used_by:'user-1',version:1});
  db.codes.push({code:'CURRENT-DAY-A',category:'Foundation-100',notes:'',used_on:'28/09/2026',used_by:'user-1',version:1});
  db.codes.push({code:'CURRENT-DAY-B',category:'Master-100',notes:'',used_on:'28/09/2026',used_by:'user-1',version:1});
  db.codes.push({code:'AVAILABLE-NOW',category:'Foundation-100',notes:'',used_on:null,used_by:null,version:1});
  await run('Cloud.refresh()');
  els['daily-used-date'].value='2026-09-28';
  els['daily-used-date'].listeners.change();
  const usedOnDay=JSON.parse(run("JSON.stringify(dailyUsedGroups('2026-09-28'))"));
  assert.deepEqual(usedOnDay.find(group=>group.cat==='Foundation-100').codes,['CURRENT-DAY-A']);
  assert.deepEqual(usedOnDay.find(group=>group.cat==='Master-100').codes,['CURRENT-DAY-B']);
  assert.match(els['daily-used-results'].children[0].textContent,/2/);
  const reportSections=Array.from(els['daily-used-results'].children).slice(1);
  assert.equal(reportSections.length,2);
  const renderedCodes=reportSections.flatMap(section=>Array.from(section.children).slice(1).flatMap(list=>Array.from(list.children).map(code=>code.textContent)));
  assert.deepEqual(renderedCodes,['CURRENT-DAY-A','CURRENT-DAY-B']);
  els['daily-used-date'].value='2026-09-26';
  els['daily-used-date'].listeners.change();
  assert.match(els['daily-used-results'].children[1].textContent,/لم تُستخدم/);
  assert.equal(els['daily-used-results'].children.length,2);
  els['daily-used-date'].value='2026-09-28';
  els['daily-used-date'].listeners.change();
  const colors=run('getDayColors()');
  assert.notEqual(colors['27/09/2026'],colors['28/09/2026']);
  const paintedCode=code=>Array.from(els['code-grid'].children).find(row=>row.children[2]?.textContent===code)?.style.background;
  run("activeCategory='Foundation-100';renderCodeGrid()");
  assert.equal(paintedCode('CURRENT-DAY-A'),colors['28/09/2026']);
  run("activeCategory='Master-100';renderCodeGrid()");
  assert.equal(paintedCode('CURRENT-DAY-B'),colors['28/09/2026']);
  const keycodesPanel=els['panel-keycodes'];
  const settingsAddForms=els['settings-add-forms'];
  assert.equal(Array.from(keycodesPanel.children).some(block=>block.className==='add-box' || block.className==='kc-add-exam'),false);
  assert.equal(settingsAddForms.hidden,false);
  let addCategory=settingsAddForms.querySelector('.add-box form');
  addCategory.elements.name.value='New Category';await fire(addCategory.elements.name,'input');
  addCategory.elements.examTitle.value='First Test Exam';addCategory.elements.language.value='Arabic';addCategory.elements.keycode.value='FIRST-KEY-1';
  await fire(addCategory,'submit');
  assert(db.settings.payload.categoryOrder.includes('New Category'));
  assert.equal(db.settings.payload.keycodes[0].code,'FIRST-KEY-1');
  let newBlock=Array.from(keycodesPanel.children).find(block=>block.children[0]?.children[0]?.textContent?.includes('New Category'));
  let examForm=settingsAddForms.children[0].children[1];
  const category=examForm.children[0].children[1];
  const [examTitle,language,keycode,destination]=examForm.children[1].children;
  category.value='New Category';await fire(category,'change');
  examTitle.value='New Test Exam';language.value='English';keycode.value='TEST-KEY-1';destination.value='New Category';
  await fire(examForm,'submit');
  assert.deepEqual(db.settings.payload.keycodes[1],{title:'New Test Exam',lang:'English',code:'TEST-KEY-1',category:'New Category'});
  await run('Cloud.refresh()');
  assert.equal(run('DEFAULT_KEYCODES[1].code'),'TEST-KEY-1');
  newBlock=Array.from(keycodesPanel.children).find(block=>block.children[0]?.children[0]?.textContent?.includes('New Category'));
  assert(Array.from(newBlock.children[1].children).some(row=>row.children?.[3]?.textContent==='TEST-KEY-1'));
  examForm=settingsAddForms.children[0].children[1];
  examForm.children[1].children[0].value='Duplicate';
  examForm.children[1].children[2].value='test-key-1';
  await fire(examForm,'submit');
  assert.equal(db.settings.payload.keycodes.length,2);
  assert.equal(els['manage-data'].hidden,false);
  els['manage-category'].value='New Category';
  els['manage-category-edit'].listeners.click();
  assert.equal(els['edit-dialog'].open,true);
  els['edit-name'].value='Renamed Category';
  await els['edit-form'].listeners.submit({preventDefault(){}});
  assert.equal(db.settings.payload.categoryLabels['New Category'],'Renamed Category');
  assert.equal(run("displayCatName('New Category')"),'Renamed Category');
  els['manage-exam'].value='TEST-KEY-1';
  els['manage-exam-edit'].listeners.click();
  els['edit-title'].value='Revised Exam';els['edit-code'].value='REVISED-KEY-1';
  await els['edit-form'].listeners.submit({preventDefault(){}});
  assert.equal(db.settings.payload.keycodes[1].title,'Revised Exam');
  assert.equal(db.settings.payload.keycodes[1].code,'REVISED-KEY-1');
  els['manage-code-category'].value='Foundation-100';await fire(els['manage-code-category'],'change');
  els['manage-code'].value='CURRENT-DAY-A';els['manage-code-edit'].listeners.click();
  els['edit-code'].value='REVISED-CODE';els['edit-category'].value='Master-100';els['edit-notes'].value='updated';
  await els['edit-form'].listeners.submit({preventDefault(){}});
  assert.equal(db.codes.find(r=>r.code==='REVISED-CODE').used_by,'user-1');
  assert.equal(db.codes.find(r=>r.code==='REVISED-CODE').category,'Master-100');
  assert.equal(db.codes.find(r=>r.code==='REVISED-CODE').used_on,'28/09/2026');
  assert.equal(els['prometric-settings'].hidden,false);
  assert.equal(run('ZOOM_URL'),'https://us02web.zoom.us/j/demo');
  assert.equal(els['zoom-card'].href,'https://us02web.zoom.us/j/demo');
  assert.match(html,/<a class="cred-card resource-card" id="zoom-card" target="_blank" rel="noopener noreferrer">/);
  assert(!html.includes('id="open-zoom"'));
  assert.equal(els['prometric-link-val'].textContent,'https://tcnet1.prometric.com/Login.aspx?demo=1');
  els['settings-zoom-link'].value='http://us02web.zoom.us/j/unsafe';
  await els['prometric-settings-form'].listeners.submit({preventDefault(){}});
  assert.equal(db.settings.payload.links.zoom,'https://us02web.zoom.us/j/demo');
  els['settings-zoom-link'].value='https://us02web.zoom.us/j/updated';
  els['settings-prometric-account'].value='updated-account';
  els['settings-prometric-password'].value='updated-password';
  els['settings-prometric-link'].value='https://tcnet1.prometric.com/Login.aspx?updated=1';
  await els['prometric-settings-form'].listeners.submit({preventDefault(){}});
  assert.equal(db.settings.payload.credentials.account,'updated-account');
  assert.equal(db.settings.payload.credentials.password,'updated-password');
  assert.equal(db.settings.payload.links.zoom,'https://us02web.zoom.us/j/updated');
  assert.equal(db.settings.payload.links.prometric,'https://tcnet1.prometric.com/Login.aspx?updated=1');
  assert.equal(els['zoom-link-val'].textContent,'https://us02web.zoom.us/j/updated');
  assert.equal(els['zoom-card'].href,'https://us02web.zoom.us/j/updated');
  clipboardFails=false;
  await els['prometric-login-card'].listeners.click();
  assert(events.some(event=>event.name==='clipboard' && event.text===db.settings.payload.links.prometric));
  const copiedLinks=events.filter(event=>event.name==='clipboard' && event.text===db.settings.payload.links.prometric).length;
  await els['prometric-login-card'].listeners.keydown({key:'Enter',preventDefault(){}});
  assert.equal(events.filter(event=>event.name==='clipboard' && event.text===db.settings.payload.links.prometric).length,copiedLinks+1);
  const deleteDecision=run("confirmDelete('Delete test?')");
  assert.equal(els['delete-dialog'].open,true);
  els['delete-cancel'].onclick();
  assert.equal(await deleteDecision,false);
  els['profile-name'].value='Salah';
  await els['profile-name-form'].listeners.submit({preventDefault(){}});
  assert.equal(authUser.user_metadata.full_name,'Salah');
  assert.equal(els['account-avatar'].textContent,'S');
  assert.equal(els['account-menu-name'].textContent,'Salah');
  els['profile-email'].value='new@example.invalid';
  await els['profile-email-form'].listeners.submit({preventDefault(){}});
  assert(events.some(e=>e.name==='auth_update'&&e.args.email==='new@example.invalid'));
  assert.match(els['profile-status'].textContent,/أكد/);
  els['profile-current-password'].value='old-password';els['profile-new-password'].value='new-password';els['profile-confirm-password'].value='different';
  await els['profile-password-form'].listeners.submit({preventDefault(){}});
  assert(!events.some(e=>e.name==='auth_update'&&e.args.password));
  els['profile-confirm-password'].value='new-password';
  await els['profile-password-form'].listeners.submit({preventDefault(){}});
  assert(events.some(e=>e.name==='auth_update'&&e.args.password==='new-password'&&e.args.current_password==='old-password'));
  assert.equal(els['profile-new-password'].value,'');
  run("activeCategory='Master-100';renderCodeGrid()");
  const rowToDelete=Array.from(els['code-grid'].children).find(row=>row.children[2]?.textContent==='REVISED-CODE');
  const deleteButton=Array.from(Array.from(rowToDelete.children).at(-1).children).at(-1);
  assert.match(deleteButton.innerHTML,/<svg/);
  await fire(deleteButton,'click');
  assert.equal(els['delete-dialog'].open,true);
  els['delete-confirm'].onclick();
  await new Promise(setImmediate);
  assert(!db.codes.some(r=>r.code==='REVISED-CODE'));

  els['bulk-import-category'].value='Foundation-100';
  await els['bulk-import-file'].listeners.change({target:{files:[{size:30,text:async()=>"Code\nBULK-ONE\nBULK-TWO\nBULK-ONE"}]}});
  assert.match(els['bulk-import-preview'].textContent,/2 كود جديد/);
  await els['bulk-import-submit'].listeners.click();
  assert(db.codes.some(row=>row.code==='BULK-ONE'));
  assert.equal(db.stock[0].remaining,198);
  const backup={format:'ibta-ops-backup',settings:clone(db.settings.payload),codes:clone(db.codes),supervisorStock:clone(db.stock)};
  await els['restore-file'].listeners.change({target:{files:[{size:20,text:async()=>'{"invalid":true}'}]}});
  assert.equal(els['restore-button'].disabled,true);
  await els['restore-file'].listeners.change({target:{files:[{size:100,text:async()=>JSON.stringify(backup)}]}});
  assert.equal(els['restore-button'].disabled,false);
  await els['restore-button'].listeners.click();
  assert.equal(els['restore-button'].disabled,true);
  assert(db.codes.some(row=>row.code==='BULK-TWO'));
  const wideBackupRow=Array(500).fill('');wideBackupRow[3]='Backup trainee';wideBackupRow[499]='00123';
  db.traineeSheets=[{owner_id:'00000000-0000-0000-0000-000000000001',cells:[wideBackupRow],format:{headers:{499:'Review'},styles:{'0:499':{bold:true}}}}];
  await run('Cloud.exportData()');
  const exportedBackup=JSON.parse(await backupBlobs.at(-1).text());
  assert.equal(exportedBackup.format,'trainflow-backup','New exports use the TrainFlow format');
  assert.deepEqual(exportedBackup.traineeSheets,db.traineeSheets,'Export includes every custom column and its formatting');
  assert.deepEqual(exportedBackup.settings,db.settings.payload);assert.equal(exportedBackup.codes.length,db.codes.length);assert.deepEqual(exportedBackup.supervisorStock,db.stock);
  assert.equal(run('validBackup('+JSON.stringify(exportedBackup)+')'),true,'Exported app backup can be imported again');
  await run('Cloud.restoreData('+JSON.stringify(exportedBackup)+')');
  assert.equal(db.traineeSheets[0].cells[0][499],'00123');assert.equal(db.traineeSheets[0].format.styles['0:499'].bold,true);
  const first='00000000-0000-0000-0000-000000000001',second='00000000-0000-0000-0000-000000000002';
  db.traineeSheets[0]={...db.traineeSheets[0],sheet_id:first,sheet_name:'Existing',sheet_order:0,version:8};
  db.traineeSheets.push({...clone(db.traineeSheets[0]),sheet_id:second,sheet_name:'Independent',version:4,cells:[Array(13).fill('Second')]});
  assert.equal((await run("Cloud.readTrainees('"+first+"','"+second+"')")).cells[0][0],'Second','Read is scoped to worksheet identity');
  assert.equal((await run("Cloud.readTrainees('"+first+"')")).cells[0][499],'00123','Legacy reads select the first worksheet only');
  assert.equal((await run("Cloud.listTraineeSheets('"+first+"')")).length,2);
  await run('Cloud.exportData()');const workbookBackup=JSON.parse(await backupBlobs.at(-1).text());assert.equal(run('validBackup('+JSON.stringify(workbookBackup)+')'),true);assert.equal(workbookBackup.traineeSheets.length,2);await run('Cloud.restoreData('+JSON.stringify(workbookBackup)+')');assert.equal(db.traineeSheets[1].sheet_name,'Independent');
  const duplicateBackup=clone(workbookBackup);duplicateBackup.traineeSheets[1].sheet_id=first;assert.equal(run('validBackup('+JSON.stringify(duplicateBackup)+')'),false,'Duplicate owner/worksheet pairs are rejected');
  console.log('PASS: backup restore, bulk code import, account profile, reports, cloud persistence, and categories.');
  db.codes.push({code:'TRAINEE-ALLOCATE',category:'TRAINEE-CATEGORY',version:1,used_on:null,owner_id:null});
  assert.equal(await run("Cloud.claimTraineeCode('TRAINEE-CATEGORY','user-1','AUTOMATIC TRAINEE')"),'TRAINEE-ALLOCATE');
  assert.equal(db.codes.find(r=>r.code==='TRAINEE-ALLOCATE').trainee_name,'AUTOMATIC TRAINEE');assert.equal(run("state.voucherNames['TRAINEE-ALLOCATE']"),'AUTOMATIC TRAINEE');
  assert.equal(await run("Cloud.saveVoucherName('TRAINEE-ALLOCATE','Edited trainee')"),true);assert.equal(db.codes.find(r=>r.code==='TRAINEE-ALLOCATE').trainee_name,'Edited trainee');
  const allocation=db.codes.find(r=>r.code==='TRAINEE-ALLOCATE');assert.equal(allocation.owner_id,'user-1');assert.equal(allocation.used_by,'user-1');assert.ok(allocation.used_on);
  await assert.rejects(run("Cloud.claimTraineeCode('NONEXISTENT','user-1')"));
  for(const name of ['inventoryReportSnapshot','inventoryDelivery','inventoryDeliveryEligible'])assert.equal(run('typeof Cloud.'+name),'undefined','Removed delivery APIs are absent');
  let resets=0,flushes=0;
  ctx.Trainees={flush:async()=>{flushes++;return false;},hasDraft:()=>true,reset(){resets++;}};
  ctx.testExpiry=ctx.SessionPolicy.expiresAt(accessToken);
  vm.runInContext('Date.now=()=>testExpiry;',ctx);
  windowListeners.focus();await new Promise(setImmediate);
  assert.equal(signOuts,1,'Daily cutoff signs out even when saving fails');
  assert.equal(flushes,1);assert.equal(resets,0,'Failed saves retain the draft in memory');
  assert.equal(els.app.hidden,true);assert.equal(els['auth-box'].hidden,false);
  assert.match(els['auth-message'].textContent,/5 مساءً/);
  assert.match(els['auth-message'].textContent,/بنفس الحساب/);
  console.log('PASS: forced daily sign-out retains a failed sheet draft and shows manual login');
  sessionReadError=true;await vm.runInContext('Cloud.boot()',ctx);
  assert.equal(els['startup-screen'].hidden,true,'Failed initialization does not leave a permanent loading screen');
  assert.equal(els['auth-box'].hidden,false);
  console.log('PASS: delayed session restoration avoids login flash and initialization errors reveal login');
  await domWindow.happyDOM.abort();
})().catch(e=>{console.error(e);process.exitCode=1;});
