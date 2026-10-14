const assert=require('node:assert/strict');
const {test}=require('node:test');
const Scores=require('../extension/prometric/exam-results-core.js');

async function reportFixture(testRows,extra=''){
  const {Window}=await import('happy-dom');const window=new Window();
  window.document.body.innerHTML='<table id="PageContent_ManageReviewScoresGridView_gridView"><tr><th>Test Title</th><th>Your Score</th></tr>'+testRows.map(([title,score,date='October 7, 2026'])=>'<tr><td title="TEST TITLE">'+title+'</td><td title="DATE">'+date+'</td><td title="YOUR SCORE">'+score+'</td></tr>').join('')+extra+'</table>';
  return window.document;
}

test('TCNet score history saves only the matching exam and its explicit outcome',async()=>{
  const document=await reportFixture([['Sales Arabic','Fail (65%)'],['Leading Through Change Arabic','Fail (30%)'],['Leadership Arabic','Pass (88.2%)']]);
  assert.deepEqual(Scores.report(document,['Leadership']),{result:'ناجح',score:'88.2%',examTitle:'Leadership Arabic',testDate:'October 7, 2026'});
  assert.equal(Scores.report(document,['Sales']).result,'راسب');
  assert.equal(Scores.report(document,['Leading Through Change'],'Arabic').score,'30%','Similar exam names remain distinct');
  assert.deepEqual(Scores.report(document,['Leadership'],'English'),{error:'NO_MATCHING_RESULT'},'A different exam language cannot supply the result');
  const bilingual=await reportFixture([['Leadership Arabic','Pass (88%)'],['Leadership English','Fail (60%)']]);
  assert.equal(Scores.report(bilingual,['Leadership'],'Arabic').score,'88%');
  const legacy=await reportFixture([['Event & Crowd Management English','Pass (70%)']]);
  assert.equal(Scores.report(legacy,['Event & Crowed management']).score,'70%');
});

test('retakes use the newest matching exam date regardless of row order or outcome',async()=>{
  for(const [older,newer,newScore,expectedResult] of [
    ['September 30, 2026','October 1, 2026','Pass (88%)','ناجح'],
    ['December 31, 2025','January 1, 2026','Fail (40%)','راسب'],
    ['February 28, 2024','February 29, 2024','Pass (88%)','ناجح']
  ]){
    const rows=[['Leadership Arabic','Pass (70%)',older],['Leadership Arabic',newScore,newer],['Leadership Arabic','Fail (30%)',older],['Leadership English','Pass (99%)','December 31, 2027'],['Sales Arabic','Pass (99%)','December 31, 2027']];
    for(const ordered of [rows,[...rows].reverse()])assert.deepEqual(Scores.report(await reportFixture(ordered),['Leadership'],'Arabic'),{result:expectedResult,score:expectedResult==='ناجح'?'88%':'40%',examTitle:'Leadership Arabic',testDate:newer});
  }
});

test('completed results with missing, invalid or tied dates retain their dates for manual review',async()=>{
  for(const date of ['', 'not a date', 'February 29, 2025', 'April 31, 2026', 'October 7, 2026', 'October 7, 2026 25:00']){
    const document=await reportFixture([['Leadership Arabic','Fail (40%)',date],['Leadership Arabic','Pass (88%)','October 7, 2026']]);
    assert.deepEqual(Scores.report(document,['Leadership'],'Arabic'),{error:'AMBIGUOUS_RESULTS',testDate:[...new Set([date||'—','October 7, 2026'])].join(' | ')});
  }
});

test('only completed Pass or Fail results participate in newest-result selection',async()=>{
  const rows=[['Leadership Arabic','Fail (40%)','October 6, 2026'],['Leadership Arabic','Pass (88%)','October 7, 2026'],['Leadership Arabic','Pending (0%)','October 14, 2026'],['Leadership Arabic','In progress',''],['Sales Arabic','Pass (99%)','October 15, 2026']];
  assert.deepEqual(Scores.report(await reportFixture(rows),['Leadership'],'Arabic'),{result:'ناجح',score:'88%',examTitle:'Leadership Arabic',testDate:'October 7, 2026'});
  assert.deepEqual(Scores.report(await reportFixture(rows.slice(2,4)),['Leadership'],'Arabic'),{error:'UNCONFIRMED_RESULT'});
});

test('numeric dates, named dates and clocks select the same newest completed result in either row order',async()=>{
  for(const [older,newer] of [
    ['10/07/2026','10/14/2026'],['07/10/2026','14/10/2026'],['02/03/2026','05/03/2026'],
    ['2026-10-07','2026-10-14'],['Oct. 7, 2026 8:10 AM','Oct. 7, 2026 1:30 PM'],
    ['October 7, 2026 12:01 AM','October 7, 2026 12:00 PM'],
    ['14/10/2026 08:00:01','14/10/2026 08:00:02'],['2026-10-07T23:59:59','2026-10-08T00:00:00']
  ]){
    const rows=[['Leadership Arabic','Fail (40%)',older],['Leadership Arabic','Pass (88%)',newer]];
    for(const ordered of [rows,[...rows].reverse()])assert.deepEqual(Scores.report(await reportFixture(ordered),['Leadership'],'Arabic'),{result:'ناجح',score:'88%',examTitle:'Leadership Arabic',testDate:newer});
  }
});

test('uncertain date order or a missing same-day clock cannot choose between completed results',async()=>{
  for(const [first,second] of [
    ['02/03/2026','03/02/2026'],['October 7, 2026','October 7, 2026 3:00 PM'],
    ['October 7, 2026 3:00 PM','October 7, 2026 3:00:30 PM'],
    ['October 7, 2026 3:00 PM','October 7, 2026 3:00 PM'],['October 7, 2026 0:30 PM','October 7, 2026 1:00 PM']
  ])assert.deepEqual(Scores.report(await reportFixture([['Leadership Arabic','Fail (40%)',first],['Leadership Arabic','Pass (88%)',second]]),['Leadership'],'Arabic'),{error:'AMBIGUOUS_RESULTS',testDate:[...new Set([first,second])].join(' | ')});
});

test('uncertain, missing, repeated and paginated scores never produce a result to save',async()=>{
  for(const [rows,extra,error] of [
    [[['Sales Arabic','Pass (80%)']],'','NO_MATCHING_RESULT'],
    [[['Leadership Arabic','88.2%']],'','UNCONFIRMED_RESULT'],
    [[['Leadership Arabic','Pass (88%)'],['Leadership English','Fail (60%)']],'','AMBIGUOUS_RESULTS'],
    [[['Leadership Arabic','Pass (88%)'],['Leadership Arabic','Fail (40%)']],'','AMBIGUOUS_RESULTS'],
    [[['Leadership Arabic','Pass (88%)']],'<tr class="pagerStyle"><td><a href="javascript:next()">2</a></td></tr>','PAGINATED_RESULTS']
  ])assert.deepEqual(Scores.report(await reportFixture(rows,extra),['Leadership']),{error,...(error==='AMBIGUOUS_RESULTS'?{testDate:'October 7, 2026'}:{})});
  for(const text of ['Pass','88%','Pending (0%)','<script>Pass (80%)</script>'])assert.equal(Scores.outcome(text),null);
  assert.deepEqual(Scores.outcome('Fail ( 0% )'),{result:'راسب',score:'0%'});
});
