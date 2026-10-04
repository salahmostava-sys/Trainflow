/* Connect the current private trainee sheet to the user's Prometric Chrome extension. */
const TraineePrometric=(()=>{
  'use strict';
  function mount(h){
    const {D,$,tr,node,button}=h,P=PrometricData;
    let client;try{client=sessionStorage.getItem('ibta_prometric_client');if(!client){client=crypto.randomUUID();sessionStorage.setItem('ibta_prometric_client',client);}}catch{client=crypto.randomUUID();}
    let connected=false,version='',run=null,extensionBusy=false,recoverable=false,working=false,applying=false,plan=null,context=null,lastError='',polling=false;
    const pending=new Map(),same=s=>context&&s.loaded&&s.owner===context.owner&&s.epoch===context.epoch;
    const reasonText=reason=>({existing:tr('يوجد يوزر أو باسورد بالفعل','Username or password already exists'),name:tr('الاسم الإنجليزي غير مكتمل','English name is incomplete'),email:tr('البريد الإلكتروني غير صحيح','Invalid email'),duplicate:tr('بيانات متطابقة في أكثر من صف؛ راجعها أولًا','Identical data in multiple rows; review first'),missing:tr('تغيّرت بيانات الصف أو تم حذفه','Row changed or was deleted')}[reason]||reason);
    const errorText=reason=>({DISCONNECTED:tr('الإضافة غير متصلة. ثبّتها في نفس Chrome ثم أعد تحميل الصفحة.','Extension disconnected. Install it in the same Chrome profile, then reload.'),BUSY:tr('هناك عملية تسجيل أو نتائج لم تُحفظ بعد في الإضافة.','The extension has a registration job or unsaved results.'),OUTDATED:tr('تغيّر الجدول المعروض. افتح التسجيل من الجدول المطلوب.','The displayed sheet changed. Open registration from the required sheet.'),LIMIT:tr('حدد بحد أقصى 5000 متدرب في الدفعة.','Select up to 5000 trainees per batch.'),SAVE:tr('تعذر حفظ الجدول. النتائج محفوظة في الإضافة؛ اضغط حفظ الآن ثم تحديث الحالة.','Could not save the sheet. Results remain in the extension; save the sheet and refresh status.')}[reason]||tr('تعذر إكمال العملية. حدّث الحالة وحاول مجددًا.','Could not complete the action. Refresh status and retry.'));
    function call(type,extra={}){
      const s=h.state();if(!s.loaded||!s.user)return Promise.reject(Error('OUTDATED'));
      const id=crypto.randomUUID(),owner=s.owner,epoch=s.epoch;
      return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(Error('DISCONNECTED'));},8000);pending.set(id,{timer,resolve:payload=>{const now=h.state();if(!now.loaded||now.owner!==owner||now.epoch!==epoch)return reject(Error('OUTDATED'));payload?.ok?resolve(payload):reject(Error(payload?.error||'DISCONNECTED'));},reject});window.postMessage({channel:'IBTA_PROMETRIC_APP',id,payload:{type,client,owner,...extra}},location.origin);});
    }
    const dialog=node('dialog',undefined,{id:'sheet-prometric-dialog',class:'sheet-file-dialog sheet-prometric-dialog','aria-labelledby':'sheet-prometric-title'}),header=node('div',undefined,{class:'sheet-file-header'}),title=node('h3','',{id:'sheet-prometric-title'}),close=button('×',()=>dialog.close());close.setAttribute('aria-label',tr('إغلاق','Close'));header.append(title,close);
    const connection=node('p','',{id:'sheet-prometric-connection',role:'status'}),setup=node('div',undefined,{class:'sheet-prometric-setup'}),download=node('a','',{id:'sheet-prometric-download',href:document.getElementById('prometric-registration-script')?.dataset.extension||'ibta-prometric.zip',download:''}),instructions=node('p');setup.append(download,instructions);
    const summary=node('p','',{id:'sheet-prometric-summary'}),preview=node('div',undefined,{class:'sheet-file-preview'}),actions=node('div',undefined,{class:'sheet-prometric-actions'}),start=button('',startRegistration,'sheet-primary'),refresh=button('',()=>poll(true)),stop=button('',stopRegistration),recover=button('',recoverResults),status=node('p','',{id:'sheet-prometric-status',role:'status'}),results=node('div',undefined,{class:'sheet-file-preview',id:'sheet-prometric-results'});start.id='sheet-prometric-start';refresh.id='sheet-prometric-refresh';stop.id='sheet-prometric-stop';recover.id='sheet-prometric-recover';actions.append(start,refresh,stop,recover);dialog.append(header,connection,setup,summary,preview,actions,status,results);document.body.append(dialog);
    const openButton=button('',()=>open());openButton.id='sheet-prometric-open';$('sheet-workspace').querySelector('.sheet-ribbon-top .sheet-ribbon-actions').append(openButton);
    function translate(){
      title.textContent=tr('تسجيل المتدربين في Prometric','Prometric trainee registration');openButton.textContent=tr('تسجيل Prometric','Prometric registration');start.textContent=tr('إنشاء الحسابات','Create accounts');refresh.textContent=tr('تحديث الحالة','Refresh status');stop.textContent=tr('إيقاف التسجيل','Stop registration');download.textContent=tr('تحميل إضافة Prometric المتصلة بالنظام','Download the IBTA-connected Prometric extension');instructions.textContent=tr('فك ZIP في مجلد ثابت، ثم حمّله من chrome://extensions باستخدام Load unpacked. عطّل نسخة Prometric القديمة، وأعد تحميل IBTA وPrometric في نفس Chrome. الإضافة تستخدم إعدادات التسجيل المحفوظة فيها.','Extract ZIP to a permanent folder and use Load unpacked at chrome://extensions. Disable the old Prometric extension, then reload IBTA and Prometric in the same Chrome profile. Registration uses the settings saved in the extension.');draw();
      recover.textContent=tr('استعادة نتائج التبويب المغلق','Recover results from a closed tab');
    }
    function table(headers){const t=node('table'),head=node('thead'),row=node('tr');headers.forEach(label=>row.append(node('th',label)));head.append(row);t.append(head,node('tbody'));return t;}
    function draw(){
      if(!dialog.open)return;const s=h.state();if(!same(s)){dialog.close();return;}
      connection.textContent=connected?tr('الإضافة متصلة — الإصدار ','Extension connected — version ')+version:tr('الإضافة غير متصلة؛ أعد تحميل الصفحة بعد تثبيتها.','Extension not connected; reload the page after installing it.');
      setup.hidden=connected;start.disabled=!connected||working||!plan?.items.length||extensionBusy||!!run?.items.some(i=>['pending','done'].includes(i.status));refresh.disabled=working;stop.hidden=!run?.items.some(i=>i.status==='pending');stop.disabled=working;
      recover.hidden=!recoverable;recover.disabled=working;
      preview.replaceChildren();summary.textContent=plan?tr('جاهز للتسجيل: ','Ready to register: ')+plan.items.length+tr(' · تم تخطي: ',' · Skipped: ')+plan.skipped.length:'';
      if(plan){const t=table([tr('الصف','Row'),tr('الاسم بالإنجليزي','English name'),tr('البريد الإلكتروني','Email'),tr('الحالة','Status')]);for(const item of [...plan.items,...plan.skipped].slice(0,100)){const row=node('tr');for(const value of [item.row+1,item.name,item.email,item.reason?reasonText(item.reason):tr('جاهز','Ready')])row.append(node('td',String(value)));t.lastChild.append(row);}preview.append(t);if(plan.items.length+plan.skipped.length>100)preview.append(node('p',tr('المعاينة تعرض أول 100 صف؛ التنفيذ يشمل كل الصفوف الجاهزة.','Preview shows the first 100 rows; all ready rows will be processed.')));}
      results.replaceChildren();status.textContent=lastError;
      if(!run)return;const counts={};run.items.forEach(item=>counts[item.status]=(counts[item.status]||0)+1);
      status.textContent=(lastError?lastError+' · ':'')+tr('حُفظ: ','Saved: ')+(counts.saved||0)+tr(' · ينتظر الحفظ: ',' · Awaiting save: ')+(counts.done||0)+tr(' · ينتظر التسجيل: ',' · Pending: ')+(counts.pending||0)+tr(' · لم يكتمل: ',' · Incomplete: ')+((counts.failed||0)+(counts.cancelled||0));
      const t=table([tr('الاسم','Name'),tr('الحالة','Status'),tr('الإجراء','Action')]),index=P.indexRows(s.cells);
      for(const item of [...run.items.filter(i=>i.status==='done'),...run.items.filter(i=>i.status!=='done')].slice(0,100)){
        const row=node('tr'),match=item.status==='done'?P.locate(s.cells,item,index):null;
        const label=item.status==='saved'?tr('تم الحفظ في الجدول','Saved to sheet'):item.status==='reviewed'?tr('تمت المراجعة دون كتابة في الجدول','Reviewed without writing to the sheet'):item.status==='done'?(match?.reason?reasonText(match.reason):tr('جاهز للحفظ','Ready to save')):item.status==='pending'?tr('جارٍ التسجيل / ينتظر دوره','Registering / queued'):tr('لم يتأكد نجاح التسجيل؛ راجع Prometric قبل إعادة المحاولة','Registration not confirmed; check Prometric before retrying');
        row.append(node('td',item.name),node('td',label));const action=node('td');
        if(item.status==='done')action.append(button(tr('نسخ اليوزر والباسورد','Copy username and password'),async()=>{if(same(h.state())&&await copyText(item.username+'\t'+item.password))showToast(tr('تم النسخ','Copied'));}));
        if(item.status==='done'&&match?.reason)action.append(button(tr('تمت المراجعة — عدم الكتابة','Reviewed — do not write'),async()=>{if(!same(h.state())||working)return;working=true;draw();try{const data=await call('DISMISS',{run:run.id,ids:[item.id]});run=data.run;lastError='';}catch(error){lastError=errorText(error.message);}finally{working=false;draw();}}));
        row.append(action);t.lastChild.append(row);
      }
      results.append(t);
    }
    async function applyResults(current){
      let s=h.state();if(applying||!s.loaded||!s.user||s.editing||current?.owner!==s.owner||current.client!==client)return;
      const completed=current.items.filter(i=>i.status==='done'&&typeof i.username==='string'&&i.username.length>0&&i.username.length<=300&&typeof i.password==='string'&&i.password.length>0&&i.password.length<=300);if(!completed.length)return;
      applying=true;const owner=s.owner,epoch=s.epoch;
      const stillCurrent=()=>{const now=h.state();return now.loaded&&now.owner===owner&&now.epoch===epoch;};
      try{
        if(!await h.flush())throw Error('SAVE');if(!stillCurrent()||h.state().editing)return;
        s=h.state();const index=P.indexRows(s.cells),next=s.cells.slice(),ids=[];
        for(const item of completed){const match=P.locate(next,item,index);if(match.reason)continue;ids.push(item.id);if(!match.alreadySaved){next[match.row]=[...next[match.row]];next[match.row][9]=item.username;next[match.row][10]=item.password;}}
        if(!ids.length)return;if(next.some((row,r)=>row!==s.cells[r]))h.change(D.normalize(next));
        if(!await h.flush())throw Error('SAVE');if(!stillCurrent())return;
        const ack=await call('ACK',{run:current.id,ids});run=ack.run;lastError='';
      }catch(error){if(stillCurrent())lastError=errorText(error.message);}
      finally{applying=false;draw();}
    }
    async function poll(showError=false){
      if(polling||!h.state().loaded||!h.state().user)return;polling=true;
      try{const data=await call('PING');connected=true;version=data.version;extensionBusy=data.busy;recoverable=data.recoverable;run=data.run;await applyResults(run);if(!lastError||!run?.items.some(i=>i.status==='done'))lastError='';}
      catch(error){if(error.message!=='OUTDATED'){connected=false;if(showError)lastError=errorText(error.message);}}
      finally{polling=false;draw();}
    }
    async function open(indices){
      h.commitEdit();const s=h.state();if(!s.loaded||!s.user)return;context={owner:s.owner,epoch:s.epoch};run=null;lastError='';
      const selected=indices||s.view.slice(s.bounds[0],s.bounds[1]+1);try{plan=P.prepare(s.cells,selected);}catch(error){plan=null;lastError=errorText(error.message);}
      dialog.dir=currentLang==='ar'?'rtl':'ltr';if(!dialog.open)dialog.showModal();translate();await poll(true);
    }
    async function startRegistration(){
      if(start.disabled||working||!plan?.items.length)return;working=true;lastError='';draw();
      try{
        if(!same(h.state()))throw Error('OUTDATED');if(!await h.flush())throw Error('SAVE');const s=h.state();if(!same(s))throw Error('OUTDATED');
        if(plan.items.some(i=>P.fingerprint(s.cells[i.row])!==i.fingerprint||s.cells[i.row]?.[9]?.trim()||s.cells[i.row]?.[10]?.trim()))throw Error('OUTDATED');
        const data=await call('START',{items:plan.items});connected=true;version=data.version;extensionBusy=data.busy;run=data.run;plan=null;
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
    function reset(){dialog.close();dialog.querySelectorAll('tbody').forEach(el=>el.replaceChildren());run=plan=context=null;lastError='';for(const request of pending.values()){clearTimeout(request.timer);request.reject(Error('OUTDATED'));}pending.clear();}
    translate();return {open,reset,translate,poll};
  }
  return {mount};
})();
