const assert=require('node:assert/strict');
const D=require('../trainees-core.js');
{
  const row=(name,date='')=>{const cells=D.blank();cells[3]=name;cells[8]=date;return cells;};
  const rows=[row('TUESDAY','2026-10-06'),row('LATE MONDAY','2026-10-05'),D.blank(),row('WEDNESDAY','2026-10-07'),row('NEXT','2026-10-08')];
  const fmt=D.format({daySeparators:[3,0,3,-1,1.5,'2',D.MAX_ROWS]});
  assert.deepEqual(fmt.daySeparators,[0,3]);
  assert.deepEqual(D.format(JSON.parse(JSON.stringify(fmt))).daySeparators,[0,3],'Shared sheet formatting retains explicit boundaries');
  assert.deepEqual(D.manualDayGroups(rows,[0,3,8]),[
    {start:0,end:2,count:2,date:'2026-10-06'},
    {start:3,end:7,count:2,date:'2026-10-07'},
    {start:8,end:8,count:0,date:''}
  ],'Only explicit boundaries split manual groups; blank rows and mixed dates stay together');
  assert.deepEqual(D.removeRows(rows,fmt,new Set([1,3])).format.daySeparators,[0,2],'Deleting a boundary row keeps its separator before the next surviving row');
  assert.deepEqual(D.removeRows(rows,D.format({daySeparators:[0,1,3]}),new Set([0,1,2])).format.daySeparators,[0],'Adjacent boundaries coalesce after deleting their contents');
  assert.deepEqual(D.shiftCells(rows,fmt,[1,1,0,12],true,'down',13).format.daySeparators,[0,4],'Whole-row cell insertion moves boundaries with rows');
  assert.deepEqual(D.shiftCells(rows,fmt,[1,1,3,3],true,'down',13).format.daySeparators,[0,3],'Partial-cell shifts keep row boundaries in place');
}
const courseFixtures=[['CBP-M','Marketing','التسويق'],['CBP-S','Sales','المبيعات'],['CBP-CS','Customer Service','خدمة العملاء'],['CBP-AI','Artificial Intelligence','الذكاء الاصطناعي'],['CBP-L','Leadership','القيادة الإدارية'],['CBP-PM','Project Management','إدارة المشاريع'],['CBP-CYBP','CYBP','ريادة الاعمال'],['CBP-ME','Employee Motivation','تحفيز الموظفين'],['CBP-CM','Conflict Management','إدارة النزاعات'],['CBP-LTC','Leading Through Change','القيادة خلال التغيير'],['CBP-ES','Executive Secretarial','السكرتارية التنفيذية'],['CBP-AB','Accounting and Budgeting','المحاسبة والميزانية'],['CBP-BC','Business Communication','اتصالات الاعمال'],['CBP-CMPR','Crisis Management and Public Relations','إدارة الأزمات في العلاقات العامة'],['CBP-ECM','Event and Conference Management','إدارة الفعاليات والحشود'],['CBP-TOT','Training of Trainers','تدريب المدربين'],['CBP-BM','Business Management','إدارة الاعمال']];
courseFixtures.push(
  ['CBP-BE','Business Etiquette','سلوكيات الأعمال'],
  ['CBP-CTS','Computer Technology Specialist','تقنية الحاسب الآلي'],
  ['CBP-HR','Human Resources','إدارة الموارد البشرية'],
  ['CBP-TH','Tourism and Hospitality','السياحة والضيافة'],
  ['CBP-DDM','Dynamic Decision Making','اتخاذ القرارات الديناميكية'],
  ['CBP-SMS','Secrets of Management Success','أسرار النجاح الإداري'],
  ['CBP-EGB','English Grammar for Business','قواعد اللغة الإنجليزية للأعمال'],
  ['CBP-FS','Financial Sustainability','الاستدامة المالية'],
  ['CBP-AIS','Artificial Intelligence Strategist','استراتيجيات الذكاء الاصطناعي'],
  ['CBP-PDBA','Professional Diploma in Business Administration','الدبلوم المهني في إدارة الأعمال']
);
const catalog=courseFixtures.flatMap(([id,title])=>[{title,code:id+'-AR-KEY',lang:'Arabic'},{title,code:id+'-EN-KEY',lang:'English'}]);
for(const [id,title,arabic]of courseFixtures){
  for(const name of [id,title,'محترف الأعمال المعتمد في '+arabic,'محترف الأعمال المعتمد في '+arabic+' '+id])assert.equal(D.courseKeycode(name,catalog)?.code,id+'-AR-KEY',name);
  for(const name of [id+' محترف الأعمال المعتمد في '+arabic,'محترف الأعمال المعتمد في '+arabic+' '+id.toLowerCase(),'محترف الاعمال المعتمد في '+arabic+' '+id])assert.equal(D.courseKeycode(name,catalog)?.code,id+'-AR-KEY','Form course matches Arabic keycode: '+name);
  for(const name of [id.replace('-','–'),id.replace('-','‑'),'CBP™- '+title])assert.equal(D.courseKeycode(name,catalog)?.code,id+'-AR-KEY','Pasted course titles and Unicode hyphens match: '+name);
}
assert.equal(D.courseKeycode('CBP-HRM',catalog)?.code,'CBP-HR-AR-KEY');
for(const title of ['إدارة الفعاليات وسلامة الحشود','محترف الأعمال المعتمد في إدارة الفعاليات و سلامة الحشود','Event and Crowd Safety Management','Event & Crowd Safety Management'])assert.equal(D.courseKeycode(title,catalog)?.code,'CBP-ECM-AR-KEY','Events and crowd safety uses the saved ECM keycode: '+title);
assert.equal(D.courseKeycode('CBP-ECM',[{title:'إدارة الفعاليات وسلامة الحشود',code:'SAVED-CROWD-KEY',lang:'Arabic'}])?.code,'SAVED-CROWD-KEY','An Arabic crowd-safety catalog title matches the course identifier');
const legacyCrowdCatalog=[{title:'Event & Crowed management ',code:'EXISTING-ECM-AR',lang:'Arabic'},{title:'Event & Crowed management',code:'EXISTING-ECM-EN',lang:'English'}];
assert.equal(D.courseKeycode('محترف الأعمال المعتمد في إدارة الفعاليات والحشود CBP-ECM',legacyCrowdCatalog)?.code,'EXISTING-ECM-AR','The reported Crowed catalog spelling resolves to its existing Arabic keycode');
assert.equal(D.courseKeycode('Event & Crowed management ',catalog)?.code,'CBP-ECM-AR-KEY','Legacy Crowed course text also matches a canonical catalog title');
assert.equal(D.courseKeycode('CBP-M-UNKNOWN',catalog),null,'An unknown identifier must not match a shorter course identifier');
assert.equal(D.courseKeycode('CBP™- Safety Management',[{title:'Safety Management',code:'CUSTOM-KEY',lang:'Arabic'}])?.code,'CUSTOM-KEY','Custom catalog courses also match a CBP title prefix');
assert.equal(D.courseKeycode('CBP-CUSTOM',[{title:'Safety Management',code:'CBP-CUSTOM',lang:'Arabic'}])?.code,'CBP-CUSTOM','Exact custom keycodes remain usable');
assert.equal(D.courseKeycode('محترف الأعمال المعتمد للشباب في ريادة الاعمال CBP-CYBP',catalog)?.code,'CBP-CYBP-AR-KEY');
assert.equal(D.courseKeycode('دورة غير معروفة',catalog),null);
assert.equal(D.courseKeycode('Sales',[{title:'Sales',code:'ONE',lang:'Arabic'},{title:'Sales',code:'TWO',lang:'Arabic'}]),null,'Ambiguous matches never choose an arbitrary code');
assert.equal(D.courseKeycode('CBP-M',[{title:'Marketing',code:'ONLY',lang:'English'}])?.code,'ONLY');
assert.equal(D.courseKeycode('محترف الأعمال المعتمد في التسويق',[{title:'محترف الأعمال المعتمد في التسويق CBP-M',code:'AR-FULL-TITLE',lang:'Arabic'}])?.code,'AR-FULL-TITLE');
assert.equal(D.courseKeycode('CBP-M',catalog.map(item=>item.code==='CBP-M-AR-KEY'?{...item,code:'UPDATED-KEY'}:item))?.code,'UPDATED-KEY','Uses the current shared catalog');
const row=D.blank();row[0]='000023';row[2]='اسم عربي';row[4]='001001';row[5]='0501234567';row[10]='a"b\tc\nd';row[12]='001234567';
assert.deepEqual(D.normalize(D.parse(D.tsv([row]))),[row],'Excel clipboard preserves strings, quotes, tabs, line breaks and Arabic');
assert.deepEqual(D.parse('a\tb\r\nc\td\r\n'),[['a','b'],['c','d']]);
assert.deepEqual(D.parse('"a"\t"b"\n"c"\t"d"'),[['a','b'],['c','d']]);
assert.equal(D.paste([],[["001234"]],2,12)[2][12],'001234');
assert.equal(D.paste([row],[['new']],0,1)[0][0],'000023');
assert.equal(D.paste([row],[['new']],0,1)[0][1],'new');
assert.equal(row[1],'','Paste must not mutate history snapshots');
assert.equal(D.paste([],[["a","b"]],0,12)[0][13],'b');
assert.throws(()=>D.paste([],[["a"]],0,500),/PASTE_BOUNDS/);
assert.throws(()=>D.paste([],[["a"]],1000000,0),/PASTE_BOUNDS/);
assert.throws(()=>D.normalize([[23]]),/CELL_LIMIT/);
assert.throws(()=>D.normalize([['x'.repeat(2001)]]),/CELL_LIMIT/);
assert.throws(()=>D.parse('"unterminated'),/INVALID_CLIPBOARD/);
assert.deepEqual(D.normalize([D.blank(),D.blank()]),[]);
console.log('Trainee clipboard and data validation tests passed');
const duplicateRows=[D.blank(),D.blank(),D.blank(),D.blank()];
duplicateRows[0][4]=' ٢١٢٣٤٥٦٧٨٩ ';duplicateRows[1][4]='2123456789';duplicateRows[2][4]='۲۱۲۳۴۵۶۷۸۹';
assert.deepEqual(D.duplicates(duplicateRows).get('2123456789'),[0,1,2]);
assert.equal(D.duplicates(duplicateRows).size,1,'Blank IDs are never duplicates');
const dummyRows=[D.blank(),D.blank()];dummyRows[0][4]='0000000000';dummyRows[1][4]='0000000000';
assert.equal(D.duplicates(dummyRows).size,0,'All-zero placeholders are not duplicates');
assert.notEqual(D.idKey('00123'),D.idKey('123'),'Keep meaningful leading zeros');
assert.equal(D.result('passed'),'ناجح');assert.equal(D.result('FAILED'),'راسب');assert.equal(D.result('absent'),'لم يدخل');
const styled=D.format({direction:'rtl',fontSize:18,hidden:[1,3],styles:{'0:2':{bg:'#aabbcc',bold:true},'1:2':{color:'#112233',size:20}}});
const removed=D.removeRows(duplicateRows,styled,new Set([0]));assert.deepEqual(removed.format.styles['0:2'],{color:'#112233',size:20});
assert.deepEqual(styled.styles['0:2'],{bg:'#aabbcc',bold:true},'Deleting rows leaves undo snapshot intact');
assert.deepEqual(D.format({styles:{'0:1':{bg:'url(https://example.invalid)',size:200},'1000000:0':{bg:'#ffffff'}}}).styles,{});
assert.equal(D.format({hidden:Array.from({length:13},(_,i)=>i)}).hidden.length,13,'Dynamic sheets can hide the base columns while custom columns remain visible');
console.log('PASS: result normalization, duplicate IDs, formatting validation and row remapping');
assert.deepEqual(D.format({headers:{500:'invalid'},styles:{'0:500':{bold:true}}}).headers,{});
assert.deepEqual(D.format({styles:{'0:500':{bold:true}}}).styles,{});
