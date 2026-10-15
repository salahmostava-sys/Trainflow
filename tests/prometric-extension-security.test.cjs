const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{webcrypto}=require('node:crypto');
const ext=path.resolve(__dirname,'../extension/prometric');
const read=f=>fs.readFileSync(path.join(ext,f),'utf8');
const {pruneStoredPasswords,purgeStoredPasswords,CREDENTIAL_RETENTION}=require('../extension/prometric/utils.js');

test('registration scripts run only in the isolated world, sharing one realm',()=>{
  const m=JSON.parse(read('manifest.json'));
  assert.equal(m.version,'4.3.0');
  for(const cs of m.content_scripts)assert.notEqual(cs.world,'MAIN','No content script runs in the page MAIN world');
  const reg=m.content_scripts.find(cs=>cs.js.includes('content.js'));
  assert.deepEqual(reg.js,['prom-channel.js','bridge.js','dom-utils.js','content.js']);
  assert.ok(m.permissions.includes('alarms'));
});

test('bridge and content never use page-visible window events',()=>{
  for(const f of ['bridge.js','content.js']){
    const src=read(f);
    assert.doesNotMatch(src,/(globalThis|window)\.(dispatchEvent|addEventListener)\(\s*(new CustomEvent\()?['"]__prom_/,f);
  }
});

test('channel scripts load together in one realm without declaration clashes',()=>{
  const ctx=vm.createContext({crypto:webcrypto,EventTarget,CustomEvent,console,setTimeout:()=>1,clearTimeout(){},document:{readyState:'loading',getElementById:()=>null,body:null},location:{href:'https://tcnet1.prometric.com/x'},navigator:{},chrome:{runtime:{sendMessage:async()=>({ok:false})},storage:{local:{get:async()=>({}),set:async()=>{}},onChanged:{addListener(){}}}}});
  ctx.globalThis=ctx;ctx.addEventListener=()=>{};ctx.dispatchEvent=()=>{throw Error('window event used');};
  for(const f of ['prom-channel.js','bridge.js','dom-utils.js','content.js'])vm.runInContext(read(f),ctx,{filename:f});
});

test('channel ignores events without the per-load nonce',()=>{
  const ctx=vm.createContext({crypto:webcrypto,EventTarget,CustomEvent});ctx.globalThis=ctx;
  vm.runInContext(read('prom-channel.js'),ctx);
  const ch=vm.runInContext('PromChannel',ctx);const got=[];
  const fn=e=>got.push(e.detail);ch.on('x',fn);ch.emit('x',{a:1});
  assert.deepEqual(got,[{a:1}]);
  ch.off('x',fn);ch.emit('x',{a:2});assert.equal(got.length,1);
  assert.equal(Object.isFrozen(ch),true);
});

test('history passwords expire after 7 days; savedCreds after 30 days',()=>{
  const now=Date.parse('2026-03-01T00:00:00Z'),day=864e5;
  const history=[{name:'new',password:'p1',date:new Date(now-2*day).toISOString()},{name:'old',password:'p2',date:new Date(now-8*day).toISOString()},{name:'nopass',date:'x'},{name:'undated',password:'p3'}];
  const r=pruneStoredPasswords({history,savedCreds:{username:'U',password:'P',savedAt:now-31*day}},now);
  assert.equal(r.changed,true);assert.equal(r.history[0].password,'p1');assert.equal(r.history[1].password,'');assert.equal(r.history[1].passwordExpired,true);assert.equal(r.history[1].name,'old');
  assert.equal(r.history[3].password,'p3','Undated entries cannot be aged and are left alone');assert.equal(r.savedCreds,null);
  const legacy=pruneStoredPasswords({savedCreds:{username:'U',password:'P'}},now);assert.equal(legacy.savedCreds.savedAt,now,'Legacy creds are stamped, not deleted');
  assert.equal(pruneStoredPasswords({history:[history[0]],savedCreds:{username:'U',password:'P',savedAt:now}},now).changed,false);
  assert.equal(CREDENTIAL_RETENTION.historyPasswordMs,7*day);
});

test('purge removes every stored password',()=>{
  const r=purgeStoredPasswords({history:[{password:'a',name:'n'},{name:'m'}]});
  assert.deepEqual(r.history.map(h=>h.password||''),['','']);assert.equal(r.savedCreds,null);
});

test('a user choosing random passwords is not migrated back to the pattern on update',async()=>{
  const stored={passPattern:'{random}'};let installed;
  const ev=()=>({addListener(l){this.l=l;}});
  const chrome={runtime:{id:'x',getManifest:()=>({version:'4.3.0'}),onMessage:ev(),onInstalled:{addListener(l){installed=l;}}},storage:{local:{async get(k){k=typeof k==='string'?[k]:k;return Object.fromEntries(k.map(x=>[x,stored[x]]));},async set(v){Object.assign(stored,v);},async remove(k){for(const x of [].concat(k))delete stored[x];}}},tabs:{onRemoved:ev()},action:{setBadgeText(){},setBadgeBackgroundColor(){}},notifications:{create(){}},contextMenus:{create(){},onClicked:ev()}};
  const ctx=vm.createContext({chrome,console,crypto:webcrypto,URL,setTimeout:()=>1,clearTimeout(){}});
  ctx.importScripts=(...fs_)=>fs_.forEach(f=>vm.runInContext(read(f),ctx,{filename:f}));
  vm.runInContext(read('background.js'),ctx,{filename:'background.js'});
  await installed({reason:'update',previousVersion:'4.2.7'});
  assert.equal(stored.passPattern,'{random}');
});
