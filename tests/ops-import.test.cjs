const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const {Window} = require('happy-dom');

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return {promise, resolve, reject};
}
function fixture() {
  const window = new Window({settings:{disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});
  window.document.documentElement.innerHTML = require('../tools/workspace-source.cjs').renderDocument().replace(/<script[^>]*>[\s\S]*?<\/script>/g, '');
  const listeners = new Map(), restored = [], imported = [];
  for (const element of window.document.querySelectorAll('[id]')) {
    const listen = element.addEventListener.bind(element);
    element.addEventListener = (type, callback) => { listeners.set(element.id + ':' + type, callback); listen(type, callback); };
  }
  const approval = deferred();
  const context = vm.createContext({document:window.document,window:{AppDialog:{confirm:()=>approval.promise}},AppDialog:{confirm:()=>approval.promise},currentLang:'en',t:key=>(...args)=>key+':'+args.join(','),Cloud:{userId:()=> 'dummy-owner',existingCodes:()=>[],restoreData:async backup=>restored.push(backup),importCodes:async (category,codes)=>{imported.push([...codes]);return codes.length;}}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../ops-ui.js'),'utf8'),context);
  const choose = (id, read) => listeners.get(id+':change')({target:{files:[{size:100,text:()=>read.promise}]}});
  return {document:window.document,context,approval,restored,imported,choose,click:id=>listeners.get(id+':click')()};
}
const backup = code => JSON.stringify({settings:{categoryOrder:['Foundation'],codeCategories:['Foundation'],keycodes:[]},codes:[{code,category:'Foundation'}]});

test('late file completions cannot replace the newer backup or CSV selection', async () => {
  for (const kind of ['backup','csv']) {
    const f=fixture(), older=deferred(), newer=deferred();
    const input=kind==='backup'?'restore-file':'bulk-import-file';
    const a=f.choose(input,older),b=f.choose(input,newer);
    newer.resolve(kind==='backup'?backup('NEWER'):'Code\nNEWER');await b;
    older.resolve(kind==='backup'?backup('OLDER'):'Code\nOLDER');await a;
    const submitted=f.click(kind==='backup'?'restore-button':'bulk-import-submit');
    f.approval.resolve(true);await submitted;
    assert.equal(kind==='backup'?f.restored[0].codes[0].code:f.imported[0][0],'NEWER');
  }
});
test('changing the selected backup cancels an outstanding restore confirmation', async () => {
  const f=fixture(),first=deferred(),second=deferred();
  const a=f.choose('restore-file',first);first.resolve(backup('FIRST'));await a;
  const restore=f.click('restore-button');
  const b=f.choose('restore-file',second);second.resolve(backup('SECOND'));await b;
  f.approval.resolve(true);await restore;
  assert.equal(f.restored.length,0,'A confirmation for FIRST cannot restore SECOND');
});
test('session cleanup invalidates pending file reads', async () => {
  const f=fixture(),file=deferred(),reading=f.choose('restore-file',file);
  vm.runInContext('resetPendingImports()',f.context);
  file.resolve(backup('OLD-SESSION'));await reading;
  await f.click('restore-button');
  assert.equal(f.document.getElementById('restore-button').disabled,true);
  assert.equal(f.restored.length,0);
});
