const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawn}=require('node:child_process');
(async()=>{
  const server=spawn(process.execPath,[path.join(__dirname,'../tools/design-preview.cjs')],{stdio:['ignore','pipe','inherit'],env:{...process.env,IBTA_PREVIEW_PORT:'4174'}});
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try{
    const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:4174/');
    const setup=async(mode)=>{
      await page.evaluate(mode=>{
        activeCategory='Foundation-100';
        state.codesByCategory[activeCategory]=mode==='empty'?[]:mode==='small'?['OLD','FREE']:mode==='past'?['OLD','NEWER']:['FREE','TODAY','OLD','NEWER'];
        state.usedCodes={OLD:'01/01/2020',NEWER:'02/01/2020',TODAY:todayStr()};
        showPanel('codes');renderCodeGrid();
      },mode);
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    };
    const geometry=()=>page.evaluate(()=>{
      const view=document.getElementById('code-sheet-viewport'),head=view.querySelector('.code-sheet-head'),anchor=view.querySelector('.code-current-start');
      return {scroll:view.scrollTop,delta:anchor?anchor.getBoundingClientRect().top-head.getBoundingClientRect().bottom:null,order:[...view.querySelectorAll('.code-row')].map(r=>r.dataset.code)};
    });
    await setup('mixed');
    let g=await geometry();assert.deepEqual(g.order,['OLD','NEWER','TODAY','FREE']);assert.ok(g.scroll>0);assert.ok(Math.abs(g.delta)<2,JSON.stringify(g));
    await page.evaluate(()=>{document.getElementById('code-sheet-viewport').scrollTop=0;renderCodeGrid();});
    await page.evaluate(()=>new Promise(requestAnimationFrame));
    assert.equal((await geometry()).scroll,0,'refresh preserves history reading position');
    await setup('small');g=await geometry();assert.ok(g.scroll>0);assert.ok(Math.abs(g.delta)<2,'small lists also conceal history');
    await setup('past');g=await geometry();assert.ok(g.scroll>0);assert.ok(Math.abs(g.delta)<2,'latest past day is the fallback');
    // Headers and every row fill the table, including the actions column, in either language.
    for(const language of ['ar','en']){
      if(await page.evaluate(()=>currentLang)!==language){if(!await page.locator('#lang-btn').isVisible())await page.locator('#sidebar-toggle').click();await page.locator('#lang-btn').click();}
      await setup('mixed');await page.evaluate(()=>{state.dateColors[todayStr()]='#0070c0';state.dateColors['01/01/2020']='#ffff00';state.voucherNames={TODAY:'TRAINING STUDENT',OLD:'LIGHT ROW STUDENT'};state.codeNotes={TODAY:'Readable blue row note',OLD:'Readable yellow row note'};renderCodeGrid();});
      const columns=await page.locator('#code-sheet-viewport').evaluate(el=>{const head=[...el.querySelector('.code-sheet-head').children],row=el.querySelector('.code-row[data-code="TODAY"]');return {head:head.map(cell=>({left:cell.getBoundingClientRect().left,width:cell.getBoundingClientRect().width})),row:[...row.children].map(cell=>({left:cell.getBoundingClientRect().left,width:cell.getBoundingClientRect().width})),width:row.getBoundingClientRect().width};});
      assert.deepEqual(columns.head,columns.row,'Header and body columns align in '+language);assert.ok(Math.abs(columns.row.reduce((n,c)=>n+c.width,0)-columns.width)<1,'All row width belongs to columns');assert.ok(columns.row[6].width<=90,'Actions keep a compact column');
      await page.mouse.move(0,0);const colors=await page.locator('.code-row[data-code="TODAY"]').evaluate(row=>[...row.querySelectorAll('.col-trainee-name input,.col-notes input')].map(el=>({text:getComputedStyle(el).color,placeholder:getComputedStyle(el,'::placeholder').color})));
      assert.ok(colors.every(c=>c.text==='rgb(255, 255, 255)'&&c.placeholder===c.text),'Used blue rows keep white names/notes/placeholders');
      const light=await page.locator('.code-row[data-code="OLD"] .col-notes input').evaluate(el=>getComputedStyle(el).color);assert.equal(light,'rgb(26, 26, 26)','Pale fills keep dark input text');
      const note=page.locator('.code-row[data-code="TODAY"] .col-notes input');await note.focus();assert.equal(await note.evaluate(el=>getComputedStyle(el).color),'rgb(15, 27, 46)','White editing surface uses dark text');assert.equal(await note.inputValue(),'Readable blue row note');await note.evaluate(el=>el.blur());await page.mouse.move(0,0);
      await page.locator('.code-sheet').screenshot({path:path.join(__dirname,'../artifacts/voucher-format-'+language+'.png')});
    }
    // Voucher widths can be changed without touching vouchers; keyboard and drag remain available in LTR.
    if(await page.evaluate(()=>currentLang)!=='en')await page.locator('#lang-btn').click();
    await setup('mixed');const handle=page.locator('.code-sheet-head .voucher-col-resizer').nth(2),before=await handle.evaluate(el=>el.parentElement.getBoundingClientRect().width);
    await handle.focus();await page.keyboard.press('ArrowRight');assert.ok(await handle.evaluate(el=>el.parentElement.getBoundingClientRect().width)>before,'Keyboard resizes a voucher column');
    const box=await handle.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+45,box.y+box.height/2);await page.mouse.up();const dragged=await handle.evaluate(el=>el.parentElement.getBoundingClientRect().width);assert.ok(dragged>before+40,'Dragging resizes a voucher column');
    await handle.dblclick();const fitted=await handle.evaluate(el=>el.parentElement.getBoundingClientRect().width);assert.ok(fitted<dragged,'Double click fits the column to its content');
    await page.reload();await setup('mixed');assert.equal(Math.round(await page.locator('.code-sheet-head').locator('.voucher-col-resizer').nth(2).evaluate(el=>el.parentElement.getBoundingClientRect().width)),Math.round(fitted),'Voucher width preference survives reload');
    const afterResize=await page.locator('#code-sheet-viewport').evaluate(el=>{const head=[...el.querySelector('.code-sheet-head').children],row=el.querySelector('.code-row');return {head:head.map(cell=>cell.getBoundingClientRect().width),row:[...row.children].map(cell=>cell.getBoundingClientRect().width)};});assert.deepEqual(afterResize.head,afterResize.row,'Resized header and voucher row remain aligned');
    await page.setViewportSize({width:390,height:844});await setup('mixed');g=await geometry();assert.ok(Math.abs(g.delta)<2,'mobile current day position');
    await setup('empty');assert.equal((await geometry()).scroll,0);
    assert.deepEqual(errors,[]);console.log('Codes timeline browser tests passed');
  }finally{await browser.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
