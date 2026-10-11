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
    require('./sheet-toolbar-helper.cjs')(page);
    const columns=require('./sheet-column-helper.cjs')(page);
    const switchLanguage=async()=>{if(!await page.locator('#lang-btn').isVisible())await page.locator('#sidebar-toggle').click();await page.locator('#lang-btn').click();if(await page.locator('#sidebar-backdrop').isVisible())await page.locator('#sidebar-backdrop').click({position:{x:10,y:10}});};
    page.on('pageerror',error=>errors.push(error.message));
    const worksheets=require('./worksheet-ui-helper.cjs')(page);await page.goto('http://127.0.0.1:4174/');
    await page.locator('#trainees-tab').click();
    await page.waitForFunction(()=>document.getElementById('sheet-status').textContent==='تم الحفظ');
    const cell=(r,c)=>page.locator(`td[data-v="${r}"][data-col="${c}"]`);
    const paste=async(r,c,text)=>{await cell(r,c).click();await cell(r,c).evaluate((el,text)=>{const data=new DataTransfer();data.setData('text/plain',text);el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));},text);};
    const values=['DEMO-001','sample@example.invalid','متدرب تجريبي','Demo Trainee','0012345','0501234567','جهة تجريبية','اختبار تجريبي','01/10/2026','demo-user','demo-password','ناجح','001234567'];
    await paste(0,0,values.join('\t')+'\r\n'+values.map((v,i)=>i===2?'متدرب ثانٍ':v).join('\t'));
    await page.locator('#sheet-save').click();await page.waitForFunction(()=>!Trainees.hasDraft());
    assert.equal(await cell(0,12).textContent(),'001234567');
    for(const locator of [cell(0,2),cell(0,11).locator('select'),page.locator('thead th[data-col="2"]'),page.locator('th.sheet-rownum button').first()]){
      const font=await locator.evaluate(el=>({family:getComputedStyle(el).fontFamily,size:getComputedStyle(el).fontSize}));assert.match(font.family,/Calibri/);assert.equal(font.size,'13px');
    }
    await cell(0,0).click();await cell(1,1).click({modifiers:['Shift']});
    assert.equal(await page.locator('.sheet-selected').count(),4,'Shift+click selects a rectangle');
    const copied=await cell(0,0).evaluate(el=>{const data=new DataTransfer();el.dispatchEvent(new ClipboardEvent('copy',{clipboardData:data,bubbles:true,cancelable:true}));return data.getData('text/plain');});
    assert.equal(copied,'DEMO-001\tsample@example.invalid\r\nDEMO-001\tsample@example.invalid');
    await page.keyboard.press('Delete');assert.equal(await cell(1,1).textContent(),'');
    await page.locator('#sheet-undo').click();assert.equal(await cell(1,1).textContent(),'sample@example.invalid');
    for(const column of [1,2,3]){
      await cell(0,column).click();assert.equal(await page.locator('#sheet-trainee-dialog').isVisible(),false,'Single click continues to select a cell');
      await cell(0,column).dblclick();await page.locator('#sheet-trainee-dialog').waitFor({state:'visible'});
      assert.match(await page.locator('#sheet-trainee-record').textContent(),/Demo Trainee/);
      assert.notEqual(await cell(0,column).getAttribute('contenteditable'),'true','Double click opens details without starting an edit');
      await page.keyboard.press('Escape');
    }
    await cell(0,2).click();await page.keyboard.press('F2');await page.keyboard.press('Control+a');await page.keyboard.insertText('اسم معدل');await page.keyboard.press('Tab');
    assert.equal(await cell(0,2).textContent(),'اسم معدل');
    await page.keyboard.press('Control+z');assert.equal(await cell(0,2).textContent(),'متدرب تجريبي');
    await page.locator('#sheet-redo').click();assert.equal(await cell(0,2).textContent(),'اسم معدل');
    await page.locator('#sheet-search').fill('ثانٍ');assert.equal(await page.locator('#sheet-grid tbody tr').count(),1);
    await page.locator('#sheet-clear-filters').click();
    await page.locator('#sheet-save').click();await page.waitForFunction(()=>!Trainees.hasDraft());
    await worksheets.switchTo('demo-user');

    assert.equal(await cell(0,0).textContent(),'','Switching users must not retain previous cells');
    await paste(0,0,'PRIVATE-ROW');await page.locator('#sheet-save').click();await page.waitForFunction(()=>!Trainees.hasDraft());
    await worksheets.switchTo('demo-admin');

    assert.equal(await cell(0,2).textContent(),'اسم معدل');
    // A failed save must keep the current owner's draft and block switching.
    await page.evaluate(()=>window.previewSaveError='CONFLICT');await paste(0,0,'UNSAVED');await page.locator('#sheet-save').click();
    await page.waitForFunction(()=>document.getElementById('sheet-status').dataset.error==='true');
    await worksheets.switchTo('demo-user');
    assert.equal(await worksheets.owner(),'demo-admin');assert.equal(await cell(0,0).textContent(),'UNSAVED');
    await page.evaluate(()=>window.previewSaveError='');await page.locator('#sheet-save').click();await page.waitForFunction(()=>!Trainees.hasDraft());
    // Edits during an in-flight save must be persisted in a subsequent save.
    await page.evaluate(()=>window.previewDelay=250);await paste(0,1,'first@example.invalid');await page.locator('#sheet-save').click();await paste(0,1,'second@example.invalid');
    await page.waitForFunction(()=>!Trainees.hasDraft());assert.equal(await page.evaluate(()=>previewSheets.get('demo-admin').cells[0][1]),'second@example.invalid');
    await page.evaluate(()=>window.previewDelay=0);
    // Background autosave must not interrupt typing in the next cell.
    await paste(0,0,'DEMO-001');await cell(0,1).click();await page.keyboard.press('F2');
    await page.waitForTimeout(1100);assert.equal(await cell(0,1).getAttribute('contenteditable'),'true');
    await page.keyboard.press('Escape');await page.locator('#sheet-save').click();await page.waitForFunction(()=>!Trainees.hasDraft());
    // Formatting must persist with each owner's sheet and participate in undo.
    await cell(0,2).click();assert.equal(await page.locator('#sheet-selection-size').isDisabled(),true);
    await page.locator('#sheet-fill').evaluate(el=>{el.value='#fff2cc';el.dispatchEvent(new Event('change',{bubbles:true}));});
    await page.locator('#sheet-text-color').evaluate(el=>{el.value='#112233';el.dispatchEvent(new Event('change',{bubbles:true}));});
    await page.locator('#sheet-bold').click();
    assert.equal(await cell(0,2).evaluate(el=>getComputedStyle(el).fontSize),'13px');
    assert.equal(await cell(0,2).evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 242, 204)');
    assert.equal(await page.locator('#sheet-font-plus').isDisabled(),true);assert.equal(await page.locator('#sheet-font-size').textContent(),'13 px');
    assert.equal(await page.locator('#sheet-font-minus').isDisabled(),true);assert.equal(await cell(0,2).evaluate(el=>getComputedStyle(el).fontSize),'13px');
    await columns.width(2,300);
    assert.ok(Math.abs((await cell(0,2).boundingBox()).width-300)<1,'Typed column width changes the actual grid');
    await columns.width(2,900);assert.ok(Math.abs((await cell(0,2).boundingBox()).width-300)<1,'An out-of-range width cannot overwrite the saved width');
    await page.locator('.sheet-col-resizer[data-resizer-col="2"]').dblclick();assert.ok(Math.abs((await cell(0,2).boundingBox()).width-220)<1,'Resetting the width restores the default');
    await columns.width(2,300);
    for(const direction of ['ltr','rtl']){
      await page.locator('#sheet-direction').selectOption(direction);
      const handle=page.locator('.sheet-col-resizer[data-resizer-col="2"]');await handle.scrollIntoViewIfNeeded();
      const before=(await cell(0,2).boundingBox()).width,grip=await handle.boundingBox();
      await page.mouse.move(grip.x+grip.width/2,grip.y+grip.height/2);await page.mouse.down();await page.mouse.move(grip.x+grip.width/2+(direction==='rtl'?-30:30),grip.y+grip.height/2);await page.mouse.up();
      assert.ok(Math.abs((await cell(0,2).boundingBox()).width-before-30)<1,'Dragging resizes the column in '+direction+' direction');
    }
    await columns.width(2,300);
    await page.locator('#sheet-direction').selectOption('rtl');
    assert.equal(await page.locator('.sheet-scroll').evaluate(el=>getComputedStyle(el).direction),'rtl');
    await columns.hide(1);
    assert.equal(await cell(0,1).count(),0,'Hidden columns must not be rendered');
    await cell(0,0).click();await page.keyboard.press('Tab');assert.equal(await page.locator('td:focus').getAttribute('data-col'),'2','Tab skips hidden columns');
    await page.keyboard.press('ArrowRight');assert.equal(await page.locator('td:focus').getAttribute('data-col'),'0','RTL arrows follow visual order');
    await page.locator('#sheet-save').click();await page.waitForFunction(()=>!Trainees.hasDraft());await page.locator('#sheet-reload').click();
    await page.waitForFunction(()=>!document.getElementById('sheet-workspace').inert);
    assert.equal(await cell(0,1).count(),0);assert.equal(await cell(0,2).evaluate(el=>getComputedStyle(el).fontSize),'13px');
    assert.ok(Math.abs((await cell(0,2).boundingBox()).width-300)<1,'Column widths survive saving and reloading');
    assert.equal(await page.locator('#sheet-direction').inputValue(),'rtl');
    await paste(0,0,'DEMO-001\tلصق مع عمود مخفي');assert.equal(await cell(0,2).textContent(),'لصق مع عمود مخفي');
    await page.locator('#sheet-save').click();await page.waitForFunction(()=>!Trainees.hasDraft());
    assert.equal(await page.evaluate(()=>previewSheets.get('demo-admin').cells[0][1]),'second@example.invalid','Paste must not overwrite hidden columns');
    await page.locator('#sheet-undo').click();
    // Formatting stays attached to rows through deletion and undo.
    await page.locator('#sheet-grid tbody .sheet-rownum button').first().click();page.once('dialog',d=>d.accept());await page.locator('#sheet-delete').click();
    assert.notEqual(await cell(0,2).evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 242, 204)');
    await page.locator('#sheet-undo').click();assert.equal(await cell(0,2).evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 242, 204)');
    await worksheets.switchTo('demo-user');

    assert.equal(await cell(0,1).count(),1);assert.equal(await page.locator('#sheet-direction').inputValue(),'ltr');
    assert.ok(Math.abs((await cell(0,2).boundingBox()).width-220)<1,'A different owner keeps its own column widths');
    await worksheets.switchTo('demo-admin');

    assert.equal(await cell(0,1).count(),0);assert.equal(await page.locator('#sheet-direction').inputValue(),'rtl');
    // Result values remain Arabic, with stable colors, even under English UI.
    await cell(0,11).locator('select').selectOption('راسب');
    assert.equal(await cell(0,11).evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 0, 0)');
    await cell(1,11).locator('select').selectOption('لم يدخل');
    assert.equal(await cell(1,11).evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 0)');
    await switchLanguage();assert.equal(await cell(0,11).locator('select').inputValue(),'راسب');
    assert.match(await cell(0,11).locator('select').textContent(),/ناجح/);await switchLanguage();
    // Duplicate marks use the whole sheet, not only visible/filtered rows.
    await paste(0,4,'٢١٢٣٤٥٦٧٨٩');await paste(1,4,'2123456789');
    assert.equal(await page.locator('.sheet-duplicate-badge').count(),2);
    assert.equal(await cell(0,4).evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 199, 206)');
    assert.equal(await cell(0,4).evaluate(el=>getComputedStyle(el).color),'rgb(156, 0, 6)');
    await page.mouse.move(1,1);await cell(0,4).hover();await page.locator('#sheet-duplicate-hint').waitFor({state:'visible'});
    const hint=await page.locator('#sheet-duplicate-hint').textContent();
    assert.match(hint,/مكرر 2 مرات/);assert.match(hint,/اختبار تجريبي/,'Duplicate preview includes the original exam name');assert.match(hint,/demo-user/);assert.match(hint,/demo-password/);assert.match(hint,/راسب/);assert.match(hint,/لم يدخل/);
    await cell(0,4).click();await page.locator('#sheet-duplicate-dialog').waitFor({state:'visible'});
    assert.equal(await page.locator('#sheet-duplicate-records .sheet-detail-record').count(),2);
    assert.equal(await page.locator('#sheet-duplicate-records dd').count(),26,'All 13 fields of each match are available');
    assert.match(await page.locator('#sheet-duplicate-records').textContent(),/second@example.invalid/,'Hidden email is present in full details');
    assert.match(await page.locator('#sheet-duplicate-records').textContent(),/001234567/);
    await page.screenshot({path:path.join(__dirname,'../dist/trainees-duplicate-dialog.png'),fullPage:true});
    await page.keyboard.press('Escape');await page.locator('#sheet-duplicate-dialog').waitFor({state:'hidden'});
    await page.locator('#sheet-search').fill('ثانٍ');assert.match(await cell(0,4).textContent(),/2×/);assert.doesNotMatch(await cell(0,4).textContent(),/مكرر/);
    await page.locator('#sheet-clear-filters').click();await page.locator('#sheet-duplicates-only').check();
    assert.equal(await page.locator('#sheet-grid tbody tr').count(),2);await page.locator('#sheet-duplicates-only').uncheck();
    await cell(1,4).dblclick();await page.keyboard.press('Control+a');await page.keyboard.insertText('9999999999');await page.keyboard.press('Tab');
    assert.equal(await page.locator('.sheet-duplicate-badge').count(),0,'Resolving a duplicate clears both marks');
    await page.locator('#sheet-undo').click();assert.equal(await page.locator('.sheet-duplicate-badge').count(),2);
    // Removing the ID shortcut keeps details readable and ID editing available in the grid.
    await page.setViewportSize({width:390,height:844});if(await page.locator('#sidebar-backdrop').isVisible())await page.locator('#sidebar-backdrop').click({position:{x:10,y:10}});await cell(0,4).click();await page.locator('#sheet-duplicate-dialog').waitFor({state:'visible'});
    assert.ok(await page.locator('#sheet-duplicate-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Mobile details must not overflow horizontally');
    assert.equal(await page.locator('#sheet-detail-edit').count(),0);assert.equal(await page.locator('#sheet-duplicate-dialog .sheet-detail-footer').isVisible(),false,'An unneeded footer leaves no empty divider');
    await page.keyboard.press('Escape');await cell(0,4).click();await page.keyboard.press('F2');assert.equal(await cell(0,4).getAttribute('contenteditable'),'true');await page.keyboard.press('Escape');
    await page.setViewportSize({width:1500,height:1000});
    await page.locator('#sheet-save').click();await page.waitForFunction(()=>!Trainees.hasDraft());
    await page.screenshot({path:path.join(__dirname,'../dist/trainees-preview.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'Grid must scroll within the page on mobile');
    assert.deepEqual(errors,[],'No browser runtime exceptions');
    console.log('PASS: grid paste/edit/undo/filter, account switching, autosave errors/races, allocation, mobile layout');
  }finally{await browser.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
