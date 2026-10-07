const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
(async()=>{
  const root=path.resolve(__dirname,'..'),port=4210,previewPort=4211;
  const nextBin=require.resolve('next/dist/bin/next'),servers=[];let browser;
  const launch=(args,env={})=>{const process=spawn(require('node:process').execPath,args,{cwd:root,env:{...require('node:process').env,...env},stdio:['ignore','pipe','inherit']});servers.push(process);return process;};
  try{
    const next=launch([nextBin,'start','-p',String(port)]);
    await new Promise((resolve,reject)=>{next.stdout.on('data',data=>{if(data.toString().includes('Ready'))resolve();});next.once('error',reject);next.once('exit',code=>reject(Error('Next exited '+code)));});
    const preview=launch(['tools/design-preview.cjs'],{IBTA_PREVIEW_PORT:String(previewPort)});await new Promise(resolve=>preview.stdout.once('data',resolve));
    browser=await chromium.launch({headless:true,channel:'msedge'});const page=await browser.newPage({viewport:{width:1366,height:900}}),reference=await browser.newPage({viewport:{width:1366,height:900}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error'&&/Minified React error|hydration|ReactDOM|flushSync/.test(message.text()))errors.push(message.text());});
    assert.equal(fs.existsSync(path.join(root,'public/workspace/index.html')),false,'Production builds use Next pages without an HTML intermediate');
    const classic=await page.request.get('http://localhost:'+port+'/classic',{maxRedirects:0});
    assert.equal(classic.status(),308);assert.equal(classic.headers().location,'/trainees');
    assert.equal((await page.request.get('http://localhost:'+port+'/workspace/index.html')).status(),404);


    await page.addInitScript(()=>{window.uiUseNativeClipboard=true;});
    await page.route('https://cdn.jsdelivr.net/**',route=>route.fulfill({contentType:'text/javascript',body:'('+require('./workspace-sdk-fixture.cjs').toString()+')();'}));
    await page.goto('http://localhost:'+port);await reference.goto('http://127.0.0.1:'+previewPort);
    for(const target of [page,reference]){try{await target.waitForFunction(()=>!document.getElementById('app').hidden&&!document.getElementById('app').inert&&!document.getElementById('app').classList.contains('workspace-restoring'));}catch(error){console.error({url:target.url(),errors,authMessage:await target.locator('#auth-message').textContent()});throw error;}await target.waitForFunction(()=>document.getElementById('sheet-status').textContent==='تم الحفظ'&&document.getElementById('sheet-ribbon-panel-all'));await target.evaluate(()=>document.fonts.ready);}
    await page.waitForURL('**/trainees');
    assert.equal(await page.locator('iframe').count(),0,'Original UI runs directly in the TypeScript/React page, preserving extension access');
    assert.equal(await page.locator('nav.tabs [data-tab]').count(),6);assert.equal(await page.locator('aside').count(),await reference.locator('aside').count(),'Sidebar and sheet allocation panels match the original runtime');
    const geometry=target=>target.evaluate(()=>['nav.tabs','#sheet-workspace','#sheet-grid','#sheet-search'].map(selector=>{const el=document.querySelector(selector),rect=el.getBoundingClientRect();return {selector,x:Math.round(rect.x),y:Math.round(rect.y),width:Math.round(rect.width),font:getComputedStyle(el).fontFamily};}));
    const pageGeometry=await geometry(page),referenceGeometry=await geometry(reference);assert.deepEqual(pageGeometry,referenceGeometry,'Layout geometry and fonts match the original UI');
    await page.evaluate(()=>{const row=Array(13).fill('');row[0]='EXISTING-VOUCHER';row[1]='existing@example.invalid';row[2]='متدرب تجريبي';row[3]='EXISTING TRAINEE';row[7]='CBP-L';uiTestDatabase.sheets['ui-admin']={cells:[row],version:0,sheet_id:'00000000-0000-0000-0000-000000000001',sheet_name:'Sheet 1',sheet_hidden:false,sheet_order:0};});
    await page.locator('#sheet-reload').click();await page.waitForFunction(()=>document.getElementById('sheet-status').textContent==='تم الحفظ');
    assert.equal(await page.locator('td[data-v="0"][data-col="0"]').textContent(),'EXISTING-VOUCHER');
    await page.context().grantPermissions(['clipboard-read','clipboard-write']);
    await page.locator('td[data-v="0"][data-col="0"]').click();await page.keyboard.press('Control+c');
    await page.waitForFunction(()=>document.getElementById('sheet-status').textContent==='تم النسخ إلى الحافظة');
    assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'EXISTING-VOUCHER','Cell value is on the system clipboard');
    assert.equal(await page.locator('#sheet-cell-content').inputValue(),'EXISTING-VOUCHER');await page.locator('.sheet-search-group').screenshot({path:path.join(root,'artifacts/selected-cell-toolbar.png')});
    await page.evaluate(()=>{const input=document.createElement('textarea');input.id='external-paste-target';input.style.cssText='position:fixed;top:0;left:0;z-index:1000';document.body.append(input);});
    await page.locator('#external-paste-target').focus();await page.keyboard.press('Control+v');assert.equal(await page.locator('#external-paste-target').inputValue(),'EXISTING-VOUCHER','Pastes outside the sheet into an ordinary text field');
    await page.locator('td[data-v="0"][data-col="0"]').click();await page.locator('td[data-v="0"][data-col="1"]').click({modifiers:['Shift']});await page.keyboard.press('Control+c');
    await page.waitForFunction(async()=>await navigator.clipboard.readText()==='EXISTING-VOUCHER\texisting@example.invalid');
    await page.locator('#external-paste-target').fill('');await page.keyboard.press('Control+v');assert.equal(await page.locator('#external-paste-target').inputValue(),'EXISTING-VOUCHER\texisting@example.invalid','Range copies as Excel-compatible tab separated text');
    await page.evaluate(()=>document.getElementById('external-paste-target').remove());
    for(const column of [1,2,3]){await page.locator('td[data-v="0"][data-col="'+column+'"]').dblclick();await page.locator('#sheet-trainee-dialog').waitFor({state:'visible'});assert.match(await page.locator('#sheet-trainee-record').textContent(),/EXISTING TRAINEE/);await page.locator('#sheet-trainee-dialog .sheet-detail-close').click();}
    await page.evaluate(()=>uiTestDatabase.sheets['ui-admin'].cells[0][3]='');await page.locator('#sheet-reload').click();await page.waitForFunction(()=>document.getElementById('sheet-status').textContent==='تم الحفظ');await page.locator('td[data-v="0"][data-col="2"]').dblclick();await page.locator('#sheet-trainee-dialog').waitFor({state:'visible'});assert.match(await page.locator('#sheet-trainee-title').textContent(),/متدرب تجريبي$/,'Arabic-only trainees can open their details');await page.keyboard.press('Escape');
    await page.locator('#sheet-columns-title').click();const widthInput=page.locator('[data-column-width="2"]');await widthInput.fill('280');await widthInput.press('Enter');assert.ok(Math.abs((await page.locator('td[data-v="0"][data-col="2"]').boundingBox()).width-280)<1);await page.screenshot({path:path.join(root,'artifacts/next-column-widths.png')});await page.locator('#sheet-columns-close').click();
    await page.locator('#sheet-xlsx-import').click();assert.equal(await page.locator('#sheet-xlsx-mode option').count(),3);await page.keyboard.press('Escape');
    assert.equal(await page.locator('#prometric-registration-script').getAttribute('data-extension')?.then(value=>value.startsWith('/workspace/trainflow-prometric.zip')),true);
    await page.screenshot({path:path.join(root,'artifacts/next-classic-trainees.png')});
    const scriptCount=await page.locator('body > script[src*="/workspace/"]').count();
    const navigationRequests=[];
    const recordNavigationRequest=request=>{if(request.resourceType()==='document'||request.resourceType()==='script'&&request.url().includes('/workspace/'))navigationRequests.push(request.url());};
    page.on('request',recordNavigationRequest);
    await page.evaluate(()=>{window.originalSheetNode=document.getElementById('panel-trainees');});
    for(const [panel,route] of [['prometric','prometric'],['codes','vouchers'],['inventory','inventory'],['keycodes','keycodes']]){
      await page.locator('nav.tabs [data-tab="'+panel+'"]').click();await page.waitForURL('**/'+route);await page.waitForFunction(()=>!document.getElementById('app').hidden&&!document.getElementById('app').classList.contains('workspace-restoring'));
      assert.equal(await page.locator('#panel-'+panel).evaluate(el=>el.classList.contains('active')),true);
    }
    await page.goBack();await page.waitForURL('**/inventory');await page.waitForFunction(()=>document.getElementById('panel-inventory').classList.contains('active'));
    await page.goForward();await page.waitForURL('**/keycodes');await page.waitForFunction(()=>document.getElementById('panel-keycodes').classList.contains('active'));
    await page.locator('#account-menu-btn').click();await page.locator('#settings-btn').click();await page.waitForURL('**/settings');await page.waitForFunction(()=>!document.getElementById('app').hidden&&!document.getElementById('app').classList.contains('workspace-restoring'));
    await page.locator('#settings-tab-reports').click();await page.waitForURL('**/settings?tab=reports');
    await page.goBack();await page.waitForURL('**/settings');await page.waitForFunction(()=>!document.getElementById('app').hidden&&!document.getElementById('app').classList.contains('workspace-restoring'));await page.waitForFunction(()=>document.getElementById('settings-pane-profile').hidden===false);
    await page.goForward();await page.waitForURL('**/settings?tab=reports');await page.waitForFunction(()=>document.getElementById('settings-pane-reports').hidden===false);
    assert.equal(await page.evaluate(()=>window.originalSheetNode===document.getElementById('panel-trainees')),true,'Panel navigation retains the mounted workspace and sheet');
    assert.deepEqual(navigationRequests,[],'Panel and history navigation must not reload documents or workspace scripts');
    page.off('request',recordNavigationRequest);
    assert.equal(await page.evaluate(()=>uiTestDatabase.sheets['ui-admin'].cells[0][0]),'EXISTING-VOUCHER','Page navigation retains saved trainee records at the data boundary');
    await page.reload();await page.locator('#app').waitFor({state:'visible'});assert.equal(await page.locator('#settings-pane-reports').isVisible(),true,'Settings URL restores its selected section on refresh');
    await page.goto('http://localhost:'+port+'/inventory');await page.locator('#app').waitFor({state:'visible'});assert.equal(await page.locator('#panel-inventory').evaluate(el=>el.classList.contains('active')),true,'Explicit URL overrides a conflicting saved page');
    await page.locator('#trainees-tab').click();await page.waitForURL('**/trainees');await page.waitForFunction(()=>document.getElementById('sheet-status').textContent==='تم الحفظ');
    await page.evaluate(()=>{window.originalSheetNode=document.getElementById('panel-trainees');});
    await page.locator('nav.tabs [data-tab="prometric"]').click();await page.waitForURL('**/prometric');await page.goBack();await page.waitForURL('**/trainees');await page.waitForFunction(()=>document.getElementById('panel-trainees').classList.contains('active'));
    assert.equal(await page.locator('td[data-v="0"][data-col="0"]').textContent(),'EXISTING-VOUCHER','Returning to trainees preserves the saved record');
    assert.equal(await page.locator('body > script[src*="/workspace/"]').count(),scriptCount,'Navigation does not boot the original scripts twice');
    const openWidth=await page.locator('#sheet-workspace').evaluate(el=>el.getBoundingClientRect().width);
    const rightEdge=()=>page.locator('#workspace-sidebar').evaluate(el=>Math.round(window.innerWidth-el.getBoundingClientRect().right));
    assert.equal(await rightEdge(),16,'Arabic sidebar stays on the right');
    const checkAccountMenu=async name=>{await page.locator('#account-menu-btn').click();const popup=page.locator('#account-menu-popover');await popup.waitFor({state:'visible'});assert.equal(await popup.evaluate(el=>el.closest('#workspace-sidebar')===null),true,'Account menu escapes the scrolling sidebar');assert.equal(await popup.evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;}),true,'The entire account menu stays inside the viewport');assert.equal(await popup.evaluate(el=>{const r=el.getBoundingClientRect();return [[r.left+12,r.top+12],[r.right-12,r.top+12],[r.left+12,r.bottom-12],[r.right-12,r.bottom-12]].every(([x,y])=>el.contains(document.elementFromPoint(x,y)));}),true,'All popup corners are painted and receive pointer events');await page.screenshot({path:path.join(root,'artifacts/account-menu-'+name+'.png')});await page.keyboard.press('Escape');assert.equal(await popup.isVisible(),false);assert.equal(await page.locator('#workspace-sidebar').isVisible(),true,'Escape closes the account menu while retaining the sidebar');assert.equal(await page.locator('#account-menu-btn').evaluate(el=>el===document.activeElement),true);};
    await page.evaluate(()=>document.getElementById('account-menu-email').textContent='test-account@example.invalid');await checkAccountMenu('desktop-ar');
    await page.locator('#account-menu-btn').click();await page.mouse.click(5,5);assert.equal(await page.locator('#account-menu-popover').isVisible(),false,'Outside click closes the portalled menu');

    await page.locator('#sidebar-compact').click();assert.equal(await page.locator('#workspace-sidebar').isVisible(),true);
    assert.equal(await page.locator('#workspace-sidebar').evaluate(el=>Math.round(el.getBoundingClientRect().width)),60);await checkAccountMenu('compact-ar');
    assert.equal(await page.locator('#trainees-tab span').isVisible(),false);assert.equal(await page.locator('#trainees-tab svg').isVisible(),true);assert.equal(await page.locator('#trainees-tab').getAttribute('aria-label'),'المتدربون');
    const compactWidth=await page.locator('#sheet-workspace').evaluate(el=>el.getBoundingClientRect().width);assert.ok(compactWidth>openWidth,'Icons-only mode leaves more room for the sheet');
    await page.screenshot({path:path.join(root,'artifacts/sidebar-icons-only.png')});
    await page.locator('nav.tabs [data-tab="prometric"]').click();await page.waitForURL('**/prometric');await page.goBack();await page.waitForURL('**/trainees');await page.waitForFunction(()=>document.getElementById('panel-trainees').classList.contains('active'));
    await page.reload();await page.locator('#app').waitFor({state:'visible'});assert.equal(await page.locator('#html-root').getAttribute('data-sidebar-size'),'compact','Compact preference survives refresh');
    await page.locator('#lang-btn').click();assert.equal(await rightEdge(),16,'English sidebar also stays on the right');assert.equal(await page.locator('#trainees-tab').getAttribute('aria-label'),'Trainees');assert.equal(await page.locator('#sidebar-compact').getAttribute('aria-label'),'Expand sidebar');await checkAccountMenu('compact-en');
    await page.locator('#lang-btn').click();await page.locator('#sidebar-compact').click();assert.equal(await page.locator('#trainees-tab span').isVisible(),true);assert.equal(await page.locator('#workspace-sidebar').evaluate(el=>Math.round(el.getBoundingClientRect().width)),224);
    await page.locator('#account-menu-btn').click();await page.locator('#sidebar-toggle').click();assert.equal(await page.locator('#account-menu-popover').isVisible(),false,'Closing the sidebar dismisses its portalled menu');assert.equal(await page.locator('#workspace-sidebar').isVisible(),false);assert.equal(await page.locator('#sidebar-toggle').getAttribute('aria-expanded'),'false');
    const closedWidth=await page.locator('#sheet-workspace').evaluate(el=>el.getBoundingClientRect().width);assert.ok(closedWidth>openWidth,'Closing the sidebar gives the sheet more space');
    await page.reload();await page.locator('#app').waitFor({state:'visible'});assert.equal(await page.locator('#workspace-sidebar').isVisible(),false,'Closed preference survives refresh');
    assert.equal(await page.locator('#sidebar-toggle').isVisible(),true,'The reopen control remains visible after refresh');assert.equal(await page.locator('#sidebar-toggle').evaluate(el=>el.closest('#workspace-sidebar')===null),true,'Reopen control is outside the hidden inert sidebar');
    await page.goto('http://localhost:'+port+'/settings');await page.locator('#app').waitFor({state:'visible'});assert.equal(await page.locator('#panel-settings').isVisible(),true);assert.equal(await page.locator('#workspace-sidebar').isVisible(),false);assert.equal(await page.locator('#sidebar-toggle').isVisible(),true,'Direct settings URL with a saved closed sidebar can reopen navigation');
    await page.screenshot({path:path.join(root,'artifacts/settings-sidebar-reopen.png')});await page.locator('#sidebar-toggle').focus();await page.keyboard.press('Enter');await page.locator('#workspace-sidebar').waitFor({state:'visible'});assert.equal(await page.locator('#sidebar-toggle').evaluate(el=>el.closest('#workspace-sidebar')!==null),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#sidebar-toggle').isVisible(),true);assert.equal(await page.locator('#sidebar-toggle').evaluate(el=>el===document.activeElement),true);

    await page.locator('#sidebar-toggle').click();await page.locator('#workspace-sidebar').waitFor({state:'visible'});
    await page.setViewportSize({width:390,height:844});await page.locator('#sidebar-toggle').click();await page.locator('#sidebar-toggle').click();assert.equal(await page.locator('#sidebar-backdrop').isVisible(),true);assert.equal(await page.locator('#workspace-sidebar').isVisible(),true);await checkAccountMenu('mobile-ar');
    await page.locator('nav.tabs [data-tab="inventory"]').click();await page.waitForURL('**/inventory');assert.equal(await page.locator('#workspace-sidebar').isVisible(),false,'Choosing a page dismisses the mobile sidebar');assert.equal(await page.locator('#sidebar-backdrop').isVisible(),false);
    await page.locator('#sidebar-toggle').click();await page.locator('#trainees-tab').click();await page.waitForURL('**/trainees');await page.setViewportSize({width:1366,height:900});await page.locator('#sidebar-toggle').click();
    await page.setViewportSize({width:390,height:844});await page.locator('#sidebar-compact').click();assert.equal(await page.locator('#sidebar-backdrop').isVisible(),false);assert.equal(await rightEdge(),12);await checkAccountMenu('mobile-compact-ar');await page.locator('#account-menu-btn').click();await page.setViewportSize({width:360,height:600});await page.waitForFunction(()=>{const r=document.getElementById('account-menu-popover').getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;},{},{timeout:3000});assert.equal(await page.locator('#account-menu-popover').isVisible(),true,'An open menu follows viewport changes');await page.keyboard.press('Escape');await page.setViewportSize({width:390,height:844});
    await page.locator('nav.tabs [data-tab="inventory"]').click();await page.waitForURL('**/inventory');assert.equal(await page.locator('#workspace-sidebar').isVisible(),true,'Mobile icon rail remains available after navigation');
    await page.locator('#trainees-tab').click();await page.waitForURL('**/trainees');await page.locator('#sidebar-compact').click();await page.locator('#sidebar-toggle').click();await page.setViewportSize({width:1366,height:900});await page.locator('#sidebar-toggle').click();
    await page.locator('#lang-btn').click();assert.equal(await page.locator('#html-root').getAttribute('lang'),'en');
    await page.reload();await page.locator('#app').waitFor({state:'visible'});await page.waitForFunction(()=>document.getElementById('sheet-status')?.textContent==='Saved');assert.equal(await page.locator('#html-root').getAttribute('lang'),'en','Refresh preserves the same language and selected sheet panel');
    await page.evaluate(()=>{uiTestDatabase.settings.payload.codeCategories.push('Navigation-50');uiTestDatabase.codes.push({code:'HISTORY-CATEGORY-VOUCHER',category:'Navigation-50',notes:'',used_on:null,used_by:null,version:1});});
    await page.locator('nav.tabs [data-tab="codes"]').click();await page.waitForURL('**/vouchers');await page.locator('#code-cat-tabs button').filter({hasText:'Navigation'}).waitFor();
    await page.locator('#code-cat-tabs button').filter({hasText:'Navigation'}).click();await page.waitForURL('**/vouchers?category=Navigation-50');
    assert.equal(await page.locator('#code-grid [data-code="HISTORY-CATEGORY-VOUCHER"]').count(),1);
    await page.goBack();await page.waitForURL('**/vouchers');await page.waitForFunction(()=>document.getElementById('code-grid').dataset.category==='Foundation-100');
    assert.equal(await page.locator('#code-grid [data-code="UI-VOUCHER"]').count(),1,'Back restores the previous voucher category even when its URL has no query');
    await page.goForward();await page.waitForURL('**/vouchers?category=Navigation-50');await page.waitForFunction(()=>document.getElementById('code-grid').dataset.category==='Navigation-50');
    assert.equal(await page.locator('#code-grid [data-code="HISTORY-CATEGORY-VOUCHER"]').count(),1,'Forward restores the selected category');
    const health=await page.request.get('http://localhost:'+port+'/api/health');assert.equal((await health.json()).runtime,'nextjs');const privateResponse=await page.request.get('http://localhost:'+port+'/api/data/ibta_codes');assert.equal(privateResponse.status(),401,'Next API keeps unauthenticated requests out of the existing database');
    const downloads=['trainflow-prometric.zip','exceljs-4.4.0.min.js','trainees-xlsx-worker.js','google-reports.gs','codes-export.js'];for(const file of downloads)assert.equal((await page.request.get('http://localhost:'+port+'/workspace/'+file)).status(),200,'Published original asset: '+file);
    for(const file of ['trainflow-whatsapp-web.zip','inventory-delivery.js'])assert.equal((await page.request.get('http://localhost:'+port+'/workspace/'+file)).status(),404,'Retired asset is unavailable: '+file);
    assert.deepEqual(errors,[]);console.log('PASS: production Next.js with TSX pages, page/settings URLs, Back/Forward, direct links, refresh, saved sheet, language, assets and API protection');
  }finally{await browser?.close();for(const server of servers)server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
