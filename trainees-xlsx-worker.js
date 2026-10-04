importScripts('exceljs-4.4.0.min.js','trainees-xlsx.js');
let workbook=null;
self.onmessage=async({data})=>{
  try{
    let result;
    if(data.action==='write'){const bytes=await TraineeXlsx.write(ExcelJS,data.cells,data.headers);result={buffer:bytes instanceof ArrayBuffer?bytes:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};}
    else{
      if(data.action==='read'){workbook=new ExcelJS.Workbook();await workbook.xlsx.load(data.buffer);}
      const sheets=workbook?.worksheets.filter(sheet=>sheet.state==='visible');
      if(!sheets?.length)throw Error('EMPTY_WORKBOOK');
      const index=data.index||0;if(!sheets[index])throw Error('EMPTY_WORKBOOK');
      result={...TraineeXlsx.sheetData(sheets[index]),sheets:sheets.map(sheet=>sheet.name)};
    }
    const transfer=result.buffer instanceof ArrayBuffer?[result.buffer]:[];self.postMessage({id:data.id,result},transfer);
  }catch(error){self.postMessage({id:data.id,error:error.message||'INVALID_XLSX'});}
};
