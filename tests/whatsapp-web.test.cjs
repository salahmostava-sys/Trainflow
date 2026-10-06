const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const S=require('../extension/whatsapp-web/schedule.js');
const now=Date.parse('2026-10-04T13:59:00Z'),config={enabled:true,time:'16:59',recipient:'966500000000',owner:'admin-test'};
assert.equal(S.at(config.time,now),now);assert.equal(S.next(config.time,now),now+86400000);
assert.equal(S.day(Date.parse('2026-10-04T22:30:00Z')),'2026-10-05');
assert.equal(S.at('00:00',Date.parse('2026-10-04T22:30:00Z')),Date.parse('2026-10-04T21:00:00Z'));
assert.equal(S.validConfig({...config,recipient:'https://evil.invalid'}),false);assert.equal(S.validConfig({...config,time:'24:00'}),false);
const snapshot={owner:config.owner,recipient:config.recipient,time:config.time,day:S.day(now),at:now-60000,message:'التاريخ: 04/10/2026\nFoundation: 15'};
assert.equal(S.validSnapshot(snapshot,config,now),true);assert.equal(S.validSnapshot({...snapshot,at:now-300001},config,now),false);
assert.equal(S.validSnapshot({...snapshot,owner:'other'},config,now),false);assert.equal(S.validSnapshot({...snapshot,recipient:'966511111111'},config,now),false);
assert.equal(S.due(config,now+120001),false);assert.equal(S.due(config,now-1),false);
(async()=>{
  let clock=now-60000,store={},created=[],events={},alarmMap=new Map(),id=10;
  const clone=v=>JSON.parse(JSON.stringify(v)),add=name=>({addListener(fn){events[name]=fn;}});
  const chrome={runtime:{id:'fixture-extension',getManifest:()=>({version:'1.0.1'}),onMessage:add('message'),onInstalled:add('installed'),onStartup:add('startup')},
    storage:{local:{async get(keys){if(typeof keys==='string')keys=[keys];return Object.fromEntries(keys.filter(k=>k in store).map(k=>[k,clone(store[k])]));},async set(data){Object.assign(store,clone(data));},async remove(keys){for(const key of Array.isArray(keys)?keys:[keys])delete store[key];}}},
    alarms:{onAlarm:add('alarm'),async create(name,options){alarmMap.set(name,{name,scheduledTime:options.when});},async get(name){return alarmMap.get(name);},async clear(name){return alarmMap.delete(name);}},
    tabs:{onUpdated:add('updated'),async query(){return [{id:1,url:'https://trainf.vercel.app/'}];},async sendMessage(){return {};},async create(options){const tab={id:id++,...options};created.push(tab);return tab;}}
  };
  const context=vm.createContext({chrome,WebSchedule:{...S,day:()=>S.day(clock),at:t=>S.at(t,clock),next:t=>S.next(t,clock),due:c=>S.due(c,clock),validSnapshot:(s,c)=>S.validSnapshot(s,c,clock)},importScripts(){},URL,Date:class extends Date{static now(){return clock;}},crypto:{randomUUID:()=> 'job-'+id},console});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../extension/whatsapp-web/background.js'),'utf8'),context);
  const drain=()=>vm.runInContext('chain',context),send=(data,url='https://trainf.vercel.app/',tabId=1)=>new Promise(resolve=>events.message(data,{id:'fixture-extension',url,tab:{id:tabId,url}},resolve));
  await drain();await send({type:'CONFIG',payload:config},'https://evil.invalid/');assert.equal(store.config,undefined,'Other origins cannot configure the sender');
  assert.equal((await send({type:'PING'},'chrome-extension://fixture-extension/popup.html')).connected,true,'The extension page can also open in a tab');
  assert.equal((await send({type:'PING'},'chrome-extension://another-extension/popup.html')).allowed,false,'Other extension pages are not authorized');
  await send({type:'CONFIG',payload:config});assert.equal(alarmMap.get('send').scheduledTime,now);
  await send({type:'SNAPSHOT',payload:{config,report:snapshot}});clock=now;
  await send({type:'SNAPSHOT',payload:{config,report:snapshot}});assert.equal(alarmMap.get('send').scheduledTime,now,'A report arriving at the send time must not defer the alarm until tomorrow');
  events.alarm({name:'send'});await drain();
  assert.equal(created.length,1);const url=new URL(created[0].url);assert.equal(url.origin,'https://web.whatsapp.com');assert.equal(url.searchParams.get('phone'),config.recipient);assert.equal(url.searchParams.get('text'),snapshot.message);
  events.alarm({name:'send'});await drain();assert.equal(created.length,1,'Repeated alarms cannot open another send');
  const job=store.attempt;assert.equal((await send({type:'CAN_SEND',id:job.id},'https://web.whatsapp.com/',999)).allowed,false,'A different WhatsApp tab cannot send');
  assert.equal((await send({type:'CAN_SEND',id:job.id},created[0].url,job.tabId)).allowed,true);
  assert.equal((await send({type:'CAN_SEND',id:job.id},created[0].url,job.tabId)).allowed,false,'Send approval is consumed exactly once');
  await send({type:'RESULT',id:job.id,state:'sent'},created[0].url,job.tabId);assert.equal(store.last.state,'sent');assert.equal(store.snapshot,undefined);assert.equal(store.attempt,undefined);
  events.alarm({name:'send'});await drain();assert.equal(created.length,1,'A sent day cannot be repeated');
  clock=now+86400000;events.alarm({name:'send'});await drain();assert.equal(created.length,1,'Yesterday\'s report is never sent');assert.equal(store.last.error,'FRESH_REPORT_REQUIRED');
  const retryConfig={...config,time:'17:01',recipient:'966511111111'};
  await send({type:'CONFIG',payload:retryConfig});assert.equal(store.last,undefined,'Explicit rescheduling can recover a confirmed failure without a send');
  assert.equal(alarmMap.get('send').scheduledTime,clock+120000);
  await send({type:'SNAPSHOT',payload:{config:retryConfig,report:{...snapshot,recipient:retryConfig.recipient,time:retryConfig.time,day:S.day(clock),at:clock}}});
  const ready=await send({type:'PING'});assert.equal(ready.prepared,true);assert.equal(ready.recipient,retryConfig.recipient);assert.equal(ready.nextSend,clock+120000);
  clock+=120000;events.alarm({name:'send'});await drain();assert.equal(created.length,2);assert.equal(new URL(created[1].url).searchParams.get('phone'),retryConfig.recipient);
  const retryJob=store.attempt;await send({type:'CAN_SEND',id:retryJob.id},created[1].url,retryJob.tabId);await send({type:'RESULT',id:retryJob.id,state:'unknown',error:'SEND_UNCONFIRMED'},created[1].url,retryJob.tabId);
  const changed={...retryConfig,time:'17:03'};await send({type:'CONFIG',payload:changed});assert.equal(store.last.state,'unknown','A possibly sent message cannot be retried by changing time');
  clock+=120000;await send({type:'SNAPSHOT',payload:{config:changed,report:{...snapshot,recipient:changed.recipient,time:changed.time,day:S.day(clock),at:clock}}});events.alarm({name:'send'});await drain();assert.equal(created.length,2);
  const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../extension/whatsapp-web/manifest.json'),'utf8'));
  assert.deepEqual(manifest.permissions,['alarms','storage']);assert.deepEqual(manifest.host_permissions,['https://trainf.vercel.app/*','https://web.whatsapp.com/*']);
  console.log('PASS: Saudi scheduling, midnight, freshness, exact recipient/body, origin checks, one-shot approval, repeated alarms, next-day stale data and minimal permissions');
})().catch(error=>{console.error(error);process.exitCode=1;});
