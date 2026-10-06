/* XLSX data exchange runs in a worker; records never leave this browser. */
const TraineeXlsx=(()=>{
  'use strict';
  const MAX_ROWS=1000000,MAX_COLS=500,MAX_CELL=2000;
  function cellText(cell){
    let value=cell.value;
    if(value==null)return '';
    if(typeof value==='object'&&('formula' in value||'sharedFormula' in value)){if(value.result===undefined)throw Error('FORMULA_RESULT');value=value.result;}
    let text;
    if(value instanceof Date)text=value.toISOString().slice(0,10);
    else if(typeof value==='object'&&Array.isArray(value.richText))text=value.richText.map(part=>part.text).join('');
    else if(typeof value==='object'&&typeof value.text==='string')text=value.text;
    else if(typeof value==='object'&&value.error)throw Error('CELL_ERROR');
    else if(typeof value==='number'&&/^0+$/.test(cell.numFmt||''))text=String(value).padStart(cell.numFmt.length,'0');
    else if(['string','number','boolean'].includes(typeof value))text=String(value);
    else throw Error('CELL_TYPE');
    if(text.length>MAX_CELL)throw Error('CELL_LIMIT');return text;
  }
  function sheetData(sheet){
    const sparse=[];let last=0,width=0;
    sheet.eachRow(row=>{const values=[];row.eachCell(cell=>{const value=cellText(cell);if(!value)return;if(row.number>MAX_ROWS+1||cell.col>MAX_COLS)throw Error('SHEET_LIMIT');values[cell.col-1]=value;width=Math.max(width,cell.col);});if(values.some(Boolean)){sparse[row.number-1]=values;last=row.number;}});
    if(!last)return {name:sheet.name,rows:[],width:0};
    const rows=Array.from({length:last},(_,r)=>Array.from({length:width},(_,c)=>sparse[r]?.[c]||''));return {name:sheet.name,rows,width};
  }
  async function write(ExcelJS,cells,headers){
    if(headers.length>MAX_COLS||cells.length>MAX_ROWS)throw Error('SHEET_LIMIT');
    const workbook=new ExcelJS.Workbook(),sheet=workbook.addWorksheet('Trainees');
    sheet.views=[{state:'frozen',ySplit:1}];
    headers.forEach((header,c)=>{sheet.getColumn(c+1).width=c===7?42:22;const cell=sheet.getCell(1,c+1);cell.value=header;cell.font={bold:true,color:{argb:'FFFFFFFF'}};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF2563EB'}};});
    let last=cells.length;while(last&&!cells[last-1].some(Boolean))last--;
    for(let r=0;r<last;r++)cells[r].forEach((value,c)=>{if(value!==''){const cell=sheet.getCell(r+2,c+1);cell.value=value;cell.numFmt='@';}});
    if(headers.length)sheet.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,last+1),column:headers.length}};
    return workbook.xlsx.writeBuffer();
  }
  async function writeCodes(ExcelJS,data){
    if(data.headers?.length!==6||!Array.isArray(data.rows)||data.rows.length>MAX_ROWS-1)throw Error('SHEET_LIMIT');
    const workbook=new ExcelJS.Workbook(),sheet=workbook.addWorksheet('Vouchers');sheet.views=[{state:'frozen',ySplit:1}];
    [28,24,20,20,14,50].forEach((width,c)=>sheet.getColumn(c+1).width=width);sheet.addRow(data.headers);
    sheet.getRow(1).eachCell(cell=>{cell.font={name:'Calibri',size:11,bold:true,color:{argb:'FFFFFFFF'}};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF0070F3'}};});
    const argb=(value,fallback)=>/^#[0-9a-f]{6}$/i.test(value||'')?'FF'+value.slice(1).toUpperCase():fallback;
    for(const item of data.rows){if(item.values?.length!==6||item.values.some(value=>typeof value!=='string'||value.length>MAX_CELL))throw Error('CELL_LIMIT');const row=sheet.addRow(item.values);row.eachCell({includeEmpty:true},(cell,c)=>{cell.numFmt='@';cell.font={name:'Calibri',size:11,color:{argb:argb(item.color,'FF16324F')},strike:!!item.used&&c===1};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:argb(item.bg,'FFFFFFFF')}};cell.alignment={vertical:'middle',wrapText:true};cell.border={bottom:{style:'thin',color:{argb:'FFDCEBFF'}}};});}
    sheet.autoFilter='A1:F'+(data.rows.length+1);sheet.getRow(1).height=26;return workbook.xlsx.writeBuffer();
  }
  const key=value=>String(value).trim().normalize('NFKC').replace(/\s+/g,' ').toLocaleLowerCase();
  async function writeCertificate(ExcelJS,data){
    if(data.headers?.length!==8||data.values?.length!==8||data.values.some(value=>typeof value!=='string'||value.length>MAX_CELL))throw Error('CERTIFICATE_DATA');
    const workbook=new ExcelJS.Workbook(),sheet=workbook.addWorksheet('Certificate name change');
    sheet.views=[{state:'frozen',ySplit:1}];
    [48,24,32,25,16,20,58,40].forEach((width,c)=>{sheet.getColumn(c+1).width=width;});
    sheet.addRow(data.headers);sheet.addRow(data.values);sheet.getRow(1).height=34;sheet.getRow(2).height=32;
    for(let r=1;r<=2;r++)for(let c=1;c<=8;c++){
      const cell=sheet.getCell(r,c);cell.font={name:'Arial',size:11,bold:true,color:{argb:r===1?'FFFFFFFF':'FF000000'}};
      cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:r===1?(c===3?'FF0BA3B5':'FF0AA3D2'):(c===3?'FF98D8CA':'FFCCEDF7')}};
      cell.alignment={vertical:'middle',wrapText:true,horizontal:r===2&&(c===5||c===6)?'center':'left'};
      cell.border=Object.fromEntries(['top','bottom','left','right'].map(side=>[side,{style:'thin',color:{argb:'FF000000'}}]));cell.numFmt='@';
    }
    if(/^\d{4}-\d{2}-\d{2}$/.test(data.dateISO||'')){sheet.getCell('E2').value=new Date(data.dateISO+'T00:00:00Z');sheet.getCell('E2').numFmt='m/d/yyyy';}
    sheet.pageSetup={orientation:'landscape',paperSize:8,fitToPage:true,fitToWidth:1,fitToHeight:0};sheet.printArea='A1:H2';
    return workbook.xlsx.writeBuffer();
  }
  function prepare(rows,hasHeaders,labels,customHeaders={}){
    const headers=hasHeaders?rows[0]||[]:[],data=hasHeaders?rows.slice(1):rows;
    let last=data.length;while(last&&!data[last-1].some(Boolean))last--;
    const width=rows[0]?.length||0;
    if(width>MAX_COLS||last>MAX_ROWS)throw Error('SHEET_LIMIT');
    const targets=[],custom={},occupied=new Set();let next=labels.length;
    for(let c=0;c<width;c++){
      let target=hasHeaders?labels.findIndex(pair=>pair.some(label=>key(label)===key(headers[c]))):c;
      if(target<0){target=c>=13&&!customHeaders[c]&&!occupied.has(c)?c:next++;if(headers[c])custom[target]=headers[c].slice(0,100);}
      if(target>=MAX_COLS||occupied.has(target))throw Error('HEADER_MAPPING');occupied.add(target);targets.push(target);
    }
    return {rows:data.slice(0,last),targets,headers:custom,width};
  }
  function detectHeaders(rows,labels){return (rows[0]||[]).filter(value=>value&&labels.some(pair=>pair.some(label=>key(label)===key(value)))).length>=2;}
  if(typeof module!=='undefined')module.exports={cellText,sheetData,write,writeCertificate,writeCodes,prepare,detectHeaders};
  return {cellText,sheetData,write,writeCertificate,writeCodes,prepare,detectHeaders};
})();
