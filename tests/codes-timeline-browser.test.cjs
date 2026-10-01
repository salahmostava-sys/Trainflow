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
    await page.setViewportSize({width:390,height:844});await setup('mixed');g=await geometry();assert.ok(Math.abs(g.delta)<2,'mobile current day position');
    await setup('empty');assert.equal((await geometry()).scroll,0);
    assert.deepEqual(errors,[]);console.log('Codes timeline browser tests passed');
  }finally{await browser.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
