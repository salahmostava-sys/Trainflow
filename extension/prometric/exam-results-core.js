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
  function calendarDate(text,order){
    const named=text.match(/^([a-z]+)\.? (\d{1,2}),? (\d{4})$/i);
    if(named){
      const months='january february march april may june july august september october november december'.split(' '),name=named[1].toLowerCase();
      return {year:Number(named[3]),month:months.findIndex(month=>month===name||month.slice(0,3)===name),day:Number(named[2])};
    }
    const yearFirst=text.match(/^(\d{4})([-/])(\d{1,2})\2(\d{1,2})$/);
    if(yearFirst)return {year:Number(yearFirst[1]),month:Number(yearFirst[3])-1,day:Number(yearFirst[4])};
    const numeric=text.match(/^(\d{1,2})([-/])(\d{1,2})\2(\d{4})$/);
    return numeric?{year:Number(numeric[4]),month:Number(numeric[order==='mdy'?1:3])-1,day:Number(numeric[order==='mdy'?3:1])}:null;
  }
  function reportDate(text,order){
    const parts=text.trim().replace(/[\u200e\u200f\u061c]/g,'').replace(/\s+/g,' ').match(/^(.*?)(?:[ T,]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i);
    if(!parts)return null;
    const calendar=calendarDate(parts[1],order),clock=clockTime(parts);if(!calendar||!clock)return null;
    const {year,month,day}=calendar,start=Date.UTC(year,month,day,clock.hour,clock.minute,clock.second),date=new Date(start);
    if(month<0||date.getUTCFullYear()!==year||date.getUTCMonth()!==month||date.getUTCDate()!==day)return null;
    // Missing clock precision remains an interval, never an assumed zero time.
    return {start,end:start+(parts[2]?(parts[4]===undefined?60000:1000):86400000)-1};
  }
  function clockTime(parts){
    const [hour,minute,second]=parts.slice(2,5).map(part=>Number(part??0)),meridiem=parts[5]?.toUpperCase();
    if(minute>59||second>59)return null;
    const minimum=meridiem?1:0,maximum=meridiem?12:23;
    if(hour<minimum||hour>maximum)return null;
    return {hour:meridiem?hour%12+Number(meridiem==='PM')*12:hour,minute,second};
  }
  function newestResult(rows){
    if(rows.length===1)return rows[0];
    let selected=null;
    // Accept numeric dates only when every valid page-wide interpretation selects the same result.
    for(const order of ['mdy','dmy']){
      const dates=rows.map(row=>reportDate(row.querySelector('td[title="DATE" i]')?.textContent||'',order));
      if(dates.some(date=>date===null))continue;
      const newest=dates.reduce((best,date,index)=>date.start>dates[best].start?index:best,0);
      if(dates.some((date,index)=>index!==newest&&date.end>=dates[newest].start)||selected!==null&&selected!==newest)return null;
      selected=newest;
    }
    return selected===null?null:rows[selected];
  }
  function report(document,examTitles,examLanguage=''){
    const grid=document.getElementById('PageContent_ManageReviewScoresGridView_gridView');
    if(!grid)return {error:'REPORT_UNAVAILABLE'};
    if(grid.querySelector('.pagerStyle,.pager a,[href*="Page$"]'))return {error:'PAGINATED_RESULTS'};
    const matches=[...grid.querySelectorAll('tr')].filter(row=>matchesTitle(row.querySelector('td[title="TEST TITLE"]')?.textContent||'',examTitles,examLanguage));
    if(!matches.length)return {error:'NO_MATCHING_RESULT'};
    const completed=matches.filter(row=>outcome(row.querySelector('td[title="YOUR SCORE"]')?.textContent));
    if(!completed.length)return {error:'UNCONFIRMED_RESULT'};
    const testRow=newestResult(completed);
    if(!testRow)return {error:'AMBIGUOUS_RESULTS',testDate:[...new Set(completed.map(row=>row.querySelector('td[title="DATE" i]')?.textContent.trim()||'—'))].join(' | ').slice(0,200)};
    const confirmed=outcome(testRow.querySelector('td[title="YOUR SCORE"]')?.textContent);
    return {...confirmed,examTitle:testRow.querySelector('td[title="TEST TITLE"]').textContent.trim(),testDate:testRow.querySelector('td[title="DATE" i]')?.textContent.trim()||''};
  }
  return {matchesTitle,outcome,report};
});
