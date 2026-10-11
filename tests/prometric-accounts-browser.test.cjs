const assert=require('node:assert/strict'),path=require('node:path'),{spawn}=require('node:child_process'),{chromium}=require('playwright');

(async()=>{
  const server=spawn(process.execPath,['tools/design-preview.cjs'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,IBTA_PREVIEW_PORT:'4222'},stdio:['ignore','pipe','inherit']});let browser;
  try{
    await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
    browser=await chromium.launch({channel:'msedge',headless:true});
    const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    // The extension transport is the boundary; this fixture never opens Prometric or creates accounts.
    const requiredVersion=require('../extension/prometric/manifest.json').version;
    await page.addInitScript(requiredVersion=>{
      window.registrationStarts=[];
      window.fixtureExtensionVersion=requiredVersion;
      window.addEventListener('message',event=>{
        if(!['IBTA_PROMETRIC_APP','IBTA_PROMETRIC_EXAM_APP'].includes(event.data?.channel))return;
        const request=event.data,payload=request.payload;
        if(payload.type==='START')window.registrationStarts.push(payload.items);
        window.postMessage({channel:request.channel==='IBTA_PROMETRIC_APP'?'IBTA_PROMETRIC_EXTENSION':'IBTA_PROMETRIC_EXAM_EXTENSION',id:request.id,payload:{ok:true,version:window.fixtureExtensionVersion,capabilities:{retake:true,examResults:true},busy:false,run:null}},location.origin);
      });
    },requiredVersion);
    await page.goto('http://127.0.0.1:4222/');await page.locator('#trainees-tab').click();
    const saved=()=>page.waitForFunction(()=>document.getElementById('sheet-status').textContent==='تم الحفظ');await saved();
    await page.evaluate(()=>{
      const make=(name,email,id,exam)=>{const row=TraineeData.blank(20);row[0]='V-'+name;row[1]=email;row[2]='الاسم العربي';row[3]=name;row[4]=id;row[5]='0500000000';row[6]='Fixture organization';row[7]=exam;row[8]='2026-10-01';return row;};
      const first=make('OLD STUDENT','old@example.invalid','1060354287','CBP-L');first[9]='FIRST-USER';first[10]='FIRST-PASSWORD';first[12]='111111111';
      const second=make('OLD STUDENT','second@example.invalid','1060354287','CBP-M');second[9]='SECOND-USER';second[10]='SECOND-PASSWORD';second[12]='222222222';
      const current=make('CURRENT STUDENT','current@example.invalid','١٠٦٠٣٥٤٢٨٧','CBP-ECM');current[13]='PRIVATE EXTRA MUST NOT APPEAR';
      const unrelated=make('CURRENT STUDENT','current@example.invalid','1000000002','CBP-ECM');
      previewSheets.set('demo-admin',{cells:[first,second,current,unrelated],version:1});
    });
    await page.locator('#sheet-reload').click();await saved();
    const dialog=page.locator('#sheet-prometric-dialog'),preview=page.locator('#sheet-prometric-preview'),comparison=page.locator('#sheet-prometric-account-comparison');
    const open=async row=>{await page.locator(`td[data-v="${row}"][data-col="3"]`).click();await page.locator('#sheet-prometric-open').click();await page.waitForFunction(()=>{const connection=document.getElementById('sheet-prometric-connection');return connection.textContent.includes('الإضافة متصلة')||connection.dataset.update==='true';});};
    await open(2);
    const updateNotice=page.locator('#sheet-extension-update');
    assert.equal(await updateNotice.isVisible(),false,'Matching extension versions need no update');
    for(const installed of ['4.1.0','99.0.0']){
      await page.evaluate(version=>window.fixtureExtensionVersion=version,installed);await page.locator('#sheet-prometric-refresh').click();
      await page.waitForFunction(version=>document.getElementById('sheet-extension-update-message').textContent.includes(version),installed);
      assert.match(await page.locator('#sheet-prometric-connection').textContent(),new RegExp(requiredVersion.replaceAll('.','\\.')));
      assert.equal(await page.locator('#sheet-prometric-download').isVisible(),true,'Mismatched installed versions expose the update download');
      assert.match(await page.locator('#sheet-extension-update-download').getAttribute('href'),/trainflow-prometric\.zip/);
      await page.locator('#sheet-prometric-close').click();assert.equal(await updateNotice.isVisible(),true,'Update notice remains visible above the table');
      await page.locator('#sheet-exam-open').click();await page.waitForFunction(version=>document.getElementById('sheet-exam-connection').textContent.includes(version),installed);
      assert.match(await page.locator('#sheet-exam-connection').textContent(),new RegExp(requiredVersion.replaceAll('.','\\.')));
      assert.equal(await page.locator('#sheet-exam-download').isVisible(),true);await page.locator('#sheet-exam-close').click();await open(2);
    }
    await page.evaluate(version=>window.fixtureExtensionVersion=version,requiredVersion);await page.locator('#sheet-prometric-refresh').click();await updateNotice.waitFor({state:'hidden'});
    assert.match(await page.locator('#sheet-prometric-summary').textContent(),/جاهز للتسجيل: 0 · حسابات محفوظة: 1/);
    assert.equal(await preview.locator('tbody tr').getAttribute('class'),'sheet-prometric-existing-account');
    assert.notEqual(await preview.locator('tbody td').first().evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
    assert.match(await preview.textContent(),/له حساب محفوظ في الصف: 1, 2/);assert.match(await preview.textContent(),/FIRST-USER.*SECOND-USER/);
    assert.equal(await page.locator('#sheet-prometric-start').isDisabled(),true);
    await preview.getByRole('button',{name:'مقارنة بيانات الحساب',exact:true}).click();
    const records=comparison.locator('.sheet-detail-record');assert.equal(await records.count(),2);
    assert.deepEqual(await records.nth(0).locator('dt').allTextContents(),await records.nth(1).locator('dt').allTextContents(),'Both records have the same fields even when one exam has no matching keycode');
    for(const record of await records.all())assert.equal((await record.locator('dt').allTextContents()).at(-1),'AnyDesk ID');
    assert.match(await records.nth(0).textContent(),/CURRENT STUDENT/);assert.match(await records.nth(1).textContent(),/FIRST-PASSWORD/);
    assert.match(await records.nth(1).textContent(),/111111111/);assert.doesNotMatch(await comparison.textContent(),/PRIVATE EXTRA MUST NOT APPEAR/);
    await page.locator('#sheet-prometric-account-source').selectOption('1');
    assert.match(await records.nth(1).textContent(),/SECOND-USER/);assert.match(await records.nth(1).textContent(),/222222222/);
    await page.locator('#sheet-prometric-refresh').click();assert.equal(await page.locator('#sheet-prometric-account-source').inputValue(),'1','Polling preserves the chosen historical account');
    assert.equal(await page.evaluate(()=>previewSheets.get('demo-admin').cells[2][9]),'','Reviewing a historical account never copies it automatically');
    await page.screenshot({path:path.resolve(__dirname,'../artifacts/prometric-account-comparison.png')});
    const before=await page.evaluate(()=>structuredClone(TraineeData.normalize(previewSheets.get('demo-admin').cells)));
    await page.evaluate(()=>window.previewSaveError='NETWORK');
    await page.locator('#sheet-prometric-reuse-account').click();
    await page.waitForFunction(()=>document.getElementById('sheet-prometric-status').textContent.includes('تم وضع الحساب في الصف؛ تعذر حفظ الجدول'));
    assert.equal(await page.evaluate(()=>previewSheets.get('demo-admin').cells[2][9]),'','A failed save is never reported as persisted');
    await page.evaluate(()=>window.previewSaveError='');await page.locator('#sheet-prometric-reuse-account').click();
    await page.waitForFunction(()=>previewSheets.get('demo-admin').cells[2][9]==='SECOND-USER');
    const after=await page.evaluate(()=>TraineeData.normalize(previewSheets.get('demo-admin').cells));
    const expected=structuredClone(before);expected[2][9]='SECOND-USER';expected[2][10]='SECOND-PASSWORD';
    assert.deepEqual(after,expected,'Only the chosen current row credentials change; old rows and all other data remain intact');
    assert.equal(await page.evaluate(()=>window.registrationStarts.length),0,'Reuse never creates another account');
    await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.ok(await records.nth(1).evaluate(el=>el.getBoundingClientRect().top)>=await records.nth(0).evaluate(el=>el.getBoundingClientRect().bottom),'Comparison cards stack on mobile');
    await page.setViewportSize({width:1500,height:1000});await page.locator('#sheet-prometric-close').click();
    await page.evaluate(()=>{const sheet=previewSheets.get('demo-admin');sheet.cells[2][9]=sheet.cells[2][10]='';});await page.locator('#sheet-reload').click();await saved();await open(2);
    await preview.getByRole('combobox').selectOption('new');assert.match(await page.locator('#sheet-prometric-summary').textContent(),/جاهز للتسجيل: 1/);
    await page.locator('#sheet-prometric-start').click();await page.waitForFunction(()=>window.registrationStarts.length===1);
    assert.deepEqual(await page.evaluate(()=>window.registrationStarts[0].map(item=>item.row)),[2],'Explicit creation registers only the chosen current row');
    await page.locator('#sheet-prometric-close').click();await open(3);
    assert.equal(await preview.locator('.sheet-prometric-existing-account').count(),0,'Conflicting IDs do not share an account even with identical names and email');
    assert.match(await page.locator('#sheet-prometric-summary').textContent(),/جاهز للتسجيل: 1 · حسابات محفوظة: 0/);
    assert.deepEqual(errors,[]);console.log('PASS: historical account warning, full comparison through AnyDesk, account selection, explicit reuse/save, unchanged history, explicit new registration and conflicting-ID isolation');
  }finally{await browser?.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
