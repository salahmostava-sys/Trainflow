/* Report destinations are preferences; no student records or tokens are persisted. */
const TraineeReports=(()=>{
  const key='ibta_report_destinations';
  const tr=(ar,en)=>currentLang==='ar'?ar:en;
  const sheetUrl=value=>/^https:\/\/docs\.google\.com\/spreadsheets\/d\/[\w-]+(?:\/|$)/.test(value.trim());
  const bridgeUrl=value=>/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(value.trim());
  const panels=new Set();
  const reportColumns={operations:[['VOUCHER',0],['الإيميل',1],['الاسم باللغة العربية',2],['الاسم باللغة الإنجليزية',3],['رقم الهوية/الإقامة',4],['رقم الهاتف',5],['الجهة',6],['الإختبار',7],['تاريخ الإختبار',null],['الحالة',11]],success:[['VOUCHER',0],['الاسم باللغة العربية',2],['تاريخ الإختبار',null],['الحالة',11]]};
  function label(tag,ar,en){const node=document.createElement(tag);node.dataset.ar=ar;node.dataset.en=en;node.textContent=tr(ar,en);return node;}
  function preferences(){let value={};try{value=JSON.parse(localStorage.getItem(key)||'{}')||{};}catch{}return Object.fromEntries(['operations','success','bridge'].map(name=>[name,typeof value[name]==='string'?value[name].trim():'']));}
  function translate(){document.querySelectorAll('.sheet-report-panel,.sheet-report-settings').forEach(panel=>{panel.querySelectorAll('[data-ar]').forEach(el=>el.textContent=tr(el.dataset.ar,el.dataset.en));panel.dir=currentLang==='ar'?'rtl':'ltr';panel.updateReady?.();});}
  function openSettings(){void showPanel('settings');activateSettingsTab('reports');document.getElementById('settings-report-operations')?.focus();}
  function setupSettings(){
    const root=document.getElementById('settings-pane-reports');if(!root||root.childNodes.length)return;
    const card=document.createElement('section');card.className='ops-card';card.append(label('h3','ربط تقارير Google Sheets','Connect Google Sheets reports'),label('p','أضف روابط التقارير ورابط أداة الربط، ثم احفظ. الروابط محفوظة على هذا المتصفح.','Add the report links and connector link, then save. Links are saved in this browser.'));
    const form=document.createElement('form'),fields={};
    for(const [name,ar,en]of [['operations','رابط تقرير العمليات','Operations report link'],['success','رابط تقرير الناجحين','Successful trainees report link'],['bridge','رابط أداة الربط Google Apps Script','Google Apps Script connector link']]){const wrap=document.createElement('label'),input=document.createElement('input');input.type='url';input.dir='ltr';input.maxLength=2000;input.autocomplete='off';input.id='settings-report-'+name;input.dataset.field=name;input.value=preferences()[name];wrap.append(label('span',ar,en),input);form.append(wrap);fields[name]=input;}
    const save=label('button','حفظ إعدادات التقارير','Save report settings');save.type='submit';save.id='settings-report-save';const status=document.createElement('p');status.id='settings-report-status';status.className='ops-status';status.setAttribute('role','status');form.append(save,status);card.append(form);root.append(card);
    form.onsubmit=event=>{event.preventDefault();const next=Object.fromEntries(Object.entries(fields).map(([name,input])=>[name,input.value.trim()]));if((next.bridge&&!bridgeUrl(next.bridge))||['operations','success'].some(name=>next[name]&&!sheetUrl(next[name]))){status.textContent=tr('استخدم روابط Google Sheets ورابط Apps Script المنشور الذي ينتهي بـ /exec.','Use Google Sheets links and a deployed Apps Script link ending in /exec.');return;}try{localStorage.setItem(key,JSON.stringify(next));status.textContent=tr('تم حفظ إعدادات التقارير.','Report settings saved.');panels.forEach(panel=>panel.updateReady());}catch{status.textContent=tr('تعذر حفظ الروابط في هذا المتصفح.','Could not save links in this browser.');}};
    const guide=document.createElement('details');guide.className='ops-card sheet-report-guide';guide.id='settings-report-guide';guide.append(label('summary','طريقة الربط بجوجل شيت — إعداد مرة واحدة','How to connect Google Sheets — one-time setup'));const steps=document.createElement('ol');
    function step(ar,en){const item=document.createElement('li');item.append(label('p',ar,en));steps.append(item);return item;}
    const sheets=step('جهّز ملف تقرير العمليات وملف تقرير الناجحين، بحساب Google لديه صلاحية تعديلهما. أضف رابطَي الملفين أعلاه. ضع العناوين التالية في صف 1؛ يمكنك تغيير ترتيبها مع الحفاظ على الأسماء.','Prepare the operations and successful-trainee spreadsheets using a Google account with edit access to both. Add their links above. Place these headers in row 1; column order can change while keeping the names.');
    const headers=Object.fromEntries(Object.entries(reportColumns).map(([kind,columns])=>[kind,columns.map(([heading])=>heading)]));
    for(const [kind,ar,en]of [['operations','نسخ عناوين تقرير العمليات','Copy operations headers'],['success','نسخ عناوين تقرير الناجحين','Copy successful-trainee headers']]){const copy=label('button',ar,en);copy.type='button';copy.id='report-copy-headers-'+kind;copy.onclick=async()=>{if(await copyText(headers[kind].join('\t')))status.textContent=tr('تم نسخ العناوين؛ الصقها في أول صف من التقرير.','Headers copied; paste them into the first report row.');};const names=document.createElement('p');names.className='sheet-report-headings';names.dir='rtl';names.textContent=headers[kind].join(' · ');sheets.append(copy,names);}
    const script=step('افتح Google Apps Script وأنشئ مشروعًا جديدًا. حمّل كود الربط من الزر التالي، وافتح الملف وانسخ محتواه كاملًا بدل محتوى Code.gs، ثم احفظ.','Open Google Apps Script and create a new project. Download the connector below, open the file, replace the contents of Code.gs with its complete code, and save.');
    const open=label('a','فتح Google Apps Script','Open Google Apps Script');open.href='https://script.google.com/';open.target='_blank';open.rel='noopener noreferrer';const download=label('a','تحميل كود الربط Code.gs','Download connector Code.gs');download.id='report-connector-download';download.href=document.getElementById('trainee-reports-script')?.dataset.connector||'google-reports.gs';download.download='Code.gs';const copyCode=label('button','نسخ كود الربط','Copy connector code');copyCode.type='button';copyCode.id='report-connector-copy';copyCode.onclick=async()=>{copyCode.disabled=true;try{const response=await fetch(download.href),code=await response.text();if(!response.ok||!code.includes('function doPost'))throw Error();if(await copyText(code))status.textContent=tr('تم نسخ الكود؛ الصقه بدل محتوى Code.gs في Apps Script.','Code copied; paste it into Code.gs in Apps Script.');}catch{status.textContent=tr('تعذر تحميل كود الربط. حاول مجددًا.','Could not load connector code. Retry.');}finally{copyCode.disabled=false;}};script.append(open,document.createTextNode(' · '),download,copyCode);
    const properties=step('في Apps Script افتح Project settings ← Script properties. اضغط عرض إعدادات المشروع هنا، ثم أضف كل اسم وقيمته في Script properties. IDs هي الجزء بين /d/ والشرطة التالية في رابط كل تقرير.','In Apps Script, open Project settings → Script properties. Show project properties below, then add each listed name and value. IDs are the portion between /d/ and the next slash in each report link.');
    const show=label('button','عرض إعدادات المشروع','Show project properties');show.type='button';show.id='report-project-properties-open';const values=document.createElement('textarea');values.id='report-project-properties';values.dir='ltr';values.rows=7;values.readOnly=true;values.hidden=true;const copy=label('button','نسخ إعدادات المشروع','Copy project properties');copy.type='button';copy.id='report-project-properties-copy';copy.hidden=true;
    show.onclick=async()=>{show.disabled=true;try{const session=await Cloud.reportSession();if(!/^sb_publishable_/.test(session.key||''))throw Error();const props={SUPABASE_URL:session.url,SUPABASE_PUBLISHABLE_KEY:session.key,OPERATIONS_ID:fields.operations.value.trim().match(/\/d\/([\w-]+)/)?.[1]||'',SUCCESS_ID:fields.success.value.trim().match(/\/d\/([\w-]+)/)?.[1]||'',HEADER_ROW:'1'};values.value=Object.entries(props).map(([name,value])=>name+' = '+value).join('\n');values.hidden=copy.hidden=false;}catch{status.textContent=tr('تعذر قراءة إعدادات المشروع. تأكد من تسجيل الدخول وحاول مجددًا.','Could not read project properties. Sign in and retry.');}finally{show.disabled=false;}};
    copy.onclick=async()=>{if(await copyText(values.value))status.textContent=tr('تم النسخ. أضف كل اسم وقيمة في Script properties.','Copied. Add each name and value in Script properties.');};properties.append(show,values,copy,label('p','اختياري: OPERATIONS_TAB وSUCCESS_TAB لاسم التبويب داخل كل ملف. بدونها يُستخدم أول تبويب. HEADER_ROW هو رقم صف العناوين، وافتراضيًا 1.','Optional: OPERATIONS_TAB and SUCCESS_TAB select worksheet names. Without them, the first worksheet is used. HEADER_ROW is the header row number, default 1.'));
    step('اضغط Deploy ← New deployment واختر Web app. اجعل Execute as = Me وWho has access = Anyone. اضغط Deploy ووافق على صلاحيات Google. حساب النشر لازم يقدر يعدّل التقريرين. إذا Anyone غير متاح في حساب المؤسسة، راجع مسؤول Google Workspace.','Choose Deploy → New deployment → Web app. Set Execute as = Me and Who has access = Anyone. Deploy and authorize Google permissions. The deploying account must be able to edit both reports. If your organization hides Anyone, contact your Google Workspace administrator.');
    step('انسخ Web app URL الذي ينتهي بـ /exec إلى خانة رابط أداة الربط أعلاه، ثم احفظ الإعدادات. استخدم /exec وليس /dev. لا تحتاج جعل ملفات Google Sheets متاحة للعامة.','Paste the Web app URL ending in /exec into the connector field above, then save settings. Use /exec, not /dev. The spreadsheets do not need to be public.');
    step('ارجع لشيت المتدربين، اختر تاريخ التقرير، واضغط معاينة التقرير لمراجعة الصفوف والأعمدة لكل تقرير. بعد المراجعة اضغط رفع تقرير العمليات أو رفع تقرير الناجحين. النتيجة تظهر في نافذة Google، ويُضاف الجديد في نهاية التقرير بدون تكرار نفس VOUCHER.','Return to the trainee sheet, choose the report date, and preview report rows and columns for each report. Review the data, then upload operations or successful trainees. Google shows the result; new rows are appended without repeating a VOUCHER.');
    guide.append(steps,label('p','لو ظهر خطأ VOUCHER رغم وجود العمود: اضبط HEADER_ROW على رقم صف العناوين، وOPERATIONS_TAB أو SUCCESS_TAB على اسم التبويب المطلوب بالضبط. رابط الملف وحده لا يحدد التبويب؛ بدون هذه الخصائص يُستخدم أول تبويب. بعد تحديث كود الربط في Code.gs احفظه، ثم انشر إصدارًا جديدًا من النشر الحالي عبر Deploy ← Manage deployments ← Edit ← New version ← Deploy.','If VOUCHER is not found despite the column being present, set HEADER_ROW to the header row number and OPERATIONS_TAB or SUCCESS_TAB to the exact worksheet name. The spreadsheet link alone does not select a worksheet; without these properties the first worksheet is used. After updating Code.gs, save and update the existing deployment using Deploy → Manage deployments → Edit → New version → Deploy.'));
    guide.append(label('p','التاريخ يعتمد على وقت استخدام الفاوتشر بتوقيت السعودية. تقرير الناجحين يشمل نتيجة ناجح فقط. اليوزر والباسورد وAnyDesk لا تُرسل. جرّب أول مرة على نسخة من التقريرين.','Report dates use voucher usage time in Saudi Arabia. Successful-trainee reports include passed results only. Usernames, passwords and AnyDesk are excluded. Test first using copies of the reports.'));const docs=label('a','شرح Google الرسمي لنشر Web app','Google’s official Web app deployment guide');docs.href='https://developers.google.com/apps-script/guides/web';docs.target='_blank';docs.rel='noopener noreferrer';guide.append(docs);root.append(guide);translate();
  }
  const day=value=>{if(!value)return '';const d=new Date(value);return Number.isNaN(+d)?'':new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);};
  function previewReport(rows,date,missing,doUpload){
    document.getElementById('sheet-report-preview')?.remove();
    const dialog=document.createElement('dialog');dialog.id='sheet-report-preview';dialog.className='sheet-report-preview';dialog.dir=currentLang==='ar'?'rtl':'ltr';dialog.setAttribute('aria-labelledby','sheet-report-preview-title');
    const header=document.createElement('div');header.className='sheet-report-preview-header';const title=label('h2','معاينة تقرير Google Sheets','Google Sheets report preview');title.id='sheet-report-preview-title';const close=label('button','إغلاق','Close');close.type='button';close.className='sheet-report-preview-close';close.onclick=()=>dialog.close();header.append(title,close);
    const info=document.createElement('p');info.className='sheet-report-preview-info';info.textContent=tr('تاريخ التقرير: ','Report date: ')+date.split('-').reverse().join('/')+tr(' — المحاولات: ',' — Attempts: ')+rows.length+tr(' — الناجحون: ',' — Passed: ')+rows.filter(row=>row[11]==='ناجح').length;
    const note=label('p','هذه بيانات التقرير من الشيت الحالي. عند الرفع يستبعد جوجل الفاوتشرات الموجودة مسبقًا في التقرير.','These are the report values from the current sheet. Upload skips vouchers already in the Google report.');note.className='sheet-report-preview-note';
    const warning=document.createElement('p');warning.className='sheet-report-preview-warning';const ids=rows.map(row=>String(row[0]||'').trim().toUpperCase()),duplicates=ids.length-new Set(ids).size;
    warning.textContent=[duplicates?tr('يوجد فاوتشر مكرر في أكثر من صف؛ صحح التكرار قبل الرفع.','A voucher appears in multiple rows; correct duplicates before uploading.'):'',missing?tr('فاوتشرات مستخدمة بدون بيانات متدرب: ','Used vouchers without trainee data: ')+missing:''].filter(Boolean).join(' ');warning.hidden=!warning.textContent;
    const tabs=document.createElement('div');tabs.className='sheet-report-preview-tabs';tabs.setAttribute('role','group');tabs.setAttribute('aria-label',tr('نوع التقرير','Report type'));const tabButtons={};let kind='operations',page=0;const pageSize=50;
    for(const [value,ar,en]of [['operations','تقرير العمليات','Operations report'],['success','تقرير الناجحين','Successful trainees report']]){const button=label('button',ar,en);button.type='button';button.dataset.reportKind=value;button.onclick=()=>{kind=value;page=0;render();};tabButtons[value]=button;tabs.append(button);}
    const uploadBtn=document.createElement('button');uploadBtn.type='button';uploadBtn.className='sheet-primary sheet-report-upload-btn';uploadBtn.style.marginInlineStart='auto';tabs.append(uploadBtn);
    const dialogStatus=document.createElement('p');dialogStatus.className='sheet-report-preview-status ops-status';dialogStatus.setAttribute('role','status');dialogStatus.setAttribute('aria-live','polite');dialogStatus.hidden=true;
    const empty=label('p','لا توجد بيانات لهذا التقرير في التاريخ المختار.','No records for this report on the selected date.');empty.className='sheet-report-preview-empty';empty.setAttribute('role','status');
    const viewport=document.createElement('div');viewport.className='sheet-report-preview-table';viewport.tabIndex=0;viewport.setAttribute('role','region');viewport.setAttribute('aria-label',tr('بيانات التقرير','Report data'));const table=document.createElement('table'),caption=document.createElement('caption'),thead=document.createElement('thead'),tbody=document.createElement('tbody');table.append(caption,thead,tbody);viewport.append(table);
    const footer=document.createElement('div');footer.className='sheet-report-preview-footer';const previous=label('button','السابق','Previous'),next=label('button','التالي','Next'),count=document.createElement('span');for(const button of [previous,next])button.type='button';count.setAttribute('aria-live','polite');previous.onclick=()=>{page--;render();};next.onclick=()=>{page++;render();};
    const footerUpload=document.createElement('button');footerUpload.type='button';footerUpload.className='sheet-primary sheet-report-upload-btn';
    footer.append(previous,count,next,footerUpload);
    function render(){
      const records=kind==='success'?rows.filter(row=>row[11]==='ناجح'):rows,columns=reportColumns[kind];for(const [value,button]of Object.entries(tabButtons))button.setAttribute('aria-pressed',String(value===kind));
      caption.textContent=tabButtons[kind].textContent;thead.replaceChildren();tbody.replaceChildren();const headings=document.createElement('tr');for(const [heading]of columns){const th=document.createElement('th');th.scope='col';th.textContent=heading;headings.append(th);}thead.append(headings);
      for(const row of records.slice(page*pageSize,(page+1)*pageSize)){const record=document.createElement('tr');for(const [,index]of columns){const cell=document.createElement('td');cell.textContent=index===null?date.split('-').reverse().join('/'):String(row[index]||'');cell.dir='auto';record.append(cell);}tbody.append(record);}
      empty.hidden=records.length>0;viewport.hidden=!records.length;footer.hidden=!records.length;previous.disabled=page===0;next.disabled=(page+1)*pageSize>=records.length;count.textContent=tr('الصفوف: ','Rows: ')+(page*pageSize+1)+'–'+Math.min((page+1)*pageSize,records.length)+tr(' من ',' of ')+records.length;viewport.scrollTop=0;
      const uploadText=kind==='operations'?tr('رفع تقرير العمليات','Upload operations report'):tr('رفع تقرير الناجحين','Upload successful trainees');
      uploadBtn.textContent=footerUpload.textContent=uploadText;
      uploadBtn.dataset.action=footerUpload.dataset.action=kind;
      const canUpload=records.length>0&&typeof doUpload==='function';
      uploadBtn.disabled=footerUpload.disabled=!canUpload;
    }
    const runUpload=async()=>{
      if(typeof doUpload!=='function')return;
      uploadBtn.disabled=footerUpload.disabled=true;
      dialogStatus.hidden=false;dialogStatus.style.color='';
      try{
        await doUpload(kind,(msg,isError)=>{
          dialogStatus.textContent=msg;
          if(isError)dialogStatus.style.color='#b42318';
          else dialogStatus.style.color='#15803d';
        });
      }finally{
        render();
      }
    };
    uploadBtn.onclick=footerUpload.onclick=runUpload;
    dialog.append(header,info,tabs,dialogStatus,note,warning,empty,viewport,footer);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});document.body.append(dialog);render();dialog.showModal();
  }
  function mount(host,source,save){
    setupSettings();const panel=document.createElement('section');panel.dir='rtl';panel.className='sheet-tools sheet-report-panel';
    panel.innerHTML='<div class="sheet-report-actions"><strong></strong><button type="button" data-action="date"></button><button type="button" data-action="preview"></button></div><span class="sheet-report-state"></span><div popover="auto" class="sheet-report-date-picker"><label><span></span><input type="date" data-field="date"></label><button type="button" data-action="apply-date"></button></div><p role="status" aria-live="polite"></p>';
    host.prepend(panel);panels.add(panel);const actions=panel.querySelector('.sheet-report-actions'),toolbar=host.querySelector('.sheet-ribbon-top .sheet-ribbon-actions'),traineeActions=['sheet-certificate-open','sheet-prometric-open'].map(id=>document.getElementById(id)).filter(Boolean);
    panel.syncExpanded=active=>{const target=active?toolbar:actions;if(target)traineeActions.forEach(button=>target.append(button));};panel.syncExpanded(host.classList.contains('sheet-expanded-view'));
    const field=name=>panel.querySelector('[data-field="'+name+'"]')||document.getElementById('settings-report-'+name),status=panel.querySelector('p');
    const title=panel.querySelector('strong');title.dataset.ar='تقارير جوجل اليومية';title.dataset.en='Daily Google reports';
    let busy=false;const ready=panel.querySelector('.sheet-report-state'),dateButton=panel.querySelector('[data-action="date"]'),picker=panel.querySelector('[popover]');dateButton.popoverTargetElement=picker;field('date').onchange=()=>{panel.updateReady();picker.hidePopover();};panel.querySelector('[data-action="apply-date"]').onclick=()=>picker.hidePopover();
    panel.updateReady=()=>{
      dateButton.textContent=tr('تاريخ التقرير: ','Report date: ')+field('date').value.split('-').reverse().join('/');
      const prefs=preferences(),bridge=bridgeUrl(prefs.bridge);
      const readyOps=bridge&&sheetUrl(prefs.operations),readySucc=bridge&&sheetUrl(prefs.success);
      const count=(readyOps?1:0)+(readySucc?1:0);
      ready.textContent=count===2?tr('جاهز للرفع من المعاينة','Ready to upload from preview'):count===1?tr('تقرير واحد جاهز','One report ready'):tr('غير مربوط — اضبط الروابط في الإعدادات','Not connected — configure in Settings');
    };
    const actionLabels={preview:['معاينة التقرير','Preview report'],'apply-date':['اختيار التاريخ','Choose date']};
    for(const [action,pair] of Object.entries(actionLabels)){const button=panel.querySelector('[data-action="'+action+'"]');if(button){button.dataset.ar=pair[0];button.dataset.en=pair[1];}}
    const fieldLabels={date:['تاريخ التقرير','Report date']};
    for(const [name,pair] of Object.entries(fieldLabels)){const label=field(name).parentElement;label.firstChild.textContent='';const text=document.createElement('span');text.dataset.ar=pair[0];text.dataset.en=pair[1];label.prepend(text);}
    field('date').value=day(new Date());
    translate();
    async function doUpload(action,onStatus){
      const prefs=preferences();
      const {owner,rows}=source(),date=field('date').value;
      if(!owner||!date){const msg=tr('اختر المستخدم والتاريخ أولًا.','Choose the user and date first.');if(onStatus)onStatus(msg,true);status.textContent=msg;return;}
      let bridge;try{bridge=new URL(prefs.bridge);if(bridge.origin!=='https://script.google.com'||!/^\/macros\/s\/[^/]+\/exec$/.test(bridge.pathname))throw Error();if(!sheetUrl(prefs[action]))throw Error();}catch{const msg=tr('أضف الروابط من الإعدادات ← تقارير جوجل أولًا.','Add links in Settings → Google reports first.');if(onStatus)onStatus(msg,true);status.textContent=msg;return;}
      const target='ibta_report_'+Date.now(),tab=window.open('about:blank',target);if(!tab){const msg=tr('اسمح بفتح نافذة التقرير ثم حاول مجددًا.','Allow the report popup and retry.');if(onStatus)onStatus(msg,true);status.textContent=msg;return;}
      busy=true;panel.updateReady();
      if(onStatus)onStatus(tr('جارٍ تجهيز وحفظ البيانات…','Preparing and saving data…'));
      try{if(!await save())throw Error(tr('تعذر حفظ الجدول. حاول مرة أخرى.','Could not save the sheet. Please retry.'));const session=await Cloud.reportSession();
        const form=document.createElement('form');form.method='POST';form.action=bridge.href;form.target=target;
        const payload={token:session.token,owner,date,kind:action,destination:prefs[action]};
        const input=document.createElement('input');input.type='hidden';input.name='payload';input.value=JSON.stringify(payload);form.append(input);document.body.append(form);form.submit();form.remove();
        const doneMsg=tr('تم إرسال التقرير — راجع نتيجة الرفع في نافذة جوجل.','Report submitted — Check upload result in Google window.');
        if(onStatus)onStatus(doneMsg);status.textContent=doneMsg;
      }catch(error){tab.close();const err=error.message||tr('تعذر تجهيز التقرير.','Could not prepare the report.');if(onStatus)onStatus(err,true);status.textContent=err;}finally{busy=false;panel.updateReady();}
    }
    panel.addEventListener('click',async e=>{
      const action=e.target.dataset.action;if(action!=='preview'||busy)return;
      const {owner,rows}=source(),date=field('date').value;
      if(!owner||!date){status.textContent=tr('اختر المستخدم والتاريخ أولًا.','Choose the user and date first.');return;}
      const codes=Cloud.codeSnapshot().filter(c=>c.owner_id===owner&&(c.used_at?day(c.used_at):String(c.used_on||'').split('/').reverse().join('-'))===date),map=new Map(codes.map(c=>[c.code.trim().toUpperCase(),c]));
      const matched=rows.filter(r=>map.has((r[0]||'').trim().toUpperCase()));
      const vouchers=new Set(matched.map(r=>(r[0]||'').trim().toUpperCase()));
      status.textContent=tr('المحاولات: ','Attempts: ')+matched.length+tr(' — الناجحون: ',' — Passed: ')+matched.filter(r=>r[11]==='ناجح').length+tr(' — بدون نتيجة: ',' — No result: ')+matched.filter(r=>!r[11]).length+tr(' — أكواد بدون متدرب: ',' — Vouchers without trainee: ')+codes.filter(c=>!vouchers.has(c.code.trim().toUpperCase())).length;
      previewReport(matched,date,codes.filter(c=>!vouchers.has(c.code.trim().toUpperCase())).length,doUpload);
    });
  }
  setupSettings();return {mount,day,translate,syncExpanded(active){panels.forEach(panel=>panel.syncExpanded?.(active));}};
})();
