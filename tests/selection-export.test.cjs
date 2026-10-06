const assert=require('node:assert/strict'),D=require('../trainees-core.js'),X=require('../trainees-xlsx.js'),ExcelJS=require('exceljs');
(async()=>{
  const ranges=[[0,1,1,2],[1,2,2,3],[4,4,5,5]],view=[9,2,7,6,4],visits=[];
  D.eachSelected(ranges,view,[0,1,2,3,4,5],(r,c)=>visits.push(r+':'+c));
  assert.equal(new Set(visits).size,visits.length,'Overlapping ranges visit each cell once');assert.equal(visits.includes('6:2'),false,'Unselected rows stay untouched');assert.equal(visits.includes('4:4'),false,'Holes stay untouched');
  assert.deepEqual(D.selectionRows(ranges,view.length),[0,1,2,4]);assert.deepEqual(D.selectionColumns(ranges,[0,1,2,3,4,5]),[1,2,3,5]);
  const bytes=await X.writeCodes(ExcelJS,{headers:['Code','Category','Status','Used on','Time','Notes'],rows:[{values:['00123','Foundation','Unused','','','=SUM(A1:A2)'],bg:'#ffffff',color:'#16324f',used:false},{values:['V-USED','Master','Used','2026-10-06','12:30','ملاحظة'],bg:'#c00000',color:'#ffffff',used:true}]}),book=new ExcelJS.Workbook();await book.xlsx.load(bytes);const sheet=book.worksheets[0];
  assert.equal(sheet.getCell('A2').value,'00123');assert.equal(sheet.getCell('F2').type,ExcelJS.ValueType.String,'Formula-like notes stay literal');assert.equal(sheet.getCell('A3').fill.fgColor.argb,'FFC00000');assert.equal(sheet.getCell('F3').fill.fgColor.argb,'FFC00000');assert.equal(sheet.getCell('A3').font.strike,true);assert.equal(!!sheet.getCell('A2').font.strike,false);assert.equal(sheet.getCell('A3').font.color.argb,'FFFFFFFF');
  console.log('PASS: additive selections deduplicate overlaps; voucher XLSX preserves strings, fills and used-code formatting');
})().catch(error=>{console.error(error);process.exitCode=1;});
