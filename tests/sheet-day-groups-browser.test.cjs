const assert=require('node:assert/strict'),path=require('node:path'),{spawn}=require('node:child_process'),{chromium}=require('playwright');
(async()=>{
  const server=spawn(process.execPath,['tools/design-preview.cjs'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,IBTA_PREVIEW_PORT:'4216'},stdio:['ignore','pipe','inherit']});let browser;
  try{
    await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
    browser=await chromium.launch({channel:'msedge',headless:true});
    const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:4216/');await page.locator('#trainees-tab').click();
    await page.waitForFunction(()=>document.getElementById('sheet-status').textContent==='تم الحفظ');
    const removed=page.locator('#sheet-add-separator,#sheet-group-days,.sheet-day-options');
    assert.equal(await removed.count(),0,'The entire separator toolbar is removed');
    const original=await page.evaluate(()=>{
      const rows=Array.from({length:240},()=>TraineeData.blank(100));
      for(const [index,name,date]of [[0,'TUESDAY','الثلاثاء 2026-10-6 م'],[1,'LATE MONDAY','2026-10-05'],[150,'THURSDAY','08/10/2026'],[151,'LATE TUESDAY','2026-10-06'],[239,'THURSDAY AGAIN','٢٠٢٦-١٠-٠٨']]){rows[index][0]='DUMMY-'+index;rows[index][3]=name;rows[index][8]=date;}
      rows[151][4]='001234';rows[151][99]='CUSTOM';
      previewSheets.set('demo-admin',{cells:rows,version:0,format:{headers:{99:'CUSTOM'}}});return rows;
    });
    const headers=page.locator('.sheet-day-label'),cell=(r,c)=>page.locator(`td[data-v="${r}"][data-col="${c}"]`);
    const go=async address=>{await page.locator('#sheet-address').fill(address);await page.locator('#sheet-address').press('Enter');};
    await page.locator('#sheet-reload').click();await page.waitForFunction(()=>document.querySelector('td[data-v="0"][data-col="3"]')?.textContent==='TUESDAY');
    assert.equal(await headers.count(),0,'Blank rows never introduce automatic separators');await cell(2,3).waitFor();
    await page.evaluate(()=>{previewSheets.get('demo-admin').format.daySeparators=[0,150,239];});
    await page.locator('#sheet-reload').click();await headers.first().waitFor();
    assert.match(await headers.first().textContent(),/الثلاثاء الموافق 06\/10\/2026.*: 2/,'Saved manual groups retain mixed dates and counts');
    await cell(1,3).click();await page.keyboard.press('ArrowDown');assert.equal(await page.locator('#sheet-address').inputValue(),'D3','Arrow navigation enters the original blank row');
    await go('D10');await cell(9,3).waitFor();
    await go('D2');await page.evaluate(()=>{const clipboardData=new DataTransfer();clipboardData.setData('text/plain','PASTED FIRST\nPASTED INTO GAP');document.querySelector('td[data-v="1"][data-col="3"]').dispatchEvent(new ClipboardEvent('paste',{clipboardData,bubbles:true,cancelable:true}));});
    await page.waitForFunction(()=>previewSheets.get('demo-admin').cells[2][3]==='PASTED INTO GAP');
    const expected=original.map(row=>row.slice());expected[1][3]='PASTED FIRST';expected[2][3]='PASTED INTO GAP';
    assert.deepEqual(await page.evaluate(()=>previewSheets.get('demo-admin').cells.map(row=>Array.from({length:100},(_,c)=>row[c]||''))),expected,'Removing controls preserves row indices, dates, leading zeros and custom fields');
    assert.deepEqual(await page.evaluate(()=>previewSheets.get('demo-admin').format.daySeparators),[0,150,239],'Ordinary saves retain existing manual boundaries');
    assert.match(await headers.first().textContent(),/: 3/);await page.locator('#sheet-undo').click();await page.waitForFunction(()=>previewSheets.get('demo-admin').cells[2][3]==='');
    await page.locator('.sheet-remove-separator').first().click();await page.waitForFunction(()=>previewSheets.get('demo-admin').format.daySeparators?.join(',')==='150,239');
    await page.locator('#sheet-undo').click();await page.waitForFunction(()=>previewSheets.get('demo-admin').format.daySeparators?.join(',')==='0,150,239');
    await page.locator('#sheet-search').fill('LATE');await page.waitForFunction(()=>!document.querySelector('.sheet-day-label'));assert.equal(await page.locator('tbody th[data-rowv]').count(),2);
    await page.locator('#sheet-clear-filters').click();await go('D151');assert.match(await headers.last().textContent(),/الخميس.*: 2/);
    await go('I151');await page.locator('#sheet-cell-content').fill('2026-10-09');await page.locator('#sheet-cell-content').press('Enter');
    await page.waitForFunction(()=>[...document.querySelectorAll('.sheet-day-label')].some(el=>el.textContent.includes('الجمعة الموافق 09/10/2026')));
    await page.locator('.sheet-scroll').evaluate(scroll=>{scroll.scrollTop=7000;});await page.waitForFunction(()=>Number(document.querySelector('tbody th[data-rowv]')?.dataset.rowv)>240);
    for(const direction of ['ltr','rtl']){
      await page.locator('#sheet-direction').selectOption(direction);await go('CV1');const viewport=await page.locator('.sheet-scroll').boundingBox();
      for(const selector of ['.sheet-day-title','.sheet-day-count','.sheet-remove-separator']){const box=await page.locator(selector).first().boundingBox();assert.ok(box.width>=32&&box.x>=viewport.x&&box.x+box.width<=viewport.x+viewport.width,'Saved separator content fits after horizontal scrolling in '+direction);}
    }
    await page.setViewportSize({width:390,height:844});if(await page.locator('#sidebar-backdrop').isVisible())await page.locator('#sidebar-backdrop').click({position:{x:10,y:10}});await go('D1');
    assert.equal(await removed.count(),0,'Removed toolbar does not return on mobile');
    const fs=require('node:fs');fs.mkdirSync(path.resolve(__dirname,'../artifacts'),{recursive:true});await page.screenshot({path:path.resolve(__dirname,'../artifacts/removed-day-toolbar-mobile.png')});
    assert.deepEqual(errors,[]);console.log('PASS: removed separator controls, original blank rows, retained saved boundaries, paste, undo, filters, virtual scrolling and mobile');
  }finally{await browser?.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
