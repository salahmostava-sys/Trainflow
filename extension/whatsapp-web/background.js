importScripts('schedule.js');
const SITE='https://ibta-ops.pages.dev/',WA='https://web.whatsapp.com/';
let chain=Promise.resolve();
const serial=task=>{const work=chain.then(task);chain=work.catch(()=>{});return work;};
const noSendErrors=new Set(['FRESH_REPORT_REQUIRED','WHATSAPP_OPEN_FAILED','WHATSAPP_NOT_READY','MESSAGE_MISMATCH']);
const state=async()=>{const s=await chrome.storage.local.get(['config','last','snapshot']),alarm=await chrome.alarms.get('send');return {connected:true,version:chrome.runtime.getManifest().version,owner:s.config?.owner||'',enabled:!!s.config?.enabled,time:s.config?.time||'16:59',recipient:s.config?.recipient||'',last:s.last||null,prepared:!!(s.config&&WebSchedule.validSnapshot(s.snapshot,s.config)),nextSend:alarm?.scheduledTime||null,blockedToday:s.last?.day===WebSchedule.day()&&['preparing','sending','sent','unknown','failed'].includes(s.last.state)};};
async function broadcast(){const payload=await state();for(const tab of await chrome.tabs.query({url:SITE+'*'}))void chrome.tabs.sendMessage(tab.id,{type:'STATE',payload}).catch(()=>{});}
async function status(status,error='',day=WebSchedule.day()){await chrome.storage.local.set({last:{state:status,error,day,at:Date.now()}});await broadcast();}
async function arm(){
  const {config}=await chrome.storage.local.get('config');
  await chrome.alarms.clear('send');await chrome.alarms.clear('prefetch');
  if(!WebSchedule.validConfig(config)||!config.enabled)return;
  const when=WebSchedule.next(config.time);await chrome.alarms.create('send',{when});await chrome.alarms.create('prefetch',{when:Math.max(Date.now()+1000,when-60000)});
}
async function requestSnapshot(){
  const tabs=(await chrome.tabs.query({url:SITE+'*'})).filter(tab=>!tab.discarded&&!tab.frozen);
  if(!tabs.length){await chrome.tabs.create({url:SITE,active:false});return;}
  for(const tab of tabs)void chrome.tabs.sendMessage(tab.id,{type:'REQUEST_SNAPSHOT'}).catch(()=>{});
}
async function dispatch(){
  const {config,snapshot,last}=await chrome.storage.local.get(['config','snapshot','last']);
  if(!WebSchedule.validConfig(config)||!WebSchedule.due(config))return;
  const day=WebSchedule.day();if(last?.day===day&&['preparing','sending','sent','unknown','failed'].includes(last.state))return;
  if(!WebSchedule.validSnapshot(snapshot,config)){await status('failed','FRESH_REPORT_REQUIRED',day);await arm();return;}
  const job={id:crypto.randomUUID(),day,owner:config.owner,time:config.time,recipient:config.recipient,message:snapshot.message,at:Date.now(),due:WebSchedule.at(config.time),phase:'preparing'};
  // Record before opening WhatsApp: a restarted worker cannot send twice.
  await status('preparing','',day);await chrome.storage.local.set({attempt:job});
  try{
    const url=WA+'send?phone='+job.recipient+'&text='+encodeURIComponent(job.message);
    const tab=await chrome.tabs.create({url,active:true});job.tabId=tab.id;await chrome.storage.local.set({attempt:job});
    await chrome.alarms.create('confirm-timeout',{when:Date.now()+120000});
  }catch{await status('failed','WHATSAPP_OPEN_FAILED',day);await chrome.storage.local.remove(['snapshot','attempt']);}
  await arm();
}
chrome.runtime.onMessage.addListener((data,sender,reply)=>{
  const source=sender.tab?.url?new URL(sender.tab.url).origin:'';
  const popup=!sender.tab&&sender.id===chrome.runtime.id;
  serial(async()=>{
    if(source===new URL(SITE).origin){
      if(data.type==='PING')return state();
      if(data.type==='CONFIG'){
        if(!WebSchedule.validConfig(data.payload))throw Error('INVALID_CONFIG');
        const {config,last}=await chrome.storage.local.get(['config','last']);
        // An explicit new schedule may retry a confirmed failure before any click.
        // Sent and ambiguous outcomes remain blocked to prevent duplicates.
        if(last?.state==='failed'&&noSendErrors.has(last.error)&&config?.owner===data.payload.owner&&(config.time!==data.payload.time||config.recipient!==data.payload.recipient))await chrome.storage.local.remove('last');
        await chrome.storage.local.set({config:data.payload});await chrome.storage.local.remove('snapshot');await arm();await requestSnapshot();return state();
      }
      if(data.type==='SNAPSHOT'){
        const {config}=await chrome.storage.local.get('config'),incoming=data.payload?.config;
        if(!config||!WebSchedule.validConfig(incoming)||incoming.owner!==config.owner)return state();
        await chrome.storage.local.set({config:incoming});if(incoming.enabled!==config.enabled||incoming.time!==config.time||incoming.recipient!==config.recipient)await arm();
        if(incoming.enabled&&WebSchedule.validSnapshot(data.payload.report,incoming))await chrome.storage.local.set({snapshot:data.payload.report});
        else await chrome.storage.local.remove('snapshot');
        return state();
      }
    }
    if(source===new URL(WA).origin){
      const {attempt,config}=await chrome.storage.local.get(['attempt','config']);
      if(!attempt||attempt.tabId!==sender.tab.id||!config?.enabled||attempt.owner!==config.owner||attempt.time!==config.time||attempt.recipient!==config.recipient||Date.now()-attempt.due>120000)return {allowed:false};
      if(data.type==='GET_JOB'&&attempt.phase==='preparing')return {job:attempt};
      if(data.type==='CAN_SEND'&&data.id===attempt.id&&attempt.phase==='preparing'){
        attempt.phase='sending';await chrome.storage.local.set({attempt});await status('sending','',attempt.day);return {allowed:true};
      }
      if(data.type==='RESULT'&&data.id===attempt.id&&['sent','failed','unknown'].includes(data.state)){
        await status(data.state,data.state==='sent'?'':String(data.error||'SEND_UNCONFIRMED').slice(0,80),attempt.day);
        await chrome.storage.local.remove(['snapshot','attempt']);await chrome.alarms.clear('confirm-timeout');return {received:true};
      }
    }
    if(popup){
      if(data.type==='PING')return state();
      if(data.type==='REFRESH'){await requestSnapshot();return state();}
      if(data.type==='STOP'){const {config}=await chrome.storage.local.get('config');if(config)await chrome.storage.local.set({config:{...config,enabled:false}});await chrome.storage.local.remove('snapshot');await arm();await broadcast();return state();}
    }
    return {allowed:false};
  }).then(reply).catch(()=>reply({connected:false,error:'EXTENSION_ERROR'}));
  return true;
});
chrome.alarms.onAlarm.addListener(alarm=>void serial(async()=>{
  if(alarm.name==='prefetch')await requestSnapshot();
  if(alarm.name==='send')await dispatch();
  if(alarm.name==='confirm-timeout'){
    const {attempt}=await chrome.storage.local.get('attempt');if(attempt){await status('unknown','SEND_UNCONFIRMED',attempt.day);await chrome.storage.local.remove(['snapshot','attempt']);}
  }
}));
chrome.tabs.onUpdated.addListener((id,change,tab)=>{if(change.status==='complete'&&tab.url?.startsWith(SITE))void chrome.tabs.sendMessage(id,{type:'REQUEST_SNAPSHOT'}).catch(()=>{});});
chrome.runtime.onInstalled.addListener(()=>void serial(arm));
chrome.runtime.onStartup.addListener(()=>void serial(arm));
// Recreate alarms if Chrome cleared them across a restart or extension update.
void serial(async()=>{if(!await chrome.alarms.get('send'))await arm();});
