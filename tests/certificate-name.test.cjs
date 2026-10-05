const assert=require('node:assert/strict'),ExcelJS=require('exceljs'),D=require('../trainees-core.js'),C=require('../certificate-name.js'),X=require('../trainees-xlsx.js');
(async()=>{
  const catalog=[{title:'Leadership',lang:'Arabic',code:'AR-L'},{title:'Leadership',lang:'English',code:'EN-L'}],row=Array(13).fill('');
  row[0]='IBTAMEAF-6203-8456';row[3]='MUNERAH ABDULLAH S B NUHIAH';row[7]='محترف الأعمال المعتمد في القيادة الإدارية CBP-L';row[8]='الاثنين ٢٠٢٦-١٠-٥ م';row[9]='munerahabdullah';row[10]='NEVER_EXPORT_PASSWORD';row[11]='ناجح';
  const plan=C.prepare(row,catalog,D);assert.equal(plan.values[2],'Leadership Arabic');assert.equal(plan.values[4],'10/5/2026');assert.equal(plan.values[5],'Pass');
  assert.deepEqual(C.examDate('2024-2-29'),{display:'2/29/2024',iso:'2024-02-29'});assert.equal(C.examDate('2026-2-29').iso,'');assert.deepEqual(C.examDate('05/10/2026'),{display:'05/10/2026',iso:''},'Ambiguous slash dates keep the source text');
  assert.throws(()=>C.complete(plan,'',''),/NAME/);assert.throws(()=>C.complete(plan,'NEW','101'),/SCORE/);assert.throws(()=>C.complete(plan,'NEW','-1'),/SCORE/);
  assert.equal(C.complete(plan,'NEW','٠').values[5],'Pass ( 0% )');assert.equal(C.complete(plan,'NEW','99.5').values[5],'Pass ( 99.5% )');
  assert.equal(C.complete(plan,'NEW','').values[5],'Pass','No invented score');assert.throws(()=>C.complete(C.prepare(row,[],D),'NEW',''),/EXAM/);
  assert.throws(()=>C.complete(C.prepare([...row].map((v,c)=>c===9?'':v),catalog,D),'NEW',''),/MISSING/);
  const data=C.complete(plan,'MUNERAH ABDULLAH S BO NUHIAH','100'),book=new ExcelJS.Workbook();await book.xlsx.load(await X.writeCertificate(ExcelJS,data));
  assert.equal(book.worksheets.length,1);const sheet=book.worksheets[0];assert.equal(sheet.columnCount,8);assert.equal(sheet.rowCount,2);assert.deepEqual(sheet.getRow(1).values.slice(1),C.HEADERS);
  assert.equal(sheet.getCell('A2').value,row[3]);assert.equal(sheet.getCell('B2').value,row[9]);assert.equal(sheet.getCell('C2').value,'Leadership Arabic');assert.equal(sheet.getCell('D2').value,row[0]);assert.equal(sheet.getCell('E2').value.toISOString(),'2026-10-05T00:00:00.000Z');assert.equal(sheet.getCell('E2').numFmt,'m/d/yyyy');assert.equal(sheet.getCell('F2').value,'Pass ( 100% )');assert.equal(sheet.getCell('G2').value,data.values[6]);assert.equal(sheet.getCell('H2').value,C.CENTER);
  assert.equal(sheet.getCell('A1').font.color.argb,'FFFFFFFF');assert.equal(sheet.getCell('C2').fill.fgColor.argb,'FF98D8CA');assert.equal(sheet.getCell('H2').border.right.style,'thin');assert.doesNotMatch(JSON.stringify(book.model),/NEVER_EXPORT_PASSWORD|Password/);
  const literalBook=new ExcelJS.Workbook();await literalBook.xlsx.load(await X.writeCertificate(ExcelJS,C.complete(plan,'=SUM(A1:A2)','')));assert.equal(literalBook.worksheets[0].getCell('G2').type,ExcelJS.ValueType.String);
  assert.equal(row[3],'MUNERAH ABDULLAH S B NUHIAH');console.log('PASS: Arabic exam matching, exact certificate template, date preservation, optional score, original names, literal text and no passwords');
})().catch(error=>{console.error(error);process.exitCode=1;});
