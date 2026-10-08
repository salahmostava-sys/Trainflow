/* Selected exam-result jobs and guarded writes to the private trainee sheet. */
(function(root,factory){
  const api=factory(typeof module==='object'?require('./prometric-core.js'):root.PrometricData,typeof module==='object'?require('./trainees-core.js'):root.TraineeData);
  if(typeof module==='object')module.exports=api;else root.PrometricExamData=api;
})(globalThis,function(P,D){
  'use strict';
  const SCORE_HEADERS=['درجة الاختبار','Exam score'];
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
      if(reason){skipped.push({row:rowIndex,name,voucher,reason});continue;}
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
    const alreadySaved=values[11]===item.result&&String(values[column]||'')===item.score;
    if(!alreadySaved&&(String(values[11]||'')!==item.originalResult||String(values[column]||'')!==item.originalScore))return {reason:'resultChanged'};
    return {row,column,alreadySaved};
  }
  function validResult(item){
    return ['ناجح','راسب'].includes(item.result)&&typeof item.score==='string'&&/^\d{1,6}(?:[.,]\d{1,4})?(?:\s*%|\s*\/\s*\d{1,6}(?:[.,]\d{1,4})?)?$/.test(item.score)&&item.score.length<=40;
  }
  function apply(rows,format,matches,result){
    if(!validResult(result))throw Error('INVALID_RESULT');
    const next=rows.slice(),values=[...next[matches.row]];
    values[11]=result.result;values[matches.column]=result.score;next[matches.row]=values;
    const nextFormat=D.format(format);nextFormat.headers[matches.column]||=SCORE_HEADERS[0];
    return {cells:D.normalize(next),format:nextFormat};
  }
  return {prepare,scoreColumn,locate,validResult,apply};
});
