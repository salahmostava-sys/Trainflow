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
    const original=await page.evaluate(()=>{
      const rows=Array.from({length:240},()=>TraineeData.blank(100));
      for(const [index,name,date]of [[0,'TUESDAY','الثلاثاء 2026-10-6 م'],[1,'LATE MONDAY','2026-10-05'],[150,'THURSDAY','08/10/2026'],[151,'LATE TUESDAY','2026-10-06'],[239,'THURSDAY AGAIN','٢٠٢٦-١٠-٠٨']]){
        rows[index][0]='DUMMY-'+index;rows[index][3]=name;rows[index][8]=date;
      }
      rows[151][4]='001234';rows[151][99]='CUSTOM';
      previewSheets.set('demo-admin',{cells:rows,version:0,format:{headers:{99:'CUSTOM'}}});return rows;
    });
    await page.locator('#sheet-reload').click();
    const headers=page.locator('.sheet-day-label'),cell=(r,c)=>page.locator(`td[data-v="${r}"][data-col="${c}"]`);
    await page.waitForFunction(()=>document.querySelector('td[data-v="0"][data-col="3"]').textContent==='TUESDAY');
    const groupOption=page.locator('#sheet-group-days');
    assert.equal(await groupOption.isChecked(),false,'Day grouping is opt-in');
    assert.equal(await headers.count(),0,'The default view has no automatic separators');
    assert.equal(await cell(2,3).count(),1,'Blank rows remain visible by default');
    assert.ok((await groupOption.boundingBox()).y<(await page.locator('.sheet-scroll').boundingBox()).y,'The option is above the table');
    await page.locator('#sheet-ribbon-toggle').click();assert.equal(await groupOption.isVisible(),true,'The option stays visible when sheet tools and filters are collapsed');await page.locator('#sheet-ribbon-toggle').click();
    await page.locator('#sheet-expanded').click();assert.equal(await groupOption.isVisible(),true,'The option stays available above the expanded grid');await page.locator('#sheet-expanded-close').click();
    await groupOption.check();
    await headers.first().waitFor();
    assert.equal(await headers.count(),3,'Long blank runs collapse enough to show all three groups');
    assert.match(await headers.nth(0).textContent(),/الثلاثاء الموافق 06\/10\/2026.*: 2$/);
    assert.match(await headers.nth(1).textContent(),/الخميس الموافق 08\/10\/2026.*: 2$/);
    assert.match(await headers.nth(2).textContent(),/الخميس الموافق 08\/10\/2026.*: 1$/,'A blank row starts another group even on the same day');
    assert.equal(await cell(2,3).count(),0,'Interior blank rows are not rendered');
    assert.equal(await cell(240,3).count(),1,'Trailing input rows remain editable');
    assert.ok((await cell(150,3).boundingBox()).y-(await cell(1,3).boundingBox()).y<100,'Blank separators consume a strip instead of thousands of pixels');
    await cell(1,3).click();await page.keyboard.press('ArrowDown');assert.equal(await page.locator('#sheet-address').inputValue(),'D151');
    await page.keyboard.press('ArrowUp');assert.equal(await page.locator('#sheet-address').inputValue(),'D2');
    await page.locator('#sheet-cell-content').fill('LATE MONDAY EDITED');await page.locator('#sheet-cell-content').press('Enter');
    await page.waitForFunction(()=>previewSheets.get('demo-admin').cells[1][3]==='LATE MONDAY EDITED');
    const stored=await page.evaluate(()=>previewSheets.get('demo-admin').cells);
    const expected=original.map(row=>row.slice());expected[1][3]='LATE MONDAY EDITED';
    assert.deepEqual(stored.map(row=>Array.from({length:100},(_,column)=>row[column]||'')),expected,'Saving retains all source rows, old dates, leading zeros and custom fields');
    await page.locator('#sheet-group-days').uncheck();
    await cell(2,3).waitFor();assert.equal(await headers.count(),0,'Turning the option off restores gaps and removes day separators');
    await page.locator('#sheet-group-days').check();await cell(150,3).waitFor();
    const go=async address=>{await page.locator('#sheet-address').fill(address);await page.locator('#sheet-address').press('Enter');};
    await go('D10');assert.equal(await page.locator('#sheet-group-days').isChecked(),false,'Navigating to a collapsed address turns the display option off and reveals the real blank row');
    await page.locator('#sheet-group-days').check();
    await page.locator('#sheet-search').fill('LATE');
    await page.waitForFunction(()=>!document.querySelector('.sheet-day-label'));assert.equal(await page.locator('tbody th[data-rowv]').count(),2,'Filters show matching records without misleading day separators');
    await page.locator('#sheet-clear-filters').click();await headers.first().waitFor();
    await go('I1');await page.locator('#sheet-cell-content').fill('2026-10-09');await page.locator('#sheet-cell-content').press('Enter');
    await page.waitForFunction(()=>document.querySelector('.sheet-day-label').textContent.includes('الجمعة الموافق 09/10/2026'));
    await go('D2');await page.evaluate(()=>{
      const clipboardData=new DataTransfer();clipboardData.setData('text/plain','PASTED FIRST\nPASTED INTO GAP');
      document.querySelector('td[data-v="1"][data-col="3"]').dispatchEvent(new ClipboardEvent('paste',{clipboardData,bubbles:true,cancelable:true}));
    });
    await page.waitForFunction(()=>previewSheets.get('demo-admin').cells[2][3]==='PASTED INTO GAP');
    assert.equal(await page.evaluate(()=>previewSheets.get('demo-admin').cells[150][3]),'THURSDAY','Pasting across a compact gap uses actual source rows without overwriting the next visible group');
    assert.match(await headers.first().textContent(),/: 3$/,'The group count updates after filling a blank row');
    await page.locator('#sheet-undo').click();await groupOption.check();await page.waitForFunction(()=>document.querySelector('.sheet-day-label')?.textContent.endsWith(': 2'));
    await page.locator('#sheet-direction').selectOption('rtl');await go('D151');
    assert.match(await headers.nth(1).textContent(),/الخميس.*: 2$/);
    await page.locator('.sheet-scroll').evaluate(scroll=>{scroll.scrollTop=7000;});
    await page.waitForFunction(()=>Number(document.querySelector('tbody th[data-rowv]')?.dataset.rowv)>240);
    await go('D1');assert.match(await headers.first().textContent(),/الجمعة/,'Returning from virtual input rows restores the right separators');
    for(const direction of ['ltr','rtl']){
      await page.locator('#sheet-direction').selectOption(direction);await go('CV1');
      const viewport=await page.locator('.sheet-scroll').boundingBox();
      for(const part of ['.sheet-day-title','.sheet-day-count']){
        const label=await page.locator(part).first().boundingBox();
        assert.ok(label.x>=viewport.x&&label.x+label.width<=viewport.x+viewport.width,'The date and count remain visible after horizontal scrolling in '+direction);
      }
    }
    await page.setViewportSize({width:390,height:844});if(await page.locator('#sidebar-backdrop').isVisible())await page.locator('#sidebar-backdrop').click({position:{x:10,y:10}});await go('D1');
    const countBox=await page.locator('.sheet-day-count').first().boundingBox(),mobile=await page.locator('.sheet-scroll').boundingBox();
    assert.ok(countBox.x>=mobile.x&&countBox.x+countBox.width<=mobile.x+mobile.width,'The count remains visible on narrow screens');
    const fs=require('node:fs');fs.mkdirSync(path.resolve(__dirname,'../artifacts'),{recursive:true});
    await page.screenshot({path:path.resolve(__dirname,'../artifacts/day-groups-mobile.png')});
    assert.deepEqual(errors,[]);console.log('PASS: blank-row day groups, mixed dates, counts, compact gaps, safe navigation, persistence, filters and virtual scrolling');
  }finally{await browser?.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
