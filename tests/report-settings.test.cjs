const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const React = require('react');
const {Window} = require('happy-dom');

test('report drafts survive rerender and translation, reorder by keyboard button, and reset for another owner', async () => {
  const window = new Window({url:'http://localhost',settings:{disableJavaScriptFileLoading:true}});
  global.window=window;global.document=window.document;global.localStorage=window.localStorage;
  global.DOMException=window.DOMException;global.IS_REACT_ACT_ENVIRONMENT=true;
  const {WorkspaceViews}=require('../tools/workspace-source.cjs').loadTsx(path.join(__dirname,'../client/workspace-views.tsx'));
  const root=window.document.createElement('div');window.document.body.append(root);
  let saved;
  const props={owner:'dummy-owner',columns:['Code','Name','Score'],preferences:{operations:[0,1],success:[1]},language:'en',save:async columns=>{saved=columns;return true;}};
  const render=async next=>React.act(async()=>WorkspaceViews.reportSettings(root,next));
  const click=async element=>React.act(async()=>element.click());
  const score=()=>root.querySelector('#settings-report-operations input[value="2"]');
  await render(props);await click(score());
  await render({...props,language:'ar',preferences:{...props.preferences}});
  assert.equal(score().checked,true,'Same-owner refresh must not discard an unchecked/saved preference draft');
  assert.equal(root.querySelector('[data-report-dirty]').dataset.reportDirty,'true');
  const moveUp=[...root.querySelectorAll('#settings-report-operations button')].find(button=>button.getAttribute('aria-label')==='تحريك لأعلى: Score');
  await click(moveUp);await click(root.querySelector('#settings-report-save'));
  assert.deepEqual(saved.operations,[0,2,1],'Keyboard-accessible reorder changes the copied column order');
  await render({...props,owner:'another-owner',preferences:{operations:[0],success:[0]}});
  assert.equal(score().checked,false,'A new owner never inherits the previous account draft');
  assert.equal(root.querySelector('[data-report-dirty]').dataset.reportDirty,'false');
  await window.happyDOM.close();
});
