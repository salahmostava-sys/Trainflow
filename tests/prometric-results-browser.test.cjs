const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process'),{chromium}=require('playwright');
(async()=>{
  const root=path.resolve(__dirname,'..'),artifacts=path.join(root,'artifacts'),extension=path.join(root,'extension/prometric');
  fs.mkdirSync(artifacts,{recursive:true});
  const server=spawn(process.execPath,[path.join(root,'tools/design-preview.cjs')],{env:{...process.env,IBTA_PREVIEW_PORT:'4198'},stdio:['ignore','pipe','inherit']});let context;
  try{
    await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
    const template=await(await fetch('http://127.0.0.1:4198/')).text();
    const makeRow=(name,code,user)=>{const row=Array(52).fill('');row[0]=code;row[1]=name.toLowerCase()+'@example.invalid';row[3]=name+' STUDENT';row[7]='CBP-L';row[9]=user;row[10]='Dummy-Pass';row[13]='KEEP CUSTOM';return row;};
    const rows=[makeRow('ALPHA','DUMMY-1','DUMMY-ALPHA'),makeRow('BETA','DUMMY-2','DUMMY-BETA'),makeRow('NO-CODE','','DUMMY-NO-CODE'),makeRow('UNSELECTED','DUMMY-4','DUMMY-OTHER')];
    context=await chromium.launchPersistentContext(fs.mkdtempSync(path.join(artifacts,'prometric-results-')),{channel:'msedge',headless:true,viewport:{width:1440,height:1000},args:['--disable-extensions-except='+extension,'--load-extension='+extension,'--host-resolver-rules=MAP trainf.vercel.app 127.0.0.1, MAP tcnet1.prometric.com 127.0.0.1']});
    const logins=[],errors=[];let account='DUMMY-OUTSIDER',signouts=0;
    await context.exposeBinding('fixtureLogin',(_,credentials)=>{logins.push(credentials);account=credentials.username;});
    await context.exposeBinding('fixtureLogout',()=>{account='';signouts++;});
    const profile=()=>'<a id="UserProfileHyperLink">'+account+'</a><a id="SignOutLinkButton" href="#" onclick="fixtureLogout().then(()=>location.href=\'/Login.aspx?ClientNameSingleSite=ibtamea\');return false">Sign Out</a>';
    function prometricFixture(url){
      let body='';
      if(url.pathname==='/Login.aspx')body=account?profile():'<input id="PageContent_UserNameTextbox_txtTextBox" placeholder="Username"><input id="PageContent_PasswordTextbox_txtTextBox" type="password"><button id="PageContent_SignInButton" onclick="fixtureLogin({username:document.getElementById(\'PageContent_UserNameTextbox_txtTextBox\').value,password:document.getElementById(\'PageContent_PasswordTextbox_txtTextBox\').value}).then(()=>location.href=\'/User/Welcome.aspx\')">Sign In</button>';
      else if(url.pathname==='/User/Welcome.aspx')body=profile();
      else if(url.pathname==='/Candidate/ManageReviewScores.aspx')body=profile()+'<table id="PageContent_ManageReviewScoresGridView_gridView"><tr><th>Test Title</th><th>Your Score</th></tr><tr><td title="TEST TITLE">Sales Arabic</td><td title="YOUR SCORE">Pass (99%)</td></tr><tr><td title="TEST TITLE">Leadership English</td><td title="DATE">October 7, 2026</td><td title="YOUR SCORE">'+(account==='DUMMY-ALPHA'?'Pass (88.2%)':'Fail (61%)')+'</td></tr></table>';
      else throw Error('Unexpected Prometric navigation: '+url.pathname);
      return '<!doctype html><html><body>'+body+'</body></html>';
    }
    await context.route(/^https?:\/\//,async route=>{
      const url=new URL(route.request().url());
      if(url.origin==='https://tcnet1.prometric.com')return route.fulfill({contentType:'text/html; charset=utf-8',body:prometricFixture(url)});
      if(url.origin==='https://trainf.vercel.app'){
        if(url.pathname==='/')return route.fulfill({contentType:'text/html; charset=utf-8',body:template.replace('const previewSheets=new Map(window.previewInitialSheets||[]);','const previewSheets=new Map([["demo-admin",'+JSON.stringify({cells:rows,version:0,format:{direction:'rtl',headers:{13:'Custom'}}})+']]);')});
        const filename=url.pathname.slice(1),previewAsset=require('../tools/preview-assets.cjs')[filename];
        if(previewAsset)return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(previewAsset,'utf8')});
        if(/^[a-z][a-z0-9-]*\.(js|css)$/.test(filename)&&fs.existsSync(path.join(root,filename)))return route.fulfill({contentType:filename.endsWith('.css')?'text/css':'text/javascript',body:fs.readFileSync(path.join(root,filename),'utf8')});
        return route.fulfill({status:404,body:''});
      }
      return route.abort();
    });
    const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>window.previewSaveError='NETWORK');await page.goto('https://trainf.vercel.app/');await page.locator('#trainees-tab').click();
    await page.waitForFunction(()=>document.getElementById('sheet-status').textContent==='تم الحفظ');
    await page.locator('td[data-v="0"][data-col="3"]').click();await page.locator('td[data-v="2"][data-col="3"]').click({modifiers:['Shift']});
    await page.locator('#sheet-exam-open').click();await page.waitForFunction(()=>!document.getElementById('sheet-exam-start').disabled);
    assert.match(await page.locator('#sheet-exam-summary').textContent(),/2.*1/);
    await page.locator('#sheet-exam-start').click();
    await page.waitForFunction(()=>document.getElementById('sheet-exam-results').textContent.includes('61%'),null,{timeout:30000});
    const pending=await worker.evaluate(()=>chrome.storage.local.get('ibtaExamRun'));
    assert.equal(pending.ibtaExamRun.items.filter(account=>account.status==='done').length,2,'Failed cloud saves retain the confirmed scores');
    assert.ok(pending.ibtaExamRun.items.every(account=>!account.password&&!account.username),'Finished accounts discard credentials');
    assert.deepEqual(logins,[{username:'DUMMY-ALPHA',password:'Dummy-Pass'},{username:'DUMMY-BETA',password:'Dummy-Pass'}],'Only selected coded accounts log in');
    assert.equal(signouts,2,'An existing unrelated session and the previous account are signed out');
    assert.equal(await page.evaluate(()=>previewSheets.get('demo-admin').cells[0][11]),'','Failed writes are not acknowledged');
    await page.locator('#sheet-exam-close').click();await page.evaluate(()=>window.previewSaveError='');await page.locator('#sheet-save').click();await page.waitForFunction(()=>!Trainees.hasDraft());
    await page.locator('#sheet-exam-open').click();await page.locator('#sheet-exam-refresh').click();
    await page.waitForFunction(()=>document.getElementById('sheet-exam-results').textContent.includes('تم الحفظ: راسب'),null,{timeout:15000});
    const saved=await page.evaluate(()=>previewSheets.get('demo-admin'));
    assert.deepEqual(saved.cells.slice(0,2).map(row=>[row[11],row[14]]),[['ناجح','88.2%'],['راسب','61%']]);
    assert.equal(saved.format.headers[14],'درجة الاختبار');assert.equal(saved.format.headers[13],'Custom');
    rows.forEach((row,index)=>{assert.deepEqual(saved.cells[index].slice(0,11),row.slice(0,11));assert.equal(saved.cells[index][13],'KEEP CUSTOM');});
    assert.equal(saved.cells[2][11],'');assert.equal(saved.cells[3][11],'');
    const acknowledged=await worker.evaluate(()=>chrome.storage.local.get('ibtaExamRun'));assert.ok(acknowledged.ibtaExamRun.items.every(account=>account.status==='saved'));
    await page.screenshot({path:path.join(artifacts,'prometric-results-saved.png')});
    await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(artifacts,'prometric-results-mobile.png')});
    assert.equal(await page.locator('#sheet-exam-dialog').evaluate(dialog=>dialog.scrollWidth<=dialog.clientWidth),true,'Mobile report cards fit inside the dialog');
    await page.setViewportSize({width:1440,height:1000});
    // Persisted conflicts beyond the first page must remain individually reviewable.
    await worker.evaluate(async()=>{const {ibtaExamRun:run}=await chrome.storage.local.get('ibtaExamRun');const confirmed=run.items[0];run.items=Array.from({length:51},(_,index)=>({...confirmed,id:'dummy-review-'+index,row:index,name:'REVIEW STUDENT '+index,fingerprint:'missing-'+index,status:'done'}));await chrome.storage.local.set({ibtaExamRun:run});});
    await page.locator('#sheet-exam-refresh').click();await page.waitForFunction(()=>document.querySelector('#sheet-exam-results').textContent.includes('REVIEW STUDENT 49'));
    await page.locator('#sheet-exam-results').getByRole('button',{name:'التالي',exact:true}).click();
    assert.match(await page.locator('#sheet-exam-results').textContent(),/REVIEW STUDENT 50/);
    await page.locator('#sheet-exam-refresh').click();await page.waitForFunction(()=>!document.getElementById('sheet-exam-refresh').disabled);
    assert.match(await page.locator('#sheet-exam-results').textContent(),/REVIEW STUDENT 50/,'Polling preserves the current results page');
    await page.locator('#sheet-exam-results').getByRole('button',{name:'عدم الكتابة',exact:true}).click();
    await page.waitForFunction(()=>document.getElementById('sheet-exam-results').textContent.includes('تمت المراجعة دون كتابة'));
    const reviewed=await worker.evaluate(()=>chrome.storage.local.get('ibtaExamRun'));assert.equal(reviewed.ibtaExamRun.items[50].status,'reviewed');
    assert.deepEqual(await page.evaluate(()=>previewSheets.get('demo-admin').cells),saved.cells,'Reviewing a missing row never writes to another row');
    assert.deepEqual(errors,[]);console.log('PASS: real extension sign-in, account isolation, selected coded rows, explicit scores, failed-save retention and durable acknowledgment');
  }finally{await context?.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
