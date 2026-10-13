/* Selected exam-result jobs and guarded writes to the private trainee sheet. */
(function(root,factory){
  const api=factory(typeof module==='object'?require('./prometric-core.js'):root.PrometricData,typeof module==='object'?require('./trainees-core.js'):root.TraineeData);
  if(typeof module==='object')module.exports=api;else root.PrometricExamData=api;
})(globalThis,function(P,D){
  'use strict';
  const SCORE_HEADERS=['نسبة الاختبار','Exam percentage','درجة الاختبار','Exam score'];
  function scoreColumn(rows,format){
    const matches=Object.entries(format.headers||{}).filter(([column,label])=>Number(column)>=D.BASE_WIDTH&&SCORE_HEADERS.includes(label));
    if(matches.length>1)throw Error('AMBIGUOUS_SCORE_COLUMN');
    if(matches.length)return Number(matches[0][0]);
    for(let column=D.BASE_WIDTH;column<D.MAX_COLS;column++)if(!format.headers?.[column]&&!format.hidden?.includes(column)&&!rows.some(row=>row[column]))return column;
    throw Error('COLUMN_LIMIT');
  }
  function prepare(rows,indices,catalog,format){
    const items=[],skipped=[],index=P.indexRows(rows),column=scoreColumn(rows,format);
    for(const rowIndex of new Set(indices)){
      if(!Number.isInteger(rowIndex)||rowIndex<0||rowIndex>=rows.length)continue;
      const row=rows[rowIndex],voucher=String(row[0]||'').trim(),username=String(row[9]||'').trim(),password=String(row[10]||'');
      if(!row.some(Boolean))continue;
      const keycode=D.courseKeycode(row[7],catalog),name=row[3]||row[2]||username;
      const language=String(keycode?.lang||'').trim(),examLanguage=/\bArabic\b/i.test(row[7])||/^(arabic|ar|العربية|عربي)$/i.test(language)?'Arabic':/\bEnglish\b/i.test(row[7])||/^(english|en|الإنجليزية|انجليزي)$/i.test(language)?'English':'';
      const reason=!voucher?'code':!username||!password||username.length>300||password.length>300?'credentials':name.length>300?'name':index.get(P.fingerprint(row))?.length!==1?'duplicate':!row[7]?.trim()?'exam':'';
      if(reason){skipped.push({row:rowIndex,name,voucher,reason,fingerprint:P.fingerprint(row),originalResult:row[11]||''});continue;}
      items.push({id:crypto.randomUUID(),row:rowIndex,name,voucher,username,password,fingerprint:P.fingerprint(row),originalCredentials:P.credentials(row),examTitles:[...new Set([row[7],keycode?.title].filter(Boolean))],examLanguage,originalResult:row[11]||'',originalScore:row[column]||''});
    }
    if(items.length>P.MAX_ITEMS)throw Error('LIMIT');
    return {items,skipped,column};
  }
  async function locate(rows,item,format,index=P.indexRows(rows)){
    const matches=index.get(item.fingerprint)||[];
    if(matches.length!==1)return {reason:matches.length?'duplicate':'missing'};
    const row=matches[0],values=rows[row],column=scoreColumn(rows,format);
    if(String(values[0]||'').trim()!==item.voucher)return {reason:'codeChanged'};
    if(await P.credentialsHash(P.credentials(values))!==item.credentialsHash)return {reason:'credentialsChanged'};
    const sameResult=values[11]===item.result&&String(values[column]||'')===item.score;
    if(!sameResult&&(String(values[11]||'')!==item.originalResult||String(values[column]||'')!==item.originalScore))return {reason:'resultChanged'};
    return {row,column,alreadySaved:sameResult&&column===D.BASE_WIDTH&&SCORE_HEADERS.slice(0,2).includes(format.headers?.[column])&&!format.hidden?.includes(column)&&resultFormat(format,row,item.result)===format};
  }
  function resultFormat(format,row,result){
    let next=format;
    for(const [column,label] of Object.entries(format.headers||{})){
      if(Number(column)<D.BASE_WIDTH||!SCORE_HEADERS.includes(label))continue;
      const key=row+':'+column,style=format.styles?.[key]||{},failed=result==='راسب',red=style.bg==='#ff0000'&&style.color==='#ffffff';
      if(failed===red)continue;
      if(next===format)next=D.format(format);
      const updated={...style};
      if(failed){updated.bg='#ff0000';updated.color='#ffffff';}else{delete updated.bg;delete updated.color;}
      if(Object.keys(updated).length)next.styles[key]=updated;else delete next.styles[key];
    }
    return next;
  }
  function sameAbsentRow(row,account){
    return !!row&&!row[0]?.trim()&&P.fingerprint(row)===account.fingerprint&&[account.originalResult,'لم يدخل'].includes(row[11]||'');
  }
  function markAbsent(rows,skipped,format){
    let next=rows,nextFormat=format;const column=scoreColumn(rows,format),hasScore=SCORE_HEADERS.includes(format.headers?.[column]);
    for(const account of skipped.filter(account=>account.reason==='code')){
      const row=rows[account.row];
      if(!sameAbsentRow(row,account))throw Error('OUTDATED');
      if(row[11]!=='لم يدخل'||hasScore&&row[column]){
        if(next===rows)next=rows.slice();
        const updated=[...row];updated[11]='لم يدخل';if(hasScore)updated[column]='';next[account.row]=updated;
      }
      nextFormat=resultFormat(nextFormat,account.row,'لم يدخل');
    }
    return {cells:next===rows?rows:D.normalize(next),format:nextFormat};
  }
  function validResult(item){
    return ['ناجح','راسب'].includes(item.result)&&typeof item.score==='string'&&/^\d{1,6}(?:[.,]\d{1,4})?(?:\s*%|\s*\/\s*\d{1,6}(?:[.,]\d{1,4})?)?$/.test(item.score)&&item.score.length<=40;
  }
  function sheetWidth(rows,format,column){
    let width=column+1;
    for(const row of rows)width=Math.max(width,row.length);
    for(const index of [...Object.keys(format.headers),...Object.keys(format.widths||{}),...format.hidden])width=Math.max(width,Number(index)+1);
    for(const [key,style] of Object.entries(format.styles))width=Math.max(width,Number(key.split(':')[1])+(style.mergeCols||1));
    return width;
  }
  const scoreDestination=(index,column)=>index===column?D.BASE_WIDTH:index>=D.BASE_WIDTH&&index<column?index+1:index;
  const columnReference=(reference,column)=>reference.replace(/[A-Z]+/i,D.letter(column));
  function scoreFormula(cellText,column){
    if(!cellText.startsWith('='))return cellText;
    return cellText.replace(/(\$?[A-Z]+\$?[1-9]\d*)(?::(\$?[A-Z]+\$?[1-9]\d*))?/gi,(reference,first,last)=>{
      const start=D.address(first),end=last&&D.address(last);if(!start||last&&!end)return reference;
      if(!last)return columnReference(first,scoreDestination(start.c,column));
      // Moving the score may split a range; keep the same referenced cells.
      const columns=[];for(let index=Math.min(start.c,end.c);index<=Math.max(start.c,end.c);index++)columns.push(scoreDestination(index,column));
      columns.sort((a,b)=>a-b);const spans=[];
      for(const index of columns){const previous=spans.at(-1);if(previous&&previous[1]+1===index)previous[1]=index;else spans.push([index,index]);}
      return spans.map(([left,right])=>columnReference(first,left)+':'+columnReference(last,right)).join(',');
    });
  }
  function scoreLayout(rows,format,column){
    const original=D.format(format);
    if(column===D.BASE_WIDTH)return {cells:rows,format:original};
    const width=sheetWidth(rows,original,column),removed=D.columns(rows,original,column,1,false,width);
    const placed=D.columns(removed.cells,removed.format,D.BASE_WIDTH,1,true,width-1);
    placed.cells=placed.cells.map((row,index)=>{const next=[...row];next[D.BASE_WIDTH]=rows[index][column]||'';return next.map(cellText=>scoreFormula(cellText,column));});
    if(original.widths?.[column])placed.format.widths[D.BASE_WIDTH]=original.widths[column];
    for(const [key,style] of Object.entries(original.styles)){
      const [row,index]=key.split(':').map(Number);
      if(index===column)placed.format.styles[row+':'+D.BASE_WIDTH]=style;
    }
    return placed;
  }
  function apply(rows,format,matches,result){
    if(!validResult(result))throw Error('INVALID_RESULT');
    const layout=scoreLayout(rows,format,scoreColumn(rows,format)),next=layout.cells.slice(),values=[...next[matches.row]];
    values[11]=result.result;values[D.BASE_WIDTH]=result.score;next[matches.row]=values;
    layout.format.headers[D.BASE_WIDTH]=SCORE_HEADERS[0];layout.format.hidden=layout.format.hidden.filter(column=>column!==D.BASE_WIDTH);
    return {cells:D.normalize(next),format:resultFormat(layout.format,matches.row,result.result)};
  }
  return {prepare,scoreColumn,locate,validResult,apply,resultFormat,markAbsent};
});
