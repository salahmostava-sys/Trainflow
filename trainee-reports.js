/* Report preferences contain only column indexes; clipboard data stays in the current worksheet. */
const TraineeReports=(()=>{
  const defaults={operations:[0,1,2,3,4,5,6,7,8,11],success:[0,2,8,11]};
  const tr=(ar,en)=>currentLang==='ar'?ar:en;
  let reportPanel;

  function preferences(){
    const saved=Cloud.reportColumns();
    return Object.fromEntries(Object.keys(defaults).map(kind=>{
      const indexes=saved?.[kind];
      const valid=Array.isArray(indexes)&&indexes.length&&indexes.every(column=>Number.isInteger(column)&&column>=0&&column<20);
      return [kind,valid?[...new Set(indexes)].sort((left,right)=>left-right):defaults[kind]];
    }));
  }
  function setupSettings(){
    const root=document.getElementById('settings-pane-reports');
    if(!root)return;
    window.WorkspaceViews.reportSettings(root,{
      owner:Cloud.userId(),columns:Trainees.reportColumnLabels(),preferences:preferences(),language:currentLang,
      save:columns=>Cloud.saveReportColumns(columns),
    });
  }
  function translate(){
    setupSettings();
    reportPanel?.querySelectorAll('[data-ar]').forEach(element=>element.textContent=tr(element.dataset.ar,element.dataset.en));
  }
  const day=timestamp=>{
    if(!timestamp)return '';
    const parsed=new Date(timestamp);
    return Number.isNaN(+parsed)?'':new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(parsed);
  };
  const voucherKey=code=>String(code||'').trim().toUpperCase();
  function dailyRows(worksheet,date){
    const codes=Cloud.codeSnapshot().filter(code=>code.owner_id===worksheet.owner&&
      (code.used_at?day(code.used_at):String(code.used_on||'').split('/').reverse().join('-'))===date);
    const vouchers=new Set(codes.map(code=>voucherKey(code.code)));
    return worksheet.rows.filter(row=>vouchers.has(voucherKey(row[0])));
  }
  async function copyReport({kind,source,commitEdit,date,status}){
    commitEdit();
    const worksheet=source();
    if(!worksheet.loaded||!worksheet.owner||!date){
      status.textContent=tr('انتظر تحميل الجدول واختر تاريخ التقرير أولًا.','Wait for the worksheet to load and choose a report date.');
      return;
    }
    const rows=dailyRows(worksheet,date).filter(row=>kind==='operations'||row[11]==='ناجح');
    if(!rows.length){
      status.textContent=tr('لا توجد بيانات لهذا التقرير في التاريخ المختار.','No records for this report on the selected date.');
      return;
    }
    const columns=preferences()[kind];
    try{
      const copied=await copyText(TraineeData.tsv(rows.map(row=>columns.map(column=>String(row[column]||'')))));
      status.textContent=copied
        ?tr('تم نسخ ','Copied ')+rows.length+tr(' صف — يمكنك اللصق مباشرة في التقرير.',' rows — paste directly into your report.')
        :tr('تعذر نسخ البيانات. حاول مجددًا.','Could not copy data. Please retry.');
    }catch{
      status.textContent=tr('تعذر نسخ البيانات. حاول مجددًا.','Could not copy data. Please retry.');
    }
  }
  function mount(source,commitEdit){
    reportPanel=document.getElementById('sheet-report-panel');
    window.WorkspaceViews.reportPanel(reportPanel);
    const date=reportPanel.querySelector('[data-field="date"]'),status=reportPanel.querySelector('p');
    date.value=day(new Date());
    date.onchange=()=>{status.textContent='';};
    for(const kind of Object.keys(defaults))reportPanel.querySelector('[data-action="'+kind+'"]').onclick=()=>copyReport({kind,source,commitEdit,date:date.value,status});
    translate();
  }
  setupSettings();
  return {mount,day,translate,setupSettings};
})();
