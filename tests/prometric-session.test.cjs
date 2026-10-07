const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const { test } = require('node:test');
const Prometric = require('../prometric-core.js');

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
      async update() {},
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
  return { stored, chrome, send, request, registrationSender };
}

function registrationItems() {
  const rows = ['ALPHA STUDENT', 'BETA STUDENT'].map((name, index) => {
    const row = Array(13).fill('');
    row[1] = `dummy${index}@example.invalid`; row[3] = name; row[4] = String(index); row[7] = 'CBP-L';
    return row;
  });
  return Prometric.prepare(rows, [0, 1]).items;
}

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
