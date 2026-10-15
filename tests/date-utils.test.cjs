const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {Window}=require('happy-dom');
const Dates=require('../date-utils.js');

const root=path.join(__dirname,'..');
const dmy=(day,month,year)=>({day,month,year});

test('parses every stored date shape into the same calendar day', ()=>{
  for(const value of ['06/10/2026','6/10/2026','2026/10/06','2026/10/6','2026-10-06','06-10-2026','06.10.2026','2026.10.06',
    '٠٦/١٠/٢٠٢٦','٢٠٢٦/١٠/٠٦','۰۶/۱۰/۲۰۲۶','\u200f06/10/2026\u200f',' 06/10/2026 '])
    assert.deepEqual(Dates.parse(value),dmy(6,10,2026),value);
  assert.deepEqual(Dates.parse('1/2/2026'),dmy(1,2,2026));
  assert.equal(Dates.toDisplay('1/2/2026'),'01/02/2026');
  assert.equal(Dates.toDisplay('2026-10-06'),'06/10/2026');
  assert.equal(Dates.toIso('٠٦/١٠/٢٠٢٦'),'2026-10-06');
  assert.equal(Dates.westernDigits('٠١٢٣٤٥٦٧٨٩ ۰۱۲۳۴۵۶۷۸۹'),'0123456789 0123456789');
});

test('rejects impossible, ambiguous and malformed dates', ()=>{
  for(const value of ['31/02/2026','29/02/2025','00/01/2026','01/13/2026','2026/02/30','32/01/2026','06/10/26','2026/10',
    '06/10-2026','2026-10/06','abc','','06/10/2026 extra',null,undefined,'1/2/3/2026'])
    assert.equal(Dates.parse(value),null,String(value));
  assert.deepEqual(Dates.parse('29/02/2024'),dmy(29,2,2024),'Leap day is valid');
  assert.equal(Dates.toIso('31/02/2026'),null);
  assert.equal(Dates.dayNumber('nope'),0);
  assert.equal(Dates.dayNumber('2026-10-06'),Date.UTC(2026,9,6));
});

test('embedded mode finds a date inside other cell text', ()=>{
  assert.deepEqual(Dates.parse('Exam on ١/٢/٢٠٢٦ at 10:00',{embedded:true}),dmy(1,2,2026));
  assert.deepEqual(Dates.parse('2026-10-06T09:00',{embedded:true}),dmy(6,10,2026));
  assert.equal(Dates.parse('Exam on 1/2/2026 at 10:00'),null,'Strict mode needs the whole value');
  assert.equal(Dates.parse('ref 123/10/2026',{embedded:true}),null,'Digits must not run into the day');
});

test('Riyadh calendar date differs from UTC between 00:00 and 03:00 Riyadh time', ()=>{
  const lateUtc=new Date('2026-10-05T22:30:00Z');
  assert.equal(lateUtc.toISOString().slice(0,10),'2026-10-05');
  assert.equal(Dates.riyadhIsoDate(lateUtc),'2026-10-06');
  assert.equal(Dates.riyadhToday(lateUtc),'06/10/2026');
  assert.equal(Dates.riyadhIsoDate(new Date('2026-10-06T20:59:59Z')),'2026-10-06');
  assert.equal(Dates.riyadhIsoDate(new Date('2026-10-06T21:00:00Z')),'2026-10-07');
  assert.equal(Dates.riyadhIsoDate('invalid'),'');
});

test('the browser script exposes TrainflowDates as a global', ()=>{
  const context=vm.createContext({Intl,Date});
  vm.runInContext(fs.readFileSync(path.join(root,'date-utils.js'),'utf8'),context);
  assert.equal(vm.runInContext('JSON.stringify(TrainflowDates.parse("2026/10/06"))',context),JSON.stringify(dmy(6,10,2026)));
});

test('workspace and trainees scripts are registered after date-utils.js', ()=>{
  const {sources}=require('../tools/workspace-source.cjs');
  const order=sources.map(source=>source.src);
  const at=order.indexOf('date-utils.js');
  assert.ok(at>=0,'date-utils.js is loaded by the workspace');
  for(const file of ['workspace.js','trainees.js','trainee-reports.js','codes-export.js'])assert.ok(order.indexOf(file)>at,file+' loads after date-utils.js');
});

test('daily operations report includes vouchers stored in older date formats', async ()=>{
  const window=new Window({url:'http://localhost',settings:{disableJavaScriptFileLoading:true}});
  const document=window.document;
  document.body.innerHTML='<div id="sheet-report-panel"><div class="sheet-report-actions"></div><input data-field="date"><button data-action="operations"></button><button data-action="success"></button><p></p></div>';
  const owner='owner-1';
  const codes=[
    ['DDMMYYYY','06/10/2026'],['YMD','2026/10/06'],['UNPADDED','6/10/2026'],['ARABIC','٠٦/١٠/٢٠٢٦'],
    ['PERSIAN','۰۶/۱۰/۲۰۲۶'],['DASHED','2026-10-06'],['OTHERDAY','07/10/2026'],['INVALID','31/02/2026'],
  ].map(([code,used_on])=>({code,used_on,owner_id:owner,used_at:null}));
  codes.push({code:'STAMPED',used_on:'01/01/2000',used_at:'2026-10-05T22:30:00Z',owner_id:owner});
  codes.push({code:'FOREIGN',used_on:'06/10/2026',used_at:null,owner_id:'someone-else'});
  let copied='';
  const context=vm.createContext({
    window:{WorkspaceViews:{reportSettings(){},reportPanel(){}}},document,navigator:{},Intl,Date,Blob:window.Blob,
    currentLang:'en',
    Cloud:{reportColumns:()=>null,userId:()=>owner,codeSnapshot:()=>codes},
    Trainees:{reportColumnLabels:()=>[]},
    TraineeData:{tsv:rows=>rows.map(row=>row.join('\t')).join('\n'),idKey:value=>String(value).trim()},
    copyText:async text=>{copied=text;return true;},
  });
  vm.runInContext(fs.readFileSync(path.join(root,'date-utils.js'),'utf8'),context);
  vm.runInContext(fs.readFileSync(path.join(root,'trainee-reports.js'),'utf8')+';globalThis.TraineeReports=TraineeReports;',context);
  const rows=[...codes.map(({code})=>[code,'','Name '+code,'','','','','','','','','']),
    ['','','Pending exam','','','','','','Exam ٦/١٠/٢٠٢٦','','','']];
  context.TraineeReports.mount(()=>({loaded:true,owner,rows,formatting:{}}),()=>{});
  const panel=document.getElementById('sheet-report-panel');
  panel.querySelector('[data-field="date"]').value='2026-10-06';
  panel.querySelector('[data-action="operations"]').click();
  for(let i=0;i<20&&!copied;i++)await new Promise(resolve=>setTimeout(resolve,5));
  const lines=copied.split('\n'),reported=lines.map(line=>line.split('\t')[0]);
  assert.deepEqual(reported,['DDMMYYYY','YMD','UNPADDED','ARABIC','PERSIAN','DASHED','STAMPED',''],copied);
  assert.equal(lines.at(-1).split('\t')[8],'10/06/2026','Operations report keeps its MM/DD/YYYY exam-date output');
  await window.happyDOM.close();
});
