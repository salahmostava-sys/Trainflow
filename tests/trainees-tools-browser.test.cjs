const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawn}=require('node:child_process');
(async()=>{
  const server=spawn(process.execPath,[path.join(__dirname,'../tools/design-preview.cjs')],{stdio:['ignore','pipe','inherit'],env:{...process.env,IBTA_PREVIEW_PORT:'4179'}});
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try{
    const page=await browser.newPage({viewport:{width:1800,height:1100}}),errors=[];let promptValue='48';
    require('./sheet-toolbar-helper.cjs')(page);
    page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept(d.type()==='prompt'?promptValue:undefined));
    await page.goto('http://127.0.0.1:4179/');await page.locator('#trainees-tab').click();await page.waitForFunction(()=>document.getElementById('sheet-status').textContent==='تم الحفظ');
    assert.ok(await page.locator('.sheet-clean-toolbar').evaluate(el=>el.getBoundingClientRect().height)<230,'Visible ribbon stays compact');
    assert.equal(await page.locator('.sheet-ribbon-tabs').count(),0,'Tools share one ribbon without tabs');
    assert.equal(await page.locator('.sheet-ribbon-panel').count(),1);
    for(const id of ['sheet-font-family','sheet-freeze','sheet-columns-title'])assert.equal(await page.locator('#'+id).isVisible(),true,'All formatting and view tools are available together');
    assert.equal(await page.locator('.sheet-clean-toolbar .sheet-command-dropdown').count(),5,'Five remaining command groups have dropdowns');
    assert.equal(await page.locator('.sheet-command-popover:popover-open').count(),0,'Dropdown actions start hidden');
    assert.equal(await page.locator('#sheet-font-family').isVisible(),true);assert.equal(await page.locator('#sheet-prometric-open').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(16, 124, 65)','Prometric registration is green');
    assert.equal(await page.locator('#sheet-autosum-menu,#sheet-fill-menu,#sheet-clear-menu,#sheet-clear-format,#sheet-insert-menu,#sheet-delete-menu,#sheet-data-tools,#sheet-wrap,#sheet-copy,#sheet-clipboard-menu,#sheet-orientation-menu,#sheet-valign-top,#sheet-valign-middle,#sheet-valign-bottom,#sheet-indent-less,#sheet-indent-more,#sheet-format-painter').count(),0,'Removed and duplicate commands are absent');
    const cell=(r,c)=>page.locator(`td[data-v="${r}"][data-col="${c}"]`);
    const select=async(r,c,endR=r,endC=c)=>{await cell(r,c).click();if(r!==endR||c!==endC)await cell(endR,endC).click({modifiers:['Shift']});};
    const menu=async(id,item)=>{await page.locator('#'+id+'-'+item).click();};
    const paste=async(r,c,text)=>{await select(r,c);await cell(r,c).evaluate((el,text)=>{const dt=new DataTransfer();dt.setData('text/plain',text);el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}));},text);};
    await paste(0,13,'10\t20\n30\t40');await page.waitForFunction(()=>document.querySelector('td[data-v="1"][data-col="14"]').textContent==='40');
    await select(0,13,1,14);await page.locator('#sheet-font-family').selectOption('Calibri');await page.locator('#sheet-italic').click();await page.locator('#sheet-underline').click();await menu('sheet-border-menu','outline');
    const format=await cell(0,13).evaluate(el=>{const s=getComputedStyle(el);return {font:s.fontFamily,italic:s.fontStyle,underline:s.textDecorationLine,top:s.borderTopWidth,left:s.borderLeftWidth};});
    assert.match(format.font,/Calibri/);assert.equal(format.italic,'italic');assert.match(format.underline,/underline/);assert.equal(format.top,'1px');assert.equal(format.left,'1px');
    await select(0,13,1,14);await menu('sheet-merge-menu','center');assert.equal(await cell(0,13).getAttribute('colspan'),'2');assert.equal(await cell(0,13).getAttribute('rowspan'),'2');assert.equal(await cell(1,13).count(),0);assert.equal(await cell(0,13).textContent(),'10');
    await select(0,13);await menu('sheet-merge-menu','unmerge');assert.equal(await cell(1,13).count(),1);await page.locator('#sheet-undo').click();assert.equal(await cell(0,13).getAttribute('colspan'),'2');await page.locator('#sheet-undo').click();assert.equal(await cell(1,13).textContent(),'30');
    await paste(2,13,'=SUM(N1:N2)');assert.equal(await cell(2,13).textContent(),'40');assert.equal(await cell(2,13).getAttribute('data-formula'),'=SUM(N1:N2)');
    await paste(0,13,'50');assert.equal(await cell(2,13).textContent(),'80','Formula recalculates after source data changes');
    await paste(0,14,'=N1*2\n=N2*2\n=N3*2');assert.equal(await cell(1,14).getAttribute('data-formula'),'=N2*2');assert.equal(await cell(2,14).textContent(),'160');
    await paste(0,16,'fruit-banana\nfruit-apple');await select(0,16);await menu('sheet-sort-menu','ascending');await page.locator('#sheet-search').fill('fruit-');assert.equal(await page.locator('#sheet-grid tbody td[data-col="16"]').first().textContent(),'fruit-apple');await page.locator('#sheet-clear-filters').click();
    await select(0,13);await menu('sheet-cell-format-menu','row-height');assert.ok(await cell(0,13).evaluate(el=>el.getBoundingClientRect().height)>=48);
    promptValue='180';await menu('sheet-cell-format-menu','column-width');assert.ok(await cell(0,13).evaluate(el=>el.getBoundingClientRect().width)>=180);
    await select(0,16);await page.locator('#sheet-columns-title').click();await page.locator('[data-column-toggle="16"]').uncheck();await page.locator('#sheet-columns-close').click();assert.equal(await cell(0,16).count(),0);await page.locator('#sheet-columns-title').click();await page.locator('[data-column-toggle="16"]').check();await page.locator('#sheet-columns-close').click();assert.equal(await cell(0,16).count(),1);
    await select(0,13);await cell(0,13).click({button:'right'});await page.locator('[data-action="clear-format"]').click();assert.equal(await cell(0,13).evaluate(el=>getComputedStyle(el).fontStyle),'normal');assert.equal(await cell(0,13).textContent(),'50');
    await page.locator('#sheet-save').click();await page.waitForFunction(()=>!Trainees.hasDraft());await page.locator('#sheet-reload').click();await page.waitForFunction(()=>document.getElementById('sheet-status').textContent==='تم الحفظ');assert.equal(await cell(2,13).textContent(),'80');
    await select(0,13,1,14);await menu('sheet-merge-menu','cells');await page.locator('#sheet-save').click();await page.waitForFunction(()=>!Trainees.hasDraft());await page.locator('#sheet-reload').click();await page.waitForFunction(()=>document.getElementById('sheet-status').textContent==='تم الحفظ');assert.equal(await cell(0,13).getAttribute('colspan'),'2','Merges survive save and reload');
    await menu('sheet-merge-menu','unmerge');
    assert.equal(await page.locator('#sheet-xlsx-import,#sheet-xlsx-export').count(),2,'Table Excel exchange has direct buttons');
    const previousColumns=await page.locator('thead th[data-col]').count();promptValue='Extra field';await page.locator('#sheet-add-col').click();assert.equal(await page.locator('thead th[data-col]').count(),previousColumns+1,'Add column directly creates a custom column');assert.match(await page.locator(`thead th[data-col="${previousColumns}"]`).textContent(),/Extra field/);await page.locator('#sheet-undo').click();assert.equal(await page.locator('thead th[data-col]').count(),previousColumns);
    // Keyboard copy/paste must retain the destination's saved border edges.
    const borderSnapshot=async(r,c)=>cell(r,c).evaluate(el=>{const style=getComputedStyle(el);return ['Top','Bottom','Left','Right'].map(side=>[style['border'+side+'Width'],style['border'+side+'Style'],style['border'+side+'Color']]);});
    await select(0,20,1,21);await menu('sheet-border-menu','outline');
    const before=await Promise.all([borderSnapshot(0,20),borderSnapshot(0,21),borderSnapshot(1,20),borderSnapshot(1,21)]);
    await paste(0,16,'Copy1\tCopy2\nCopy3\tCopy4');await select(0,16,1,17);await menu('sheet-border-menu','none');await page.locator('#sheet-italic').click();const copiedText=await cell(0,16).evaluate(el=>{const dt=new DataTransfer();el.dispatchEvent(new ClipboardEvent('copy',{clipboardData:dt,bubbles:true,cancelable:true}));return dt.getData('text/plain');});assert.equal(copiedText.replace(/\r\n/g,'\n'),'Copy1\tCopy2\nCopy3\tCopy4');
    await paste(0,20,copiedText);await page.waitForFunction(()=>document.querySelector('td[data-v="0"][data-col="20"]').textContent==='Copy1');
    assert.deepEqual(await Promise.all([borderSnapshot(0,20),borderSnapshot(0,21),borderSnapshot(1,20),borderSnapshot(1,21)]),before,'Clipboard paste retains every destination border edge');
    const plainBefore=await borderSnapshot(0,22);await paste(0,22,copiedText);await page.waitForFunction(()=>document.querySelector('td[data-v="0"][data-col="22"]').textContent==='Copy1');assert.deepEqual(await borderSnapshot(0,22),plainBefore,'Copied no-border formatting cannot remove the default grid');
    await paste(0,20,'مراجعة\tبيانات\nصف ثان\t123');assert.deepEqual(await Promise.all([borderSnapshot(0,20),borderSnapshot(0,21),borderSnapshot(1,20),borderSnapshot(1,21)]),before,'Keyboard paste keeps the outlined range');
    await page.locator('#sheet-undo').click();assert.equal(await cell(0,20).textContent(),'Copy1');assert.deepEqual(await borderSnapshot(0,20),before[0]);await page.locator('#sheet-redo').click();assert.equal(await cell(0,20).textContent(),'مراجعة');
    await page.locator('#sheet-save').click();await page.waitForFunction(()=>!Trainees.hasDraft());await page.locator('#sheet-reload').click();await page.waitForFunction(()=>document.getElementById('sheet-status').textContent==='تم الحفظ');assert.deepEqual(await Promise.all([borderSnapshot(0,20),borderSnapshot(0,21),borderSnapshot(1,20),borderSnapshot(1,21)]),before,'Fixed destination borders survive save and reload');
    const dropdownIds=['sheet-rows-columns-menu','sheet-cell-format-menu','sheet-merge-menu','sheet-border-menu','sheet-sort-menu'];
    for(const id of dropdownIds){await page.locator('#'+id+'-trigger').click();assert.equal(await page.locator('.sheet-command-popover:popover-open').count(),1);assert.equal(await page.locator('#'+id+'-trigger').getAttribute('aria-expanded'),'true');await page.keyboard.press('Escape');assert.equal(await page.locator('.sheet-command-popover:popover-open').count(),0);}
    await page.locator('#sheet-address').fill('A1');await page.locator('#sheet-address').press('Enter');await page.locator('#sheet-rows-columns-menu-trigger').focus();await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate(()=>document.activeElement.id),'sheet-add');assert.equal(await page.locator('#sheet-delete-col').isDisabled(),true);await page.keyboard.press('End');assert.equal(await page.evaluate(()=>document.activeElement.id),'sheet-add-col','Keyboard skips protected column deletion');await page.keyboard.press('Escape');
    await page.locator('#sheet-border-menu-trigger').click();await page.locator('#sheet-sort-menu-trigger').click();assert.equal(await page.locator('.sheet-command-popover:popover-open').count(),1,'Opening another group closes the first');await page.keyboard.press('Escape');
    await page.locator('#sheet-rows-columns-menu-trigger').click();await page.screenshot({path:path.join(__dirname,'../artifacts/sheet-dropdowns-desktop.png')});await page.keyboard.press('Escape');
    const ribbonToggle=page.locator('#sheet-ribbon-toggle');assert.equal(await ribbonToggle.getAttribute('aria-controls'),'sheet-ribbon-panel-all');assert.equal(await ribbonToggle.getAttribute('aria-expanded'),'true');
    await page.locator('#sheet-border-menu-trigger').click();await ribbonToggle.click();assert.equal(await page.locator('.sheet-command-popover:popover-open').count(),0,'Collapsing closes open menus');assert.equal(await page.locator('#sheet-ribbon-panel-all').isVisible(),false);assert.equal(await ribbonToggle.getAttribute('aria-expanded'),'false');
    for(const id of ['sheet-save','sheet-search','sheet-address'])assert.equal(await page.locator('#'+id).isVisible(),true,'Collapsing keeps '+id+' accessible');
    await page.screenshot({path:path.join(__dirname,'../artifacts/sheet-ribbon-collapsed.png')});await page.reload();await page.waitForFunction(()=>document.getElementById('sheet-status')?.textContent==='تم الحفظ');assert.equal(await page.locator('#sheet-ribbon-panel-all').isVisible(),false,'Browser refresh retains collapsed preference');
    await page.locator('#sheet-expanded').click();assert.equal(await ribbonToggle.isVisible(),false,'Expanded view uses its existing Tools control');await page.locator('#sheet-expanded-tools').click();assert.equal(await page.locator('#sheet-ribbon-panel-all').isVisible(),true,'Expanded Tools can open a normally collapsed ribbon');await page.locator('#sheet-expanded-close').click();assert.equal(await page.locator('#sheet-ribbon-panel-all').isVisible(),false,'Exiting expanded view restores the normal collapsed choice');
    await ribbonToggle.focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#sheet-ribbon-panel-all').isVisible(),true);assert.equal(await ribbonToggle.getAttribute('aria-expanded'),'true');
    await page.setViewportSize({width:390,height:844});
    for(const language of ['ar','en']){
      if(await page.evaluate(()=>currentLang)!==language)await page.locator('#lang-btn').click();
      await ribbonToggle.click();assert.equal(await page.locator('#sheet-ribbon-panel-all').isVisible(),false);assert.equal(await ribbonToggle.textContent(),language==='ar'?'إظهار أدوات الجدول ▾':'Show sheet tools ▾');for(const id of ['sheet-save','sheet-search'])assert.equal(await page.locator('#'+id).isVisible(),true);await ribbonToggle.click();
      for(const id of dropdownIds){await page.locator('#'+id+'-trigger').click();assert.equal(await page.locator('#'+id+'-items').getAttribute('dir'),language==='ar'?'rtl':'ltr');const b=await page.locator('#'+id+'-items').boundingBox();assert.ok(b&&b.x>=0&&b.y>=0&&b.x+b.width<=391&&b.y+b.height<=845,'Mobile menu stays inside viewport: '+id);await page.keyboard.press('Escape');}
    }
    await page.locator('#sheet-sort-menu-trigger').click();await page.screenshot({path:path.join(__dirname,'../artifacts/sheet-dropdowns-mobile.png')});await page.locator('#sheet-status').click();assert.equal(await page.locator('.sheet-command-popover:popover-open').count(),0,'Outside click closes the menu');
    await page.locator('#sheet-sort-menu-trigger').click();await page.evaluate(()=>Trainees.suspend());assert.equal(await page.locator('.sheet-command-popover:popover-open').count(),0,'Sign-out cleanup closes menu actions');
    assert.deepEqual(errors,[]);console.log('PASS: unified ribbon with five dropdown groups and removed controls, keyboard/outside cleanup, mobile RTL/LTR bounds, keyboard copy/paste, font/borders/merge/undo/formulas/sort/size/hide and cloud reload');
  }finally{await browser.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
