/* TCNet reports the outcome explicitly; a threshold is never inferred. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.PrometricScores=api;})(globalThis,()=>{
  'use strict';
  function titleKey(title){return String(title).normalize('NFKC').toLowerCase().replace(/\b(arabic|english)\b/g,'').replace(/\bcrowed\b/g,'crowd').replace(/&/g,'and').replace(/[^\p{L}\p{N}]/gu,'');}
  function outcome(text){
    const match=String(text).trim().match(/^(Pass|Fail)\s*\(\s*(\d{1,6}(?:[.,]\d{1,4})?\s*%)\s*\)$/i);
    return match?{result:match[1].toLowerCase()==='pass'?'ناجح':'راسب',score:match[2].replace(/\s/g,'')}:null;
  }
  function matchesTitle(title,examTitles,examLanguage){
    const reportedLanguage=String(title).match(/\b(Arabic|English)\b/i)?.[1];
    return (!examLanguage||!reportedLanguage||reportedLanguage.toLowerCase()===examLanguage.toLowerCase())&&examTitles.some(expected=>titleKey(expected)===titleKey(title));
  }
  function reportDate(text){
    // TCNet's named-month format avoids guessing the order of numeric date fields.
    const parts=text.trim().replace(/\s+/g,' ').match(/^([a-z]+) (\d{1,2}), (\d{4})$/i);
    if(!parts)return null;
    const month='january february march april may june july august september october november december'.split(' ').indexOf(parts[1].toLowerCase()),day=Number(parts[2]),year=Number(parts[3]);
    const timestamp=Date.UTC(year,month,day),date=new Date(timestamp);
    return month>=0&&date.getUTCFullYear()===year&&date.getUTCMonth()===month&&date.getUTCDate()===day?timestamp:null;
  }
  function newestAttempt(rows){
    // One attempt needs no comparison; missing dates or a tied newest date remain ambiguous.
    if(rows.length===1)return rows[0];
    const dated=rows.map(row=>({row,date:reportDate(row.querySelector('td[title="DATE"]')?.textContent||'')}));
    if(dated.some(attempt=>attempt.date===null))return null;
    const newestDate=Math.max(...dated.map(attempt=>attempt.date)),newest=dated.filter(attempt=>attempt.date===newestDate);
    return newest.length===1?newest[0].row:null;
  }
  function report(document,examTitles,examLanguage=''){
    const grid=document.getElementById('PageContent_ManageReviewScoresGridView_gridView');
    if(!grid)return {error:'REPORT_UNAVAILABLE'};
    if(grid.querySelector('.pagerStyle,.pager a,[href*="Page$"]'))return {error:'PAGINATED_RESULTS'};
    const matches=[...grid.querySelectorAll('tr')].filter(row=>matchesTitle(row.querySelector('td[title="TEST TITLE"]')?.textContent||'',examTitles,examLanguage));
    if(!matches.length)return {error:'NO_MATCHING_RESULT'};
    const testRow=newestAttempt(matches);
    if(!testRow)return {error:'AMBIGUOUS_RESULTS'};
    const confirmed=outcome(testRow.querySelector('td[title="YOUR SCORE"]')?.textContent);
    return confirmed?{...confirmed,examTitle:testRow.querySelector('td[title="TEST TITLE"]').textContent.trim(),testDate:testRow.querySelector('td[title="DATE"]')?.textContent.trim()||''}:{error:'UNCONFIRMED_RESULT'};
  }
  return {matchesTitle,outcome,report};
});
