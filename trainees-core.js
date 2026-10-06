/* Spreadsheet data operations. Values stay strings (IDs and leading zeros included). */
(function(root){
  'use strict';
  const BASE_WIDTH=13,WIDTH=13,MAX_ROWS=1000000,MAX_COLS=500,MAX_CELL=2000;
  // Validated snapshots are immutable. Unchanged rows can safely be shared by
  // edits, undo history and pending saves instead of copying every cell.
  const validatedSheets=new WeakSet(),validatedRows=new WeakSet();
  const storageRows=new WeakMap();
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
      for(const field of ['italic','underline','strike','wrap','borderTop','borderBottom','borderLeft','borderRight'])if(typeof style[field]==='boolean')next[field]=style[field];
      if(['Arial','Calibri','Tahoma','Segoe UI','Times New Roman','IBM Plex Sans Arabic'].includes(style.font))next.font=style.font;
      if(['left','center','right'].includes(style.align))next.align=style.align;
      if(['top','middle','bottom'].includes(style.valign))next.valign=style.valign;
      if(['none','all','outline','top','bottom','left','right'].includes(style.border))next.border=style.border;
      for(const [field,min,max]of [['indent',0,15],['rotation',-90,90],['height',20,400],['mergeCols',1,MAX_COLS],['mergeRows',1,MAX_ROWS]])if(Number.isInteger(style[field])&&style[field]>=min&&style[field]<=max)next[field]=style[field];
      const [row,column]=key.split(':').map(Number);if(next.mergeCols)next.mergeCols=Math.min(next.mergeCols,MAX_COLS-column);if(next.mergeRows)next.mergeRows=Math.min(next.mergeRows,MAX_ROWS-row);
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
    for(const [key,style]of Object.entries(formatting.styles)){const [r,c]=key.split(':').map(Number);const target=r>=rows.length?r-removed:mapping.get(r);if(target!==undefined){const v={...style};if(v.mergeRows)v.mergeRows=Math.max(1,v.mergeRows-[...indices].filter(i=>i>=r&&i<r+v.mergeRows).length);next.styles[target+':'+c]=v;}}
    return {cells:rows.filter((_,i)=>!indices.has(i)),format:next};
  }
  function normalize(rows){
    if(!Array.isArray(rows)||rows.length>MAX_ROWS)throw Error('ROW_LIMIT');
    if(validatedSheets.has(rows))return rows;
    let width=BASE_WIDTH;
    for(let i=0;i<rows.length;i++){
      if(!Array.isArray(rows[i]))throw Error('COLUMN_LIMIT');
      if(rows[i].length>width)width=Math.min(MAX_COLS,rows[i].length);
    }
    const result=rows.map(row=>{
      if(row.length===width&&validatedRows.has(row))return row;
      const next=blank(width);
      row.forEach((value,i)=>{
        if(i>=MAX_COLS)return;
        if(typeof value!=='string'||value.length>MAX_CELL)throw Error('CELL_LIMIT');
        next[i]=value;
      });
      if(next.length>11)next[11]=normalizeResult(next[11]);
      Object.freeze(next);validatedRows.add(next);return next;
    });
    while(result.length&&result[result.length-1].every(value=>value===''))result.pop();
    Object.freeze(result);validatedSheets.add(result);return result;
  }
  function storage(rows){
    const sheet=normalize(rows);
    // The first row retains the sheet width. Other rows omit empty trailing
    // custom cells; loading normalizes them back to the same rectangular sheet.
    return sheet.map((row,i)=>{
      if(i===0)return row;if(storageRows.has(row))return storageRows.get(row);
      let end=row.length;while(end>BASE_WIDTH&&row[end-1]==='')end--;
      const compact=end===row.length?row:Object.freeze(row.slice(0,end));storageRows.set(row,compact);return compact;
    });
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
    if(!Number.isInteger(rowIndex)||!Number.isInteger(columnIndex)||rowIndex<0||columnIndex<0||rowIndex+values.length>MAX_ROWS||values.some(r=>columnIndex+r.length>MAX_COLS))throw Error('PASTE_BOUNDS');
    const normalized=normalize(rows),next=normalized.slice();
    let targetWidth=normalized[0]?.length||Math.min(MAX_COLS,rows.reduce((width,row)=>Math.max(width,row.length),BASE_WIDTH));
    values.forEach(r=>{
      if(columnIndex+r.length>targetWidth)targetWidth=Math.min(MAX_COLS,columnIndex+r.length);
    });
    values.forEach((row,r)=>{
      while(next.length<=rowIndex+r)next.push(blank(targetWidth));
      next[rowIndex+r]=[...next[rowIndex+r]];
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
  function deleteCells(rows,formatting,indices,start,end,direction,width){
    if(!['left','right'].includes(direction)||start<0||end<start||end>=width||width>MAX_COLS)throw Error('DELETE_BOUNDS');
    const count=end-start+1,next=rows.map(row=>[...row]),fmt=format(formatting);
    const destination=c=>direction==='left'?(c<start?c:c>end?c-count:null):(c>end?c:c<start?c+count:null);
    for(const r of indices){
      if(!next[r])continue;
      const row=blank(width);
      for(let c=0;c<width;c++){const target=destination(c);if(target!==null)row[target]=next[r][c]||'';}
      next[r]=row;
    }
    fmt.styles={};
    for(const [key,style]of Object.entries(formatting.styles)){
      const [r,c]=key.split(':').map(Number),target=indices.has(r)?destination(c):c;
      if(target!==null)fmt.styles[r+':'+target]={...style};
    }
    return {cells:normalize(next),format:fmt};
  }
  const courseAliases=[
    ['CBP-M','Marketing','التسويق'],['CBP-S','Sales','المبيعات'],['CBP-CS','Customer Service','خدمة العملاء'],
    ['CBP-AI','Artificial Intelligence','الذكاء الاصطناعي'],['CBP-L','Leadership','القيادة الإدارية','القيادة'],
    ['CBP-PM','Project Management','إدارة المشاريع'],['CBP-CYBP','CYBP','Certified Young Business Professional','Youth Business','ريادة الأعمال','ريادة الاعمال'],
    ['CBP-ME','Employee Motivation','Motivating Employees','تحفيز الموظفين'],['CBP-CM','Conflict Management','إدارة النزاعات'],
    ['CBP-LTC','Leading Through Change','القيادة خلال التغيير'],['CBP-ES','Executive Secretarial','Executive Secretary','السكرتارية التنفيذية'],
    ['CBP-AB','Accounting and Budgeting','Accounting & Budgeting','المحاسبة والميزانية'],['CBP-BC','Business Communication','Business Communications','اتصالات الأعمال'],
    ['CBP-CMPR','Crisis Management and Public Relations','Crisis Management & Public Relations','Crisis Management in Public Relations','إدارة الأزمات في العلاقات العامة'],
    ['CBP-ECM','Event and Crowd Management','Event & Crowd Management','Events and Crowd Management','Event and Conference Management','Events and Conferences Management','Event Management','إدارة الفعاليات والحشود'],
    ['CBP-TOT','Training of Trainers','Train the Trainer','Training Trainers','تدريب المدربين'],['CBP-BM','Business Management','إدارة الأعمال']
  ];
  const courseName=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[\u064b-\u065f\u0670\u0640\u200e\u200f\u061c]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/محترف الاعمال المعتمد\s*(?:في)?/g,'').replace(/certified business professional\s*(?:in)?/g,'').replace(/[^a-z0-9\u0621-\u064a]/g,'');
  function courseKeycode(value,catalog){
    const identity=text=>{const identifier=String(text||'').match(/\bCBP[-\s]*(CMPR|CYBP|LTC|ECM|TOT|CS|AI|PM|ME|CM|ES|AB|BC|BM|M|S|L)\b/i);return courseName(identifier?'CBP-'+identifier[1]:text);};
    const name=identity(value);if(!name)return null;
    const aliases=courseAliases.find(group=>group.some(alias=>courseName(alias)===name));
    const names=new Set((aliases||[value]).map(courseName));
    let matches=(Array.isArray(catalog)?catalog:[]).filter(item=>item&&typeof item.code==='string'&&item.code.trim()&&(names.has(identity(item.title))||names.has(courseName(item.code))));
    const preferred=matches.filter(item=>/^(arabic|ar|العربية|عربي)$/i.test(String(item.lang||'').trim()));
    if(preferred.length)matches=preferred;
    return new Set(matches.map(item=>item.code)).size===1?matches[0]:null;
  }
  function columns(rows,formatting,start,count,insert,width){
    if(start<BASE_WIDTH||start>=width+(insert?1:0)||count<1||(!insert&&start+count>width)||(insert&&width+count>MAX_COLS))throw Error('COLUMN_BOUNDS');
    const fmt=format(formatting),map=c=>insert?(c>=start?c+count:c):(c<start?c:c>=start+count?c-count:null);
    const cells=rows.map(row=>{const next=blank(width);row.forEach((v,c)=>next[c]=v);next.splice(start,insert?0:count,...(insert?Array(count).fill(''):[]));return next;});
    fmt.headers={};for(let c=BASE_WIDTH;c<width;c++){const target=map(c);if(target!==null)fmt.headers[target]=formatting.headers?.[c]||'Column '+(c+1);}
    if(insert)for(let c=start;c<start+count;c++)fmt.headers[c]='New column';
    fmt.hidden=(formatting.hidden||[]).map(map).filter(c=>c!==null);
    fmt.styles={};for(const [key,style]of Object.entries(formatting.styles||{})){const [r,c]=key.split(':').map(Number),target=map(c);if(target!==null){const v={...style};if(v.mergeCols){if(insert&&c<start&&c+v.mergeCols>start)v.mergeCols+=count;else if(!insert)v.mergeCols=Math.max(1,v.mergeCols-Math.max(0,Math.min(c+v.mergeCols,start+count)-Math.max(c,start)));}fmt.styles[r+':'+target]=v;}}
    return {cells:normalize(cells),format:fmt};
  }
  function pasteMapped(rows,values,rowIndex,targets){
    if(!Number.isInteger(rowIndex)||rowIndex<0||rowIndex+values.length>MAX_ROWS||targets.some(c=>!Number.isInteger(c)||c<0||c>=MAX_COLS)||values.some(r=>r.length>targets.length))throw Error('PASTE_BOUNDS');
    const normalized=normalize(rows),width=Math.max(normalized[0]?.length||Math.min(MAX_COLS,rows.reduce((width,row)=>Math.max(width,row.length),BASE_WIDTH)),...targets.map(c=>c+1)),next=normalized.slice();
    for(let y=0;y<values.length;y++){while(next.length<=rowIndex+y)next.push(blank(width));next[rowIndex+y]=[...next[rowIndex+y]];for(let x=0;x<values[y].length;x++){while(next[rowIndex+y].length<=targets[x])next[rowIndex+y].push('');next[rowIndex+y][targets[x]]=values[y][x];}}
    return normalize(next);
  }
  function address(value){const m=/^\$?([A-Z]+)\$?([1-9]\d*)$/i.exec(value);if(!m)return null;let c=0;for(const ch of m[1].toUpperCase())c=c*26+ch.charCodeAt(0)-64;const r=Number(m[2])-1;return r<MAX_ROWS&&c<=MAX_COLS?{r,c:c-1}:null;}
  function letter(c){let text='';for(c++;c>0;c=Math.floor((c-1)/26))text=String.fromCharCode(65+(c-1)%26)+text;return text;}
  function number(value){if(typeof value==='number')return value;if(typeof value!=='string'||!value.trim())return null;const text=value.trim().replace(/[٠-٩]/g,c=>c.charCodeAt(0)-1632).replace(/[۰-۹]/g,c=>c.charCodeAt(0)-1776).replace(/٬|,/g,'').replace(/٫/g,'.');return /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?$/i.test(text)&&Number.isFinite(Number(text))?Number(text):null;}
  function formulaValue(rows,r,c,cache=new Map(),visiting=new Set()){
    const key=r+':'+c;if(cache.has(key))return cache.get(key);const raw=rows[r]?.[c]||'';if(!raw.startsWith('='))return raw;
    if(visiting.has(key)||visiting.size>100)return '#CYCLE!';visiting.add(key);
    let result;try{
      const source=raw.slice(1).toUpperCase(),tokens=[];let at=0;
      while(at<source.length){const m=/^\s*(\d+(?:\.\d*)?|\.\d+|\$?[A-Z]+\$?\d+|[A-Z]+|[+\-*/^():,])/.exec(source.slice(at));if(!m){if(!source.slice(at).trim())break;throw '#NAME?';}tokens.push(m[1]);at+=m[0].length;}
      let p=0;const num=v=>{if(String(v).startsWith('#'))throw v;const n=number(v);if(n===null){if(v==='')return 0;throw '#VALUE!';}return n;};
      const read=ref=>{const a=address(ref);if(!a)throw '#REF!';return formulaValue(rows,a.r,a.c,cache,visiting);};
      function primary(){const t=tokens[p++];if(t==='+'||t==='-')return (t==='-'?-1:1)*num(primary());if(t==='('){const v=expression();if(tokens[p++]!==')')throw '#VALUE!';return v;}if(/^\d|^\./.test(t||''))return Number(t);if(address(t||''))return read(t);
        if(['SUM','AVERAGE','COUNT','MIN','MAX'].includes(t)&&tokens[p++]==='('){const values=[];if(tokens[p]!==')')do{if(address(tokens[p]||'')&&tokens[p+1]===':'){const a=address(tokens[p]),b=address(tokens[p+2]||'');p+=3;if(!b)throw '#REF!';if((Math.abs(b.r-a.r)+1)*(Math.abs(b.c-a.c)+1)>MAX_ROWS)throw '#NUM!';for(let y=Math.min(a.r,b.r);y<=Math.max(a.r,b.r);y++)for(let x=Math.min(a.c,b.c);x<=Math.max(a.c,b.c);x++)values.push(formulaValue(rows,y,x,cache,visiting));}else values.push(expression());if(tokens[p]!==',')break;p++;}while(true);if(tokens[p++]!==')')throw '#VALUE!';if(values.some(v=>String(v).startsWith('#')))throw values.find(v=>String(v).startsWith('#'));const numbers=values.map(number).filter(v=>v!==null);if(t==='COUNT')return numbers.length;if(t==='SUM')return numbers.reduce((a,b)=>a+b,0);if(t==='AVERAGE'){if(!numbers.length)throw '#DIV/0!';return numbers.reduce((a,b)=>a+b,0)/numbers.length;}return numbers.length?(numbers.reduce((a,b)=>t==='MIN'?Math.min(a,b):Math.max(a,b))):0;}
        throw '#NAME?';}
      function power(){let v=primary();if(tokens[p]==='^'){p++;v=num(v)**num(power());}return v;}
      function product(){let v=power();while(['*','/'].includes(tokens[p])){const op=tokens[p++],b=num(power());if(op==='/'&&b===0)throw '#DIV/0!';v=op==='*'?num(v)*b:num(v)/b;}return v;}
      function expression(){let v=product();while(['+','-'].includes(tokens[p])){const op=tokens[p++],b=num(product());v=op==='+'?num(v)+b:num(v)-b;}return v;}
      result=expression();if(p!==tokens.length)throw '#VALUE!';if(typeof result==='number'){if(!Number.isFinite(result))throw '#NUM!';result=String(Number(result.toPrecision(14)));}
    }catch(error){result=typeof error==='string'&&error.startsWith('#')?error:'#VALUE!';}finally{visiting.delete(key);}cache.set(key,result);return result;
  }
  function shiftFormula(value,dr,dc){return value.startsWith('=')?value.replace(/(\$?)([A-Z]+)(\$?)([1-9]\d*)/gi,(all,ac,col,ar,row)=>{const a=address(col+row);if(!a)return '#REF!';const r=a.r+(ar?0:dr),c=a.c+(ac?0:dc);return r<0||r>=MAX_ROWS||c<0||c>=MAX_COLS?'#REF!':ac+letter(c)+ar+(r+1);}):value;}
  // Selection coordinates belong to the displayed view, not the stored row order.
  const selectedCell=(ranges,r,c)=>ranges.some(([r1,r2,c1,c2])=>r>=r1&&r<=r2&&c>=c1&&c<=c2);
  function selectionRows(ranges,length){
    const spans=ranges.map(([a,b])=>[Math.max(0,a),Math.min(length-1,b)]).filter(([a,b])=>a<=b).sort((a,b)=>a[0]-b[0]),rows=[];let last=-1;
    for(const [a,b]of spans)for(let r=Math.max(a,last+1);r<=b;r++){rows.push(r);last=r;}return rows;
  }
  const selectionColumns=(ranges,cols)=>cols.filter(c=>ranges.some(([, ,a,b])=>c>=a&&c<=b));
  function eachSelected(ranges,view,cols,run){
    const columns=selectionColumns(ranges,cols);for(const r of selectionRows(ranges,view.length))for(const c of columns)if(selectedCell(ranges,r,c))run(view[r],c,r);
  }
  const api={BASE_WIDTH,WIDTH,MAX_ROWS,MAX_COLS,MAX_CELL,blank,normalize,storage,parse,tsv,paste,pasteMapped,result:normalizeResult,defaultFormat,format,idKey,duplicates,removeRows,deleteCells,courseKeycode,columns,address,letter,number,formulaValue,shiftFormula,selectedCell,selectionRows,selectionColumns,eachSelected};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.TraineeData=api;
})(globalThis);
