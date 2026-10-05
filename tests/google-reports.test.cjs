const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const headers=['رقم الهاتف','VOUCHER','الاسم باللغة العربية','تاريخ الإختبار','الحالة','حالة الإرسال'];
const owner='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const row=(code,result)=>[code,'email','اسم','Name','001234','050123','','','','secret','secret',result,'private'];
let rows=[row('PASS','ناجح'),row('FAIL','راسب')],written=[],destination='sheet',reads=0;
const props={SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'public',SUCCESS_ID:'sheet',OPERATIONS_ID:'other'};
const range={getDisplayValues:()=>[headers],copyTo(){},setNumberFormat(){},setValues(v){written=v;}};
const tab={getName:()=> 'تقرير الناجحين',getLastRow:()=>1,getLastColumn:()=>headers.length,getRange:()=>range,getMaxRows:()=>100,insertRowsAfter(){}};
const context={Map,Set,Date,JSON,String,Number,Error,encodeURIComponent,
  PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]})},
  LockService:{getScriptLock:()=>({waitLock(){},hasLock:()=>true,releaseLock(){}})},
  Utilities:{formatDate:()=> '2026-10-01'},
  HtmlService:{createHtmlOutput:v=>v},
  SpreadsheetApp:{openById:id=>{assert.equal(id,destination);return {getSheets:()=>[tab],getSheetByName:name=>name===tab.getName()?tab:null};},CopyPasteType:{},flush(){}},
  UrlFetchApp:{fetch:url=>{reads++;return {getResponseCode:()=>200,getContentText:()=>JSON.stringify(url.includes('trainee')?[{cells:rows}]:[{code:'PASS',used_at:'2026-10-01T07:00:00Z'},{code:'FAIL',used_at:'2026-10-01T07:00:00Z'}])};}}
};
vm.createContext(context);vm.runInContext(fs.readFileSync('tools/google-reports.gs','utf8'),context);
const send=(overrides={})=>context.doPost({parameter:{payload:JSON.stringify({owner,token:'token',date:'2026-10-01',kind:'success',destination:'https://docs.google.com/spreadsheets/d/sheet/edit',...overrides})}});
assert.match(send(),/تمت إضافة 1/);assert.equal(written.length,1);assert.deepEqual(Array.from(written[0]),['050123','PASS','اسم','01/10/2026','ناجح','']);assert.ok(!JSON.stringify(written).includes('secret'));
for(const heading of ['\u200fVOU\u200bCHER\ufeff',' V O U C H E R ','voucher','VOUCHER\n']){headers[1]=heading;written=[];assert.match(send(),/تمت إضافة 1/);assert.equal(written[0][1],'PASS','Voucher matching and output mapping use the same normalization');}
headers[1]='VOUCHER';const originalHeaders=headers.slice();
for(const heading of ['الإسم باللغة العربية','الإِسْم باللغة العربية','الا\u0654سم باللغة العربية','الاـسم باللغة العربية']){headers[2]=heading;written=[];assert.match(send(),/تمت إضافة 1/);assert.equal(written[0][2],'اسم');}
headers.splice(0,headers.length,'VOUCHER','الإيميل','الإسم باللغة العربية','الإسم باللغة الإنجليزية','رقم الهوية / الإقامة','رقم الجوال','الجهة','الإختبار','تاريخ الإختبار','الحالة','حالة التواصل');destination='other';written=[];assert.match(send({kind:'operations',destination:'https://docs.google.com/spreadsheets/d/other/edit'}),/تمت إضافة 2/);assert.deepEqual(Array.from(written[0]),['PASS','email','اسم','Name','001234','050123','','','01/10/2026','ناجح','']);
headers[3]='عنوان مختلف';written=[];assert.match(send({kind:'operations',destination:'https://docs.google.com/spreadsheets/d/other/edit'}),/غير الموجودة في التبويب «تقرير الناجحين»، الصف 1: الاسم باللغة الإنجليزية/);assert.equal(written.length,0);destination='sheet';headers.splice(0,headers.length,...originalHeaders);
headers[1]='Other column';written=[];assert.match(send(),/التبويب «تقرير الناجحين»، الصف 1/);assert.match(send(),/SUCCESS_TAB/);assert.equal(written.length,0);props.HEADER_ROW='2';assert.match(send(),/التبويب «تقرير الناجحين»، الصف 2/);delete props.HEADER_ROW;headers[1]='VOUCHER';
props.HEADER_ROW='0';assert.match(send(),/HEADER_ROW يجب/);props.HEADER_ROW='1.5';assert.match(send(),/HEADER_ROW يجب/);delete props.HEADER_ROW;
props.SUCCESS_TAB='wrong worksheet';assert.match(send(),/تبويب التقرير غير موجود: wrong worksheet/);props.SUCCESS_TAB=tab.getName();assert.match(send(),/تمت إضافة 1/);delete props.SUCCESS_TAB;
tab.getLastColumn=()=>0;written=[];assert.match(send(),/التقرير فارغ في التبويب «تقرير الناجحين»/);assert.equal(written.length,0);tab.getLastColumn=()=>headers.length;
rows.push(row('PASS','ناجح'));assert.match(send(),/أكثر من صف/);rows.pop();
const prior=reads;assert.match(send({destination:'https://docs.google.com/spreadsheets/d/evil/edit'}),/لا يطابق/);assert.equal(reads,prior);
tab.getLastRow=()=>2;tab.getRange=(r,c,n)=>r===1?range:{...range,getDisplayValues:()=>[['PASS']]};written=[];assert.match(send(),/تمت إضافة 0/);assert.equal(written.length,0);
headers[1]='\u200fVOU\u200bCHER';written=[];assert.match(send(),/تمت إضافة 0/);assert.equal(written.length,0,'Hidden characters do not bypass duplicate prevention');
console.log('PASS: success filtering, Unicode header normalization, header location diagnostics, private field exclusion, duplicate prevention and approved destinations');
