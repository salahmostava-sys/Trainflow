const assert=require('node:assert/strict'),{webcrypto}=require('node:crypto');
global.crypto||=webcrypto;
const E=require('../prometric-exam-core.js'),P=require('../prometric-core.js'),D=require('../trainees-core.js');
const trainee=(id,code='VOUCHER-'+id)=>[code,id+'@example.invalid','اسم '+id,'STUDENT '+id,id,'050','','Sales','2026-10-08','USER-'+id,'PASSWORD-'+id,'',''];
(async()=>{
  // Only explicitly selected rows with both a voucher and complete saved credentials may log in.
  const rows=[trainee('1'),trainee('2',''),trainee('3'),trainee('4')];rows[2][10]='';
  const plan=E.prepare(rows,[0,0,1,2],[],D.defaultFormat());
  assert.deepEqual(plan.items.map(item=>item.row),[0]);assert.deepEqual(plan.skipped.map(item=>item.reason),['code','credentials']);
  assert.equal(E.prepare([rows[0],[...rows[0]]],[0],[],D.defaultFormat()).skipped[0].reason,'duplicate');
  const custom=D.defaultFormat();custom.headers[13]='Notes';rows[0][13]='KEEP';rows[0][14]='EXISTING VALUE';
  assert.equal(E.scoreColumn(rows,custom),15,'A score column never overwrites custom data or headers');
  const item={...plan.items[0],credentialsHash:await P.credentialsHash(plan.items[0].originalCredentials),result:'ناجح',score:'85%'};
  const moved=[trainee('UNSELECTED'),rows[0]];const match=await E.locate(moved,item,custom);assert.equal(match.row,1);
  const saved=E.apply(moved,custom,match,item);assert.equal(saved.cells[1][11],'ناجح');assert.equal(saved.cells[1][13],'85%');assert.equal(saved.cells[1][14],'KEEP');assert.equal(saved.cells[1][15],'EXISTING VALUE');assert.equal(saved.cells[0][11],'');assert.equal(rows[0][11],'');
  assert.equal(saved.format.headers[13],'نسبة الاختبار');assert.equal(saved.format.headers[14],'Notes');
  assert.equal((await E.locate(saved.cells,item,saved.format)).alreadySaved,true,'Retry after saving matches the already saved result');
  const oldHeader=D.format(saved.format);oldHeader.headers[13]='درجة الاختبار';
  assert.equal((await E.locate(saved.cells,item,oldHeader)).alreadySaved,false,'An unchanged legacy score still updates the percentage column heading');
  for(const [column,value,reason]of [[0,'NEW-VOUCHER','codeChanged'],[10,'NEW-PASSWORD','credentialsChanged'],[11,'راسب','resultChanged']]){
    const changed=rows[0].slice();changed[column]=value;assert.equal((await E.locate([changed],item,custom)).reason,reason);
  }
  for(const [result,score,valid]of [['ناجح','0%',true],['راسب','49 / 100',true],['ناجح','',false],['Unknown','90',false],['ناجح','<script>',false]])assert.equal(E.validResult({result,score}),valid);
  // Existing score columns move next to AnyDesk without losing other rows, widths or cell formatting.
  const legacy=D.defaultFormat();legacy.headers={13:'Notes',15:'Exam score',30:'Later'};legacy.widths={13:220,15:120};legacy.hidden=[13,15];legacy.styles={'0:13':{bg:'#ff0000'},'1:15':{bold:true},'0:30':{color:'#00ff00'}};
  const historical=[trainee('OLD'),trainee('NEW')];historical[0][13]='PRIVATE NOTES';historical[0][15]='70%';historical[0][11]='ناجح';historical[0][30]='LAST';
  const shifted=E.apply(historical,legacy,{row:1,column:15},{result:'راسب',score:'40%'});
  assert.deepEqual(shifted.cells.map(row=>row[13]),['70%','40%']);assert.equal(shifted.cells[0][14],'PRIVATE NOTES');assert.equal(shifted.cells[0][30],'LAST');
  assert.equal(shifted.format.widths[13],120);assert.equal(shifted.format.widths[14],220);assert.deepEqual(shifted.format.hidden,[14]);
  assert.deepEqual(shifted.format.styles['0:14'],{bg:'#ff0000'});assert.deepEqual(shifted.format.styles['1:13'],{bold:true});assert.equal(shifted.format.headers[30],'Later');
  const formulas=[trainee('FORMULA')];formulas[0][13]='2';formulas[0][14]='3';formulas[0][15]='70%';formulas[0][16]='=SUM(N1:O1)';formulas[0][17]='=SUM(O1:P1)';formulas[0][18]='=$N$1+O1';
  const calculated=E.apply(formulas,{headers:{15:'Exam score'}},{row:0,column:15},{result:'ناجح',score:'90%'});
  assert.deepEqual([16,17,18].map(column=>D.formulaValue(calculated.cells,0,column)),['5','3','5'],'Moving the score preserves formulas, split ranges and absolute references');
  const maximum=[Array(500).fill('CUSTOM')],full=D.defaultFormat();full.headers[499]='درجة الاختبار';maximum[0][499]='90%';
  assert.equal(E.apply(maximum,full,{row:0,column:499},{result:'ناجح',score:'90%'}).cells[0].length,500,'Moving an existing score does not require an extra column');
  console.log('PASS: selected coded accounts only, duplicate/moved rows, credential and result changes, exact scores, safe extra column and durable-save retry');
})().catch(error=>{console.error(error);process.exitCode=1;});
