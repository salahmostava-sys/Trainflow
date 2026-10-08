const assert=require('node:assert/strict'),path=require('node:path'),{spawn}=require('node:child_process'),{chromium}=require('playwright');
(async()=>{
  const server=spawn(process.execPath,['tools/design-preview.cjs'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,IBTA_PREVIEW_PORT:'4215'},stdio:['ignore','pipe','inherit']});let browser;
  try{
    await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
    browser=await chromium.launch({channel:'msedge',headless:true});
    const context=await browser.newContext({viewport:{width:1500,height:1000},permissions:['clipboard-read','clipboard-write']}),page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:4215/');await page.locator('#trainees-tab').click();
    await page.waitForFunction(()=>document.getElementById('sheet-status').textContent==='تم الحفظ');
    await page.evaluate(()=>{
      const rows=Array.from({length:260},(_,index)=>{const row=TraineeData.blank(200);row[0]='DUMMY-'+index;row[1]='dummy'+index+'@example.invalid';row[2]='متدرب '+index;row[3]='DUMMY STUDENT '+index;return row;});
      rows[0][4]='001234';rows[0][6]='DUMMY ORGANIZATION';rows[0][11]='ناجح';rows[0][18]='KEEP CUSTOM';rows[1][30]='KEEP TARGET TAIL';rows[2][13]='=2+3';
      previewSheets.set('demo-admin',{cells:rows,version:0,format:{headers:{199:'Last column'},styles:{'0:3':{bg:'#ff0000'},'1:3':{bg:'#00aa77'}}}});
    });
    await page.locator('#sheet-reload').click();await page.waitForFunction(()=>document.querySelector('td[data-v="0"][data-col="3"]').textContent==='DUMMY STUDENT 0');
    const cell=(r,c)=>page.locator(`td[data-v="${r}"][data-col="${c}"]`),content=page.locator('#sheet-cell-content');
    const go=async address=>{await page.locator('#sheet-address').fill(address);await page.locator('#sheet-address').press('Enter');};
    // Regression: the content bar was readonly, even when a name was selected.
    await cell(0,3).click();await content.fill('MARIAM QASIM M ALAHDAL');
    await content.evaluate(input=>input.setSelectionRange(15,15));
    await page.waitForFunction(()=>previewSheets.get('demo-admin').cells[0][3]==='MARIAM QASIM M ALAHDAL');
    assert.equal(await content.evaluate(input=>input.selectionStart),15,'Autosave preserves the input caret');
    assert.equal(await content.inputValue(),'MARIAM QASIM M ALAHDAL');
    await content.press('Enter');assert.equal(await cell(0,3).textContent(),'MARIAM QASIM M ALAHDAL');
    await content.fill('CANCEL THIS EDIT');await content.press('Escape');
    assert.equal(await cell(1,3).textContent(),'DUMMY STUDENT 1');
    await page.locator('#sheet-address').fill('N3');await page.locator('#sheet-address').press('Enter');
    assert.equal(await content.inputValue(),'5');await content.focus();assert.equal(await content.inputValue(),'=2+3');await content.press('Escape');
    await page.locator('#sheet-columns-title').click();await page.locator('[data-column-toggle="1"]').uncheck();await page.locator('#sheet-columns-close').click();
    await page.locator('th[data-rowv="0"] button').click();await page.keyboard.press('Control+c');
    const expected=await page.evaluate(()=>previewSheets.get('demo-admin').cells[0].slice(0,19));
    await page.waitForFunction(async text=>await navigator.clipboard.readText()===text,expected.join('\t'));
    const copied=await page.evaluate(async()=>{const [item]=await navigator.clipboard.read();return {text:await(await item.getType('text/plain')).text(),html:await(await item.getType('text/html')).text()};});
    assert.deepEqual(copied.text.split('\t'),expected,'Row copy retains hidden fields and internal blanks without empty trailing columns');
    assert.doesNotMatch(copied.html,/background-color/,'Whole rows copy data without source formatting');
    await page.locator('th[data-rowv="1"] button').click();await page.keyboard.press('Control+v');
    await page.waitForFunction(()=>previewSheets.get('demo-admin').cells[1][3]==='MARIAM QASIM M ALAHDAL');
    const pasted=await page.evaluate(()=>previewSheets.get('demo-admin'));
    assert.deepEqual(pasted.cells[1].slice(0,19),expected);assert.equal(pasted.cells[1][30],'KEEP TARGET TAIL');assert.equal(pasted.format.styles['1:3'].bg,'#00aa77');
    await go('A4');await page.keyboard.press('Control+v');
    await page.waitForFunction(()=>previewSheets.get('demo-admin').cells[3][18]==='KEEP CUSTOM');
    assert.deepEqual(await page.evaluate(()=>previewSheets.get('demo-admin').cells[3].slice(0,19)),expected,'Pasting on the first cell also retains hidden-column positions');
    await go('A5');await cell(4,0).click({button:'right'});await page.locator('#sheet-context-menu [data-action="paste"]').click();
    await page.waitForFunction(()=>previewSheets.get('demo-admin').cells[4][18]==='KEEP CUSTOM');
    assert.deepEqual(await page.evaluate(()=>previewSheets.get('demo-admin').cells[4].slice(0,19)),expected,'Context-menu paste uses the same row layout');
    await page.locator('th[data-rowv="0"] button').click();await page.locator('th[data-rowv="1"] button').click({modifiers:['Shift']});await page.keyboard.press('Control+c');
    await page.waitForFunction(async()=> (await navigator.clipboard.readText()).split('\r\n').length===2);
    assert.equal((await page.evaluate(()=>navigator.clipboard.readText())).split('\r\n').length,2,'A row range copies both records');
    await page.locator('#sheet-columns-title').click();await page.locator('[data-column-toggle="1"]').check();await page.locator('#sheet-columns-close').click();
    const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    for(const direction of ['ltr','rtl']){
      await page.locator('#sheet-direction').selectOption(direction);await go('D1');
      await page.locator('.sheet-scroll').evaluate(scroll=>{scroll.scrollLeft=0;scroll.scrollTop=0;});await settle();
      const origin=await cell(0,3).boundingBox(),viewport=await page.locator('.sheet-scroll').boundingBox();
      await page.mouse.move(origin.x+origin.width/2,origin.y+origin.height/2);await page.mouse.down();
      await page.mouse.move(direction==='ltr'?viewport.x+viewport.width-3:viewport.x+3,origin.y+origin.height/2,{steps:8});
      await page.waitForFunction(()=>Math.abs(document.querySelector('.sheet-scroll').scrollLeft)>550&&Number(document.querySelector('td.sheet-current')?.dataset.col)>6);
      await page.mouse.up();await settle();
      const horizontal=await page.locator('.sheet-scroll').evaluate(scroll=>scroll.scrollLeft);await settle();assert.equal(await page.locator('.sheet-scroll').evaluate(scroll=>scroll.scrollLeft),horizontal,'Releasing the pointer stops horizontal scrolling in '+direction);
      await go('D1');await page.locator('.sheet-scroll').evaluate(scroll=>scroll.scrollTop=0);await settle();
      const start=await cell(0,3).boundingBox(),bounds=await page.locator('.sheet-scroll').boundingBox();
      await page.mouse.move(start.x+start.width/2,start.y+start.height/2);await page.mouse.down();
      await page.mouse.move(start.x+start.width/2,Math.min(995,bounds.y+bounds.height+12),{steps:8});
      await page.waitForFunction(()=>document.querySelector('.sheet-scroll').scrollTop>700&&Number(document.querySelector('td.sheet-current')?.dataset.v)>30);
      await page.mouse.up();await settle();
      const vertical=await page.locator('.sheet-scroll').evaluate(scroll=>scroll.scrollTop);await settle();assert.equal(await page.locator('.sheet-scroll').evaluate(scroll=>scroll.scrollTop),vertical,'Releasing the pointer stops vertical scrolling in '+direction);
      assert.ok(await page.locator('td.sheet-selected').count()>1,'Autoscroll extends the selected range across virtual rows and columns');
      const current=await page.locator('td.sheet-current').boundingBox(),head=await page.locator('thead th').first().boundingBox();
      await page.mouse.move(current.x+current.width/2,current.y+current.height/2);await page.mouse.down();
      await page.mouse.move(current.x+current.width/2,head.y+2,{steps:8});
      await page.waitForFunction(()=>document.querySelector('.sheet-scroll').scrollTop<100&&Number(document.querySelector('td.sheet-current')?.dataset.v)<10);
      await page.mouse.up();
    }
    assert.deepEqual(errors,[]);console.log('PASS: editable content bar, caret-safe autosave, cancellation, row data copy/paste and stationary drag autoscroll in both directions');
  }finally{await browser?.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
