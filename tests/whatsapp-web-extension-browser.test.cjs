const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{
  const artifacts=path.resolve(__dirname,'../artifacts');fs.mkdirSync(artifacts,{recursive:true});
  const profile=fs.mkdtempSync(path.join(artifacts,'whatsapp-extension-test-')),extension=path.resolve(__dirname,'../extension/whatsapp-web');
  // A fresh isolated profile: never attach to the user's Chrome or WhatsApp login.
  const ctx=await chromium.launchPersistentContext(profile,{channel:'msedge',headless:true,args:['--disable-extensions-except='+extension,'--load-extension='+extension]});
  try{
    await ctx.route(/^https?:\/\//,route=>route.abort());
    const worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker',{timeout:10000});
    const id=await worker.evaluate(()=>chrome.runtime.id),popup=await ctx.newPage(),errors=[];
    popup.on('pageerror',e=>errors.push(e.message));await popup.goto('chrome-extension://'+id+'/popup.html');
    await popup.waitForFunction(()=>document.getElementById('status').textContent.includes('متوقف على هذا الجهاز'),null,{timeout:10000}).catch(async error=>{throw Error(error.message+'\nErrors: '+JSON.stringify(errors)+'\nPopup: '+await popup.locator('body').innerText());});
    const version=JSON.parse(fs.readFileSync(path.join(extension,'manifest.json'),'utf8')).version;
    assert((await popup.locator('#diagnostics').textContent()).includes('الإصدار '+version));
    await popup.locator('#stop').click();await popup.waitForFunction(()=>!document.getElementById('stop').disabled);
    assert.match(await popup.locator('#status').textContent(),/متوقف على هذا الجهاز/);assert.deepEqual(errors,[]);
    await popup.screenshot({path:path.join(artifacts,'whatsapp-extension-popup.png')});
    assert.equal((await worker.evaluate(()=>chrome.storage.local.get('config'))).config,undefined,'Opening the popup never enables sending');
    for(const mode of ['undefined','rejected','provider-error']){
      const page=await ctx.newPage(),pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
      await page.setContent('<p id="status"></p><p id="diagnostics"></p><button id="refresh">Refresh</button><button id="stop">Stop</button>');
      await page.evaluate(mode=>{window.chrome={runtime:{getManifest:()=>({version:'1.0.2'}),async sendMessage(){if(mode==='rejected')throw Error('Could not establish connection. Receiving end does not exist.');return mode==='undefined'?undefined:{connected:false,error:'EXTENSION_ERROR'};}}};},mode);
      await page.addScriptTag({content:fs.readFileSync(path.join(extension,'popup.js'),'utf8')});
      await page.waitForFunction(()=>document.getElementById('status').textContent.includes('تعذر الاتصال'));
      assert.match(await page.locator('#diagnostics').textContent(),/سبب التعطل:/);assert.equal(await page.locator('#refresh').isEnabled(),true);
      await page.locator('#refresh').click();await page.waitForFunction(()=>!document.getElementById('refresh').disabled);
      assert.deepEqual(pageErrors,[],'Missing background responses must show a diagnosis instead of crashing');await page.close();
    }
    console.log('PASS: actual MV3 popup connects to the installed worker, stays disabled, and handles absent/rejected/invalid replies without uncaught errors; isolated profile, no external sends');
  }finally{await ctx.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
