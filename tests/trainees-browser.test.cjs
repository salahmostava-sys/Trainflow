const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawn}=require('node:child_process');
(async()=>{
  const server=spawn(process.execPath,[path.join(__dirname,'../tools/design-preview.cjs')],{stdio:['ignore','pipe','inherit'],env:{...process.env,IBTA_PREVIEW_PORT:'4174'}});
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('Preview server exited '+code)));});
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try{
    const context=await browser.newContext({viewport:{width:1500,height:1000}}),page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:4174/');
    await page.locator('#trainees-tab').click();
    await page.waitForFunction(()=>document.getElementById('sheet-status').textContent==='تم الحفظ');
    const cell=(r,c)=>page.locator(`td[data-v="${r}"][data-col="${c}"]`);
    const paste=async(r,c,text)=>{await cell(r,c).click();await cell(r,c).evaluate((el,text)=>{const data=new DataTransfer();data.setData('text/plain',text);el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));},text);};
    const values=['DEMO-001','sample@example.invalid','متدرب تجريبي','Demo Trainee','0012345','0501234567','جهة تجريبية','اختبار تجريبي','01/10/2026','demo-user','demo-password','ناجح','001234567'];
    await paste(0,0,values.join('\t')+'\r\n'+values.map((v,i)=>i===2?'متدرب ثانٍ':v).join('\t'));
    await page.locator('#sheet-save').click();await page.waitForFunction(()=>!Trainees.hasDraft());
    assert.equal(await cell(0,12).textContent(),'001234567');
    await cell(0,0).click();await cell(1,1).click({modifiers:['Shift']});
    assert.equal(await page.locator('.sheet-selected').count(),4,'Shift+click selects a rectangle');
    const copied=await cell(0,0).evaluate(el=>{const data=new DataTransfer();el.dispatchEvent(new ClipboardEvent('copy',{clipboardData:data,bubbles:true,cancelable:true}));return data.getData('text/plain');});
    assert.equal(copied,'DEMO-001\tsample@example.invalid\r\nDEMO-001\tsample@example.invalid');
    await page.keyboard.press('Delete');assert.equal(await cell(1,1).textContent(),'');
    await page.locator('#sheet-undo').click();assert.equal(await cell(1,1).textContent(),'sample@example.invalid');
    await cell(0,2).dblclick();await page.keyboard.press('Control+a');await page.keyboard.insertText('اسم معدل');await page.keyboard.press('Tab');
    assert.equal(await cell(0,2).textContent(),'اسم معدل');
    await page.keyboard.press('Control+z');assert.equal(await cell(0,2).textContent(),'متدرب تجريبي');
    await page.locator('#sheet-redo').click();assert.equal(await cell(0,2).textContent(),'اسم معدل');
    await page.locator('#sheet-search').fill('ثانٍ');assert.equal(await page.locator('#sheet-grid tbody tr').count(),1);
    await page.locator('#sheet-clear-filters').click();
    await page.locator('#sheet-save').click();await page.waitForFunction(()=>!Trainees.hasDraft());
    await page.locator('#sheet-owner').selectOption('demo-user');
    await page.waitForFunction(()=>document.getElementById('sheet-owner').value==='demo-user'&&!document.getElementById('sheet-owner').disabled);
    assert.equal(await cell(0,0).textContent(),'','Switching users must not retain previous cells');
    await paste(0,0,'PRIVATE-ROW');await page.locator('#sheet-save').click();await page.waitForFunction(()=>!Trainees.hasDraft());
    await page.locator('#sheet-owner').selectOption('demo-admin');
    await page.waitForFunction(()=>document.getElementById('sheet-owner').value==='demo-admin'&&!document.getElementById('sheet-owner').disabled);
    assert.equal(await cell(0,2).textContent(),'اسم معدل');
    // A failed save must keep the current owner's draft and block switching.
    await page.evaluate(()=>window.previewSaveError='CONFLICT');await paste(0,0,'UNSAVED');await page.locator('#sheet-save').click();
    await page.waitForFunction(()=>document.getElementById('sheet-status').dataset.error==='true');
    await page.locator('#sheet-owner').selectOption('demo-user');
    assert.equal(await page.locator('#sheet-owner').inputValue(),'demo-admin');assert.equal(await cell(0,0).textContent(),'UNSAVED');
    await page.evaluate(()=>window.previewSaveError='');await page.locator('#sheet-save').click();await page.waitForFunction(()=>!Trainees.hasDraft());
    // Edits during an in-flight save must be persisted in a subsequent save.
    await page.evaluate(()=>window.previewDelay=250);await paste(0,1,'first@example.invalid');await page.locator('#sheet-save').click();await paste(0,1,'second@example.invalid');
    await page.waitForFunction(()=>!Trainees.hasDraft());assert.equal(await page.evaluate(()=>previewSheets.get('demo-admin').cells[0][1]),'second@example.invalid');
    await page.evaluate(()=>window.previewDelay=0);
    await page.locator('#sheet-codes-mode').click();await page.locator('#sheet-pool').click();
    await page.locator('input[data-code="DEMO-POOL-002"]').check();page.once('dialog',d=>d.accept());await page.locator('#sheet-assign').click();
    await page.waitForFunction(()=>document.getElementById('sheet-code-status').textContent.includes('تم تحديث'));
    await page.locator('#sheet-owned').click();assert.match(await page.locator('#sheet-code-list').textContent(),/DEMO-POOL-002/);
    await page.locator('#sheet-mode').click();
    // Background autosave must not interrupt typing in the next cell.
    await paste(0,0,'DEMO-001');await cell(0,1).dblclick();
    await page.waitForTimeout(1100);assert.equal(await cell(0,1).getAttribute('contenteditable'),'true');
    await page.keyboard.press('Escape');await page.locator('#sheet-save').click();await page.waitForFunction(()=>!Trainees.hasDraft());
    await page.screenshot({path:path.join(__dirname,'../dist/trainees-preview.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'Grid must scroll within the page on mobile');
    assert.deepEqual(errors,[],'No browser runtime exceptions');
    console.log('PASS: grid paste/edit/undo/filter, account switching, autosave errors/races, allocation, mobile layout');
  }finally{await browser.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
