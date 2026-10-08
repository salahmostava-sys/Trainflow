const assert=require('node:assert/strict');
const {test}=require('node:test');
const Scores=require('../extension/prometric/exam-results-core.js');

async function reportFixture(testRows,extra=''){
  const {Window}=await import('happy-dom');const window=new Window();
  window.document.body.innerHTML='<table id="PageContent_ManageReviewScoresGridView_gridView"><tr><th>Test Title</th><th>Your Score</th></tr>'+testRows.map(([title,score])=>'<tr><td title="TEST TITLE">'+title+'</td><td title="DATE">October 7, 2026</td><td title="YOUR SCORE">'+score+'</td></tr>').join('')+extra+'</table>';
  return window.document;
}

test('TCNet score history saves only the matching exam and its explicit outcome',async()=>{
  const document=await reportFixture([['Sales Arabic','Fail (65%)'],['Leadership Arabic','Pass (88.2%)']]);
  assert.deepEqual(Scores.report(document,['Leadership']),{result:'ناجح',score:'88.2%',examTitle:'Leadership Arabic',testDate:'October 7, 2026'});
  assert.equal(Scores.report(document,['Sales']).result,'راسب');
  assert.deepEqual(Scores.report(document,['Leadership'],'English'),{error:'NO_MATCHING_RESULT'},'A different exam language cannot supply the result');
  const bilingual=await reportFixture([['Leadership Arabic','Pass (88%)'],['Leadership English','Fail (60%)']]);
  assert.equal(Scores.report(bilingual,['Leadership'],'Arabic').score,'88%');
  const legacy=await reportFixture([['Event & Crowd Management English','Pass (70%)']]);
  assert.equal(Scores.report(legacy,['Event & Crowed management']).score,'70%');
});

test('uncertain, missing, repeated and paginated scores never produce a result to save',async()=>{
  for(const [rows,extra,error] of [
    [[['Sales Arabic','Pass (80%)']],'','NO_MATCHING_RESULT'],
    [[['Leadership Arabic','88.2%']],'','UNCONFIRMED_RESULT'],
    [[['Leadership Arabic','Pass (88%)'],['Leadership English','Fail (60%)']],'','AMBIGUOUS_RESULTS'],
    [[['Leadership Arabic','Pass (88%)']],'<tr class="pagerStyle"><td><a href="javascript:next()">2</a></td></tr>','PAGINATED_RESULTS']
  ])assert.deepEqual(Scores.report(await reportFixture(rows,extra),['Leadership']),{error});
  for(const text of ['Pass','88%','Pending (0%)','<script>Pass (80%)</script>'])assert.equal(Scores.outcome(text),null);
  assert.deepEqual(Scores.outcome('Fail ( 0% )'),{result:'راسب',score:'0%'});
});
