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
  const key=value=>String(value).trim().normalize('NFKC').replace(/\s+/g,' ').toLocaleLowerCase();
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
  if(typeof module!=='undefined')module.exports={cellText,sheetData,write,prepare,detectHeaders};
  return {cellText,sheetData,write,prepare,detectHeaders};
})();
