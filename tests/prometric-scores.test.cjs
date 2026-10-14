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

test('retakes with missing, invalid, ambiguous or tied dates still require manual review',async()=>{
  // Unsupported numeric dates must not be guessed as either month/day or day/month.
  for(const date of ['', 'not a date', '02/03/2026', 'February 29, 2025', 'April 31, 2026', 'October 7, 2026']){
    const document=await reportFixture([['Leadership Arabic','Fail (40%)',date],['Leadership Arabic','Pass (88%)','October 7, 2026']]);
    assert.deepEqual(Scores.report(document,['Leadership'],'Arabic'),{error:'AMBIGUOUS_RESULTS'});
  }
  const unconfirmed=await reportFixture([['Leadership Arabic','Pass (88%)','October 6, 2026'],['Leadership Arabic','Pending (0%)','October 7, 2026']]);
  assert.deepEqual(Scores.report(unconfirmed,['Leadership'],'Arabic'),{error:'UNCONFIRMED_RESULT'},'An older confirmed result cannot replace an unconfirmed newest attempt');
});

test('uncertain, missing, repeated and paginated scores never produce a result to save',async()=>{
  for(const [rows,extra,error] of [
    [[['Sales Arabic','Pass (80%)']],'','NO_MATCHING_RESULT'],
    [[['Leadership Arabic','88.2%']],'','UNCONFIRMED_RESULT'],
    [[['Leadership Arabic','Pass (88%)'],['Leadership English','Fail (60%)']],'','AMBIGUOUS_RESULTS'],
    [[['Leadership Arabic','Pass (88%)'],['Leadership Arabic','Fail (40%)']],'','AMBIGUOUS_RESULTS'],
    [[['Leadership Arabic','Pass (88%)']],'<tr class="pagerStyle"><td><a href="javascript:next()">2</a></td></tr>','PAGINATED_RESULTS']
  ])assert.deepEqual(Scores.report(await reportFixture(rows,extra),['Leadership']),{error});
  for(const text of ['Pass','88%','Pending (0%)','<script>Pass (80%)</script>'])assert.equal(Scores.outcome(text),null);
  assert.deepEqual(Scores.outcome('Fail ( 0% )'),{result:'راسب',score:'0%'});
});
