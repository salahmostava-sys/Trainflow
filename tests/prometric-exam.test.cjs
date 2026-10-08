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
  const saved=E.apply(moved,custom,match,item);assert.equal(saved.cells[1][11],'ناجح');assert.equal(saved.cells[1][15],'85%');assert.equal(saved.cells[1][13],'KEEP');assert.equal(saved.cells[0][11],'');assert.equal(rows[0][11],'');
  assert.equal((await E.locate(saved.cells,item,saved.format)).alreadySaved,true,'Retry after saving matches the already saved result');
  for(const [column,value,reason]of [[0,'NEW-VOUCHER','codeChanged'],[10,'NEW-PASSWORD','credentialsChanged'],[11,'راسب','resultChanged']]){
    const changed=rows[0].slice();changed[column]=value;assert.equal((await E.locate([changed],item,custom)).reason,reason);
  }
  for(const [result,score,valid]of [['ناجح','0%',true],['راسب','49 / 100',true],['ناجح','',false],['Unknown','90',false],['ناجح','<script>',false]])assert.equal(E.validResult({result,score}),valid);
  console.log('PASS: selected coded accounts only, duplicate/moved rows, credential and result changes, exact scores, safe extra column and durable-save retry');
})().catch(error=>{console.error(error);process.exitCode=1;});
