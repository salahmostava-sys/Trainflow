const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const { test } = require('node:test');
const Prometric = require('../prometric-core.js');
const Exam = require('../prometric-exam-core.js');

function extensionFixture(fetcher) {
  const stored = {}, tabs = new Map();
  const clone = value => value === undefined ? value : structuredClone(value);
  const event = () => ({ addListener(listener) { this.listener = listener; } });
  let nextTab = 40;
  const chrome = {
    runtime: { id: 'fixture-extension', getManifest: () => ({ version: '4.1.1' }), onMessage: event(), onInstalled: event() },
    storage: { local: {
      async get(keys) { return Object.fromEntries((typeof keys === 'string' ? [keys] : keys).map(key => [key, clone(stored[key])])); },
      async set(values) { Object.assign(stored, clone(values)); },
      async remove(keys) { for (const key of typeof keys === 'string' ? [keys] : keys) delete stored[key]; }
    } },
    tabs: {
      onRemoved: event(),
      async create(options) { const tab = { id: ++nextTab, ...options }; tabs.set(tab.id, tab); return tab; },
      async get(id) { if (!tabs.has(id)) throw Error('Tab closed'); return tabs.get(id); },
      async update(id, options) { Object.assign(tabs.get(id), options); },
      async remove(id) { tabs.delete(id); },
      async sendMessage() {}
    },
    action: { setBadgeText() {}, setBadgeBackgroundColor() {} },
    notifications: { create() {} },
    contextMenus: { create() {}, onClicked: event() }
  };
  const context = vm.createContext({ chrome, console, crypto: webcrypto, URL, fetch: fetcher, setTimeout: () => 1, clearTimeout() {} });
  const extension = path.resolve(__dirname, '../extension/prometric');
  context.importScripts = (...files) => files.forEach(file => vm.runInContext(fs.readFileSync(path.join(extension, file), 'utf8'), context, { filename: file }));
  vm.runInContext(fs.readFileSync(path.join(extension, 'background.js'), 'utf8'), context, { filename: 'background.js' });
  const app = { id: chrome.runtime.id, frameId: 0, url: 'https://trainf.vercel.app/', tab: { id: 10 } };
  const popup = { id: chrome.runtime.id };
  const send = (message, sender = popup) => new Promise(resolve => chrome.runtime.onMessage.listener(message, sender, resolve));
  const request = payload => send({ action: 'ibtaRequest', payload: { owner: 'dummy-owner', client: 'dummy-client', ...payload } }, app);
  const registrationSender = () => ({ id: chrome.runtime.id, frameId: 0, url: 'https://tcnet1.prometric.com/Registration.aspx', tab: { id: stored.currentTabId } });
  return { stored, chrome, tabs, send, request, registrationSender };
}

function registrationItems() {
  const rows = ['ALPHA STUDENT', 'BETA STUDENT'].map((name, index) => {
    const row = Array(13).fill('');
    row[1] = `dummy${index}@example.invalid`; row[3] = name; row[4] = String(index); row[7] = 'CBP-L';
    return row;
  });
  return Prometric.prepare(rows, [0, 1]).items;
}

async function examItems(){
  const rows=registrationItems().map((account,index)=>{const row=Array(13).fill('');row[0]='DUMMY-CODE-'+index;row[1]=account.email;row[3]=account.name;row[7]='Leadership';row[9]='DUMMY-USER-'+index;row[10]='DUMMY-PASSWORD';return row;});
  return Promise.all(Exam.prepare(rows,[0,1],[],{}).items.map(async account=>{const {originalCredentials,...safe}=account;return {...safe,credentialsHash:await Prometric.credentialsHash(originalCredentials)};}));
}

test('result jobs isolate app and Prometric tabs and retain scores until durable acknowledgment',async()=>{
  const fixture=extensionFixture(),items=await examItems(),app={id:fixture.chrome.runtime.id,frameId:0,url:'https://trainf.vercel.app/',tab:{id:10}};
  const request=(type,extra={},sender=app)=>fixture.send({action:'ibtaExamRequest',payload:{owner:'dummy-owner',client:'dummy-client',type,...extra}},sender);
  assert.equal((await request('START',{items})).ok,true);
  const examSender=()=>({id:fixture.chrome.runtime.id,frameId:0,url:'https://tcnet1.prometric.com/User/Welcome.aspx',tab:{id:fixture.stored.ibtaExamRun.examTab}});
  const record=(account,extra,sender=examSender())=>fixture.send({action:'ibtaExamRecord',run:fixture.stored.ibtaExamRun.id,id:account.id,...extra},sender);
  assert.equal((await request('PING')).run.items[0].password,undefined,'Polling cannot disclose queued credentials');
  fixture.stored.queue=[{status:'failed'}];fixture.stored.queueIndex=0;fixture.stored.isRunning=false;
  await fixture.chrome.contextMenus.onClicked.listener({menuItemId:'resume_queue'});
  assert.equal(fixture.stored.isRunning,false,'Popup registration cannot resume during a results job');
  assert.equal((await fixture.request({type:'START',items:registrationItems()})).error,'BUSY');
  assert.equal((await record(items[0],{loggedIn:true,username:items[0].username},{...examSender(),tab:{id:999}})).error,'FORBIDDEN');
  assert.equal((await record(items[0],{loggedIn:true,username:items[0].username})).ok,true);
  const scoreSender={...examSender(),url:'https://tcnet1.prometric.com/Candidate/ManageReviewScores.aspx'};
  assert.equal((await record(items[0],{rawScore:'Pass (88.2%)',examTitle:'Sales Arabic'},scoreSender)).error,'INVALID_RESULT');
  assert.equal((await record(items[0],{rawScore:'Pass (88.2%)',examTitle:'Leadership Arabic'},scoreSender)).ok,true);
  assert.equal(fixture.stored.ibtaExamRun.items[0].status,'done');assert.equal(fixture.stored.ibtaExamRun.items[0].password,undefined);
  assert.equal((await request('ACK',{run:fixture.stored.ibtaExamRun.id,ids:[items[0].id]},{...app,tab:{id:11}})).error,'OUTDATED');
  fixture.tabs.set(10,{id:10});
  assert.equal((await request('RECOVER',{}, {...app,tab:{id:11}})).error,'ACTIVE_TAB','Another tab cannot take over an open app tab');
  await request('STOP',{run:fixture.stored.ibtaExamRun.id});
  assert.equal(fixture.stored.ibtaExamRun.items[0].score,'88.2%');assert.equal(fixture.stored.ibtaExamRun.items[0].status,'done','Stop retains unsaved confirmed scores');
  assert.equal(fixture.stored.ibtaExamRun.items[1].password,undefined,'Stop discards pending account credentials');
  assert.equal((await record(items[1],{rawScore:'Fail (60%)',examTitle:'Leadership Arabic'},scoreSender)).error,'FORBIDDEN');
  assert.equal((await request('START',{items})).error,'BUSY');
  await request('ACK',{run:fixture.stored.ibtaExamRun.id,ids:[items[0].id]});
  assert.equal(fixture.stored.ibtaExamRun.items[0].status,'saved');assert.equal((await request('START',{items})).ok,true);
  fixture.tabs.delete(10);
  const recovered=await request('RECOVER',{}, {...app,tab:{id:11}});
  assert.equal(recovered.run.appTab,11);assert.equal(recovered.run.items[0].password,undefined,'Closed-tab recovery does not expose queued passwords');
  assert.equal((await request('STOP',{run:recovered.run.id})).error,'OUTDATED','The old app tab cannot control a recovered batch');
});

test('completed account documents cannot access the next account and failed tabs remain inspectable',async()=>{
  const fixture=extensionFixture(),items=await examItems();
  const request=(type,extra={})=>fixture.send({action:'ibtaExamRequest',payload:{owner:'dummy-owner',client:'dummy-client',type,...extra}},{id:fixture.chrome.runtime.id,frameId:0,url:'https://trainf.vercel.app/',tab:{id:10}});
  await request('START',{items});
  const tab=fixture.stored.ibtaExamRun.examTab,run=fixture.stored.ibtaExamRun.id;
  const sender=documentId=>({id:fixture.chrome.runtime.id,frameId:0,documentId,url:'https://tcnet1.prometric.com/User/Welcome.aspx',tab:{id:tab}});
  for(const documentId of ['dummy-login-document','dummy-welcome-document'])assert.equal((await fixture.send({action:'ibtaExamContext'},sender(documentId))).username,items[0].username);
  assert.equal((await fixture.send({action:'ibtaExamRecord',run,id:items[0].id,error:'WRONG_ACCOUNT'},sender('dummy-welcome-document'))).ok,true);
  for(const documentId of ['dummy-login-document','dummy-welcome-document'])assert.equal((await fixture.send({action:'ibtaExamContext'},sender(documentId))).active,false,'Previous documents cannot receive another trainee\'s credentials');
  const second=sender('dummy-next-document');
  assert.equal((await fixture.send({action:'ibtaExamContext'},second)).username,items[1].username);
  assert.equal((await fixture.send({action:'ibtaExamRecord',run,id:items[1].id,error:'SESSION_EXPIRED',page:'/SessionTimedout.aspx'},second)).ok,true);
  assert.equal(fixture.stored.ibtaExamRun.items[1].error,'SESSION_EXPIRED');
  assert.equal(fixture.stored.ibtaExamRun.items[1].page,'/SessionTimedout.aspx');
  assert.ok(fixture.stored.ibtaExamRun.items.every(account=>!account.password&&!account.username));
  assert.equal(fixture.tabs.get(tab).active,true,'The last failed page remains open for inspection');
  assert.equal((await fixture.send({action:'ibtaExamContext'},second)).active,false,'A failed tab cannot keep requesting credentials');
  assert.equal((await request('START',{items:items.slice(1)})).ok,true);
  assert.equal(fixture.tabs.has(tab),false,'Retry closes the old failed tab');
});

test('sheet import rejects unexpected URLs and fetches a valid CSV without cookies', async () => {
  const requests = [];
  const fixture = extensionFixture(async (url, options) => {
    requests.push({ url, options });
    return { ok: true, text: async () => 'Name,Email\nDUMMY STUDENT,dummy@example.invalid' };
  });
  const valid = 'https://docs.google.com/spreadsheets/d/dummy_sheet/export?format=csv&gid=0';
  for (const url of [
    valid.replace('https:', 'http:'),
    valid.replace('docs.google.com', 'example.invalid'),
    valid.replace('docs.google.com', 'user:password@docs.google.com'),
    valid.replace('/export?', '/edit?'),
    valid.replace('format=csv', 'format=html'),
    valid.replace('gid=0', 'gid=invalid'),
  ]) {
    assert.equal((await fixture.send({ action: 'fetchSheet', url })).ok, false);
  }
  assert.equal(requests.length, 0, 'Rejected URLs cannot reach the network');
  const response = await fixture.send({ action: 'fetchSheet', url: valid });
  assert.equal(response.ok, true);
  assert.equal(response.text, 'Name,Email\nDUMMY STUDENT,dummy@example.invalid');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, valid);
  assert.equal(requests[0].options.credentials, 'omit');
});

for (const clearVia of ['popup', 'context menu']) {
  test(`clearing pending registrations via ${clearVia} allows a new Trainflow run`, async () => {
    const fixture = extensionFixture(), items = registrationItems();
    assert.equal((await fixture.request({ type: 'START', items })).ok, true);
    if (clearVia === 'popup') assert.equal((await fixture.send({ action: 'clearSession' })).ok, true);
    else await fixture.chrome.contextMenus.onClicked.listener({ menuItemId: 'stop_clear' });
    const status = await fixture.request({ type: 'PING' });
    assert.equal(status.busy, false);
    assert.deepEqual(Array.from(status.run.items, entry => entry.status), ['cancelled', 'cancelled']);
    assert.equal((await fixture.request({ type: 'START', items })).ok, true);
  });
}

test('clearing a run retains confirmed credentials until the sheet acknowledges its save', async () => {
  const fixture = extensionFixture(), items = registrationItems();
  const started = await fixture.request({ type: 'START', items });
  const queueId = fixture.stored.currentProcessingId, sender = fixture.registrationSender();
  assert.equal((await fixture.send({ action: 'ibtaSubmitted', queueId }, sender)).ok, true);
  assert.equal((await fixture.send({ action: 'stepDone', queueId, finalUsername: 'ALPHASTUDENT', password: 'DUMMY', step: 'dashboard' }, sender)).ok, true);
  await fixture.send({ action: 'clearSession' });
  const status = await fixture.request({ type: 'PING' });
  assert.deepEqual(Array.from(status.run.items, entry => entry.status), ['done', 'cancelled']);
  assert.equal(status.run.items[0].password, 'DUMMY');
  assert.equal((await fixture.request({ type: 'START', items })).error, 'BUSY');
  await fixture.request({ type: 'ACK', run: started.run.id, ids: [items[0].id] });
  assert.equal((await fixture.request({ type: 'PING' })).busy, false);
  assert.equal((await fixture.request({ type: 'START', items })).ok, true);
});

test('a failed registration can still be confirmed after an explicit manual retry', async () => {
  const fixture = extensionFixture();
  await fixture.request({ type: 'START', items: registrationItems().slice(0, 1) });
  let queueId = fixture.stored.currentProcessingId;
  assert.equal((await fixture.send({ action: 'stepFailed', queueId, reason: 'Dummy missing field', retryable: true }, fixture.registrationSender())).ok, true);
  assert.equal((await fixture.request({ type: 'PING' })).run.items[0].status, 'failed');
  assert.equal((await fixture.send({ action: 'retryFailed' })).ok, true);
  queueId = fixture.stored.currentProcessingId;
  const sender = fixture.registrationSender();
  await fixture.send({ action: 'ibtaSubmitted', queueId }, sender);
  assert.equal((await fixture.send({ action: 'stepDone', queueId, finalUsername: 'ALPHASTUDENT', password: 'DUMMY', step: 'dashboard' }, sender)).ok, true);
  assert.equal((await fixture.request({ type: 'PING' })).run.items[0].status, 'done');
});

for (const action of ['stepDone', 'stepFailed']) {
  test(`${action} queued behind session clearing is rejected rather than saved to history`, async () => {
    const fixture = extensionFixture();
    await fixture.request({ type: 'START', items: registrationItems() });
    const sender = fixture.registrationSender(), queueId = fixture.stored.currentProcessingId;
    const [cleared, late] = await Promise.all([
      fixture.send({ action: 'clearSession' }),
      fixture.send({ action, queueId, finalUsername: 'LATE', password: 'DUMMY', step: 'dashboard', reason: 'DUMMY_FAILURE' }, sender)
    ]);
    assert.equal(cleared.ok, true);
    assert.equal(late.ok, false);
    assert.equal(fixture.stored.history, undefined);
    assert.equal(fixture.stored.copiedCreds, undefined);
  });
}
