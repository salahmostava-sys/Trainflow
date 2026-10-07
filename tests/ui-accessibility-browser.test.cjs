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

test.skip('keyboard exam ordering persists and cannot move past either boundary (kc-exam-order buttons removed per user request)',{timeout:30000},async t=>{
  const page=await openWorkspace(t);await navigate(page,'keycodes');
  const rows=page.locator('.kc-row');
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
    await page.locator('#sheet-cell-format-menu').click();
    await page.locator('#sheet-cell-format-menu-row-height').click();
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
