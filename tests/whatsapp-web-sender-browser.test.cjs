const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    for(const mode of ['success','denied','changed','mismatch','blocked']){
      const page=await browser.newPage();await page.setContent('<div id="main"><div class="message-out">REPORT</div><footer><div contenteditable="true" role="textbox">REPORT</div><button aria-label="Send">Send</button></footer></div>');
      await page.evaluate(mode=>{
        window.calls=[];window.clicks=0;const composer=document.querySelector('[contenteditable]');if(mode==='mismatch')composer.innerText='OTHER MESSAGE';
        if(mode==='blocked'){const dialog=document.createElement('div');dialog.setAttribute('role','dialog');dialog.innerText='WhatsApp confirmation';document.body.append(dialog);}
        const job={id:'fixture-job',day:'2026-10-04',recipient:'966500000000',message:'REPORT',due:Date.now()+(['mismatch','blocked'].includes(mode)?-114000:0)};
        window.chrome={runtime:{async sendMessage(data){window.calls.push(data);if(data.type==='GET_JOB')return {job};if(data.type==='CAN_SEND'){if(mode==='changed')composer.innerText='USER DRAFT';return {allowed:mode!=='denied'};}return {};}}};
        document.querySelector('button').onclick=()=>{window.clicks++;const outgoing=document.createElement('div');outgoing.className='message-out';outgoing.innerText=composer.innerText;document.getElementById('main').append(outgoing);composer.innerText='';};
      },mode);
      await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../extension/whatsapp-web/sender.js'),'utf8')});
      if(mode==='denied')await page.waitForFunction(()=>window.calls.some(c=>c.type==='CAN_SEND'));
      else await page.waitForFunction(()=>window.calls.some(c=>c.type==='RESULT'));
      const result=await page.evaluate(()=>({calls:window.calls,clicks:window.clicks}));
      assert.equal(result.clicks,mode==='success'?1:0,'Only the exact authorized draft can be sent');
      if(mode==='success')assert.equal(result.calls.at(-1).state,'sent');
      if(['changed','mismatch'].includes(mode))assert.equal(result.calls.at(-1).error,'MESSAGE_MISMATCH');
      if(mode==='blocked'){assert.equal(result.calls.at(-1).error,'WHATSAPP_NOT_READY');assert.equal(result.calls.some(c=>c.type==='CAN_SEND'),false);}
      await page.close();
    }
    console.log('PASS: WhatsApp UI fixture confirms exact draft, one send, no overwrite, denied approval and post-approval draft changes; no external messages sent');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
