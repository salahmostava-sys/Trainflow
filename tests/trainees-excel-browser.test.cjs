const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawn}=require('node:child_process');
(async()=>{
  const server=spawn(process.execPath,[path.join(__dirname,'../tools/design-preview.cjs')],{stdio:['ignore','pipe','inherit'],env:{...process.env,IBTA_PREVIEW_PORT:'4176'}});
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try{
    const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:4176/');await page.locator('#trainees-tab').click();
    await page.waitForFunction(()=>document.getElementById('sheet-status').textContent==='تم الحفظ');
    const editCell=page.locator('td[data-v="0"][data-col="2"]');
    await editCell.dblclick();await page.keyboard.press('Control+a');await page.keyboard.insertText('اختبار الحفظ التلقائي');
    await page.waitForFunction(()=>document.getElementById('sheet-status').textContent==='تم الحفظ');
    assert.equal(await editCell.textContent(),'اختبار الحفظ التلقائي');
    assert.equal(await editCell.getAttribute('contenteditable'),'true','Saving does not end typing or reset the caret');
    await page.locator('#sheet-reload').click();await page.waitForFunction(()=>document.getElementById('sheet-status').textContent==='تم الحفظ');
    assert.equal(await editCell.textContent(),'اختبار الحفظ التلقائي','Autosave persists before leaving the edited cell');
    assert.equal(await page.locator('#sheet-add-1000').count(),0);
    await page.locator('#sheet-add-bulk-btn').click();
    await page.locator('#sheet-wrap').click();assert.equal(await page.locator('#sheet-wrap').getAttribute('aria-pressed'),'true');
    await page.locator('#sheet-freeze').click();assert.equal(await page.locator('#sheet-grid').evaluate(el=>el.classList.contains('sheet-freeze-column')),true);
    await page.locator('#sheet-address').fill('D150');await page.locator('#sheet-address').press('Enter');
    assert.equal(await page.locator('td.sheet-current').getAttribute('data-col'),'3');
    assert.equal(await page.locator('td.sheet-current').getAttribute('data-v'),'149');
    assert.equal(await page.locator('#sheet-address').inputValue(),'D150');
    await page.locator('#sheet-address').fill('ZZ999999');await page.locator('#sheet-address').press('Enter');
    assert.equal(await page.locator('#sheet-status').getAttribute('data-error'),'true');
    assert.equal(await page.locator('.sheet-ribbon-group').count(),3);
    await page.setViewportSize({width:390,height:844});await page.locator('#sheet-address').fill('A1');await page.locator('#sheet-address').press('Enter');
    assert.equal(await page.locator('#sheet-address').inputValue(),'A1');
    // The old design fixture omits reports and some non-trainee page globals.
    const fixtureErrors=new Set(['codes is not defined',"Cannot read properties of null (reading 'addEventListener')",'TraineeReports is not defined']);
    assert.deepEqual(errors.filter(message=>!fixtureErrors.has(message)),[]);
    console.log('PASS: ribbon controls, address navigation across pages, invalid addresses, active cells and mobile layout');
  }finally{await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
