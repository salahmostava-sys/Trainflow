const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto').webcrypto,P=require('../prometric-core.js');
const trainee=(name,email,id,exam='CBP-L')=>{const row=Array(13).fill('');row[1]=email;row[3]=name;row[4]=id;row[7]=exam;return row;};
const a=trainee('ALPHA STUDENT','alpha@example.invalid','00123'),b=trainee('BETA STUDENT','beta@example.invalid','00456');
const rows=[a,b,trainee('NORAH','norah@example.invalid','00999'),trainee('BAD EMAIL','invalid','00888')];rows[1][9]='EXISTING';
const plan=P.prepare(rows,[0,1,2,3,0]);assert.equal(plan.items.length,1);assert.deepEqual(plan.skipped.map(i=>i.reason),['existing','name','email']);
const result={...plan.items[0],username:'ALPHASTUDENT1',password:'DEMO'};
assert.equal(P.locate([trainee('OTHER PERSON','other@example.invalid','55'),a],result).row,1,'Moved rows match by identity rather than row number');
assert.equal(P.locate([a,[...a]],result).reason,'duplicate');assert.equal(P.locate([b],result).reason,'missing');
const existing=[...a];existing[9]='KEEP';assert.equal(P.locate([existing],result).reason,'existing');existing[9]=result.username;existing[10]=result.password;assert.equal(P.locate([existing],result).alreadySaved,true);
assert.equal(P.prepare([a,[...a]],[0,1]).items.length,0,'Duplicate row identities require manual review');
assert.equal(P.prepare([a,trainee(a[3],a[1],a[4],'CBP-M')],[0,1]).items.length,2,'Different exam rows remain separate registrations');
assert.equal(P.indexRows(Array.from({length:3068},(_,i)=>trainee('TEST STUDENT '+i,'test'+i+'@example.invalid',String(i)))).size,3068);
(async()=>{
  const root=path.resolve(__dirname,'../extension/prometric'),stored={},clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));let nextTab=40;
  const event=()=>({addListener(){}}),ctx=vm.createContext({console,crypto,URL,setTimeout:()=>1,clearTimeout(){}});
  ctx.chrome={runtime:{id:'fixture-extension',getManifest:()=>({version:'4.1.0'}),onMessage:event(),onInstalled:event()},
    storage:{local:{async get(keys){if(typeof keys==='string')keys=[keys];return Object.fromEntries((keys||Object.keys(stored)).map(k=>[k,clone(stored[k])]));},async set(values){Object.assign(stored,clone(values));},async remove(keys){for(const k of typeof keys==='string'?[keys]:keys)delete stored[k];}}},
    tabs:{onRemoved:event(),async create({url}){return {id:++nextTab,url};},async get(id){return {id};},async update(){},async remove(){},async sendMessage(){}},action:{setBadgeText(){},setBadgeBackgroundColor(){}},notifications:{create(){}},contextMenus:{create(){},onClicked:event()}};
  ctx.importScripts=(...files)=>files.forEach(file=>vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file}));vm.runInContext(fs.readFileSync(path.join(root,'background.js'),'utf8'),ctx);
  const api=vm.runInContext('IbtaRegistration',ctx),sender={id:'fixture-extension',frameId:0,url:'https://ibta-ops.pages.dev/',tab:{id:10}},base={owner:'owner-one',client:'test-client'};
  await assert.rejects(()=>api.enqueue({...base,type:'PING'},{...sender,frameId:1}),/FORBIDDEN/);
  await assert.rejects(()=>api.enqueue({...base,type:'PING'},{...sender,url:'https://other.invalid/'}),/FORBIDDEN/);
  const items=P.prepare([a,trainee(a[3],a[1],a[4],'CBP-M')],[0,1]).items;
  const started=await api.enqueue({...base,type:'START',items},sender);assert.equal(started.run.items.length,2);assert.equal(stored.queue.length,2,'IBTA metadata is not silently deduplicated by name/email');
  await assert.rejects(()=>api.enqueue({...base,type:'START',items},sender),/BUSY/);
  const current=stored.queue[0],prometricSender={id:'fixture-extension',frameId:0,url:'https://tcnet1.prometric.com/Registration.aspx',tab:{id:stored.currentTabId}},message={queueId:current._queueId,finalUsername:'ALPHASTUDENT1',password:'DEMO-PASSWORD',step:'dashboard'};
  assert.equal(await api.trustedStep(message,{...prometricSender,tab:{id:999}}),false);await assert.rejects(()=>api.submitted({...message,queueId:'old'},prometricSender),/FORBIDDEN/);
  await api.submitted(message,prometricSender);await api.record(message,{queue:clone(stored.queue),queueIndex:0},'done');assert.equal(stored.ibtaRun.items[0].status,'done');assert.equal(stored.ibtaRun.items[0].username,'ALPHASTUDENT1');
  // An ACK racing the next result cannot discard that next result.
  const ack=api.enqueue({...base,type:'ACK',run:started.run.id,ids:[items[0].id]},sender),next=api.record({...message,queueId:stored.queue[1]._queueId},{queue:clone(stored.queue),queueIndex:1},'done');await Promise.all([ack,next]);assert.equal(stored.ibtaRun.items[0].status,'saved');assert.equal(stored.ibtaRun.items[0].password,undefined);assert.equal(stored.ibtaRun.items[1].status,'failed','A dashboard without its registration submission marker is not accepted');
  assert.equal((await api.enqueue({...base,owner:'other-owner',type:'PING'},sender)).run,null,'Results are scoped to the sheet owner');
  await assert.rejects(()=>api.enqueue({...base,client:'other-client',type:'ACK',run:started.run.id,ids:[items[0].id]},sender),/OUTDATED/);
  await assert.rejects(()=>api.enqueue({...base,client:'new-client',type:'RECOVER'},{...sender,tab:{id:20}}),/ACTIVE_TAB/);
  await assert.rejects(()=>api.enqueue({...base,owner:'other-owner',client:'new-client',type:'RECOVER'},{...sender,tab:{id:20}}),/OUTDATED/);
  ctx.chrome.tabs.get=async()=>{throw Error('Tab closed');};
  const recovered=await api.enqueue({...base,client:'new-client',type:'RECOVER'},{...sender,tab:{id:20}});assert.equal(recovered.run.client,'new-client');assert.equal(recovered.run.tab,20);assert.equal((await api.enqueue({...base,type:'PING'},sender)).run,null,'A closed tab cannot retrieve results after rebinding');
  stored.ibtaRun.items[1].status='done';stored.ibtaRun.items[1].username='REVIEW';stored.ibtaRun.items[1].password='REVIEW-PASSWORD';
  await api.enqueue({...base,client:'new-client',type:'DISMISS',run:started.run.id,ids:[items[1].id]},{...sender,tab:{id:20}});assert.equal(stored.ibtaRun.items[1].status,'reviewed','Manual review is distinct from a successful database save');
  console.log('PASS: Prometric row validation, moved/duplicate rows, protected credentials, per-exam identity, origin/tab/queue validation, confirmed-only results and serialized save acknowledgments');
})().catch(error=>{console.error(error);process.exitCode=1;});
