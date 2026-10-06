const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{
  const root=path.resolve(__dirname,'..'),artifacts=path.join(root,'artifacts');fs.mkdirSync(artifacts,{recursive:true});
  const profile=fs.mkdtempSync(path.join(artifacts,'whatsapp-flow-test-')),extension=path.join(root,'extension/whatsapp-web');
  const ctx=await chromium.launchPersistentContext(profile,{channel:'msedge',headless:true,args:['--disable-extensions-except='+extension,'--load-extension='+extension,'--host-resolver-rules=MAP trainf.vercel.app 127.0.0.1, MAP web.whatsapp.com 127.0.0.1']});
  let mockSends=0;
  try{
    // Both host pages are local fixtures. No request reaches IBTA or WhatsApp.
    await ctx.route(/^https?:\/\//,async route=>{
      const url=new URL(route.request().url());
      if(url.origin==='https://trainf.vercel.app'){
        if(url.pathname==='/inventory-delivery.js')return route.fulfill({contentType:'text/javascript; charset=utf-8',body:fs.readFileSync(path.join(root,'inventory-delivery.js'),'utf8')});
        if(url.pathname!=='/')return route.fulfill({status:404,body:''});
        return route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><html><head><meta charset="utf-8"></head><body><h1>Isolated integration fixture</h1><div id="inventory-whatsapp-settings"></div><script>
          const currentLang='ar';window.cfg={provider:'web',enabled:false,time:'16:59',phoneId:'',template:'',language:'ar',apiVersion:'v24.0',last:null};
          const Cloud={role:()=> 'admin',userId:()=> 'fixture-admin',inventoryDeliveryEligible:()=>true,inventoryMessageSettings:()=>({number:'966500000000'}),inventoryDelivery:async options=>{if(options)window.cfg={...window.cfg,...options};return window.cfg;},inventoryReportSnapshot:async()=>({categories:['Foundation'],stock:{Foundation:3},available:{Foundation:12},settings:{number:'966500000000'}})};
          function inventoryMessage(){return 'ISOLATED TEST REPORT';}async function copyText(){return true;}
          </script><script id="inventory-delivery-script" src="inventory-delivery.js" data-extension="trainflow-whatsapp-web.zip"></script></body></html>`});
      }
      if(url.origin==='https://web.whatsapp.com')return route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><html><head><meta charset="utf-8"></head><body><h1>Isolated WhatsApp fixture</h1><div id="main"><footer><div contenteditable="true" role="textbox"></div><button aria-label="Send">Send</button></footer></div><script>
        const composer=document.querySelector('[contenteditable]');composer.innerText=new URL(location.href).searchParams.get('text')||'';
        document.querySelector('button').onclick=()=>{const out=document.createElement('div');out.className='message-out';out.innerText=composer.innerText;document.getElementById('main').append(out);composer.innerText='';window.mockSendCount=(window.mockSendCount||0)+1;};
        </script></body></html>`});
      return route.abort();
    });
    const worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker',{timeout:10000});
    await worker.evaluate(()=>{self.fixtureMessages=[];chrome.runtime.onMessage.addListener((data,sender)=>{self.fixtureMessages.push({type:data.type,url:sender.url,tabURL:sender.tab?.url,tabId:sender.tab?.id,id:sender.id});});});
    const page=await ctx.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.addInitScript(()=>{window.fixtureMessages=[];window.addEventListener('message',event=>{if(event.data?.channel?.startsWith('IBTA_'))window.fixtureMessages.push({origin:event.origin,sameSource:event.source===window,...event.data});});});await page.goto('https://trainf.vercel.app/');
    await page.evaluate(()=>InventoryDelivery.load());
    await page.waitForFunction(()=>document.getElementById('inventory-auto-connection').textContent.includes('الإضافة متصلة'),null,{timeout:10000}).catch(async error=>{console.log(JSON.stringify({errors,connection:await page.locator('#inventory-auto-connection').textContent(),pageMessages:await page.evaluate(()=>window.fixtureMessages),workerMessages:await worker.evaluate(()=>self.fixtureMessages)},null,2));throw error;});
    const time=new Date(Date.now()+10800000).toISOString().slice(11,16);await page.locator('#inventory-auto-time').fill(time);await page.locator('#inventory-auto-enabled').check();await page.locator('#inventory-auto-save').click();
    await page.waitForFunction(()=>document.getElementById('inventory-auto-status').textContent.includes('تم الحفظ'),null,{timeout:10000});
    await page.waitForFunction(()=>document.getElementById('inventory-auto-diagnostics').textContent.includes('تقرير حديث جاهز'),null,{timeout:10000});
    const stored=await worker.evaluate(()=>chrome.storage.local.get(['config','snapshot']));assert.equal(stored.config.recipient,'966500000000');assert.equal(stored.snapshot.message,'ISOLATED TEST REPORT');
    // Force only the real alarm time in this isolated profile; normal due/owner/
    // freshness/one-shot checks and both content scripts remain unchanged.
    const opened=ctx.waitForEvent('page',{timeout:15000});await worker.evaluate(()=>chrome.alarms.create('send',{when:Date.now()+1000}));
    const openedWA=await opened;await openedWA.waitForLoadState('domcontentloaded').catch(()=>{});
    // Browser-created tabs can navigate before Playwright attaches its routes.
    // DNS above blocks both live hosts; navigate again once routes are attached.
    const attempt=await worker.evaluate(()=>chrome.storage.local.get('attempt'));await openedWA.goto('https://web.whatsapp.com/send?phone='+attempt.attempt.recipient+'&text='+encodeURIComponent(attempt.attempt.message));
    await page.waitForFunction(()=>document.getElementById('inventory-auto-last').textContent.includes('ظهرت الرسالة كصادرة'),null,{timeout:45000}).catch(async error=>{console.log(JSON.stringify({status:await page.locator('#inventory-auto-last').textContent(),storage:await worker.evaluate(()=>chrome.storage.local.get(null)),alarms:await worker.evaluate(()=>chrome.alarms.getAll()),messages:await worker.evaluate(()=>self.fixtureMessages),tabs:await Promise.all(ctx.pages().map(async tab=>({url:tab.url(),text:(await tab.locator('body').innerText()).slice(0,800)})))},null,2));throw error;});
    const wa=ctx.pages().find(tab=>tab.url().startsWith('https://web.whatsapp.com/'));assert.ok(wa);mockSends=await wa.evaluate(()=>window.mockSendCount);assert.equal(mockSends,1);
    assert.equal(new URL(wa.url()).searchParams.get('phone'),'966500000000');assert.equal((await worker.evaluate(()=>chrome.storage.local.get('last'))).last.state,'sent');assert.deepEqual(errors,[]);
    const restarted=ctx.waitForEvent('serviceworker',{timeout:10000});await worker.evaluate(()=>chrome.runtime.reload()).catch(()=>{});await restarted;
    await page.evaluate(()=>InventoryDelivery.load());await page.waitForFunction(()=>document.getElementById('inventory-auto-connection').textContent.includes('ثبّت إضافة Chrome'),null,{timeout:10000});
    await page.reload();await page.evaluate(()=>InventoryDelivery.load());await page.waitForFunction(()=>document.getElementById('inventory-auto-connection').textContent.includes('الإضافة متصلة'),null,{timeout:10000});
    console.log('PASS: real MV3 app bridge, CONFIG acknowledgment, fresh inventory snapshot, Chrome alarm, dedicated WhatsApp tab, sender approval and outgoing confirmation; all network pages mocked, '+mockSends+' local fixture send, zero real messages');
  }finally{await ctx.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
