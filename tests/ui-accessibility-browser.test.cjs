const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..');
let server,browser,origin;

const installBoundaryFixtures=require('./workspace-sdk-fixture.cjs');

before(async()=>{
  require('../tools/prepare-runtime.cjs');
  const assets=new Set(fs.readdirSync(root).filter(name=>/\.(js|css)$/.test(name)));
  server=http.createServer((req,res)=>{
    const name=new URL(req.url,'http://localhost').pathname.slice(1);
    if(['','trainees','keycodes','prometric','vouchers','inventory','settings'].includes(name)){
      const html=require('../tools/workspace-source.cjs').renderDocument().replace(/<script src="https:\/\/cdn.jsdelivr.net[^>]+><\/script>/,'<script src="supabase-test-sdk.js"></script>');
      res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);
    }else if(name==='supabase-test-sdk.js'){
      res.setHeader('Content-Type','text/javascript');res.end('('+installBoundaryFixtures.toString()+')();');
    }else if(require('../tools/preview-assets.cjs')[name]){
      res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(require('../tools/preview-assets.cjs')[name]));
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
  const button=page.locator('nav.tabs [data-tab][data-tab="'+panel+'"]');
  if(!await button.isVisible())await page.locator('#sidebar-toggle').click();
  await button.click();
  const paths={trainees:'trainees',keycodes:'keycodes',prometric:'prometric',codes:'vouchers',inventory:'inventory',settings:'settings'};
  await page.waitForURL('**/'+paths[panel]);
  await page.waitForFunction(()=>!document.getElementById('app').hidden&&!document.getElementById('app').classList.contains('workspace-restoring'));
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
  assert.ok(await page.evaluate(()=>uiTestDatabase.codes[0].used_on));assert.notEqual(await page.locator('.code-row[data-code="UI-VOUCHER"]').evaluate(el=>el.style.background),'','Used voucher receives its date color after a sheet has been opened');
  assert.equal(await page.getByRole('textbox',{name:'ملاحظات الكود UI-VOUCHER',exact:true}).count(),1);
  await navigate(page,'prometric');
  for(const [id,text] of [['cred-account','UI-ACCOUNT'],['cred-password','UI-PASSWORD']]){
    await page.locator('#'+id).focus();await page.keyboard.press('Enter');
    await page.waitForFunction(text=>uiTestCopies.at(-1)===text,text);
  }
});

test('voucher names require double click to edit and preserve the next field draft during saving',{timeout:30000},async t=>{
  const page=await openWorkspace(t);await navigate(page,'codes');
  await page.evaluate(async()=>{
    uiTestDatabase.codes.push({...uiTestDatabase.codes[0],code:'SECOND-VOUCHER'});await Cloud.refresh();
    window.uiTestNameSaveGate=new Promise(resolve=>{window.uiReleaseNameSave=resolve;});
  });
  const first=page.getByRole('textbox',{name:'اسم المتدرب للفاوتشر UI-VOUCHER',exact:true});
  const second=page.getByRole('textbox',{name:'اسم المتدرب للفاوتشر SECOND-VOUCHER',exact:true});
  await first.click();assert.equal(await first.evaluate(el=>el.readOnly),true,'A single click does not enable name editing');
  await first.dblclick();await first.fill('FIRST TRAINEE');await second.dblclick();
  assert.equal(await second.evaluate(el=>el===document.activeElement&&!el.readOnly),true,'Double click edits the next name while the previous save is pending');
  assert.equal(await page.locator('#app').evaluate(el=>el.inert),false);
  await page.keyboard.insertText('SECOND DRAFT');
  await page.evaluate(()=>{uiReleaseNameSave();window.uiTestNameSaveGate=null;});
  await page.waitForFunction(()=>state.voucherNames['UI-VOUCHER']==='FIRST TRAINEE');
  assert.equal(await second.evaluate(el=>el===document.activeElement),true);assert.equal(await second.inputValue(),'SECOND DRAFT','A save cannot replace another field draft');
  await first.dblclick();await page.waitForFunction(()=>state.voucherNames['SECOND-VOUCHER']==='SECOND DRAFT');
  assert.equal(await first.evaluate(el=>el===document.activeElement),true);
  await first.fill('EDITED FIRST');await page.keyboard.press('Tab');
  await page.waitForFunction(()=>state.voucherNames['UI-VOUCHER']==='EDITED FIRST');
  assert.equal(await page.getByRole('textbox',{name:'ملاحظات الكود UI-VOUCHER',exact:true}).evaluate(el=>el===document.activeElement),true,'Tab focus survives saving');
  await page.evaluate(()=>{uiTestDatabase.nameSaveError='CONFLICT: reload required';});
  await first.focus();await page.keyboard.press('F2');await first.fill('REJECTED NAME');await second.dblclick();await page.keyboard.press('End');await page.keyboard.insertText(' STILL EDITING');
  await page.waitForFunction(()=>document.getElementById('cloud-status').textContent===t('conflict'));
  assert.equal(await first.inputValue(),'EDITED FIRST');assert.equal(await second.evaluate(el=>el===document.activeElement),true);assert.equal(await second.inputValue(),'SECOND DRAFT STILL EDITING');
  assert.equal(await page.evaluate(()=>uiTestDatabase.codes[0].trainee_name),'EDITED FIRST');assert.deepEqual(await page.evaluate(()=>uiTestCopies),[],'Editing names never claims or copies a voucher');
});

test.skip('keyboard exam ordering persists and cannot move past either boundary (kc-exam-order buttons removed per user request)',{timeout:30000},async t=>{
  const page=await openWorkspace(t);await navigate(page,'keycodes');
  const rows=page.locator('.kc-row');
  assert.equal(await rows.first().locator('.kc-exam-order').first().isDisabled(),true);
});

test('report destinations follow the signed-in account on a fresh browser and isolate other accounts',{timeout:30000},async t=>{
  const page=await openWorkspace(t);await navigate(page,'settings');await page.locator('#settings-tab-reports').click();
  const links={operations:'https://docs.google.com/spreadsheets/d/account-operations/edit',success:'https://docs.google.com/spreadsheets/d/account-success/edit',bridge:'https://script.google.com/macros/s/account-connector/exec'};
  for(const [name,link]of Object.entries(links))await page.locator('#settings-report-'+name).fill(link);
  await page.locator('#settings-report-save').click();await page.waitForFunction(()=>document.getElementById('settings-report-status').textContent.includes('تم حفظ'));
  const database=await page.evaluate(()=>uiTestDatabase);assert.deepEqual(database.accountMetadata['ui-admin'].report_destinations,links);
  for(const variant of ['same-account','other-account','legacy-browser']){
    const otherAccount=variant==='other-account',legacyBrowser=variant==='legacy-browser';
    const context=await browser.newContext({viewport:{width:1440,height:1000}});t.after(()=>context.close());
    await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
    await context.addInitScript(({database,otherAccount,legacyBrowser,links})=>{
      if(otherAccount){window.uiTestUser={id:'other-user',email:'other@example.invalid',user_metadata:{}};database.members.push({user_id:'other-user',email:'other@example.invalid',active:true,role:'admin'});}
      if(legacyBrowser){delete database.accountMetadata['ui-admin'].report_destinations;localStorage.setItem('ibta_report_destinations',JSON.stringify(links));}
      sessionStorage.setItem('test-sdk-database',JSON.stringify(database));
    },{database,otherAccount,legacyBrowser,links});
    const remote=await context.newPage();await remote.goto(origin+'/settings');await remote.locator('#settings-tab-reports').click();
    if(legacyBrowser)await remote.waitForFunction(()=>uiTestDatabase.accountMetadata?.['ui-admin']?.report_destinations?.operations?.includes('account-operations'));
    for(const [name,link]of Object.entries(links))assert.equal(await remote.locator('#settings-report-'+name).inputValue(),otherAccount?'':link,'Account settings load without local browser preferences');
    assert.equal(await remote.evaluate(()=>localStorage.getItem('ibta_report_destinations')),null);
  }
  await page.evaluate(()=>{uiTestDatabase.authSaveError='NETWORK';});await page.locator('#settings-report-operations').fill('https://docs.google.com/spreadsheets/d/unsaved/edit');await page.locator('#settings-report-save').click();
  await page.waitForFunction(()=>document.getElementById('settings-report-status').textContent.includes('تعذر'));
  assert.equal(await page.locator('#settings-report-operations').inputValue(),'https://docs.google.com/spreadsheets/d/unsaved/edit');assert.deepEqual(await page.evaluate(()=>Cloud.reportDestinations()),links,'Failed saves preserve the last account configuration');
});

test('settings side tabs follow vertical keyboard navigation and adapt on mobile',{timeout:30000},async t=>{
  const page=await openWorkspace(t);await navigate(page,'settings');
  assert.equal(await page.locator('#settings-tabs').getAttribute('aria-orientation'),'vertical');
  for(const [language,nextKey,previousKey] of [['ar','ArrowLeft','ArrowRight'],['en','ArrowRight','ArrowLeft']]){
    if(await page.locator('html').getAttribute('lang')!==language)await page.locator('#lang-btn').click();
    await page.locator('#settings-tab-profile').click();await page.keyboard.press(nextKey);
    assert.equal(await page.locator('#settings-tab-data').getAttribute('aria-selected'),'true');
    assert.equal(await page.locator(':focus').getAttribute('id'),'settings-tab-data');
    await page.keyboard.press(previousKey);
    assert.equal(await page.locator('#settings-tab-profile').getAttribute('aria-selected'),'true');
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.locator('#settings-tab-data').getAttribute('aria-selected'),'true');
    await page.keyboard.press('ArrowUp');
    assert.equal(await page.locator('#settings-tab-profile').getAttribute('aria-selected'),'true');
    const tabs=await page.locator('#settings-tabs').boundingBox(),pane=await page.locator('#settings-pane-profile').boundingBox();
    assert.ok(tabs.x+tabs.width<=pane.x||pane.x+pane.width<=tabs.x,'Tabs sit beside the content in '+language);
    await page.keyboard.press('End');
    assert.equal(await page.locator('#settings-tab-sync').getAttribute('aria-selected'),'true');
    await page.keyboard.press('Home');
    assert.equal(await page.locator('#settings-tab-profile').getAttribute('aria-selected'),'true');
  }
  await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(()=>document.getElementById('settings-tabs').getAttribute('aria-orientation')==='horizontal');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Settings fit a mobile viewport');
});

test('compact operational pages remove empty width and keep inventory copying readable',{timeout:30000},async t=>{
  const page=await openWorkspace(t);
  await page.evaluate(async()=>{
    uiTestDatabase.stock=[{category:'Foundation-100',remaining:10}];
    uiTestDatabase.settings.payload.links={prometric:'https://tcnet1.prometric.com/Login.aspx?ClientNameSingleSite=preview',zoom:'https://us02web.zoom.us/j/123456789?pwd=preview'};
    await Cloud.refresh();
  });
  for(const [panel,limit] of [['keycodes',920],['prometric',720],['codes',930],['inventory',680]]){
    await navigate(page,panel);
    const surface=page.locator(panel==='codes'?'.code-sheet':'#panel-'+panel);
    assert.ok((await surface.boundingBox()).width<=limit+1,panel+' no longer stretches across the workspace');
    if(panel==='prometric'){
      let bottom=0;
      for(const id of ['prometric-login-card','cred-account','cred-password','zoom-card']){
        const bounds=await page.locator('#'+id).boundingBox();
        assert.ok(bounds.y>=bottom,'Prometric cards follow login, account, password and Zoom order');bottom=bounds.y+bounds.height;
      }
    }
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),panel+' remains within the mobile viewport');
    await page.setViewportSize({width:1440,height:1000});
  }
  const copy=page.locator('#inventory-copy-message');
  assert.equal(await copy.isEnabled(),true);
  for(const interaction of ['normal','hover','pressed']){
    if(interaction==='hover')await copy.hover();
    if(interaction==='pressed')await page.mouse.down();
    const colors=await copy.evaluate(el=>{const css=getComputedStyle(el);return [css.color,css.backgroundColor];});
    assert.equal(colors[0],'rgb(255, 255, 255)',interaction+' text stays white');
    assert.notEqual(colors[0],colors[1],interaction+' text differs from the background');
  }
  await page.mouse.up();
  await page.waitForFunction(()=>uiTestCopies.length===1);
  assert.equal(await page.evaluate(()=>uiTestCopies[0]),await page.locator('#inventory-message').innerText(),'Copying retains the full inventory message');
  await navigate(page,'trainees');await page.waitForFunction(()=>document.getElementById('sheet-status').textContent==='تم الحفظ');await page.locator('#sheet-prometric-open').click();
  const registration=page.locator('#sheet-prometric-dialog');assert.ok((await registration.boundingBox()).width<=760,'Registration dialog has a compact desktop width');
  await page.setViewportSize({width:390,height:844});assert.ok(await registration.evaluate(el=>{const box=el.getBoundingClientRect();return box.left>=0&&box.right<=innerWidth;}),'Registration dialog fits mobile');await page.keyboard.press('Escape');
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

test('a failed sheet save blocks page navigation and keeps the draft editable',{timeout:30000},async t=>{
  const page=await openWorkspace(t);
  await page.evaluate(()=>{uiTestDatabase.saveError='CONFLICT';});
  const cell=page.locator('td[data-v="0"][data-col="0"]');
  await cell.dblclick();await page.keyboard.insertText('SAVE-BEFORE-NAVIGATION');await page.keyboard.press('Tab');
  await page.locator('nav.tabs a[data-tab="prometric"]').click();
  await page.waitForFunction(()=>document.getElementById('sheet-status').dataset.error==='true');
  assert.equal(new URL(page.url()).pathname,'/');
  assert.equal(await cell.textContent(),'SAVE-BEFORE-NAVIGATION');
  assert.equal(await page.locator('#panel-trainees').isVisible(),true);
  await page.evaluate(()=>{uiTestDatabase.saveError='';});
  await navigate(page,'prometric');
  await navigate(page,'trainees');
  assert.equal(await page.locator('td[data-v="0"][data-col="0"]').textContent(),'SAVE-BEFORE-NAVIGATION');
  await page.evaluate(()=>{uiTestDatabase.saveError='CONFLICT';});
  await cell.click();await page.keyboard.press('F2');await page.keyboard.press('Control+a');await page.keyboard.insertText('UNSAVED-HISTORY-DRAFT');await page.keyboard.press('Tab');
  await page.goBack();
  await page.waitForFunction(()=>location.pathname==='/trainees'&&document.getElementById('sheet-status').dataset.error==='true');
  assert.equal(await page.locator('#panel-trainees').isVisible(),true,'Failed saves cancel Back and restore the current URL');
  assert.equal(await cell.textContent(),'UNSAVED-HISTORY-DRAFT');
  await page.evaluate(()=>{uiTestDatabase.saveError='';});await page.locator('#sheet-save').click();await page.waitForFunction(()=>!Trainees.hasDraft());
  await page.goBack();await page.waitForURL('**/prometric');await page.waitForFunction(()=>document.getElementById('panel-prometric').classList.contains('active'));
  await page.goForward();await page.waitForURL('**/trainees');await page.waitForFunction(()=>document.getElementById('panel-trainees').classList.contains('active'));
  assert.equal(await cell.textContent(),'UNSAVED-HISTORY-DRAFT','The history stack stays usable after recovering from a failed save');
});

test('mobile sheets start with compact tools and retain an explicit expansion choice',{timeout:30000},async t=>{
  const page=await openWorkspace(t,{viewport:{width:390,height:844}});
  const toggle=page.locator('#sheet-ribbon-toggle');
  assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  assert.equal(await page.locator('#sheet-ribbon-panel-all').isVisible(),false);
  assert.ok((await page.locator('#sheet-grid').boundingBox()).y<700,'The grid is visible in the first mobile screen');
  await toggle.click();
  await page.reload();
  await page.waitForFunction(()=>!document.getElementById('app').hidden&&!document.getElementById('app').classList.contains('workspace-restoring'));
  assert.equal(await toggle.getAttribute('aria-expanded'),'true');
  await navigate(page,'codes');
  for(const button of await page.locator('.code-row .col-actions button').all()){
    const bounds=await button.boundingBox();assert.ok(bounds.width>=44&&bounds.height>=44,'Voucher actions support touch');
  }
});

test('the mobile drawer contains keyboard focus and releases it on close, compact mode and resize',{timeout:30000},async t=>{
  const page=await openWorkspace(t,{viewport:{width:390,height:844}});
  await page.locator('#sidebar-toggle').click();
  await page.locator('#lang-btn').focus();await page.keyboard.press('Tab');
  assert.equal(await page.locator(':focus').getAttribute('id'),'sidebar-compact');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.locator(':focus').getAttribute('id'),'lang-btn');
  assert.equal(await page.locator('#workspace-main').evaluate(el=>el.inert),true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator(':focus').getAttribute('id'),'sidebar-toggle');
  assert.equal(await page.locator('#workspace-main').evaluate(el=>el.inert),false);
  await page.locator('#sidebar-toggle').click();await page.locator('#sidebar-compact').click();
  assert.equal(await page.locator('#workspace-main').evaluate(el=>el.inert),false);
  await page.locator('#sidebar-compact').click();await page.setViewportSize({width:1440,height:1000});
  assert.equal(await page.locator('#workspace-main').evaluate(el=>el.inert),false);
});

test('numeric prompts expose a localized label and announce validation without losing the value',{timeout:30000},async t=>{
  const page=await openWorkspace(t);
  await page.evaluate(()=>{window.__IBTA_TEST_AUTOMATION__=false;});
  for(const [label,error] of [['ارتفاع الصف','الحد الأدنى هو 20'],['Row Height','Minimum value is 20']]){
    await page.locator('th[data-rowv="0"] button').click({button:'right'});
    const action=page.locator('#sheet-context-menu [data-action="row-height"]');
    assert.equal(await action.locator('.sheet-menu-label').textContent(),label+'…');
    await action.click();
    const input=page.getByRole('spinbutton',{name:label,exact:true});
    await input.fill('10');await page.locator('#app-modal-confirm').click();
    assert.equal(await input.inputValue(),'10');assert.equal(await input.getAttribute('aria-invalid'),'true');
    assert.equal(await page.locator('#app-modal-error').textContent(),error);
    assert.equal(await page.locator('#app-modal-error').getAttribute('aria-live'),'polite');
    assert.match(await input.getAttribute('aria-describedby'),/app-modal-error/);
    await input.fill('48');assert.equal(await input.getAttribute('aria-invalid'),null);
    await page.locator('#app-modal-cancel').click();
    if(label==='ارتفاع الصف')await page.locator('#lang-btn').click();
  }
});

test('touch controls and report actions remain usable without changing saved sheet density',{timeout:30000},async t=>{
  const page=await openWorkspace(t,{viewport:{width:390,height:844},hasTouch:true});
  await page.locator('#sheet-ribbon-toggle').click();
  await page.locator('#sheet-row-size').selectOption('15');
  assert.equal(await page.evaluate(()=>localStorage.getItem('ibta_trainee_row_size')),'15');
  for(const selector of ['#sheet-ribbon-toggle','#sheet-font-minus','th[data-rowv="0"] button','td[data-v="0"][data-col="11"] select']){
    const bounds=await page.locator(selector).boundingBox();assert.ok(bounds.height>=44&&bounds.width>=44,selector+' supports touch: '+JSON.stringify(bounds));
  }
  for(const language of ['ar','en']){
    const bounds=await page.locator('#sheet-prometric-open').boundingBox();
    assert.ok(bounds.x>=0&&bounds.x+bounds.width<=390,'Registration is visible without horizontal scrolling in '+language);
    if(language==='ar'){
      await page.locator('#sidebar-toggle').click();await page.locator('#lang-btn').click();await page.locator('#sidebar-toggle').click();
    }
  }
  await page.locator('#sheet-zoom-reset').fill('50');await page.locator('#sheet-zoom-reset').press('Enter');
  const rowTarget=await page.locator('th[data-rowv="0"] button').boundingBox();
  assert.ok(rowTarget.height>=44&&rowTarget.width>=44,'Zoom does not shrink the touch target');
  await page.locator('#sheet-address').fill('A900');await page.locator('#sheet-address').press('Enter');
  assert.equal(await page.locator('td[data-v="899"][data-col="0"]').isVisible(),true,'Virtual scrolling reaches distant touch rows');
  assert.equal(await page.evaluate(()=>localStorage.getItem('ibta_trainee_row_size')),'15');
});
