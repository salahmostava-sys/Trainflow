const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path=require('node:path');
class Element {
  constructor(){this.children=[];this.listeners={};this.style={};this.dataset={};this.value='';this.hidden=false;this.textContent='';this.classList={add(){},remove(){},toggle(){},contains(){return false}};}
  appendChild(e){this.children.push(e);} removeChild(e){this.children=this.children.filter(x=>x!==e);}
  addEventListener(event,fn){this.listeners[event]=fn;} select(){} focus(){} matches(){return false;}
  set innerHTML(v){this.children=[];} get innerHTML(){return '';}
}
const els={},storage=new Map(),events=[];
const document={getElementById:id=>els[id] ||= new Element(),createElement:()=>new Element(),querySelectorAll:()=>[],querySelector:()=>new Element(),body:new Element(),execCommand:()=>false,hidden:false};
const db={settings:{id:1,version:1,payload:{keycodes:[],categoryOrder:['Foundation'],codeCategories:['Foundation-100'],keycodeOrder:{},keycodeOverrides:{},dateColors:{},credentials:{account:'test-account',password:'test-password'}}},codes:[{code:'TEST',category:'Foundation-100',notes:'',used_on:null,used_by:null,version:1}]};
const clone=x=>JSON.parse(JSON.stringify(x));
let conflict=false,clipboardFails=false,codeReads=0;
const client={
  auth:{getSession:async()=>({data:{session:{user:{id:'user-1',email:'test@example.invalid'}}}}),onAuthStateChange(){},signOut:async()=>({})},
  from(table){return {select(){return this;},eq(){return this;},order(){return this;},single:async()=>table==='ibta_members'?{data:{role:'admin',active:true}}:{data:clone(db.settings)},range:async()=>{codeReads++;return {data:clone(db.codes)};}};},
  async rpc(name,args){
    events.push({name,args:clone(args)});
    if(conflict)return {error:{message:'CONFLICT: reload required'}};
    if(name==='ibta_claim_code'){
      const row=db.codes.find(r=>r.code===args.target_code&&r.version===args.expected_version&&!r.used_on);
      if(!row)return {data:[]};row.used_on=args.use_date;row.used_by='user-1';row.version++;return {data:[clone(row)]};
    }
    for(const c of args.changes){
      if(c.op==='update'){const r=db.codes.find(r=>r.code===c.code);assert.equal(c.version,r.version);r.notes=c.notes;r.used_on=c.used_on;r.version++;}
      if(c.op==='insert')db.codes.push({...c,version:1});
      if(c.op==='delete')db.codes=db.codes.filter(r=>r.code!==c.code);
    }
    if(args.settings_payload){db.settings.payload=clone(args.settings_payload);db.settings.version++;}
    return {};
  }
};
const ctx=vm.createContext({document,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},sessionStorage:{},window:{supabase:{createClient:()=>client},addEventListener(){}},navigator:{clipboard:{writeText:async()=>{if(clipboardFails)throw Error('denied');events.push({name:'clipboard'});}}},setInterval(){},setTimeout(){},clearTimeout(){},confirm:()=>true,location:{reload(){}}});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../cloud.js'),'utf8'),ctx);
const html=fs.readFileSync(path.join(__dirname,'../ibta-ops.html'),'utf8');
for(const [,script] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))vm.runInContext(script,ctx);
const run=s=>vm.runInContext(s,ctx);
(async()=>{
  await new Promise(setImmediate);
  assert.equal(els['auth-box'].hidden,true);assert.equal(els.app.hidden,false);
  assert.equal(els['cred-account-val'].textContent,'test-account');
  els['add-codes-input'].value='unsaved code';
  assert.equal(await run('Cloud.refresh(true)'),false);
  assert.equal(codeReads,1);
  els['add-codes-input'].value='';
  assert.equal(await run('Cloud.refresh(true)'),true);
  assert.equal(codeReads,2);
  assert.equal(await run('Cloud.refresh(true)'),false);
  assert.equal(codeReads,2);
  run("state.codeNotes.TEST='hello'");assert.equal(await run('saveState()'),true);assert.equal(db.codes[0].notes,'hello');
  await run("Cloud.copyCode('TEST')");assert.equal(db.codes[0].used_by,'user-1');
  assert(events.findIndex(e=>e.name==='ibta_claim_code')<events.findIndex(e=>e.name==='clipboard'));
  conflict=true;run("state.codeNotes.TEST='stale'");assert.equal(await run('saveState()'),false);assert.equal(run('state.codeNotes.TEST'),'hello');conflict=false;
  db.codes.push({code:'FAIL-COPY',category:'Foundation-100',notes:'',used_on:null,used_by:null,version:1});await run('Cloud.refresh()');
  clipboardFails=true;assert.equal(await run("Cloud.copyCode('FAIL-COPY')"),false);assert.equal(db.codes.find(r=>r.code==='FAIL-COPY').used_by,'user-1');
  assert.match(els['cloud-status'].textContent,/تم حجز/);
  assert(!storage.has('ibta_ops_state_v4'));
  const count=events.length;const row=els['code-grid'].children[0];await row.listeners.click({target:{closest:()=>true}});assert.equal(events.length,count);
  console.log('PASS: authenticated rendering, persisted notes, claim-before-copy, conflict recovery, clipboard failure reservation, selection isolation, no local operational storage.');
})().catch(e=>{console.error(e);process.exitCode=1;});
