const assert=require('node:assert/strict'),{test}=require('node:test');
const Live=require('../workspace-live.js');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function socketFixture(t,onRefresh){
  t.mock.timers.enable({apis:['setTimeout']});let receive,status,removed=false;const statuses=[];
  const channel={on(_type,_filter,callback){receive=callback;return this;},subscribe(callback){status=callback;return this;}};
  const connection=Live.connect({client:{channel:()=>channel,removeChannel:async()=>{removed=true;}},owner:'dummy-owner',onRefresh,onStatus:next=>statuses.push(next)});
  t.after(()=>connection.close());
  return {connection,emit:owner=>receive({new:{key:owner||'workspace',owner_id:owner||null}}),status:next=>status(next),statuses,removed:()=>removed,async tick(ms){t.mock.timers.tick(ms);await settle();}};
}
test('live events coalesce bursts and retain changes that arrive during a refresh',async t=>{
  const updates=[];let release;
  const socket=socketFixture(t,async scope=>{updates.push(scope);if(updates.length===1)await new Promise(resolve=>release=resolve);return true;});
  socket.emit();socket.emit();await socket.tick(100);
  socket.emit();socket.emit('other-owner');release();await settle();await socket.tick(1000);
  assert.deepEqual(updates,['workspace','workspace','other-owner']);
});
test('live updates wait for a draft to finish and catch up after reconnecting',async t=>{
  const view={draft:'unfinished name',saved:'old value'};let blocked=true;
  const socket=socketFixture(t,async scope=>{if(blocked)return false;view.saved=scope;return true;});
  socket.emit();await socket.tick(100);assert.deepEqual(view,{draft:'unfinished name',saved:'old value'});
  blocked=false;await socket.tick(1000);assert.equal(view.saved,'workspace');
  socket.status('CHANNEL_ERROR');socket.status('SUBSCRIBED');await socket.tick(100);
  assert.equal(view.saved,'sheets','Reconnect also catches missed sheet changes');
  assert(socket.statuses.includes('pending'));assert(socket.statuses.includes('reconnecting'));assert.equal(socket.statuses.at(-1),'connected');
});
test('closing the session cancels queued work and ignores stale socket callbacks',async t=>{
  const updates=[];const socket=socketFixture(t,async scope=>{updates.push(scope);return true;});
  socket.emit();socket.connection.close();socket.emit('old-owner');socket.status('SUBSCRIBED');await socket.tick(5000);
  assert.equal(socket.removed(),true);assert.deepEqual(updates,[]);assert.deepEqual(socket.statuses,[]);
});
test('a failed data read is retried without losing the pending update',async t=>{
  t.mock.method(console,'warn',()=>{});let failed=false,display='old';
  const socket=socketFixture(t,async scope=>{if(scope==='workspace'){if(!failed){failed=true;throw Error('NETWORK');}display='latest';}return true;});
  socket.status('SUBSCRIBED');await socket.tick(100);assert.equal(display,'old');assert.equal(socket.statuses.at(-1),'retrying');
  await socket.tick(5000);assert.equal(display,'latest');assert.equal(socket.statuses.at(-1),'connected');
});
