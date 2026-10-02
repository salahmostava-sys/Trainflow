/* Spreadsheet data operations. Values stay strings (IDs and leading zeros included). */
(function(root){
  'use strict';
  const BASE_WIDTH=13,WIDTH=13,MAX_ROWS=1000000,MAX_COLS=500,MAX_CELL=2000;
  const blank=(w=BASE_WIDTH)=>Array(Math.max(BASE_WIDTH,w)).fill('');
  function normalizeResult(value){
    const key=value.trim().toLocaleLowerCase();
    if(['pass','passed','success','ناجح','ناجه','ناجحة'].includes(key))return 'ناجح';
    if(['fail','failed','راسب','راسبة'].includes(key))return 'راسب';
    if(['absent','not attended','no show','no-show','لم يدخل'].includes(key))return 'لم يدخل';
    return value;
  }
  const defaultFormat=()=>({direction:'ltr',fontSize:13,hidden:[],styles:{},headers:{}});
  function format(value){
    const out=defaultFormat();if(!value||typeof value!=='object')return out;
    if(['rtl','ltr'].includes(value.direction))out.direction=value.direction;
    if(Number.isInteger(value.fontSize)&&value.fontSize>=10&&value.fontSize<=32)out.fontSize=value.fontSize;
    if(Array.isArray(value.hidden))out.hidden=[...new Set(value.hidden.filter(c=>Number.isInteger(c)&&c>=0&&c<MAX_COLS))];
    if(value.headers&&typeof value.headers==='object'){
      out.headers={};
      for(const [c,name] of Object.entries(value.headers)){
        if(/^\d+$/.test(c)&&Number(c)<MAX_COLS&&typeof name==='string')out.headers[c]=name.slice(0,100);
      }
    }
    if(value.styles&&typeof value.styles==='object')for(const [key,style]of Object.entries(value.styles)){
      if(!/^(0|[1-9]\d*):(\d+)$/.test(key)||Number(key.split(':')[0])>=MAX_ROWS||Number(key.split(':')[1])>=MAX_COLS||!style||typeof style!=='object')continue;
      const next={};for(const field of ['bg','color'])if(/^#[0-9a-f]{6}$/i.test(style[field]))next[field]=style[field];
      if(typeof style.bold==='boolean')next.bold=style.bold;
      if(Number.isInteger(style.size)&&style.size>=10&&style.size<=32)next.size=style.size;
      if(Object.keys(next).length)out.styles[key]=next;
    }
    return out;
  }
  function idKey(value){return value.normalize('NFKC').replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[\s\u200e\u200f\u061c-]/g,'');}
  function duplicates(rows){const groups=new Map();rows.forEach((r,i)=>{const key=idKey(r[4]||'');if(/^\d+$/.test(key)){if(!groups.has(key))groups.set(key,[]);groups.get(key).push(i);}});return new Map([...groups].filter(([,indices])=>indices.length>1));}
  function removeRows(rows,formatting,indices){
    const next=format(formatting),mapping=new Map();let at=0;
    rows.forEach((_,i)=>{if(!indices.has(i))mapping.set(i,at++);});next.styles={};
    const removed=[...indices].filter(i=>i<rows.length).length;
    for(const [key,style]of Object.entries(formatting.styles)){const [r,c]=key.split(':').map(Number);const target=r>=rows.length?r-removed:mapping.get(r);if(target!==undefined)next.styles[target+':'+c]={...style};}
    return {cells:rows.filter((_,i)=>!indices.has(i)),format:next};
  }
  function normalize(rows){
    if(!Array.isArray(rows)||rows.length>MAX_ROWS)throw Error('ROW_LIMIT');
    let width=BASE_WIDTH;
    for(let i=0;i<rows.length;i++){
      if(!Array.isArray(rows[i]))throw Error('COLUMN_LIMIT');
      if(rows[i].length>width)width=Math.min(MAX_COLS,rows[i].length);
    }
    const result=rows.map(row=>{
      const next=blank(width);
      row.forEach((value,i)=>{
        if(i>=MAX_COLS)return;
        if(typeof value!=='string'||value.length>MAX_CELL)throw Error('CELL_LIMIT');
        next[i]=value;
      });
      if(next.length>11)next[11]=normalizeResult(next[11]);
      return next;
    });
    while(result.length&&result[result.length-1].every(value=>value===''))result.pop();
    return result;
  }
  // Excel clipboard TSV supports quoted tabs, newlines and doubled quotes.
  function parse(text){
    if(text.length>50000000)throw Error('SIZE_LIMIT');
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
    if(rows.length>MAX_ROWS||rows.some(r=>r.length>MAX_COLS))throw Error('ROW_LIMIT');
    return rows;
  }
  const quote=value=>/[\t\r\n"]/.test(value)?'"'+value.replaceAll('"','""')+'"':value;
  const tsv=rows=>rows.map(row=>row.map(quote).join('\t')).join('\r\n');
  function paste(rows,values,rowIndex,columnIndex){
    if(rowIndex<0||columnIndex<0||rowIndex+values.length>MAX_ROWS||values.some(r=>columnIndex+r.length>MAX_COLS))throw Error('PASTE_BOUNDS');
    const next=rows.map(row=>[...row]);
    let targetWidth=BASE_WIDTH;
    if(next.length&&next[0].length>targetWidth)targetWidth=next[0].length;
    values.forEach(r=>{
      if(columnIndex+r.length>targetWidth)targetWidth=Math.min(MAX_COLS,columnIndex+r.length);
    });
    values.forEach((row,r)=>{
      while(next.length<=rowIndex+r)next.push(blank(targetWidth));
      row.forEach((value,c)=>{
        const col=columnIndex+c;
        if(col<MAX_COLS){
          while(next[rowIndex+r].length<=col)next[rowIndex+r].push('');
          next[rowIndex+r][col]=value;
        }
      });
    });
    return normalize(next);
  }
  const api={BASE_WIDTH,WIDTH,MAX_ROWS,MAX_COLS,MAX_CELL,blank,normalize,parse,tsv,paste,result:normalizeResult,defaultFormat,format,idKey,duplicates,removeRows};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.TraineeData=api;
})(globalThis);
