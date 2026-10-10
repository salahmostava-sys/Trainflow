/* Connect the current private trainee sheet to the user's Prometric Chrome extension. */
const TraineePrometric=(()=>{
  'use strict';
  function mount(h){
    const {D,$,tr}=h,P=PrometricData;
    let client;try{client=sessionStorage.getItem('ibta_prometric_client');if(!client){client=crypto.randomUUID();sessionStorage.setItem('ibta_prometric_client',client);}}catch{client=crypto.randomUUID();}
    let connected=false,version='',retakeSupported=false,run=null,extensionBusy=false,recoverable=false,working=false,applying=false,plan=null,context=null,lastError='',polling=false,selectedIndices=[];
    const credentialChecks=new Map(),accountChoices=new Map();let previewPage=0;
    const pending=new Map(),same=s=>context&&s.loaded&&s.owner===context.owner&&s.epoch===context.epoch;
    const reasonText=reason=>({existing:tr('يوجد يوزر أو باسورد بالفعل','Username or password already exists'),checking:tr('جارٍ التحقق من الحساب المسجل','Checking the saved account'),credentialsChanged:tr('تم تعديل الحساب المسجل؛ لن يتم استبداله','Saved account was changed; it will not be replaced'),name:tr('الاسم الإنجليزي غير مكتمل','English name is incomplete'),email:tr('البريد الإلكتروني غير صحيح','Invalid email'),duplicate:tr('بيانات متطابقة في أكثر من صف؛ راجعها أولًا','Identical data in multiple rows; review first'),missing:tr('تغيّرت بيانات الصف أو تم حذفه','Row changed or was deleted')}[reason]||reason);
    const errorText=reason=>({DISCONNECTED:tr('الإضافة غير متصلة. ثبّتها في نفس Chrome ثم أعد تحميل الصفحة.','Extension disconnected. Install it in the same Chrome profile, then reload.'),BUSY:tr('هناك عملية تسجيل أو نتائج لم تُحفظ بعد في الإضافة.','The extension has a registration job or unsaved results.'),OUTDATED:tr('تغيّر الجدول المعروض. افتح التسجيل من الجدول المطلوب.','The displayed sheet changed. Open registration from the required sheet.'),UPDATE_EXTENSION:tr('يلزم تثبيت إصدار إضافة Prometric 4.1.4 أو أحدث لإنشاء حساب جديد لمتدرب له حساب محفوظ.','Install Prometric extension 4.1.4 or later to create a new account for a trainee with saved credentials.'),LIMIT:tr('حدد بحد أقصى 5000 متدرب في الدفعة.','Select up to 5000 trainees per batch.'),SAVE:tr('تعذر حفظ الجدول. النتائج محفوظة في الإضافة؛ اضغط حفظ الآن ثم تحديث الحالة.','Could not save the sheet. Results remain in the extension; save the sheet and refresh status.')}[reason]||tr('تعذر إكمال العملية. حدّث الحالة وحاول مجددًا.','Could not complete the action. Refresh status and retry.'));
    function call(type,extra={}){
      const s=h.state();if(!s.loaded||!s.user)return Promise.reject(Error('OUTDATED'));
      const id=crypto.randomUUID(),owner=s.owner,epoch=s.epoch;
      return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(Error('DISCONNECTED'));},8000);pending.set(id,{timer,resolve:payload=>{const now=h.state();if(!now.loaded||now.owner!==owner||now.epoch!==epoch)return reject(Error('OUTDATED'));payload?.ok?resolve(payload):reject(Error(payload?.error||'DISCONNECTED'));},reject});window.postMessage({channel:'IBTA_PROMETRIC_APP',id,payload:{type,client,owner,...extra}},location.origin);});
    }
    const dialog=$('sheet-prometric-dialog');window.WorkspaceViews.prometricDialog(dialog,{extensionURL:$('prometric-registration-script')?.dataset.extension||'/workspace/trainflow-prometric.zip'});
    const title=$('sheet-prometric-title'),close=$('sheet-prometric-close'),connection=$('sheet-prometric-connection'),setup=dialog.querySelector('.sheet-prometric-setup'),download=$('sheet-prometric-download'),instructions=$('sheet-prometric-instructions'),summary=$('sheet-prometric-summary'),modeHelp=$('sheet-prometric-account-help'),preview=$('sheet-prometric-preview'),start=$('sheet-prometric-start'),refresh=$('sheet-prometric-refresh'),stop=$('sheet-prometric-stop'),recover=$('sheet-prometric-recover'),status=$('sheet-prometric-status'),results=$('sheet-prometric-results');
    close.setAttribute('aria-label',tr('إغلاق','Close'));close.onclick=()=>dialog.close();start.onclick=startRegistration;refresh.onclick=()=>poll(true);stop.onclick=stopRegistration;recover.onclick=recoverResults;
    const openButton=$('sheet-prometric-open');openButton.onclick=()=>open();$('sheet-workspace').querySelector('.sheet-ribbon-top .sheet-ribbon-actions').append(openButton);
    function translate(){
      title.textContent=tr('تسجيل المتدربين في Prometric','Prometric trainee registration');openButton.textContent=tr('تسجيل Prometric','Prometric registration');start.textContent=tr('إنشاء الحسابات','Create accounts');refresh.textContent=tr('تحديث الحالة','Refresh status');stop.textContent=tr('إيقاف التسجيل','Stop registration');download.textContent=tr('تحميل إضافة Prometric المتصلة بالنظام','Download the TrainFlow-connected Prometric extension');instructions.textContent=tr('فك ZIP في مجلد ثابت، ثم حمّله من chrome://extensions باستخدام Load unpacked. عطّل نسخة Prometric القديمة، وأعد تحميل TrainFlow وPrometric في نفس Chrome. الإضافة تستخدم إعدادات التسجيل المحفوظة فيها.','Extract ZIP to a permanent folder and use Load unpacked at chrome://extensions. Disable the old Prometric extension, then reload TrainFlow and Prometric in the same Chrome profile. Registration uses the settings saved in the extension.');draw();
      recover.textContent=tr('استعادة نتائج التبويب المغلق','Recover results from a closed tab');
    }
    function buildPlan(){
      const s=h.state();if(!same(s))return;credentialChecks.clear();
      try{plan=P.prepare(s.cells,selectedIndices,accountChoices);lastError='';}catch(error){plan=null;lastError=errorText(error.message);}
    }
    function accountChoicesLocked(){return working||extensionBusy||!!run?.items.some(item=>['pending','done'].includes(item.status));}
    function chooseAccount(index,mode){
      const s=h.state(),row=s.cells[index];if(!same(s)||accountChoicesLocked()||!selectedIndices.includes(index)||!row||!['new','reuse'].includes(mode))return;
      if(mode==='new')accountChoices.set(index,{fingerprint:P.fingerprint(row),credentials:P.credentials(row)});else accountChoices.delete(index);
      buildPlan();draw();
    }
    async function copyAccount(index){
      const s=h.state(),row=s.cells[index];if(!same(s)||!selectedIndices.includes(index)||!row)return;
      if(await copyText((row[9]||'')+'\t'+(row[10]||'')))showToast(tr('تم نسخ الحساب','Account copied'));
    }
    function drawPreview(s){
      const rows=plan?[...plan.items,...plan.skipped].sort((a,b)=>a.row-b.row).map(item=>{
        const row=s.cells[item.row],hasAccount=!!(row?.[9]?.trim()||row?.[10]?.trim());
        return {row:item.row,name:item.name,email:item.email,hasAccount,username:row?.[9]||'',mode:P.replacementSelected(row,item.row,accountChoices)?'new':'reuse',status:item.reason==='existing'?tr('الاحتفاظ بالحساب المسجل','Keep the saved account'):item.reason?reasonText(item.reason):tr('جاهز لإنشاء حساب','Ready to create an account')};
      }):[];
      window.WorkspaceViews.registrationPreview(preview,{rows,page:previewPage,disabled:accountChoicesLocked(),headings:[tr('الصف','Row'),tr('الاسم بالإنجليزي','English name'),tr('البريد الإلكتروني','Email'),tr('اسم المستخدم','Username'),tr('الإجراء','Action'),tr('الحالة','Status')],labels:{reuse:tr('الاحتفاظ بالحساب المسجل','Keep the saved account'),create:tr('إنشاء حساب جديد','Create a new account'),copy:tr('نسخ الحساب','Copy account'),account:tr('الإجراء لحساب الصف','Account action for row'),previous:tr('السابق','Previous'),next:tr('التالي','Next'),page:tr('الصفحة','Page')},changeAccount:chooseAccount,copyAccount,changePage:page=>{previewPage=page;draw();}});
    }
    function displayMatch(cells,item,index){
      if(!item.replaceExisting)return P.locate(cells,item,index);
      const rows=index.get(item.fingerprint)||[];const cached=credentialChecks.get(item.id),values=rows.length===1?cells[rows[0]]:null;
      return P.locate(cells,item,index,cached?.row===values?cached.hash:undefined);
    }
    function draw(){
      if(!dialog.open)return;const s=h.state();if(!same(s)){dialog.close();return;}
      connection.textContent=connected?tr('الإضافة متصلة — الإصدار ','Extension connected — version ')+version:tr('الإضافة غير متصلة؛ أعد تحميل الصفحة بعد تثبيتها.','Extension not connected; reload the page after installing it.');
      setup.hidden=connected;const retakePlan=!!plan?.items.some(item=>item.replaceExisting);start.disabled=!connected||working||!plan?.items.length||extensionBusy||!!run?.items.some(i=>['pending','done'].includes(i.status))||(retakePlan&&!retakeSupported);refresh.disabled=working;stop.hidden=!run?.items.some(i=>i.status==='pending');stop.disabled=working;
      recover.hidden=!recoverable;recover.disabled=working;
      const hasSaved=selectedIndices.some(index=>{const row=s.cells[index];return row?.[9]?.trim()||row?.[10]?.trim();});modeHelp.hidden=!hasSaved;modeHelp.textContent=retakePlan&&!retakeSupported&&connected?errorText('UPDATE_EXTENSION'):tr('اختر الإجراء لكل حساب على حدة. عند إنشاء حساب جديد، يظل الحساب الحالي محفوظًا حتى تأكيد نجاح التسجيل الجديد وحفظه.','Choose an action for each account. When creating a new account, the current credentials stay saved until the new registration is confirmed and saved.');
      const savedAccounts=plan?.skipped.filter(item=>item.reason==='existing').length||0;
      summary.textContent=plan?tr('جاهز للتسجيل: ','Ready to register: ')+plan.items.length+tr(' · حسابات محفوظة: ',' · Saved accounts: ')+savedAccounts+tr(' · يحتاج مراجعة: ',' · Needs review: ')+(plan.skipped.length-savedAccounts):'';
      drawPreview(s);
      window.WorkspaceViews.registrationResults(results,{headings:[],rows:[]});status.textContent=lastError;
      if(!run)return;const counts={};run.items.forEach(item=>counts[item.status]=(counts[item.status]||0)+1);
      status.textContent=(lastError?lastError+' · ':'')+tr('حُفظ: ','Saved: ')+(counts.saved||0)+tr(' · ينتظر الحفظ: ',' · Awaiting save: ')+(counts.done||0)+tr(' · ينتظر التسجيل: ',' · Pending: ')+(counts.pending||0)+tr(' · لم يكتمل: ',' · Incomplete: ')+((counts.failed||0)+(counts.cancelled||0));
      const index=P.indexRows(s.cells),rows=[];
      for(const item of [...run.items.filter(record=>record.status==='done'),...run.items.filter(record=>record.status!=='done')].slice(0,100)){
        const match=item.status==='done'?displayMatch(s.cells,item,index):null;
        const label=item.status==='saved'?tr('تم الحفظ في الجدول','Saved to sheet'):item.status==='reviewed'?tr('تمت المراجعة دون كتابة في الجدول','Reviewed without writing to the sheet'):item.status==='done'?(match?.reason?reasonText(match.reason):tr('جاهز للحفظ','Ready to save')):item.status==='pending'?tr('جارٍ التسجيل / ينتظر دوره','Registering / queued'):tr('لم يتأكد نجاح التسجيل؛ راجع Prometric قبل إعادة المحاولة','Registration not confirmed; check Prometric before retrying');
        const actions=[];
        if(item.status==='done')actions.push({label:tr('نسخ اليوزر والباسورد','Copy username and password'),run:async()=>{if(same(h.state())&&await copyText(item.username+'\t'+item.password))showToast(tr('تم النسخ','Copied'));}});
        if(item.status==='done'&&match?.reason&&match.reason!=='checking')actions.push({label:tr('تمت المراجعة — عدم الكتابة','Reviewed — do not write'),run:async()=>{if(!same(h.state())||working)return;working=true;draw();try{const response=await call('DISMISS',{run:run.id,ids:[item.id]});run=response.run;lastError='';}catch(error){lastError=errorText(error.message);}finally{working=false;draw();}}});
        rows.push({id:item.id,name:item.name,status:label,actions});
      }
      window.WorkspaceViews.registrationResults(results,{headings:[tr('الاسم','Name'),tr('الحالة','Status'),tr('الإجراء','Action')],rows});
    }
    async function applyResults(current){
      let s=h.state();if(applying||!s.loaded||!s.user||s.editing||current?.owner!==s.owner||current.client!==client)return;
      const completed=current.items.filter(i=>i.status==='done'&&typeof i.username==='string'&&i.username.length>0&&i.username.length<=300&&typeof i.password==='string'&&i.password.length>0&&i.password.length<=300);if(!completed.length)return;
      applying=true;const owner=s.owner,epoch=s.epoch;
      const stillCurrent=()=>{const now=h.state();return now.loaded&&now.owner===owner&&now.epoch===epoch;};
      try{
        if(!await h.flush())throw Error('SAVE');if(!stillCurrent()||h.state().editing)return;
        s=h.state();const index=P.indexRows(s.cells),next=s.cells.slice(),ids=[],hashes=new Map();
        for(const item of completed)if(item.replaceExisting){const rows=index.get(item.fingerprint)||[];if(rows.length===1)hashes.set(item.id,{row:s.cells[rows[0]],hash:await P.credentialsHash(P.credentials(s.cells[rows[0]]))});}
        if(!stillCurrent()||h.state().editing||h.state().cells!==s.cells)return;
        for(const item of completed){const cached=hashes.get(item.id),match=P.locate(next,item,index,cached?.hash);if(cached)credentialChecks.set(item.id,cached);if(match.reason)continue;ids.push(item.id);if(!match.alreadySaved){next[match.row]=[...next[match.row]];next[match.row][9]=item.username;next[match.row][10]=item.password;}}
        if(!ids.length)return;if(next.some((row,r)=>row!==s.cells[r]))h.change(D.normalize(next));
        if(!await h.flush())throw Error('SAVE');if(!stillCurrent())return;
        const ack=await call('ACK',{run:current.id,ids});run=ack.run;lastError='';
      }catch(error){if(stillCurrent())lastError=errorText(error.message);}
      finally{applying=false;draw();}
    }
    async function poll(showError=false){
      if(polling||!h.state().loaded||!h.state().user)return;polling=true;
      try{const data=await call('PING');connected=true;version=data.version;retakeSupported=data.capabilities?.retake===true;extensionBusy=data.busy;recoverable=data.recoverable;run=data.run;await applyResults(run);if(!lastError||!run?.items.some(i=>i.status==='done'))lastError='';}
      catch(error){if(error.message!=='OUTDATED'){connected=false;if(showError)lastError=errorText(error.message);}}
      finally{polling=false;draw();}
    }
    async function open(indices){
      h.commitEdit();const s=h.state();if(!s.loaded||!s.user)return;context={owner:s.owner,epoch:s.epoch};run=null;lastError='';
      selectedIndices=[...(indices||s.selectedRows||s.view.slice(s.bounds[0],s.bounds[1]+1))];accountChoices.clear();previewPage=0;buildPlan();
      dialog.dir=currentLang==='ar'?'rtl':'ltr';if(!dialog.open)dialog.showModal();translate();await poll(true);
    }
    async function startRegistration(){
      if(start.disabled||working||!plan?.items.length)return;working=true;lastError='';draw();
      try{
        if(!same(h.state()))throw Error('OUTDATED');if(!await h.flush())throw Error('SAVE');const s=h.state();if(!same(s))throw Error('OUTDATED');
        if(plan.items.some(item=>P.fingerprint(s.cells[item.row])!==item.fingerprint||(item.replaceExisting?P.credentials(s.cells[item.row])!==item.originalCredentials:!!(s.cells[item.row]?.[9]?.trim()||s.cells[item.row]?.[10]?.trim()))))throw Error('OUTDATED');
        if(plan.items.some(item=>item.replaceExisting)&&!retakeSupported)throw Error('UPDATE_EXTENSION');
        const items=await Promise.all(plan.items.map(async item=>{const {originalCredentials,...safe}=item;return item.replaceExisting?{...safe,previousCredentials:await P.credentialsHash(originalCredentials)}:safe;}));
        if(!same(h.state())||h.state().cells!==s.cells)throw Error('OUTDATED');
        const data=await call('START',{items});connected=true;version=data.version;retakeSupported=data.capabilities?.retake===true;extensionBusy=data.busy;run=data.run;plan=null;
      }catch(error){lastError=errorText(error.message);}
      finally{working=false;draw();}
    }
    async function stopRegistration(){
      if(working||!run)return;working=true;draw();try{const data=await call('STOP',{run:run.id});run=data.run;extensionBusy=data.busy;lastError='';}catch(error){lastError=errorText(error.message);}finally{working=false;draw();}
    }
    async function recoverResults(){
      if(working||!recoverable||!same(h.state()))return;working=true;draw();try{const data=await call('RECOVER');run=data.run;recoverable=false;lastError='';await applyResults(run);}catch(error){lastError=error.message==='ACTIVE_TAB'?tr('التبويب الأصلي ما زال مفتوحًا؛ ارجع له أو أغلقه قبل الاستعادة هنا.','The original tab is still open; use it or close it before recovering here.'):errorText(error.message);}finally{working=false;draw();}
    }
    window.addEventListener('message',event=>{
      const data=event.data;if(event.source!==window||event.origin!==location.origin||data?.channel!=='IBTA_PROMETRIC_EXTENSION')return;
      if(data.changed){poll();return;}const request=pending.get(data.id);if(!request)return;pending.delete(data.id);clearTimeout(request.timer);request.resolve(data.payload);
    });
    const timer=setInterval(()=>poll(),5000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll();});
    function reset(){dialog.close();window.WorkspaceViews.clear(preview);window.WorkspaceViews.registrationResults(results,{headings:[],rows:[]});run=plan=context=null;selectedIndices=[];credentialChecks.clear();accountChoices.clear();previewPage=0;lastError='';for(const request of pending.values()){clearTimeout(request.timer);request.reject(Error('OUTDATED'));}pending.clear();}
    translate();return {open,reset,translate,poll};
  }
  return {mount};
})();
