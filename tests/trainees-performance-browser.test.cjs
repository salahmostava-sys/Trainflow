const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),{spawn}=require('node:child_process');
(async()=>{
  const server=spawn(process.execPath,[path.join(__dirname,'../tools/design-preview.cjs')],{env:{...process.env,IBTA_PREVIEW_PORT:'4181'},stdio:['ignore','pipe','inherit']});let browser;
  try{
    await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
    browser=await chromium.launch({headless:true,channel:'msedge'});
    const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];
    require('./sheet-toolbar-helper.cjs')(page);
    page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:4181/');await page.locator('#trainees-tab').click();
    await page.waitForFunction(()=>document.getElementById('sheet-status').textContent==='تم الحفظ');
    assert.equal(await page.locator('thead th[data-col]').count(),20,'Default sheets display only A through T');
    await page.evaluate(()=>{const old=previewSheets.get('demo-admin')||{version:0};previewSheets.set('demo-admin',{...old,cells:Array.from({length:3068},(_,i)=>Array.from({length:500},(_,c)=>c===2?'Trainee '+i:c===7?(i%2?'Certified Business Professional in Leadership and Management CBP-L':'محترف الأعمال المعتمد في القيادة الإدارية CBP-L'):c===19?'Last '+i:c===499?'Legacy '+i:'')),format:{direction:'ltr',headers:{19:'Last visible column',499:'Legacy column'},styles:{'0:16':{mergeCols:3,mergeRows:2},'10:19':{height:60,wrap:true},'5:18':{mergeCols:5},'1:499':{bold:true}}}});});
    await page.locator('#sheet-reload').click();await page.waitForFunction(()=>document.getElementById('sheet-status').textContent==='تم الحفظ');
    const mounted=()=>page.locator('#sheet-grid td[data-col]').count();assert.ok(await mounted()<2000,'Visible rows and columns bound DOM size even for 1.5 million data cells');
    assert.equal(await page.locator('thead th[data-col]').count(),20,'Legacy data and headers beyond T never expand the displayed grid');
    assert.equal(await page.locator('thead th[data-col="20"],td[data-col="499"]').count(),0);
    await page.locator('th[data-rowv="0"] button').click();
    assert.equal(await page.locator('#sheet-address').inputValue(),'A1','Whole-row selection keeps the active cell inside the displayed grid');
    const copied=await page.locator('#sheet-grid').evaluate(el=>{const clipboardData=new DataTransfer();el.dispatchEvent(new ClipboardEvent('copy',{clipboardData,bubbles:true,cancelable:true}));return clipboardData.getData('text/plain').split('\t');});
    assert.equal(copied.length,500,'Whole-row copy retains stored columns beyond the display limit');assert.equal(copied[499],'Legacy 0');
    const go=async(address)=>{await page.locator('#sheet-address').fill(address);await page.locator('#sheet-address').press('Enter');};
    for(const direction of ['ltr','rtl']){
      await page.locator('#sheet-direction').selectOption(direction);await page.locator('thead th[data-col="7"] button').click();
      for(const align of ['left','right','center']){
        await page.locator('#sheet-align-'+align).click();
        for(const r of [0,1]){
          const edges=await page.locator(`td[data-v="${r}"][data-col="7"]`).evaluate(el=>{const range=document.createRange();range.selectNodeContents(el.querySelector('.sheet-cell-value'));const text=range.getBoundingClientRect(),cell=el.getBoundingClientRect();return {align:getComputedStyle(el).textAlign,left:text.left-cell.left,right:cell.right-text.right,center:(text.left+text.right-cell.left-cell.right)/2,selected:el.classList.contains('sheet-selected')};});
          assert.equal(edges.align,align);assert.equal(edges.selected,true,'Column selection survives toolbar actions');
          assert.ok(Math.abs(align==='left'?edges.left-6:align==='right'?edges.right-7:edges.center)<2,'Long Arabic and English exam names visibly follow '+align+' alignment in '+direction+': '+JSON.stringify(edges));
        }
        await page.locator('#sheet-save').click();await page.waitForFunction(()=>!Trainees.hasDraft());
        assert.equal(await page.evaluate(()=>previewSheets.get('demo-admin').format.styles['3067:7'].align),align,'The last data row receives whole-column alignment');
        assert.equal(await page.evaluate(()=>previewSheets.get('demo-admin').format.styles['4067:7'].align),align,'Empty input rows receive whole-column alignment');
      }
    }
    await page.locator('#sheet-direction').selectOption('ltr');await page.locator('#sheet-undo').click();await page.locator('#sheet-redo').click();
    const aligned=async()=>{const delta=await page.locator('td.sheet-current').evaluate(td=>{const th=document.querySelector('thead th[data-col="'+td.dataset.col+'"]');return Math.abs(td.getBoundingClientRect().left-th.getBoundingClientRect().left);});assert.ok(delta<2,'Column spacers retain header/cell alignment');};
    await go('T3068');assert.equal(await page.locator('td.sheet-current').textContent(),'Last 3067');await aligned();assert.ok(await mounted()<2000);
    await page.keyboard.press('F2');await page.keyboard.press('Control+a');await page.keyboard.insertText('Changed last');
    await page.setViewportSize({width:1400,height:1000});
    assert.equal(await page.locator('td.sheet-current').getAttribute('contenteditable'),'true','Resizing does not interrupt typing');
    await page.keyboard.press('Enter');await page.locator('#sheet-save').click();await page.waitForFunction(()=>!Trainees.hasDraft());
    assert.equal(await page.evaluate(()=>previewSheets.get('demo-admin').cells[3067][19]),'Changed last');
    assert.equal(await page.evaluate(()=>previewSheets.get('demo-admin').cells[3067][499]),'Legacy 3067','Editing a visible cell preserves legacy columns');
    await page.locator('#sheet-undo').click();await go('T3068');assert.equal(await page.locator('td.sheet-current').textContent(),'Last 3067');
    await page.locator('#sheet-redo').click();await go('T3068');assert.equal(await page.locator('td.sheet-current').textContent(),'Changed last');
    await go('Q1');assert.equal(await page.locator('td.sheet-current').getAttribute('colspan'),'3','Visible merges stay intact');await aligned();
    await go('S6');assert.equal(await page.locator('td.sheet-current').getAttribute('colspan'),'2','Merges crossing T stop at the displayed boundary');await aligned();
    await go('T11');assert.ok(await page.locator('td.sheet-current').evaluate(el=>el.getBoundingClientRect().height)>=60);
    await go('T100');await page.keyboard.press('ArrowRight');assert.equal(await page.locator('td.sheet-current').getAttribute('data-col'),'19','Keyboard navigation stops at T');
    await go('U100');assert.equal(await page.locator('td.sheet-current').getAttribute('data-col'),'19','Address navigation cannot reveal U');
    await page.locator('td.sheet-current').evaluate(el=>{const clipboardData=new DataTransfer();clipboardData.setData('text/plain','VISIBLE\tLEGACY PASTE');el.dispatchEvent(new ClipboardEvent('paste',{clipboardData,bubbles:true,cancelable:true}));});
    await page.locator('#sheet-save').click();await page.waitForFunction(()=>!Trainees.hasDraft());
    assert.deepEqual(await page.evaluate(()=>{const row=previewSheets.get('demo-admin').cells[99];return [row[19],row[20],row[499]];}),['VISIBLE','LEGACY PASTE','Legacy 99'],'Wide paste stays contiguous and preserves other legacy columns');
    assert.equal(await page.locator('thead th[data-col]').count(),20,'Wide paste cannot expand the visible grid');
    await page.locator('#sheet-undo').click();
    await page.locator('#sheet-direction').selectOption('rtl');await go('C100');assert.equal(await page.locator('td.sheet-current').textContent(),'Trainee 99');await aligned();
    await go('T2000');assert.equal(await page.locator('td.sheet-current').textContent(),'Last 1999');await aligned();
    await page.locator('#sheet-zoom-in').click();await go('T3068');await aligned();
    await page.setViewportSize({width:390,height:844});if(await page.locator('#sidebar-backdrop').isVisible())await page.locator('#sidebar-backdrop').click({position:{x:10,y:10}});await go('C1');await aligned();assert.ok(await mounted()<1000);
    await page.locator('#sheet-save').click();await page.waitForFunction(()=>!Trainees.hasDraft());await page.locator('#sheet-reload').click();await page.waitForFunction(()=>document.getElementById('sheet-status').textContent==='تم الحفظ');
    await go('T3068');assert.equal(await page.locator('td.sheet-current').textContent(),'Changed last','Visible edits survive compact persistence and reload');
    const legacy=await page.evaluate(()=>{const sheet=previewSheets.get('demo-admin');return {value:sheet.cells[3067][499],header:sheet.format.headers[499],style:sheet.format.styles['1:499']};});
    assert.deepEqual(legacy,{value:'Legacy 3067',header:'Legacy column',style:{bold:true}},'Saving and reloading preserve legacy data and formatting');
    assert.equal(await page.locator('thead th[data-col]').count(),20,'Reload and mobile layouts retain the 20-column limit');
    await page.keyboard.press('Control+ArrowUp');assert.equal(await page.locator('td.sheet-current').getAttribute('data-v'),'0');
    await page.keyboard.press('Control+ArrowDown');assert.equal(await page.locator('td.sheet-current').getAttribute('data-v'),'3067','Ctrl+Down skips the 1000 empty input rows');
    await go('C4068');await page.keyboard.press('F2');await page.keyboard.insertText('New last row');await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.getElementById('sheet-grid').getAttribute('aria-rowcount')==='5069');
    await page.keyboard.press('Control+ArrowDown');assert.equal(await page.locator('td.sheet-current').getAttribute('data-v'),'4067','New entries extend both navigation and the 1000-row buffer');
    const bottom=await page.locator('.sheet-scroll').evaluate(async el=>{el.scrollTop=el.scrollHeight;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return el.scrollTop;});
    await page.evaluate(()=>Trainees.translate());
    assert.ok(Math.abs(await page.locator('.sheet-scroll').evaluate(el=>el.scrollTop)-bottom)<40,'Background refresh preserves the bottom scroll position');
    await page.waitForFunction(()=>!Trainees.hasDraft());
    assert.ok(await page.locator('.sheet-scroll').evaluate(el=>el.scrollTop)>bottom-40,'Autosave never returns the user to the first row');
    assert.deepEqual(errors,[]);console.log('PASS: 20 displayed columns, 3068 × 500 stored cells, legacy preservation, clipped merges, navigation, undo, save, RTL alignment, zoom and mobile');
  }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
