const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process'),{chromium}=require('playwright');
(async()=>{
  const root=path.resolve(__dirname,'..'),artifacts=path.join(root,'artifacts'),extension=path.join(root,'extension/prometric');
  const server=spawn(process.execPath,[path.join(root,'tools/design-preview.cjs')],{env:{...process.env,IBTA_PREVIEW_PORT:'4193'},stdio:['ignore','pipe','inherit']});let ctx;
  try{
    await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
    const template=await(await fetch('http://127.0.0.1:4193/')).text(),makeRow=(name,email,id,user='')=>{const r=Array(52).fill('');r[1]=email;r[3]=name;r[4]=id;r[7]='CBP-L';r[9]=user;return r;};
    let fixtureRows=[makeRow('ALPHA STUDENT','alpha@example.invalid','0001'),makeRow('EXISTING STUDENT','existing@example.invalid','0002','KEEP-USER'),makeRow('BETA STUDENT','beta@example.invalid','0003')],fixtureVersion=0;
    const profile=fs.mkdtempSync(path.join(artifacts,'prometric-flow-'));
    ctx=await chromium.launchPersistentContext(profile,{channel:'msedge',headless:true,viewport:{width:1500,height:1000},args:['--disable-extensions-except='+extension,'--load-extension='+extension,'--host-resolver-rules=MAP ibta-ops.pages.dev 127.0.0.1, MAP tcnet1.prometric.com 127.0.0.1']});
    const created=[],profiles=[],submitted=[];
    await ctx.exposeBinding('fixtureCreated',(source,data)=>{created.push(data);});await ctx.exposeBinding('fixtureProfile',(source,data)=>{profiles.push(data);});await ctx.exposeBinding('fixtureSubmitted',(source,data)=>{submitted.push(data);});
    function registrationFixture(url){
      let body='';const step=url.searchParams.get('step')||'1';
      if(url.pathname.includes('InvalidHostHeader'))body='<h1>Local registration fixture</h1>';
      else if(url.pathname.includes('Login.aspx'))body='<a href="/Registration.aspx?step=1">Register new user</a>';
      else if(step==='1')body='<h1>Test Provider or Program</h1><select id="provider"><option>Select</option><option value="ibta">IBTA MEA</option></select><button onclick="location.href=\'/Registration.aspx?step=2\'">Continue</button>';
      else if(step==='2')body=`<h1>Sign in information</h1><input id="Username" placeholder="Username"><p id="taken"></p><input type="password" id="Password"><input type="password" id="ConfirmPassword"><input id="Answer"><button id="Continue">Continue</button><script>
        document.getElementById('Username').addEventListener('input',()=>document.getElementById('taken').textContent=document.getElementById('Username').value==='BETASTUDENT'?'username already found':'');
        document.getElementById('Continue').onclick=()=>{sessionStorage.setItem('fixtureCreds',JSON.stringify({username:document.getElementById('Username').value,password:document.getElementById('Password').value}));location.href='/Registration.aspx?step=3';};</script>`;
      else if(step==='3')body=`<h1>Profile information</h1><input id="FirstName" placeholder="First Name"><input id="LastName" placeholder="Last Name"><input id="Address1" placeholder="Mailing Address"><input id="City" placeholder="City"><input id="State" placeholder="State/Province"><input id="Postal" placeholder="Postal Code"><input id="Email" type="email" placeholder="Email Address"><select id="Country"><option value="">Select</option><option value="SA">Saudi Arabia</option></select><button id="Continue">Continue</button><script>document.getElementById('Continue').onclick=async()=>{const p=Object.fromEntries([...document.querySelectorAll('input,select')].map(el=>[el.id,el.value]));await fixtureProfile(p);sessionStorage.setItem('fixtureProfile',JSON.stringify(p));location.href='/Registration.aspx?step=4';};</script>`;
      else if(step==='4')body=`<h1>PERSONAL DATA PRIVACY</h1><label><input id="Agree" type="checkbox">I AGREE</label><label><input name="consent" type="radio">I Consent</label><button id="Continue">Continue</button><script>let once=false;document.getElementById('Continue').onclick=async()=>{if(once)return;once=true;const data=JSON.parse(sessionStorage.getItem('fixtureCreds'));await fixtureSubmitted(data);location.href='/Registration.aspx?step=dashboard';};</script>`;
      else if(step==='dashboard')body=`<h1>Welcome</h1><p>Update Information</p><a href="/Login.aspx" id="signout">Sign Out</a><script>fixtureCreated({...JSON.parse(sessionStorage.getItem('fixtureCreds')),email:JSON.parse(sessionStorage.getItem('fixtureProfile')).Email});</script>`;
      return '<!doctype html><html><head><meta charset="utf-8"></head><body>'+body+'</body></html>';
    }
    await ctx.route(/^https?:\/\//,async route=>{
      const url=new URL(route.request().url());
      if(url.origin==='https://ibta-ops.pages.dev'){
        if(url.pathname==='/')return route.fulfill({contentType:'text/html; charset=utf-8',body:template.replace('const previewSheets=new Map();','const previewSheets=new Map([["demo-admin",'+JSON.stringify({cells:fixtureRows,version:fixtureVersion,format:{direction:'ltr'}})+']]);')});
        const file=url.pathname.slice(1);if(/^[a-z][a-z0-9-]*\.(js|css)$/.test(file)&&fs.existsSync(path.join(root,file)))return route.fulfill({contentType:file.endsWith('.css')?'text/css':'text/javascript',body:fs.readFileSync(path.join(root,file),'utf8')});
        return route.fulfill({status:404,body:''});
      }
      if(url.origin==='https://tcnet1.prometric.com')return route.fulfill({contentType:'text/html; charset=utf-8',body:registrationFixture(url)});
      return route.abort();
    });
    const worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker');await worker.evaluate(()=>chrome.storage.local.set({pageDelay:0.01,userDelay:1,autoSubmit:true,desktopNotifications:false,backgroundMode:false,passPattern:'{F}#{f}Demo1970'}));
    let page=await ctx.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
    await page.addInitScript(()=>window.previewSaveError='NETWORK');await page.goto('https://ibta-ops.pages.dev/');await page.locator('#trainees-tab').click();await page.waitForFunction(()=>document.getElementById('sheet-status').textContent==='تم الحفظ');
    await page.locator('td[data-v="0"][data-col="3"]').click();await page.locator('td[data-v="2"][data-col="3"]').click({modifiers:['Shift']});await page.locator('#sheet-prometric-open').click();
    await page.waitForFunction(()=>document.getElementById('sheet-prometric-connection').textContent.includes('الإضافة متصلة'),null,{timeout:15000});assert.match(await page.locator('#sheet-prometric-summary').textContent(),/2.*1/);assert.match(await page.locator('#sheet-prometric-dialog').textContent(),/يوجد يوزر أو باسورد بالفعل/);
    await page.screenshot({path:path.join(artifacts,'prometric-registration-preview.png')});
    const opened=ctx.waitForEvent('page');await page.locator('#sheet-prometric-start').click();const registration=await opened;await registration.waitForLoadState('domcontentloaded').catch(()=>{});await registration.goto('https://tcnet1.prometric.com/InvalidHostHeader.aspx');
    await page.waitForFunction(()=>document.getElementById('sheet-prometric-start').disabled);
    // Move the selected records while registration is running. Results must follow identity.
    fixtureRows=[makeRow('OTHER STUDENT','other@example.invalid','0000'),...fixtureRows];fixtureVersion++;
    await page.locator('#sheet-prometric-dialog .sheet-file-header button').click();await page.evaluate(({cells,version})=>previewSheets.set('demo-admin',{cells,version,format:{direction:'ltr'}}),{cells:fixtureRows,version:fixtureVersion});await page.locator('#sheet-reload').click();
    await page.waitForFunction(()=>document.getElementById('sheet-status').textContent==='تم الحفظ');
    await page.waitForFunction(()=>document.querySelector('td[data-v="1"][data-col="9"]').textContent==='ALPHASTUDENT',null,{timeout:60000}).catch(async error=>{console.log(JSON.stringify({errors,app:await page.locator('#sheet-status').textContent(),regURL:registration.url(),regText:(await registration.locator('body').innerText()).slice(-1200),worker:await worker.evaluate(()=>chrome.storage.local.get(['queueIndex','currentProcessingId','ibtaRun']))},null,2));throw error;});
    assert.equal(await page.locator('td[data-v="2"][data-col="9"]').textContent(),'KEEP-USER','Existing credentials remain unchanged');assert.equal(await page.evaluate(()=>previewSheets.get('demo-admin').cells[1][9]),'','Failed save has not been acknowledged');
    await worker.evaluate(()=>new Promise((resolve,reject)=>{const finish=run=>{if(run?.items.filter(i=>i.status==='done').length!==2)return;clearTimeout(timer);chrome.storage.onChanged.removeListener(changed);resolve();};const changed=changes=>finish(changes.ibtaRun?.newValue);const timer=setTimeout(()=>{chrome.storage.onChanged.removeListener(changed);reject(Error('Fixture registrations did not finish'));},45000);chrome.storage.onChanged.addListener(changed);chrome.storage.local.get('ibtaRun').then(data=>finish(data.ibtaRun));}));
    const unsaved=await worker.evaluate(()=>chrome.storage.local.get('ibtaRun'));assert.equal(unsaved.ibtaRun.items.filter(i=>i.status==='done').length,2);assert.ok(unsaved.ibtaRun.items.every(i=>i.password),'Confirmed results remain recoverable until saved');
    assert.equal(created.length,2,'Only the two ready fixture registrations ran');assert.equal(submitted.length,2);assert.equal(profiles.length,2);assert.deepEqual(profiles.map(p=>p.Email),['alpha@example.invalid','beta@example.invalid']);assert.ok(profiles.every(p=>p.Country==='SA'));
    // Reload discards the failed in-memory draft, then reconnects to the persisted results.
    await page.reload();await page.locator('#trainees-tab').click();await page.waitForFunction(()=>document.querySelector('td[data-v="3"][data-col="9"]').textContent==='BETASTUDENT1',null,{timeout:15000});
    await page.close();page=await ctx.newPage();page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());await page.addInitScript(()=>window.previewSaveError='NETWORK');await page.goto('https://ibta-ops.pages.dev/');await page.locator('#trainees-tab').click();await page.locator('#sheet-prometric-open').click();await page.waitForFunction(()=>!document.getElementById('sheet-prometric-recover').hidden);await page.locator('#sheet-prometric-recover').click();await page.waitForFunction(()=>document.querySelector('td[data-v="3"][data-col="9"]').textContent==='BETASTUDENT1',null,{timeout:15000});await page.locator('#sheet-prometric-dialog .sheet-file-header button').click();
    await page.evaluate(()=>window.previewSaveError='');await page.locator('#sheet-save').click();await page.waitForFunction(()=>!Trainees.hasDraft());
    await page.locator('#sheet-prometric-open').click();await page.locator('#sheet-prometric-refresh').click();await page.waitForFunction(()=>document.getElementById('sheet-prometric-status').textContent.includes('حُفظ: 2'),null,{timeout:15000});
    const saved=await page.evaluate(()=>previewSheets.get('demo-admin').cells);assert.equal(saved[1][9],'ALPHASTUDENT');assert.equal(saved[3][9],'BETASTUDENT1');assert.equal(saved[1][10],'A#aDemo1970');assert.equal(saved[2][9],'KEEP-USER');
    const acknowledged=await worker.evaluate(()=>chrome.storage.local.get('ibtaRun'));assert.ok(acknowledged.ibtaRun.items.every(i=>i.status==='saved'&&!i.password),'Credentials are acknowledged only after a successful sheet save');
    await page.screenshot({path:path.join(artifacts,'prometric-registration-saved.png')});await page.locator('#sheet-prometric-dialog .sheet-file-header button').click();await page.locator('#sheet-owner').selectOption('demo-user');await page.waitForFunction(()=>document.getElementById('sheet-status').textContent==='تم الحفظ');assert.equal(await page.locator('td[data-v="0"][data-col="9"]').textContent(),'','Results never enter another user sheet');
    const popup=await ctx.newPage();await popup.goto('chrome-extension://'+new URL(worker.url()).host+'/popup.html');assert.equal(await popup.locator('#versionBadge').textContent(),'v4.1.0');assert.equal(await popup.locator('#ibtaOpen').isVisible(),true);
    assert.deepEqual(errors,[]);console.log('PASS: installed MV3 bridge, preview/skipping, actual fixture registration steps, final username suffix, moved-row matching, failed-save retention, reload/closed-tab recovery, durable acknowledgment and owner isolation; zero real accounts created');
  }finally{await ctx?.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
