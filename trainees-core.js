/* Spreadsheet data operations. Values stay strings (IDs and leading zeros included). */
(function(root){
  'use strict';
  const WIDTH=13,MAX_ROWS=5000,MAX_CELL=2000;
  const blank=()=>Array(WIDTH).fill('');
  function normalize(rows){
    if(!Array.isArray(rows)||rows.length>MAX_ROWS)throw Error('ROW_LIMIT');
    const result=rows.map(row=>{
      if(!Array.isArray(row)||row.length>WIDTH)throw Error('COLUMN_LIMIT');
      const next=blank();
      row.forEach((value,i)=>{if(typeof value!=='string'||value.length>MAX_CELL)throw Error('CELL_LIMIT');next[i]=value;});
      return next;
    });
    while(result.length&&result[result.length-1].every(value=>value===''))result.pop();
    return result;
  }
  // Excel clipboard TSV supports quoted tabs, newlines and doubled quotes.
  function parse(text){
    if(text.length>4000000)throw Error('SIZE_LIMIT');
    text=text.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').replace(/\r/g,'\n');
    const rows=[];let row=[],cell='',quoted=false,closed=false;
    for(let i=0;i<text.length;i++){
      const ch=text[i];
      if(quoted){if(ch==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=ch;}
      else if(ch==='"'&&cell===''&&!closed)quoted=true;
      else if(ch==='\t'||ch==='\n'){row.push(cell);cell='';closed=false;if(ch==='\n'){rows.push(row);row=[];}}
      else cell+=ch;
    }
    if(quoted)throw Error('INVALID_CLIPBOARD');
    row.push(cell);rows.push(row);
    if(text.endsWith('\n'))rows.pop();
    if(rows.length>MAX_ROWS||rows.some(r=>r.length>WIDTH))throw Error('ROW_LIMIT');
    return rows;
  }
  const quote=value=>/[\t\r\n"]/.test(value)?'"'+value.replaceAll('"','""')+'"':value;
  const tsv=rows=>rows.map(row=>row.map(quote).join('\t')).join('\r\n');
  function paste(rows,values,rowIndex,columnIndex){
    if(rowIndex<0||columnIndex<0||rowIndex+values.length>MAX_ROWS||values.some(r=>columnIndex+r.length>WIDTH))throw Error('PASTE_BOUNDS');
    const next=rows.map(row=>[...row]);
    values.forEach((row,r)=>{while(next.length<=rowIndex+r)next.push(blank());row.forEach((value,c)=>{next[rowIndex+r][columnIndex+c]=value;});});
    return normalize(next);
  }
  const api={WIDTH,MAX_ROWS,MAX_CELL,blank,normalize,parse,tsv,paste};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.TraineeData=api;
})(globalThis);
