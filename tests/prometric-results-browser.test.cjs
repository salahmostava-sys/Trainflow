const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process'),{chromium}=require('playwright');
(async()=>{
  const root=path.resolve(__dirname,'..'),artifacts=path.join(root,'artifacts'),extension=path.join(root,'extension/prometric');
  fs.mkdirSync(artifacts,{recursive:true});
  const server=spawn(process.execPath,[path.join(root,'tools/design-preview.cjs')],{env:{...process.env,IBTA_PREVIEW_PORT:'4198'},stdio:['ignore','pipe','inherit']});let context;
  try{
    await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
    const template=await(await fetch('http://127.0.0.1:4198/')).text();
    const makeRow=(name,code,user)=>{const row=Array(52).fill('');row[0]=code;row[1]=name.toLowerCase()+'@example.invalid';row[3]=name+' STUDENT';row[7]='CBP-L';row[9]=user;row[10]='Dummy-Pass';row[13]='KEEP CUSTOM';return row;};
    // The worksheet is already saved; the simulated outage applies to saving fetched results.
    const rows=[makeRow('ALPHA','DUMMY-1','DUMMY-ALPHA'),makeRow('BETA','DUMMY-2','DUMMY-BETA'),makeRow('NO-CODE','','DUMMY-NO-CODE'),makeRow('UNSELECTED','DUMMY-4','DUMMY-OTHER')];
    rows[0][7]='CBP-S';rows[0][12]='123456789';rows[1][12]='987654321';
    rows.push([...rows[0]]); // The selected trainee also exists as an unselected identical copy.
    context=await chromium.launchPersistentContext(fs.mkdtempSync(path.join(artifacts,'prometric-results-')),{channel:'msedge',headless:true,viewport:{width:1440,height:1000},args:['--disable-extensions-except='+extension,'--load-extension='+extension,'--host-resolver-rules=MAP trainf.vercel.app 127.0.0.1, MAP tcnet1.prometric.com 127.0.0.1']});
    const logins=[],errors=[],examActions=[];let account='DUMMY-OUTSIDER',signouts=0,candidateVisited=false,forceSessionExpiry=false,stalledHistoryClicks=0,missingHistoryControl=false,postbackHistory=false,redirectHistory=false,scoreRequests=0;
    await context.exposeBinding('fixtureLogin',(_,credentials)=>{logins.push(credentials);account=credentials.username;candidateVisited=false;});
    await context.exposeBinding('fixtureLogout',()=>{account='';signouts++;});
    await context.exposeBinding('fixtureExamAction',(_,action)=>examActions.push(action));
    await context.exposeBinding('fixtureStalledHistory',()=>{stalledHistoryClicks++;});
    const profile=()=>'<a id="UserProfileHyperLink">'+account+'</a><a id="SignOutLinkButton" href="#" onclick="fixtureLogout().then(()=>location.href=\'/Login.aspx?ClientNameSingleSite=ibtamea\');return false">Sign Out</a>';
    function prometricFixture(url){
      let body='';
      if(url.pathname==='/Login.aspx')body=account?profile():'<input id="PageContent_UserNameTextbox_txtTextBox" placeholder="Username"><input id="PageContent_PasswordTextbox_txtTextBox" type="password"><button id="PageContent_SignInButton" onclick="document.body.append(document.createElement(\'progress\'));fixtureLogin({username:document.getElementById(\'PageContent_UserNameTextbox_txtTextBox\').value,password:document.getElementById(\'PageContent_PasswordTextbox_txtTextBox\').value}).then(()=>setTimeout(()=>location.href=\'/User/Welcome.aspx\',250))">Sign In</button>';
      else if(url.pathname==='/User/Welcome.aspx')body=profile()+'<nav id="NavigationMenu"><span>Candidate</span><a href="/fixture-take-test" style="display:none">Take Test</a></nav>';
      else if(url.pathname==='/fixture-take-test'){
        candidateVisited=true;
        // Regression: clicking History can leave the Candidate page unchanged.
        const history=missingHistoryControl?'<span>History</span>':postbackHistory?'<input type="submit" value="History">':account==='DUMMY-ALPHA'?'<a href="/Candidate/ManageReviewScores.aspx">History</a>':forceSessionExpiry?'<button onclick="location.href=\'/Candidate/ManageReviewScores.aspx\'">History</button>':'<input type="submit" value="History" onclick="fixtureStalledHistory();return false">';
        body=profile()+'<button onclick="fixtureExamAction(\'Take\')">Take</button><input type="button" value="Resume" onclick="fixtureExamAction(\'Resume\')"><h2>Review Scores</h2><form method="'+(postbackHistory?'post':'get')+'" action="'+(postbackHistory?'/fixture-take-test':'/Candidate/ManageReviewScores.aspx')+'">'+history+'</form>';
      }
      else if(url.pathname==='/Candidate/ManageReviewScores.aspx'){
        const results=[['Sales Arabic','10/6/2026 8:00 AM','Fail (30%)'],['Sales Arabic','10/7/2026 1:30 PM','Pass (99%)'],['Leadership English','10/7/2026 1:30 PM',account==='DUMMY-ALPHA'?'Pass (88.2%)':'Fail (61%)'],['Leadership English','10/6/2026 8:00 AM','Pass (95%)'],['Sales Arabic','','In progress'],['Leadership English','10/14/2026','Pending (0%)']];
        body=candidateVisited&&!forceSessionExpiry?profile()+'<table id="PageContent_ManageReviewScoresGridView_gridView"><tr><th>Test Title</th><th>Your Score</th></tr>'+results.map(([title,date,score])=>'<tr><td title="TEST TITLE">'+title+'</td><td title="DATE">'+date+'</td><td title="YOUR SCORE">'+score+'</td></tr>').join('')+'</table>':'<p>Your Session has been timed out! Please login again.</p><input id="PageContent_LoginButton" type="button" value="Login">';
      }
      else throw Error('Unexpected Prometric navigation: '+url.pathname);
      return '<!doctype html><html><body>'+body+'</body></html>';
    }
    await context.route(/^https?:\/\//,async route=>{
      const url=new URL(route.request().url());
      if(url.origin==='https://tcnet1.prometric.com'){
        if(url.pathname==='/Candidate/ManageReviewScores.aspx'){
          scoreRequests++;
          // Serve the final Candidate document without allowing a redirect request outside this fixture.
          if(redirectHistory)return route.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html><html><body>'+profile()+'<script>history.replaceState(null,"","/fixture-take-test");</script><h2>Review Scores</h2><span>History</span></body></html>'});
        }
        return route.fulfill({contentType:'text/html; charset=utf-8',body:prometricFixture(url)});
      }
      if(url.origin==='https://trainf.vercel.app'){
        if(url.pathname==='/')return route.fulfill({contentType:'text/html; charset=utf-8',body:template.replace('const previewSheets=new Map(window.previewInitialSheets||[]);','const previewSheets=new Map([["demo-admin",'+JSON.stringify({cells:rows,version:1,format:{direction:'rtl',headers:{13:'Custom'}}})+']]);')});
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
    assert.equal(await page.locator('#sheet-exam-connection').textContent(),'متصل');
    assert.equal(await page.locator('#sheet-exam-connection').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(21, 128, 61)');
    assert.equal(await page.locator('#sheet-exam-download').isVisible(),false);
    assert.equal(await page.locator('#sheet-exam-preview tbody tr').count(),3);
    await page.screenshot({path:path.join(artifacts,'prometric-results-ready.png')});
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
    assert.deepEqual(saved.cells.slice(0,2).map(row=>[row[11],row[13]]),[['ناجح','99%'],['راسب','61%']],'Each selected row saves the newest matching attempt, even when older attempts have a different outcome or higher percentage');
    assert.equal(saved.format.headers[13],'نسبة الاختبار');assert.equal(saved.format.headers[14],'Custom');
    rows.forEach((row,index)=>{assert.deepEqual(saved.cells[index].slice(0,11),row.slice(0,11));assert.equal(saved.cells[index][12],row[12]);assert.equal(saved.cells[index][14],'KEEP CUSTOM');});
    assert.equal(saved.cells[2][11],'لم يدخل','Selected trainees without a voucher are marked absent');assert.equal(saved.cells[3][11],'','Unselected trainees are not changed');
    assert.equal(saved.cells[4][11],'','An identical unselected trainee never receives the selected copy’s result');
    assert.deepEqual(saved.format.styles['1:13'],{bg:'#ff0000',color:'#ffffff'},'Failed percentages retain a red fill in the saved sheet');
    const acknowledged=await worker.evaluate(()=>chrome.storage.local.get('ibtaExamRun'));assert.ok(acknowledged.ibtaExamRun.items.every(account=>account.status==='saved'));
    await page.screenshot({path:path.join(artifacts,'prometric-results-saved.png')});
    await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(artifacts,'prometric-results-mobile.png')});
    assert.equal(await page.locator('#sheet-exam-dialog').evaluate(dialog=>dialog.scrollWidth<=dialog.clientWidth),true,'Mobile tables scroll inside the dialog');
    await page.setViewportSize({width:1440,height:1000});
    await page.locator('#sheet-exam-close').click();await page.locator('#sheet-address').fill('N2');await page.locator('#sheet-address').press('Enter');
    assert.equal(await page.locator('td[data-v="1"][data-col="13"]').evaluate(cell=>getComputedStyle(cell).backgroundColor),'rgb(255, 0, 0)');
    await page.locator('#sheet-address').fill('D3');await page.locator('#sheet-address').press('Enter');
    await page.locator('td[data-v="2"][data-col="3"]').click();await page.locator('#sheet-exam-open').click();
    await page.waitForFunction(()=>!document.getElementById('sheet-exam-start').disabled);await page.locator('#sheet-exam-start').click();
    await page.waitForFunction(()=>!document.getElementById('sheet-exam-start').disabled);
    assert.equal(logins.length,2,'A selection containing only no-code trainees never opens another account');
    // Alternate Candidate markup must still open the known read-only scores page.
    missingHistoryControl=true;
    await page.locator('#sheet-exam-close').click();await page.locator('td[data-v="1"][data-col="3"]').click();
    await page.locator('#sheet-exam-open').click();await page.waitForFunction(()=>!document.getElementById('sheet-exam-start').disabled);
    await page.locator('#sheet-exam-start').click();
    await page.waitForFunction(()=>document.querySelectorAll('#sheet-exam-results tbody tr').length===1&&document.getElementById('sheet-exam-results').textContent.includes('تم الحفظ: راسب'),null,{timeout:15000});
    const alternate=await worker.evaluate(()=>chrome.storage.local.get('ibtaExamRun'));
    assert.equal(alternate.ibtaExamRun.items.length,1);assert.equal(alternate.ibtaExamRun.items[0].status,'saved');
    assert.equal(alternate.ibtaExamRun.items[0].score,'61%','Missing History controls do not block score retrieval');
    // WebForms may post History back to the same Candidate URL in a new document.
    missingHistoryControl=false;postbackHistory=true;
    const returnedCandidate=context.waitForEvent('response',{predicate:response=>new URL(response.url()).pathname==='/fixture-take-test'&&response.request().method()==='POST'});
    await page.locator('#sheet-exam-close').click();await page.locator('#sheet-exam-open').click();
    await page.waitForFunction(()=>!document.getElementById('sheet-exam-start').disabled);await page.locator('#sheet-exam-start').click();
    await returnedCandidate;
    await page.waitForFunction(()=>document.getElementById('sheet-exam-results').textContent.includes('تم الحفظ: راسب'),null,{timeout:15000});
    const postback=await worker.evaluate(()=>chrome.storage.local.get('ibtaExamRun'));
    assert.notEqual(postback.ibtaExamRun.id,alternate.ibtaExamRun.id);assert.equal(postback.ibtaExamRun.items[0].status,'saved','A same-page History postback resumes at score history');
    postbackHistory=false;missingHistoryControl=true;
    redirectHistory=true;const beforeRedirect=scoreRequests;
    await page.locator('#sheet-exam-close').click();await page.locator('#sheet-exam-open').click();
    await page.waitForFunction(()=>!document.getElementById('sheet-exam-start').disabled);await page.locator('#sheet-exam-start').click();
    await page.waitForFunction(()=>document.getElementById('sheet-exam-results').textContent.includes('صفحة النتائج غير متاحة'),null,{timeout:15000});
    assert.equal(scoreRequests,beforeRedirect+1,'A redirect back to Candidate cannot loop or re-fetch indefinitely');
    assert.deepEqual(await page.evaluate(()=>previewSheets.get('demo-admin').cells),saved.cells,'Unavailable history cannot overwrite a result');
    missingHistoryControl=redirectHistory=false;
    // Regression: missing profiles were called wrong accounts and the failed tab vanished.
    forceSessionExpiry=true;
    await page.locator('#sheet-exam-close').click();
    await page.locator('td[data-v="1"][data-col="3"]').click();
    await page.locator('#sheet-exam-open').click();await page.waitForFunction(()=>!document.getElementById('sheet-exam-start').disabled);
    await page.locator('#sheet-exam-start').click();
    await page.waitForFunction(()=>document.getElementById('sheet-exam-results').textContent.includes('انتهت جلسة Prometric'));
    const failed=await worker.evaluate(()=>chrome.storage.local.get('ibtaExamRun'));
    assert.equal(failed.ibtaExamRun.items.length,1,'Only the selected retry row is accessed');
    assert.equal(failed.ibtaExamRun.items[0].error,'SESSION_EXPIRED');
    assert.equal(failed.ibtaExamRun.items[0].password,undefined);
    const failureTab=await worker.evaluate(async()=>{const {ibtaExamRun:run}=await chrome.storage.local.get('ibtaExamRun');return chrome.tabs.get(run.examTab);});
    assert.equal(failureTab.active,true);assert.match(failureTab.url,/ManageReviewScores\.aspx/);
    assert.deepEqual(await page.evaluate(()=>previewSheets.get('demo-admin').cells),saved.cells,'Expired sessions never overwrite previously saved results');
    assert.match(await page.locator('#sheet-exam-status').textContent(),/متروك مفتوحًا/);
    // Persisted conflicts beyond the first page must remain individually reviewable.
    await worker.evaluate(async confirmed=>{const {ibtaExamRun:run}=await chrome.storage.local.get('ibtaExamRun');run.items=Array.from({length:51},(_,index)=>({...confirmed,id:'dummy-review-'+index,row:index,name:'REVIEW STUDENT '+index,fingerprint:'missing-'+index,status:'done'}));await chrome.storage.local.set({ibtaExamRun:run});},acknowledged.ibtaExamRun.items[0]);
    await page.locator('#sheet-exam-refresh').click();await page.waitForFunction(()=>document.querySelector('#sheet-exam-results').textContent.includes('REVIEW STUDENT 49'));
    await page.locator('#sheet-exam-results').getByRole('button',{name:'التالي',exact:true}).click();
    assert.match(await page.locator('#sheet-exam-results').textContent(),/REVIEW STUDENT 50/);
    await page.locator('#sheet-exam-refresh').click();await page.waitForFunction(()=>!document.getElementById('sheet-exam-refresh').disabled);
    assert.match(await page.locator('#sheet-exam-results').textContent(),/REVIEW STUDENT 50/,'Polling preserves the current results page');
    await page.locator('#sheet-exam-results').getByRole('button',{name:'عدم الكتابة',exact:true}).click();
    await page.waitForFunction(()=>document.getElementById('sheet-exam-results').textContent.includes('تمت المراجعة دون كتابة'));
    const reviewed=await worker.evaluate(()=>chrome.storage.local.get('ibtaExamRun'));assert.equal(reviewed.ibtaExamRun.items[50].status,'reviewed');
    assert.deepEqual(await page.evaluate(()=>previewSheets.get('demo-admin').cells),saved.cells,'Reviewing a missing row never writes to another row');
    assert.equal(stalledHistoryClicks,1,'A stalled History control is clicked once before the results-page fallback');
    assert.deepEqual(examActions,[],'History navigation and its fallback never trigger Take or Resume');
    assert.deepEqual(errors,[]);console.log('PASS: real extension sign-in, History controls and stalled-navigation fallback, no exam actions, account isolation, selected coded rows, explicit scores, failed-save retention and durable acknowledgment');
  }finally{await context?.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
