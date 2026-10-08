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
  function report(document,examTitles,examLanguage=''){
    const grid=document.getElementById('PageContent_ManageReviewScoresGridView_gridView');
    if(!grid)return {error:'REPORT_UNAVAILABLE'};
    if(grid.querySelector('.pagerStyle,.pager a,[href*="Page$"]'))return {error:'PAGINATED_RESULTS'};
    const matches=[...grid.querySelectorAll('tr')].filter(row=>matchesTitle(row.querySelector('td[title="TEST TITLE"]')?.textContent||'',examTitles,examLanguage));
    if(matches.length!==1)return {error:matches.length?'AMBIGUOUS_RESULTS':'NO_MATCHING_RESULT'};
    const testRow=matches[0],confirmed=outcome(testRow.querySelector('td[title="YOUR SCORE"]')?.textContent);
    return confirmed?{...confirmed,examTitle:testRow.querySelector('td[title="TEST TITLE"]').textContent.trim(),testDate:testRow.querySelector('td[title="DATE"]')?.textContent.trim()||''}:{error:'UNCONFIRMED_RESULT'};
  }
  return {matchesTitle,outcome,report};
});
