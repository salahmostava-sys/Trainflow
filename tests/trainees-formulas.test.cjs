const assert=require('node:assert/strict');
const D=require('../trainees-core.js');
const rows=D.normalize([
  ['2','٣','text','007','=SUM(A1:B2)','=AVERAGE(A1:B2)','=COUNT(A1:C2)','=MIN(A1:B2)','=MAX(A1:B2)','=A1+B1*2','=SUM(A1:B1)/2'],
  ['4','5','','','=SUM(A1:A2)+MAX(B1:B2)','=A2^2','=1/0','=ZZZ1','=H2','=SUM(A1:C1)','=UNKNOWN(A1)']
]);
for(const [c,value]of [[4,'14'],[5,'3.5'],[6,'4'],[7,'2'],[8,'5'],[9,'8'],[10,'2.5']])assert.equal(D.formulaValue(rows,0,c),value);
for(const [c,value]of [[4,'11'],[5,'16'],[6,'#DIV/0!'],[7,'#NAME?'],[8,'#NAME?'],[9,'5'],[10,'#NAME?']])assert.equal(D.formulaValue(rows,1,c),value);
assert.equal(D.formulaValue(rows,0,3),'007','Identifiers retain their exact text');
const cycle=D.normalize([['=B1','=A1']]);assert.equal(D.formulaValue(cycle,0,0),'#CYCLE!');
assert.equal(D.shiftFormula('=SUM(N1:N2)+$A$1+A$2+$B3',2,1),'=SUM(O3:O4)+$A$1+B$2+$B5');
assert.equal(D.shiftFormula('=A1',-1,0),'=#REF!');
assert.equal(D.formulaValue(D.normalize([['=fetch("evil")']]),0,0),'#NAME?','Formulas never execute JavaScript');
const fmt=D.format({styles:{'0:13':{font:'Calibri',italic:true,underline:true,align:'left',valign:'bottom',wrap:true,border:'all',borderTop:true,height:48,rotation:-45,indent:2,mergeCols:2,mergeRows:2},'0:499':{mergeCols:5},'1:2':{font:'url(evil)',rotation:300,height:500,indent:99}}});
assert.equal(fmt.styles['0:13'].font,'Calibri');assert.equal(fmt.styles['0:13'].mergeRows,2);assert.equal(fmt.styles['0:499'].mergeCols,1);assert.equal(fmt.styles['1:2'],undefined);
const cols=D.columns(rows,fmt,14,1,true,52);assert.equal(cols.format.styles['0:13'].mergeCols,3);
const deleted=D.removeRows(rows,fmt,new Set([1]));assert.equal(deleted.format.styles['0:13'].mergeRows,1);
console.log('PASS: safe aggregate/arithmetic formulas, Arabic numbers, relative/absolute references, cycles and saved Excel formats');
const mapped=D.pasteMapped(D.normalize([['keep','hidden','old']]),[['new','name'],['next','other']],0,[0,2]);
assert.equal(mapped[0][0],'new');assert.equal(mapped[0][1],'hidden');assert.equal(mapped[0][2],'name');assert.equal(mapped[1][2],'other');
const wide=Array.from({length:3068},(_,r)=>Array.from({length:500},(_,c)=>c===499?'last-'+r:''));
const imported=D.pasteMapped([],wide,0,Array.from({length:500},(_,c)=>c));assert.equal(imported.length,3068);assert.equal(imported[3067][499],'last-3067');
assert.throws(()=>D.pasteMapped([], [['x']],0,[500]),/PASTE_BOUNDS/);
