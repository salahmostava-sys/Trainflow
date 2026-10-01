const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const headers=['رقم الهاتف','VOUCHER','الاسم باللغة العربية','تاريخ الإختبار','الحالة','حالة الإرسال'];
const owner='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const row=(code,result)=>[code,'email','اسم','Name','001234','050123','','','','secret','secret',result,'private'];
let rows=[row('PASS','ناجح'),row('FAIL','راسب')],written=[],destination='sheet',reads=0;
const props={SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'public',SUCCESS_ID:'sheet',OPERATIONS_ID:'other'};
const range={getDisplayValues:()=>[headers],copyTo(){},setNumberFormat(){},setValues(v){written=v;}};
const tab={getLastRow:()=>1,getLastColumn:()=>headers.length,getRange:()=>range,getMaxRows:()=>100,insertRowsAfter(){}};
const context={Map,Set,Date,JSON,String,Number,Error,encodeURIComponent,
  PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]})},
  LockService:{getScriptLock:()=>({waitLock(){},hasLock:()=>true,releaseLock(){}})},
  Utilities:{formatDate:()=> '2026-10-01'},
  HtmlService:{createHtmlOutput:v=>v},
  SpreadsheetApp:{openById:id=>{assert.equal(id,destination);return {getSheets:()=>[tab]};},CopyPasteType:{},flush(){}},
  UrlFetchApp:{fetch:url=>{reads++;return {getResponseCode:()=>200,getContentText:()=>JSON.stringify(url.includes('trainee')?[{cells:rows}]:[{code:'PASS',used_at:'2026-10-01T07:00:00Z'},{code:'FAIL',used_at:'2026-10-01T07:00:00Z'}])};}}
};
vm.createContext(context);vm.runInContext(fs.readFileSync('tools/google-reports.gs','utf8'),context);
const send=(overrides={})=>context.doPost({parameter:{payload:JSON.stringify({owner,token:'token',date:'2026-10-01',kind:'success',destination:'https://docs.google.com/spreadsheets/d/sheet/edit',...overrides})}});
assert.match(send(),/تمت إضافة 1/);assert.equal(written.length,1);assert.deepEqual(Array.from(written[0]),['050123','PASS','اسم','01/10/2026','ناجح','']);assert.ok(!JSON.stringify(written).includes('secret'));
rows.push(row('PASS','ناجح'));assert.match(send(),/أكثر من صف/);rows.pop();
const prior=reads;assert.match(send({destination:'https://docs.google.com/spreadsheets/d/evil/edit'}),/لا يطابق/);assert.equal(reads,prior);
tab.getLastRow=()=>2;tab.getRange=(r,c,n)=>r===1?range:{...range,getDisplayValues:()=>[['PASS']]};written=[];assert.match(send(),/تمت إضافة 0/);assert.equal(written.length,0);
console.log('PASS: success filtering, header mapping, private field exclusion, duplicate prevention and approved destinations');
