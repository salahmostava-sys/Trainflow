/* Authenticated app initiates jobs; only the dedicated Prometric tab confirms them. */
const IbtaRegistration=(()=>{
  'use strict';const ORIGIN='https://trainf.vercel.app',MAX=5000;let serial=Promise.resolve();
  const appSender=sender=>sender?.id===chrome.runtime.id&&sender.frameId===0&&Number.isInteger(sender.tab?.id)&&new URL(sender.url||'https://invalid.invalid').origin===ORIGIN;
  const str=(value,max)=>typeof value==='string'&&value.length>0&&value.length<=max;
  const same=(run,payload)=>run&&run.owner===payload.owner&&run.client===payload.client;
  async function status(payload){
    const {ibtaRun:run,isRunning,singleRunning}=await chrome.storage.local.get(['ibtaRun','isRunning','singleRunning']);
    return {ok:true,version:chrome.runtime.getManifest().version,capabilities:{retake:true},busy:!!(isRunning||singleRunning||run?.items.some(i=>['pending','done'].includes(i.status))),recoverable:!!(run&&run.owner===payload.owner&&run.client!==payload.client),run:same(run,payload)?run:null};
  }
  async function notify(run){try{await chrome.tabs.sendMessage(run.tab,{action:'ibtaChanged'},{frameId:0});}catch{/* tab may be closed */}}
  async function request(payload,sender){
    if(!appSender(sender)||!payload||!['PING','START','ACK','DISMISS','RECOVER','STOP'].includes(payload.type)||!str(payload.client,80)||!str(payload.owner,80))throw Error('FORBIDDEN');
    if(payload.type==='PING')return status(payload);
    const stored=await chrome.storage.local.get(['ibtaRun','isRunning','singleRunning']);let run=stored.ibtaRun;
    if(payload.type==='RECOVER'){
      if(!run||run.owner!==payload.owner)throw Error('OUTDATED');
      if(run.tab!==sender.tab.id){let existing;try{existing=await chrome.tabs.get(run.tab);}catch{/* tab may be closed */}if(existing)throw Error('ACTIVE_TAB');}
      run.client=payload.client;run.tab=sender.tab.id;await chrome.storage.local.set({ibtaRun:run});return status(payload);
    }
    if(payload.type==='START'){
      if(stored.isRunning||stored.singleRunning||run?.items.some(i=>['pending','done'].includes(i.status))||await IbtaExamResults.reserved())throw Error('BUSY');
      if(!Array.isArray(payload.items)||!payload.items.length||payload.items.length>MAX)throw Error('INVALID_ROWS');
      const seen=new Set(),items=payload.items.map(i=>{
        if(!i||!str(i.id,80)||seen.has(i.id)||!str(i.name,300)||!/[A-Za-z]/.test(i.name)||!str(i.email,320)||!isValidEmail(i.email)||!str(i.fingerprint,12000)||!Number.isInteger(i.row)||i.row<0||i.row>=1000000)throw Error('INVALID_ROWS');
        const retake=i.replaceExisting===true;
        if(retake&&(!str(i.previousCredentials,64)||!/^[a-f0-9]{64}$/.test(i.previousCredentials)))throw Error('INVALID_ROWS');
        if(!retake&&('previousCredentials' in i||'replaceExisting' in i))throw Error('INVALID_ROWS');
        seen.add(i.id);return {id:i.id,row:i.row,name:i.name,email:i.email,fingerprint:i.fingerprint,replaceExisting:retake,previousCredentials:retake?i.previousCredentials:undefined,status:'pending'};
      });
      run={id:crypto.randomUUID(),owner:payload.owner,client:payload.client,tab:sender.tab.id,created:new Date().toISOString(),items};
      const defaults=await chrome.storage.local.get(['defAddress','defCity','defState','defPostal','defCountry']);
      await chrome.storage.local.set({ibtaRun:run});
      try{await handleStartQueue({source:'ibta',items:items.map(i=>({name:i.name,email:i.email,mailingAddress:defaults.defAddress||'Al-Alameya',city:defaults.defCity||'JEDDAH',state:defaults.defState||'JEDDAH',postalCode:defaults.defPostal||'00000',country:defaults.defCountry||'Saudi Arabia',_ibta:{run:run.id,item:i.id}}))});}
      catch(error){for(const i of run.items)if(i.status==='pending'){i.status='failed';i.error='START_FAILED';}await chrome.storage.local.set({ibtaRun:run,isRunning:false,singleRunning:false});throw error;}
    }else{
      if(!same(run,payload)||run.id!==payload.run)throw Error('OUTDATED');
      if(payload.type==='ACK'||payload.type==='DISMISS'){
        if(!Array.isArray(payload.ids)||payload.ids.length>MAX||payload.ids.some(id=>!str(id,80)))throw Error('INVALID_ROWS');
        const ids=new Set(payload.ids);for(const i of run.items)if(ids.has(i.id)&&i.status==='done'){i.status=payload.type==='ACK'?'saved':'reviewed';if(payload.type==='ACK'){delete i.username;delete i.password;}}
      }else{
        await handleStopQueue();await closeRegistrationWindow();for(const i of run.items)if(i.status==='pending'){i.status='cancelled';i.error='STOPPED';}
      }
      run.tab=sender.tab.id;await chrome.storage.local.set({ibtaRun:run});
    }
    return status(payload);
  }
  function queue(task){const job=serial.then(task);serial=job.catch(()=>{});return job;}
  function enqueue(payload,sender){return queue(()=>request(payload,sender));}
  async function trustedStep(msg,sender){
    if(sender?.id!==chrome.runtime.id||sender.frameId!==0||new URL(sender.url||'https://invalid.invalid').origin!=='https://tcnet1.prometric.com')return false;
    const {currentTabId,queue,queueIndex}=await chrome.storage.local.get(['currentTabId','queue','queueIndex']);
    return sender.tab?.id===currentTabId&&queue?.[queueIndex]?._queueId===msg.queueId;
  }
  async function markSubmitted(msg,sender){
    if(!await trustedStep(msg,sender))throw Error('FORBIDDEN');const {queue,queueIndex}=await chrome.storage.local.get(['queue','queueIndex']);
    queue[queueIndex]._ibtaSubmitted=true;await chrome.storage.local.set({queue});return {ok:true};
  }
  async function recordResult(msg,state,status){
    const current=state.queue?.[state.queueIndex];if(!current?._ibta)return;
    const {ibtaRun:run}=await chrome.storage.local.get('ibtaRun');if(!run||run.id!==current._ibta.run)return;
    const item=run.items.find(i=>i.id===current._ibta.item);if(!item||['done','saved','reviewed','cancelled'].includes(item.status))return;
    if(status==='done'&&current._ibtaSubmitted&&str(msg.finalUsername,300)&&str(msg.password,300)&&msg.step==='dashboard'){
      item.status='done';item.username=msg.finalUsername;item.password=msg.password;
    }else{item.status='failed';item.error=status==='done'?'UNCONFIRMED':String(msg.reason||'REGISTRATION_FAILED').slice(0,400);}
    await chrome.storage.local.set({ibtaRun:run});await notify(run);
  }
  async function cancelPendingRun(){
    const {ibtaRun:run}=await chrome.storage.local.get('ibtaRun');if(!run)return;
    for(const item of run.items)if(item.status==='pending'){item.status='cancelled';item.error='STOPPED';}
    await chrome.storage.local.set({ibtaRun:run});await notify(run);
  }
  async function reserved(){const {ibtaRun:run}=await chrome.storage.local.get('ibtaRun');return !!run?.items.some(i=>['pending','done'].includes(i.status));}
  return {enqueue,exclusive:queue,trustedStep,submitted:(msg,sender)=>queue(()=>markSubmitted(msg,sender)),record:(msg,state,status)=>queue(()=>recordResult(msg,state,status)),cancelPending:()=>queue(cancelPendingRun),reserved};
})();
