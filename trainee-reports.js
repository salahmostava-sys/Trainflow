/* Report destinations are preferences; no student records or tokens are persisted. */
const TraineeReports=(()=>{
  const key='ibta_report_destinations';
  const tr=(ar,en)=>currentLang==='ar'?ar:en;
  const sheetUrl=value=>/^https:\/\/docs\.google\.com\/spreadsheets\/d\/[\w-]+(?:\/|$)/.test(value.trim());
  const bridgeUrl=value=>/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(value.trim());
  function translate(){document.querySelectorAll('.sheet-report-panel').forEach(panel=>{panel.querySelectorAll('[data-ar]').forEach(el=>el.textContent=tr(el.dataset.ar,el.dataset.en));panel.dir=currentLang==='ar'?'rtl':'ltr';panel.updateReady?.();});}
  const day=value=>{if(!value)return '';const d=new Date(value);return Number.isNaN(+d)?'':new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);};
  function mount(host,source,save){
    const panel=document.createElement('details');panel.dir='rtl';panel.className='sheet-tools sheet-report-panel';
    panel.innerHTML='<summary>تقارير جوجل اليومية</summary><label>تاريخ الاختبار <input type="date" data-field="date"></label><label>رابط تقرير العمليات <input type="url" data-field="operations" dir="ltr"></label><label>رابط تقرير الناجحين <input type="url" data-field="success" dir="ltr"></label><label>رابط أداة الربط Google Apps Script <input type="url" data-field="bridge" dir="ltr"></label><button type="button" data-action="preview">معاينة العدد</button><button type="button" data-action="operations">رفع تقرير العمليات</button><button type="button" data-action="success">رفع تقرير الناجحين</button><p role="status" aria-live="polite"></p>';
    host.prepend(panel);const field=name=>panel.querySelector('[data-field="'+name+'"]'),status=panel.querySelector('p');
    const summary=panel.querySelector('summary');summary.textContent='';const title=document.createElement('span');title.dataset.ar='تقارير جوجل اليومية';title.dataset.en='Daily Google reports';summary.append(title);
    const ready=document.createElement('span');ready.className='sheet-report-state';summary.append(ready);
    panel.updateReady=()=>{const bridge=bridgeUrl(field('bridge').value);let count=0;for(const kind of ['operations','success']){const enabled=bridge&&sheetUrl(field(kind).value);panel.querySelector('[data-action="'+kind+'"]').disabled=!enabled;if(enabled)count++;}ready.textContent=count===2?tr('جاهز للرفع','Ready to upload'):count===1?tr('تقرير واحد جاهز','One report ready'):tr('غير مربوط — أضف روابط التقرير وأداة الربط','Not connected — add report and connector links');};
    const actionLabels={preview:['معاينة العدد','Preview counts'],operations:['رفع تقرير العمليات','Upload operations report'],success:['رفع تقرير الناجحين','Upload successful trainees']};
    for(const [action,pair] of Object.entries(actionLabels)){const button=panel.querySelector('[data-action="'+action+'"]');button.dataset.ar=pair[0];button.dataset.en=pair[1];}
    const fieldLabels={date:['تاريخ الاختبار','Exam date'],operations:['رابط تقرير العمليات','Operations report link'],success:['رابط تقرير الناجحين','Successful trainees report link'],bridge:['رابط أداة الربط','Connector link']};
    for(const [name,pair] of Object.entries(fieldLabels)){const label=field(name).parentElement;label.firstChild.textContent='';const text=document.createElement('span');text.dataset.ar=pair[0];text.dataset.en=pair[1];label.prepend(text);}
    field('date').value=day(new Date());let prefs={};try{prefs=JSON.parse(localStorage.getItem(key)||'{}');}catch{}
    for(const name of ['operations','success','bridge']){field(name).value=prefs[name]||'';field(name).oninput=()=>{const value=Object.fromEntries(['operations','success','bridge'].map(n=>[n,field(n).value.trim()]));try{localStorage.setItem(key,JSON.stringify(value));}catch{}panel.updateReady();};}
    translate();
    panel.addEventListener('click',async e=>{
      const action=e.target.dataset.action;if(!action)return;
      const {owner,rows}=source(),date=field('date').value;
      if(!owner||!date){status.textContent='اختر المستخدم والتاريخ أولًا.';return;}
      const codes=Cloud.codeSnapshot().filter(c=>c.owner_id===owner&&(c.used_at?day(c.used_at):String(c.used_on||'').split('/').reverse().join('-'))===date),map=new Map(codes.map(c=>[c.code.trim().toUpperCase(),c]));
      const matched=rows.filter(r=>map.has((r[0]||'').trim().toUpperCase()));
      const vouchers=new Set(matched.map(r=>(r[0]||'').trim().toUpperCase()));
      status.textContent=`المحاولات: ${matched.length} — الناجحون: ${matched.filter(r=>r[11]==='ناجح').length} — بدون نتيجة: ${matched.filter(r=>!r[11]).length} — أكواد بدون متدرب: ${codes.filter(c=>!vouchers.has(c.code.trim().toUpperCase())).length}`;
      if(action==='preview')return;
      let bridge;try{bridge=new URL(field('bridge').value);if(bridge.origin!=='https://script.google.com'||!/^\/macros\/s\/[^/]+\/exec$/.test(bridge.pathname))throw Error();if(!/^https:\/\/docs\.google\.com\/spreadsheets\/d\/[\w-]+/.test(field(action).value))throw Error();}catch{status.textContent='أضف رابط التقرير ورابط أداة الربط المنشورة أولًا. راجع docs/google-reports.md.';return;}
      // Open before asynchronous saving to avoid popup blocking. The token travels in POST, never in a URL.
      const target='ibta_report_'+Date.now(),tab=window.open('about:blank',target);if(!tab){status.textContent='اسمح بفتح نافذة التقرير ثم حاول مجددًا.';return;}
      e.target.disabled=true;
      try{if(!await save())throw Error('تعذر حفظ الجدول. حاول مرة أخرى.');const session=await Cloud.reportSession();
        const form=document.createElement('form');form.method='POST';form.action=bridge.href;form.target=target;
        const payload={token:session.token,owner,date,kind:action,destination:field(action).value};
        const input=document.createElement('input');input.type='hidden';input.name='payload';input.value=JSON.stringify(payload);form.append(input);document.body.append(form);form.submit();form.remove();status.textContent+=' — راجع نتيجة الرفع في نافذة جوجل.';
      }catch(error){tab.close();status.textContent=error.message||'تعذر تجهيز التقرير.';}finally{e.target.disabled=false;}
    });
  }
  return {mount,day,translate};
})();
