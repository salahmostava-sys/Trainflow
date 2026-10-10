/* Report destinations are preferences; no student records or tokens are persisted. */
const TraineeReports=(()=>{
  const key='ibta_report_destinations';
  const tr=(ar,en)=>currentLang==='ar'?ar:en;
  const sheetUrl=value=>/^https:\/\/docs\.google\.com\/spreadsheets\/d\/[\w-]+(?:\/|$)/.test(value.trim());
  const bridgeUrl=value=>/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(value.trim());
  const panels=new Set();
  const reportColumns={operations:[['VOUCHER',0],['الإيميل',1],['الاسم باللغة العربية',2],['الاسم باللغة الإنجليزية',3],['رقم الهوية/الإقامة',4],['رقم الهاتف',5],['الجهة',6],['الإختبار',7],['تاريخ الإختبار',null],['الحالة',11]],success:[['VOUCHER',0],['الاسم باللغة العربية',2],['تاريخ الإختبار',null],['الحالة',11]]};
  function preferences(){let value=Cloud.reportDestinations()||{};const owner=Cloud.userId();if(owner&&!Cloud.reportDestinations())try{const claimed=localStorage.getItem(key+'_owner');if(!claimed||claimed===owner){localStorage.setItem(key+'_owner',owner);value=JSON.parse(localStorage.getItem(key)||'{}')||{};}}catch{}return Object.fromEntries(['operations','success','bridge'].map(name=>[name,typeof value[name]==='string'?value[name].trim():'']));}
  const validPreferences=prefs=>prefs.bridge.length<=2000&&(!prefs.bridge||bridgeUrl(prefs.bridge))&&['operations','success'].every(name=>prefs[name].length<=2000&&(!prefs[name]||sheetUrl(prefs[name])));
  function translate(){document.getElementById('settings-pane-reports')?.updateDestinations?.();document.querySelectorAll('.sheet-report-panel,.sheet-report-settings').forEach(panel=>{panel.querySelectorAll('[data-ar]').forEach(el=>el.textContent=tr(el.dataset.ar,el.dataset.en));panel.dir=currentLang==='ar'?'rtl':'ltr';panel.updateReady?.();});}
  function openSettings(){void showPanel('settings');activateSettingsTab('reports');document.getElementById('settings-report-operations')?.focus();}
  function setupSettings(){
    const root=document.getElementById('settings-pane-reports');if(!root||root.childNodes.length)return;
    const headers=Object.fromEntries(Object.entries(reportColumns).map(([kind,columns])=>[kind,columns.map(([heading])=>heading)]));
    window.WorkspaceViews.reportSettings(root,{headers});
    const form=root.querySelector('form'),fields=Object.fromEntries(['operations','success','bridge'].map(name=>[name,document.getElementById('settings-report-'+name)])),status=document.getElementById('settings-report-status');
    const submit=document.getElementById('settings-report-save');let settingsOwner='',saving=false;
    const savePreferences=async next=>{if(saving)return;saving=true;submit.disabled=true;status.textContent=tr('جارٍ حفظ الروابط مع حسابك…','Saving links with your account…');const owner=Cloud.userId();try{const saved=await Cloud.saveReportDestinations(next);if(owner!==Cloud.userId())return;status.textContent=saved?tr('تم حفظ إعدادات التقارير مع حسابك.','Report settings saved with your account.'):tr('تعذر حفظ الروابط مع حسابك. حاول مجددًا.','Could not save links with your account. Retry.');if(saved){try{localStorage.removeItem(key);}catch{}panels.forEach(panel=>panel.updateReady());}}finally{saving=false;submit.disabled=false;}};
    root.updateDestinations=()=>{const owner=Cloud.userId();if(Cloud.reportDestinations()===undefined||owner===settingsOwner)return;settingsOwner=owner;const prefs=preferences();for(const [name,input]of Object.entries(fields))input.value=prefs[name];status.textContent='';if(owner&&!Cloud.reportDestinations()&&Object.values(prefs).some(Boolean)&&validPreferences(prefs))void savePreferences(prefs);};root.updateDestinations();
    form.onsubmit=async event=>{event.preventDefault();const next=Object.fromEntries(Object.entries(fields).map(([name,input])=>[name,input.value.trim()]));if(!validPreferences(next)){status.textContent=tr('استخدم روابط Google Sheets ورابط Apps Script المنشور الذي ينتهي بـ /exec.','Use Google Sheets links and a deployed Apps Script link ending in /exec.');return;}await savePreferences(next);};
    for(const kind of ['operations','success'])document.getElementById('report-copy-headers-'+kind).onclick=async()=>{if(await copyText(headers[kind].join('\t')))status.textContent=tr('تم نسخ العناوين؛ الصقها في أول صف من التقرير.','Headers copied; paste them into the first report row.');};
    const download=document.getElementById('report-connector-download'),copyCode=document.getElementById('report-connector-copy');
    download.href=document.getElementById('trainee-reports-script')?.dataset.connector||'google-reports.gs';
    copyCode.onclick=async()=>{copyCode.disabled=true;try{const response=await fetch(download.href),code=await response.text();if(!response.ok||!code.includes('function doPost'))throw Error();if(await copyText(code))status.textContent=tr('تم نسخ الكود؛ الصقه بدل محتوى Code.gs في Apps Script.','Code copied; paste it into Code.gs in Apps Script.');}catch{status.textContent=tr('تعذر تحميل كود الربط. حاول مجددًا.','Could not load connector code. Retry.');}finally{copyCode.disabled=false;}};
    const show=document.getElementById('report-project-properties-open'),values=document.getElementById('report-project-properties'),copy=document.getElementById('report-project-properties-copy');
    show.onclick=async()=>{show.disabled=true;try{const session=await Cloud.reportSession();if(!/^sb_publishable_/.test(session.key||''))throw Error();const props={SUPABASE_URL:session.url,SUPABASE_PUBLISHABLE_KEY:session.key,OPERATIONS_ID:fields.operations.value.trim().match(/\/d\/([\w-]+)/)?.[1]||'',SUCCESS_ID:fields.success.value.trim().match(/\/d\/([\w-]+)/)?.[1]||'',HEADER_ROW:'1'};values.value=Object.entries(props).map(([name,value])=>name+' = '+value).join('\n');values.hidden=copy.hidden=false;}catch{status.textContent=tr('تعذر قراءة إعدادات المشروع. تأكد من تسجيل الدخول وحاول مجددًا.','Could not read project properties. Sign in and retry.');}finally{show.disabled=false;}};
    copy.onclick=async()=>{if(await copyText(values.value))status.textContent=tr('تم النسخ. أضف كل اسم وقيمة في Script properties.','Copied. Add each name and value in Script properties.');};translate();
  }
  const day=value=>{if(!value)return '';const d=new Date(value);return Number.isNaN(+d)?'':new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);};
  function previewReport(rows,date,missing,doUpload,onDateChange){
    const root=document.getElementById('sheet-report-preview-root');
    window.WorkspaceViews.reportPreview(root,{rows,date,missing,columns:reportColumns,language:currentLang,upload:doUpload,close:()=>window.WorkspaceViews.clear(root),onDateChange});
  }
  function mount(host,source,save){
    setupSettings();const panel=document.getElementById('sheet-report-panel');window.WorkspaceViews.reportPanel(panel);
    panels.add(panel);const actions=panel.querySelector('.sheet-report-actions'),toolbar=host.querySelector('.sheet-ribbon-top .sheet-ribbon-actions'),traineeActions=['sheet-certificate-open','sheet-prometric-open'].map(id=>document.getElementById(id)).filter(Boolean);
    panel.syncExpanded=active=>{const target=active?toolbar:actions;if(target)traineeActions.forEach(button=>target.append(button));};panel.syncExpanded(host.classList.contains('sheet-expanded-view'));
    const field=name=>panel.querySelector('[data-field="'+name+'"]')||document.getElementById('settings-report-'+name),status=panel.querySelector('p');
    const title=panel.querySelector('strong');title.dataset.ar='تقارير جوجل اليومية';title.dataset.en='Daily Google reports';
    let busy=false;const ready=panel.querySelector('.sheet-report-state'),dateButton=panel.querySelector('[data-action="date"]'),picker=panel.querySelector('[popover]');dateButton.popoverTargetElement=picker;
    dateButton.addEventListener('click',()=>{try{if(typeof field('date').showPicker==='function')field('date').showPicker();}catch{}});
    field('date').onchange=()=>{panel.updateReady();try{picker?.hidePopover?.();}catch{}};
    panel.querySelector('[data-action="apply-date"]').onclick=()=>{try{picker?.hidePopover?.();}catch{}};
    panel.updateReady=()=>{
      dateButton.textContent=tr('تاريخ التقرير: ','Report date: ')+field('date').value.split('-').reverse().join('/');
      const prefs=preferences(),bridge=bridgeUrl(prefs.bridge);
      const readyOps=bridge&&sheetUrl(prefs.operations),readySucc=bridge&&sheetUrl(prefs.success);
      const count=(readyOps?1:0)+(readySucc?1:0);
      ready.textContent=count&&navigator.onLine?tr('متصل','Connected'):tr('غير متصل','Disconnected');
      ready.title=count===2?tr('روابط التقريرين مكتملة','Both report links are configured'):count===1?tr('رابط تقرير واحد مكتمل','One report link is configured'):tr('روابط التقارير غير مكتملة','Report links are incomplete');
    };
    const actionLabels={preview:['معاينة التقرير','Preview report'],'apply-date':['اختيار التاريخ','Choose date']};
    for(const [action,pair] of Object.entries(actionLabels)){const button=panel.querySelector('[data-action="'+action+'"]');if(button){button.dataset.ar=pair[0];button.dataset.en=pair[1];}}
    field('date').value=day(new Date());
    translate();
    async function doUpload(action,onStatus,context){
      if(busy)return;
      const prefs=preferences();
      const {owner,sheetId,rows}=source(),date=context?.date||field('date').value;
      const targetOwner=Cloud.userId()||owner;
      if(context&&(owner!==context.owner||sheetId!==context.sheetId)){onStatus?.(tr('تغيّر الشيت؛ أغلق المعاينة وافتحها مجددًا.','The worksheet changed; close and reopen the preview.'),true);return;}
      if(!targetOwner||!date){const msg=tr('اختر المستخدم والتاريخ أولًا.','Choose the user and date first.');if(onStatus)onStatus(msg,true);status.textContent=msg;return;}
      let bridge;try{bridge=new URL(prefs.bridge);if(bridge.origin!=='https://script.google.com'||!/^\/macros\/s\/[^/]+\/exec$/.test(bridge.pathname))throw Error();if(!sheetUrl(prefs[action]))throw Error();}catch{const msg=tr('أضف الروابط من الإعدادات ← تقارير جوجل أولًا.','Add links in Settings → Google reports first.');if(onStatus)onStatus(msg,true);status.textContent=msg;return;}
      const target='ibta_report_'+Date.now(),tab=window.open('about:blank',target);if(!tab){const msg=tr('اسمح بفتح نافذة التقرير ثم حاول مجددًا.','Allow the report popup and retry.');if(onStatus)onStatus(msg,true);status.textContent=msg;return;}
      busy=true;panel.updateReady();
      if(onStatus)onStatus(tr('جارٍ تجهيز وحفظ البيانات…','Preparing and saving data…'));
      try{if(!await save())throw Error(tr('تعذر حفظ الجدول. حاول مرة أخرى.','Could not save the sheet. Please retry.'));const session=await Cloud.reportSession();
        const form=document.createElement('form');form.method='POST';form.action=bridge.href;form.target=target;
        const payload={token:session.token,owner:targetOwner,sheet:sheetId,date,kind:action,destination:prefs[action],rows:context?.matched||rows};
        const input=document.createElement('input');input.type='hidden';input.name='payload';input.value=JSON.stringify(payload);form.append(input);document.body.append(form);form.submit();form.remove();
        const doneMsg=tr('تم إرسال التقرير — راجع نتيجة الرفع في نافذة جوجل.','Report submitted — Check upload result in Google window.');
        if(onStatus)onStatus(doneMsg);status.textContent=doneMsg;
      }catch(error){tab.close();const err=error.message||tr('تعذر تجهيز التقرير.','Could not prepare the report.');if(onStatus)onStatus(err,true);status.textContent=err;}finally{busy=false;panel.updateReady();}
    }
    panel.addEventListener('click',async e=>{
      const action=e.target.dataset.action;if(action!=='preview'||busy)return;
      const {owner,sheetId,rows}=source();
      function showForDate(targetDate){
        if(!targetDate)return;
        field('date').value=targetDate;
        panel.updateReady();
        const codes=Cloud.codeSnapshot().filter(c=>c.owner_id===owner&&(c.used_at?day(c.used_at):String(c.used_on||'').split('/').reverse().join('-'))===targetDate),map=new Map(codes.map(c=>[c.code.trim().toUpperCase(),c]));
        const matched=rows.filter(r=>map.has((r[0]||'').trim().toUpperCase()));
        const vouchers=new Set(matched.map(r=>(r[0]||'').trim().toUpperCase()));
        const missingCount=codes.filter(c=>!vouchers.has(c.code.trim().toUpperCase())).length;
        status.textContent=tr('المحاولات: ','Attempts: ')+matched.length+tr(' — الناجحون: ',' — Passed: ')+matched.filter(r=>r[11]==='ناجح').length+tr(' — بدون نتيجة: ',' — No result: ')+matched.filter(r=>!r[11]).length+tr(' — أكواد بدون متدرب: ',' — Vouchers without trainee: ')+missingCount;
        previewReport(matched,targetDate,missingCount,(kind,onStatus,uploadDate)=>doUpload(kind,onStatus,{owner,sheetId,date:uploadDate||targetDate,matched}),showForDate);
      }
      const initialDate=field('date').value;
      if(!owner||!initialDate){status.textContent=tr('اختر المستخدم والتاريخ أولًا.','Choose the user and date first.');return;}
      showForDate(initialDate);
    });
  }
  for(const event of ['online','offline'])window.addEventListener(event,()=>panels.forEach(panel=>panel.updateReady()));
  setupSettings();return {mount,day,translate,syncExpanded(active){panels.forEach(panel=>panel.syncExpanded?.(active));}};
})();
