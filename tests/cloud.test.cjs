const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path=require('node:path');
class Element {
  constructor(){this.children=[];this.listeners={};this.style={};this.dataset={};this.value='';this.hidden=false;this.textContent='';this.classList={add(){},remove(){},toggle(){},contains(){return false}};}
  appendChild(e){this.children.push(e);} removeChild(e){this.children=this.children.filter(x=>x!==e);}
  addEventListener(event,fn){this.listeners[event]=fn;} select(){} focus(){} matches(){return false;}
  setAttribute(name,value){this[name]=value;}
  getAttribute(name){return this[name] ?? null;}
  removeAttribute(name){delete this[name];}
  get options(){return this.children;}
  showModal(){this.open=true;}
  close(){this.open=false;}
  set innerHTML(v){this.children=[];this._html=v;} get innerHTML(){return this._html||'';}
}
const els={},storage=new Map(),events=[];
const document={listeners:{},addEventListener(event,fn){this.listeners[event]=fn;},getElementById:id=>els[id] ||= new Element(),createElement:()=>new Element(),querySelectorAll:()=>[],querySelector:()=>new Element(),body:new Element(),execCommand:()=>false,hidden:false};
const db={settings:{id:1,version:1,payload:{keycodes:[],categoryOrder:['Foundation'],codeCategories:['Foundation-100'],keycodeOrder:{},keycodeOverrides:{},dateColors:{},credentials:{account:'test-account',password:'test-password'},links:{zoom:'https://us02web.zoom.us/j/demo',prometric:'https://tcnet1.prometric.com/Login.aspx?demo=1'}}},codes:[{code:'TEST',category:'Foundation-100',notes:'',used_on:null,used_by:null,version:1}],stock:[],members:[{email:'test@example.invalid',role:'admin',active:true,user_id:'user-1'},{email:'member@example.invalid',role:'operator',active:true,user_id:null}]};
const clone=x=>JSON.parse(JSON.stringify(x));
let conflict=false,clipboardFails=false,codeReads=0;
const authUser={id:'user-1',email:'test@example.invalid',user_metadata:{}};
const client={
  auth:{getSession:async()=>({data:{session:{user:clone(authUser)}}}),onAuthStateChange(){},signOut:async()=>({}),updateUser:async args=>{events.push({name:'auth_update',args:clone(args)});if(args.data)authUser.user_metadata={...authUser.user_metadata,...args.data};return {data:{user:clone(authUser)}};}},
  from(table){
    if(table==='ibta_supervisor_stock')return {select:async()=>({data:clone(db.stock),error:null})};
    if(table==='ibta_members'){
      let filter;
      return {select(){return this;},eq(field,value){filter=[field,value];return this;},
        maybeSingle:async()=>({data:clone(db.members.find(row=>row[filter?.[0]]===filter?.[1]) || null)}),
        order:async()=>({data:clone(db.members)}),
        insert:async row=>{db.members.push(clone(row));return {error:null};},
        update(changes){return {eq:async(field,value)=>{const row=db.members.find(item=>item[field]===value);Object.assign(row,changes);return {error:null};}};}
      };
    }
    return {select(){return this;},eq(){return this;},order(){return this;},single:async()=>({data:clone(db.settings)}),range:async()=>{codeReads++;return {data:clone(db.codes)};}};
  },
  async rpc(name,args){
    events.push({name,args:clone(args)});
    if(conflict)return {error:{message:'CONFLICT: reload required'}};
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
      return {};
    }
    if(name==='ibta_claim_code'){
      const row=db.codes.find(r=>r.code===args.target_code&&r.version===args.expected_version&&!r.used_on);
      if(!row)return {data:[]};row.used_on=args.use_date;row.used_at='2026-09-30T09:45:00.000Z';row.used_by='user-1';row.version++;return {data:[clone(row)]};
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
const ctx=vm.createContext({document,URL,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},sessionStorage:{},window:{supabase:{createClient:()=>client},addEventListener(){}},navigator:{clipboard:{writeText:async text=>{if(clipboardFails)throw Error('denied');events.push({name:'clipboard',text});}}},setInterval(){},setTimeout(){},clearTimeout(){},confirm:()=>true,location:{reload(){}}});
els['account-menu-popover']=new Element();els['account-menu-popover'].hidden=true;
els['inventory-current-quantity']=new Element();
els['inventory-purchased-quantity']=new Element();
els['inventory-whatsapp-number']=new Element();
els['inventory-supervisor-name']=new Element();
els['inventory-message-language']=new Element();
vm.runInContext(fs.readFileSync(path.join(__dirname,'../cloud.js'),'utf8'),ctx);
const html=fs.readFileSync(path.join(__dirname,'../ibta-ops.html'),'utf8');
assert.match(html,/family=IBM\+Plex\+Sans\+Arabic/);
assert.match(html,/--ui-font:'IBM Plex Sans Arabic'/);
assert.match(html,/#auth-box\{font-family:var\(--ui-font\)/);
assert(!/Tajawal|Calibri/.test(html));
assert.match(html,/id="prometric-login-card"[^>]*>\s*<div[^>]*data-i18n="prometricLoginLink"/);
assert(html.indexOf('id="prometric-login-card"')<html.indexOf('id="cred-account"'));
assert.match(html,/\.cred-value,\.resource-value\{[^}]*font-size:16px;[^}]*font-weight:600/);
assert(!html.includes('id="remaining-summary-details"'));
assert(!html.includes('id="inventory-grid"'));
assert(html.indexOf('id="panel-inventory"')<html.indexOf('id="settings-pane-inventory"'));
assert(html.indexOf('id="settings-pane-inventory"')<html.indexOf('id="inventory-admin"'));
assert(html.indexOf('id="inventory-admin"')<html.indexOf('id="inventory-whatsapp-settings"'));
assert.match(html,/<details class="report-card" id="daily-used-details">/);
assert.match(html,/#daily-used-results\{display:grid;grid-template-columns:repeat\(auto-fit,minmax\(220px,1fr\)\)/);
for(const tab of ['profile','data','prometric','inventory','preferences','sync']){
  assert(html.includes(`id="settings-tab-${tab}"`));
  assert(html.includes(`id="settings-pane-${tab}"`));
}
assert(!html.includes('id="copy-prometric-link"'));
for(const [,script] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))vm.runInContext(script,ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../ops-ui.js'),'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
assert.equal(run("validBackup({format:'ibta-ops-backup',settings:{categoryOrder:[],codeCategories:[],keycodes:[]},codes:[{code:'A',category:'Foundation-100'}]})"),true);
assert.equal(run("validBackup({settings:{},codes:[{code:'A',category:'X'}]})"),false);
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
  await new Promise(setImmediate);
  assert.equal(els['auth-box'].hidden,true);assert.equal(els.app.hidden,false);
  assert.equal(els['settings-tab-data'].hidden,false);
  els['settings-tab-data'].listeners.click();
  assert.equal(els['settings-pane-data'].hidden,false);
  assert.equal(els['settings-pane-profile'].hidden,true);
  els['settings-tab-data'].listeners.keydown({key:'ArrowRight',preventDefault(){}});
  assert.equal(els['settings-pane-prometric'].hidden,false);
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
  assert.equal(els['account-menu-btn']['aria-expanded'],'true');
  document.listeners.keydown({key:'Escape'});
  assert.equal(els['account-menu-popover'].hidden,true);
  assert.equal(els['cred-account-val'].textContent,'test-account');
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
  els['inventory-whatsapp-number'].value='966500000000';
  els['inventory-supervisor-name'].value='Ahmed';
  els['inventory-message-language'].value='en';
  await els['inventory-save-settings'].listeners.click();
  assert.equal(db.settings.payload.inventoryWhatsappNumber,'966500000000');
  assert.equal(db.settings.payload.inventorySupervisorName,'Ahmed');
  assert.equal(db.settings.payload.inventoryMessageLanguage,'en');
  assert.match(els['inventory-whatsapp-link'].href,/^https:\/\/wa\.me\/966500000000\?text=/);
  assert.match(els['inventory-message'].textContent,/Codes with me\nFoundation: 1\n\nCodes with Ahmed\nFoundation: 200\n\nTotal codes\nFoundation: 201/);
  assert(!els['inventory-message'].textContent.includes('التأسيسي'));
  els['inventory-message-language'].value='ar';
  await els['inventory-save-settings'].listeners.click();
  assert.match(els['inventory-message'].textContent,/الأكواد معايا\nFoundation: 1\n\nالأكواد مع Ahmed\nFoundation: 200\n\nإجمالي الأكواد\nFoundation: 201/);
  els['daily-used-details'].open=true;
  els['daily-used-details'].listeners.toggle();
  assert.equal(els['daily-used-panel'].hidden,false);
  run('toggleLanguage()');
  assert.equal(els['signed-in'].textContent,'test@example.invalid · Admin');
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
  assert.equal(els['code-grid'].children[0].children[3].textContent,run('todayStr()')+' 12:45');
  assert(events.findIndex(e=>e.name==='ibta_claim_code')<events.findIndex(e=>e.name==='clipboard'));
  conflict=true;run("state.codeNotes.TEST='stale'");assert.equal(await run('saveState()'),false);assert.equal(run('state.codeNotes.TEST'),'hello');conflict=false;
  db.codes.push({code:'FAIL-COPY',category:'Foundation-100',notes:'',used_on:null,used_by:null,version:1});await run('Cloud.refresh()');
  clipboardFails=true;assert.equal(await run("Cloud.copyCode('FAIL-COPY')"),false);assert.equal(db.codes.find(r=>r.code==='FAIL-COPY').used_by,'user-1');
  assert.match(els['cloud-status'].textContent,/تم حجز/);
  assert(!storage.has('ibta_ops_state_v4'));
  const count=events.length;const row=els['code-grid'].children[0];await row.listeners.click({target:{closest:()=>true}});assert.equal(events.length,count);
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
  const reportSections=els['daily-used-results'].children.slice(1);
  assert.equal(reportSections.length,2);
  const renderedCodes=reportSections.flatMap(section=>section.children.slice(1).flatMap(list=>list.children.map(code=>code.textContent)));
  assert.deepEqual(renderedCodes,['CURRENT-DAY-A','CURRENT-DAY-B']);
  els['daily-used-date'].value='2026-09-26';
  els['daily-used-date'].listeners.change();
  assert.match(els['daily-used-results'].children[1].textContent,/لم تُستخدم/);
  assert.equal(els['daily-used-results'].children.length,2);
  els['daily-used-date'].value='2026-09-28';
  els['daily-used-date'].listeners.change();
  const colors=run('getDayColors()');
  assert.notEqual(colors['27/09/2026'],colors['28/09/2026']);
  const paintedCode=code=>els['code-grid'].children.find(row=>row.children[2]?.textContent===code)?.style.background;
  run("activeCategory='Foundation-100';renderCodeGrid()");
  assert.equal(paintedCode('CURRENT-DAY-A'),colors['28/09/2026']);
  run("activeCategory='Master-100';renderCodeGrid()");
  assert.equal(paintedCode('CURRENT-DAY-B'),colors['28/09/2026']);
  const keycodesPanel=els['panel-keycodes'];
  const settingsAddForms=els['settings-add-forms'];
  assert.equal(keycodesPanel.children.some(block=>block.className==='add-box' || block.className==='kc-add-exam'),false);
  assert.equal(settingsAddForms.hidden,false);
  let addCategory=settingsAddForms.children[1];
  addCategory.children[2].children[0].value='New Category';
  addCategory.children[4].children[0].value='First Test Exam';
  addCategory.children[4].children[1].value='Arabic';
  addCategory.children[4].children[2].value='FIRST-KEY-1';
  addCategory.children[4].children[3].value='New Category';
  await addCategory.children[2].children[1].listeners.click();
  assert(db.settings.payload.categoryOrder.includes('New Category'));
  assert.equal(db.settings.payload.keycodes[0].code,'FIRST-KEY-1');
  let newBlock=keycodesPanel.children.find(block=>block.children[0]?.children[0]?.textContent?.includes('New Category'));
  let examForm=settingsAddForms.children[0].children[1];
  const category=examForm.children[0].children[1];
  const [examTitle,language,keycode,destination]=examForm.children[1].children;
  category.value='New Category';category.listeners.change();
  examTitle.value='New Test Exam';language.value='English';keycode.value='TEST-KEY-1';destination.value='New Category';
  await examForm.listeners.submit({preventDefault(){}});
  assert.deepEqual(db.settings.payload.keycodes[1],{title:'New Test Exam',lang:'English',code:'TEST-KEY-1',category:'New Category'});
  await run('Cloud.refresh()');
  assert.equal(run('DEFAULT_KEYCODES[1].code'),'TEST-KEY-1');
  newBlock=keycodesPanel.children.find(block=>block.children[0]?.children[0]?.textContent?.includes('New Category'));
  assert(newBlock.children[1].children.some(row=>row.children?.[3]?.textContent==='TEST-KEY-1'));
  examForm=settingsAddForms.children[0].children[1];
  examForm.children[1].children[0].value='Duplicate';
  examForm.children[1].children[2].value='test-key-1';
  await examForm.listeners.submit({preventDefault(){}});
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
  els['manage-code-category'].value='Foundation-100';els['manage-code-category'].listeners.change();
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
  const rowToDelete=els['code-grid'].children.find(row=>row.children[2]?.textContent==='REVISED-CODE');
  const deleteButton=rowToDelete.children[5].children.at(-1);
  assert.match(deleteButton.innerHTML,/<svg/);
  const deleting=deleteButton.listeners.click({stopPropagation(){}});
  assert.equal(els['delete-dialog'].open,true);
  els['delete-confirm'].onclick();
  await deleting;
  assert(!db.codes.some(r=>r.code==='REVISED-CODE'));
  els['low-stock-threshold'].value='3';
  await els['low-stock-save'].listeners.click();
  assert.equal(db.settings.payload.lowStockThreshold,3);
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
  console.log('PASS: backup restore, bulk code import, account profile, reports, cloud persistence, and categories.');
})().catch(e=>{console.error(e);process.exitCode=1;});
