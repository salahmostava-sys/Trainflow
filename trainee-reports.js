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
      return [kind,valid?[...new Set(indexes)]:defaults[kind]];
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
  function examDay(raw){
    const text=String(raw||'').replace(/[٠-٩۰-۹]/g,digit=>String(digit.charCodeAt(0)-(digit<='٩'?1632:1776))).replace(/[\u200e\u200f\u061c]/g,'');
    const iso=text.match(/(?:^|\D)(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?!\d)/);
    const local=text.match(/(?:^|\D)(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?!\d)/);
    if(!iso&&!local)return '';
    const [year,month,date]=iso?iso.slice(1).map(Number):[Number(local[3]),Number(local[2]),Number(local[1])];
    const parsed=new Date(Date.UTC(year,month-1,date));
    return parsed.getUTCFullYear()===year&&parsed.getUTCMonth()===month-1&&parsed.getUTCDate()===date?parsed.toISOString().slice(0,10):'';
  }
  function dailyRecords(worksheet,date,kind){
    const codes=Cloud.codeSnapshot().filter(code=>code.owner_id===worksheet.owner&&
      (code.used_at?day(code.used_at):String(code.used_on||'').split('/').reverse().join('-'))===date);
    const vouchers=new Set(codes.map(code=>voucherKey(code.code)));
    const matched=[];
    (worksheet.rows||[]).forEach((row,index)=>{
      const pendingResult=!row[11]?.trim()||row[11].trim()==='لم يدخل';
      if(vouchers.has(voucherKey(row[0]))||kind==='operations'&&pendingResult&&examDay(row[8])===date)matched.push({row,index});
    });
    return matched;
  }
  function operationsRecords(records){
    return records.map(({row,index})=>{
      const iso=examDay(row[8]);
      if(!iso)return {row,index};
      const copiedRow=[...row];
      copiedRow[8]=iso.slice(5,7)+'/'+iso.slice(8,10)+'/'+iso.slice(0,4);
      return {row:copiedRow,index};
    });
  }

  function reportHtml(records,columns,worksheet){
    const formatting=worksheet.formatting||{};
    const styles=formatting.styles||{};
    const duplicateIds=worksheet.duplicateIds;
    const direction=formatting.direction||'rtl';
    const table=document.createElement('table');
    table.setAttribute('border','1');
    table.style.borderCollapse='collapse';
    table.style.direction=direction;
    table.style.fontFamily='Calibri, Arial, sans-serif';
    table.style.fontSize='11pt';
    table.style.fontWeight='700';
    table.style.border='1px solid #000000';
    for(const {row,index} of records){
      const tr=document.createElement('tr');
      table.appendChild(tr);
      for(const c of columns){
        const td=document.createElement('td');
        tr.appendChild(td);
        const value=row[c]||'';
        const style=styles[index+':'+c]||{};
        const result=c===11?({'ناجح':['#00b050','#ffffff'],'راسب':['#ff0000','#ffffff'],'لم يدخل':['#ffff00','#000000']}[value]):null;
        const duplicate=c===4&&duplicateIds&&(typeof duplicateIds.has==='function'?duplicateIds.has(typeof TraineeData!=='undefined'?TraineeData.idKey(value):String(value).trim()):false);
        const hasName=Boolean(row[2]?.trim()||row[3]?.trim());
        const codeMissing=c===0&&hasName&&!value.trim();
        td.textContent=value;
        const bg=duplicate?'#ffc7ce':codeMissing?'#ff0000':result?.[0]||style.bg||'#ffffff';
        const color=duplicate?'#9c0006':codeMissing?'#ffffff':result?.[1]||style.color||'#000000';
        td.style.backgroundColor=bg;
        td.style.color=color;
        td.style.fontWeight='700';
        if(style.italic)td.style.fontStyle='italic';
        if(style.underline||style.strike)td.style.textDecoration=[style.underline?'underline':'',style.strike?'line-through':''].filter(Boolean).join(' ');
        td.style.fontSize='11pt';
        td.style.fontFamily='Calibri, Arial, sans-serif';
        td.style.border='1px solid #000000';
        td.style.padding='4px 8px';
        td.style.textAlign='center';
        td.style.verticalAlign='middle';
        td.style.whiteSpace=value.includes('\n')?'pre-wrap':'nowrap';
      }
    }
    return table.outerHTML;
  }
  async function copyReportData(text,html){
    let copied=false;
    if(navigator.clipboard?.write&&typeof ClipboardItem!=='undefined')try{
      await navigator.clipboard.write([new ClipboardItem({
        'text/plain':new Blob([text],{type:'text/plain'}),
        'text/html':new Blob([html],{type:'text/html'})
      })]);
      copied=true;
    }catch{}
    if(!copied)copied=await copyText(text);
    return copied;
  }
  async function copyReport({kind,source,commitEdit,date,status}){
    commitEdit();
    const worksheet=source();
    if(!worksheet.loaded||!worksheet.owner||!date){
      status.textContent=tr('انتظر تحميل الجدول واختر تاريخ التقرير أولًا.','Wait for the worksheet to load and choose a report date.');
      return;
    }
    const matched=dailyRecords(worksheet,date,kind).filter(({row})=>kind==='operations'||row[11]==='ناجح');
    const records=kind==='operations'?operationsRecords(matched):matched;
    if(!records.length){
      status.textContent=tr('لا توجد بيانات لهذا التقرير في التاريخ المختار.','No records for this report on the selected date.');
      return;
    }
    const columns=preferences()[kind];
    try{
      const tsv=TraineeData.tsv(records.map(({row})=>columns.map(column=>String(row[column]||''))));
      const html=reportHtml(records,columns,worksheet);
      const copied=await copyReportData(tsv,html);
      status.textContent=copied
        ?tr('تم نسخ ','Copied ')+records.length+tr(' صف — يمكنك اللصق مباشرة في التقرير.',' rows — paste directly into your report.')
        :tr('تعذر نسخ البيانات. حاول مجددًا.','Could not copy data. Please retry.');
    }catch{
      status.textContent=tr('تعذر نسخ البيانات. حاول مجددًا.','Could not copy data. Please retry.');
    }
  }
  function mount(source,commitEdit){
    reportPanel=document.getElementById('sheet-report-panel');
    if(!reportPanel.querySelector('.sheet-report-actions'))window.WorkspaceViews.reportPanel(reportPanel);
    const date=reportPanel.querySelector('[data-field="date"]'),status=reportPanel.querySelector('p');
    date.value=day(new Date());
    date.onchange=()=>{status.textContent='';};
    for(const kind of Object.keys(defaults))reportPanel.querySelector('[data-action="'+kind+'"]').onclick=()=>copyReport({kind,source,commitEdit,date:date.value,status});
    translate();
  }
  setupSettings();
  return {mount,day,translate,setupSettings};
})();
