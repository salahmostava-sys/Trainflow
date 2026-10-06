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
    await page.evaluate(()=>{const old=previewSheets.get('demo-admin')||{version:0};previewSheets.set('demo-admin',{...old,cells:Array.from({length:3068},(_,i)=>Array.from({length:500},(_,c)=>c===2?'Trainee '+i:c===7?(i%2?'Certified Business Professional in Leadership and Management CBP-L':'محترف الأعمال المعتمد في القيادة الإدارية CBP-L'):c===499?'Last '+i:'')),format:{direction:'ltr',headers:{499:'Last column'},styles:{'0:250':{mergeCols:4,mergeRows:2},'10:499':{height:60,wrap:true}}}});});
    await page.locator('#sheet-reload').click();await page.waitForFunction(()=>document.getElementById('sheet-status').textContent==='تم الحفظ');
    const mounted=()=>page.locator('#sheet-grid td[data-col]').count();assert.ok(await mounted()<2000,'Visible rows and columns bound DOM size even for 1.5 million data cells');
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
    await go('SF3068');assert.equal(await page.locator('td.sheet-current').textContent(),'Last 3067');await aligned();assert.ok(await mounted()<2000);
    await page.keyboard.press('F2');await page.keyboard.press('Control+a');await page.keyboard.insertText('Changed last');
    await page.setViewportSize({width:1400,height:1000});
    assert.equal(await page.locator('td.sheet-current').getAttribute('contenteditable'),'true','Resizing does not interrupt typing');
    await page.keyboard.press('Enter');await page.locator('#sheet-save').click();await page.waitForFunction(()=>!Trainees.hasDraft());
    assert.equal(await page.evaluate(()=>previewSheets.get('demo-admin').cells[3067][499]),'Changed last');
    await page.locator('#sheet-undo').click();await go('SF3068');assert.equal(await page.locator('td.sheet-current').textContent(),'Last 3067');
    await page.locator('#sheet-redo').click();await go('SF3068');assert.equal(await page.locator('td.sheet-current').textContent(),'Changed last');
    await go('IQ1');assert.equal(await page.locator('td.sheet-current').getAttribute('colspan'),'4','A far-column merge stays intact');await aligned();
    await go('SF11');assert.ok(await page.locator('td.sheet-current').evaluate(el=>el.getBoundingClientRect().height)>=60);
    await page.locator('#sheet-freeze').click();await go('SF100');assert.equal(await page.locator('td[data-v="99"][data-col="0"]').count(),1,'Frozen first column stays mounted');
    await page.locator('#sheet-direction').selectOption('rtl');await go('C100');assert.equal(await page.locator('td.sheet-current').textContent(),'Trainee 99');await aligned();
    await go('SF2000');assert.equal(await page.locator('td.sheet-current').textContent(),'Last 1999');await aligned();
    await page.locator('#sheet-zoom-in').click();await go('SF3068');await aligned();
    await page.setViewportSize({width:390,height:844});if(await page.locator('#sidebar-backdrop').isVisible())await page.locator('#sidebar-backdrop').click({position:{x:10,y:10}});await go('C1');await aligned();assert.ok(await mounted()<1000);
    await page.locator('#sheet-save').click();await page.waitForFunction(()=>!Trainees.hasDraft());await page.locator('#sheet-reload').click();await page.waitForFunction(()=>document.getElementById('sheet-status').textContent==='تم الحفظ');
    await go('SF3068');assert.equal(await page.locator('td.sheet-current').textContent(),'Changed last','Far edits survive compact persistence and reload');
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
    assert.deepEqual(errors,[]);console.log('PASS: 3068 × 500 viewport, distant cells/merges, undo, save, frozen column, RTL alignment, zoom, resize during editing and mobile');
  }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
