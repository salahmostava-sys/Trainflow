/* Fetch only the explicitly selected coded accounts, then acknowledge a cloud save. */
const TraineeExamResults=(()=>{
  'use strict';
  function mount(h){
    const {$,tr}=h,E=PrometricExamData,P=PrometricData;
    let client;try{client=sessionStorage.getItem('ibta_exam_client');if(!client){client=crypto.randomUUID();sessionStorage.setItem('ibta_exam_client',client);}}catch{client=crypto.randomUUID();}
    let context=null,plan=null,run=null,connected=false,version='',supported=false,busy=false,recoverable=false,working=false,polling=false,applying=false,lastError='';
    const pending=new Map(),blocked=new Map(),dialog=$('sheet-exam-dialog');
    window.WorkspaceViews.examResultsDialog(dialog);
    const requiredVersion=$('prometric-registration-script').dataset.version;
    const control=name=>$('sheet-exam-'+name),same=s=>context&&s.loaded&&s.owner===context.owner&&s.epoch===context.epoch;
    const reasons={
      name:['الاسم أطول من 300 حرف؛ راجعه أولًا','Name exceeds 300 characters; review it first'],code:['لا يوجد كود','No voucher code'],credentials:['يوزر أو باسورد غير مكتمل','Missing username or password'],duplicate:['بيانات مكررة؛ تحتاج مراجعة','Duplicate identity; review required'],exam:['اسم الاختبار غير موجود','Missing exam title'],
      codeChanged:['تغير كود الصف؛ لم تتم الكتابة','Voucher changed; nothing written'],credentialsChanged:['تغير الحساب؛ لم تتم الكتابة','Credentials changed; nothing written'],resultChanged:['تغيرت النتيجة؛ لم تتم الكتابة','Result changed; nothing written'],missing:['تغير الصف أو تم حذفه','Row changed or deleted'],
      LOGIN_FAILED:['تعذر الدخول؛ راجع الحساب','Sign-in failed; check credentials'],WRONG_ACCOUNT:['الحساب المفتوح لا يطابق الحساب المطلوب','Signed-in account does not match'],SESSION_EXPIRED:['انتهت جلسة Prometric؛ أعد جلب النتيجة','Prometric session expired; retry fetching'],NO_MATCHING_RESULT:['لا توجد نتيجة مطابقة للاختبار','No matching test result'],AMBIGUOUS_RESULTS:['أكثر من محاولة لنفس الاختبار؛ راجعها يدويًا','Multiple attempts for this test; review manually'],PAGINATED_RESULTS:['النتائج موزعة على صفحات؛ راجعها يدويًا','Results have multiple pages; review manually'],UNCONFIRMED_RESULT:['الدرجة أو الحالة غير مؤكدة','Score or outcome not confirmed'],REPORT_UNAVAILABLE:['صفحة النتائج غير متاحة','Score report unavailable'],TIMEOUT:['انتهت مهلة الاتصال؛ حاول مجددًا','Connection timed out; retry'],TAB_CLOSED:['تم إغلاق تبويب النتائج','Results tab closed'],STOPPED:['تم الإيقاف','Stopped'],START_FAILED:['تعذر فتح تبويب النتائج','Could not open results tab'],
      DISCONNECTED:['الإضافة غير متصلة؛ حدّثها وأعد تحميل TrainFlow','Extension disconnected; update it and reload TrainFlow'],BUSY:['الإضافة مشغولة أو لديها نتائج تنتظر الحفظ','Extension busy or has results awaiting save'],OUTDATED:['تغير الجدول؛ افتح العملية مجددًا','Sheet changed; reopen this action'],SAVE:['تعذر الحفظ. النتيجة محفوظة في الإضافة؛ احفظ الجدول ثم حدّث الحالة','Save failed. Results remain in the extension; save the sheet then refresh'],ACTIVE_TAB:['التبويب الأصلي مفتوح؛ استخدمه أو أغلقه أولًا','Original tab is open; use it or close it first'],UPDATE_EXTENSION:['حدّث إضافة Prometric إلى '+requiredVersion+' لجلب النتائج','Update Prometric extension to '+requiredVersion+' to fetch results'],AMBIGUOUS_SCORE_COLUMN:['يوجد أكثر من عمود درجة الاختبار؛ راجع عناوين الأعمدة','Multiple exam score columns; review column headings'],COLUMN_LIMIT:['لا يوجد عمود فارغ لحفظ الدرجة','No free column for the score'],LIMIT:['حدد بحد أقصى 5000 متدرب','Select up to 5000 trainees']
    };
    const reason=code=>tr(...(reasons[code]||['تعذر إكمال العملية؛ حدّث الحالة وحاول مجددًا','Could not complete this action; refresh status and retry']));
    function call(type,extra={}){
      const s=h.state();if(!s.loaded||!s.user)return Promise.reject(Error('OUTDATED'));
      const id=crypto.randomUUID(),owner=s.owner,epoch=s.epoch;
      return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(Error('DISCONNECTED'));},8000);pending.set(id,{timer,reject,resolve:response=>{const now=h.state();if(!now.loaded||now.owner!==owner||now.epoch!==epoch)return reject(Error('OUTDATED'));response?.ok?resolve(response):reject(Error(response?.error||'DISCONNECTED'));}});window.postMessage({channel:'IBTA_PROMETRIC_EXAM_APP',id,payload:{type,owner,client,...extra}},location.origin);});
    }
    function update(response){connected=true;version=response.version;supported=response.capabilities?.examResults===true;busy=!!response.busy;recoverable=response.recoverable;run=response.run;}
    function table(container,accounts){
      window.WorkspaceViews.examResultsTable(container,{headings:[tr('الصف','Row'),tr('المتدرب','Trainee'),tr('الحالة','Status'),tr('الدرجة','Score'),tr('الاختبار','Test'),tr('تاريخ النتيجة','Result date'),tr('مراجعة','Review')],labels:{previous:tr('السابق','Previous'),next:tr('التالي','Next'),page:tr('الصفحة','Page'),empty:container===control('preview')?tr('حدد صفوف المتدربين في الجدول لعرضها هنا.','Select trainee rows in the sheet to preview them here.'):tr('لم يتم جلب نتائج بعد.','No results fetched yet.')},rows:accounts});
    }
    function draw(){
      if(!dialog.open)return;
      const mismatch=connected&&!!version&&version!==requiredVersion;
      control('connection').textContent=mismatch?tr('حدّث إضافة Prometric: الإصدار المثبت '+version+'، والإصدار المطلوب '+requiredVersion+'.','Update Prometric extension: installed '+version+', required '+requiredVersion+'.'):connected?(supported?tr('الإضافة متصلة','Extension connected'):reason('UPDATE_EXTENSION')):reason('DISCONNECTED');
      control('connection').dataset.update=String(mismatch);
      control('start').disabled=working||busy||!connected||!supported||!plan?.items.length||!same(h.state());control('stop').disabled=working||!run?.items.some(account=>account.status==='pending');control('recover').hidden=!recoverable;control('recover').disabled=working;control('refresh').disabled=working;
      control('summary').textContent=plan?tr('جاهز للجلب: ','Ready: ')+plan.items.length+tr(' · تم تخطي: ',' · Skipped: ')+plan.skipped.length:'';
      table(control('preview'),plan?[...plan.items.map(account=>({...account,status:tr('جاهز لجلب النتيجة','Ready to fetch result')})),...plan.skipped.map(account=>({...account,id:'skip-'+account.row,status:reason(account.reason)}))].sort((a,b)=>a.row-b.row).map(account=>({id:account.id,row:account.row,name:account.name,status:account.status,score:'',exam:h.state().cells[account.row]?.[7]||'',date:''})):[]);
      control('status').textContent=lastError||(Number.isInteger(run?.examTab)&&run.items.at(-1)?.status==='failed'?tr('تبويب آخر حساب فشل متروك مفتوحًا؛ راجعه ثم حدد الصف وأعد الجلب.','The last failed account tab remains open; inspect it, then select the row and retry.'): '');
      table(control('results'),run?.items.map(account=>({id:account.id,row:account.row,name:account.name,score:account.score||'',exam:account.examTitle||'',date:account.testDate||'',status:account.status==='done'&&blocked.has(account.id)?reason(blocked.get(account.id)):account.status==='saved'?tr('تم الحفظ: ','Saved: ')+account.result:account.status==='done'?tr('ينتظر الحفظ: ','Awaiting save: ')+account.result:account.status==='pending'?tr('جارٍ الجلب / ينتظر دوره','Fetching / queued'):account.status==='reviewed'?tr('تمت المراجعة دون كتابة','Reviewed without writing'):reason(account.error),dismiss:account.status==='done'&&blocked.has(account.id)?{label:tr('عدم الكتابة','Do not write'),run:()=>dismiss(account.id)}:undefined}))||[]);
    }
    async function applyResults(current){
      let s=h.state();if(applying||!s.loaded||s.editing||!s.user||current?.owner!==s.owner||current.client!==client)return;
      const completed=current.items.filter(account=>account.status==='done'&&E.validResult(account));if(!completed.length)return;
      applying=true;const owner=s.owner,epoch=s.epoch,stillCurrent=()=>{const now=h.state();return now.loaded&&now.owner===owner&&now.epoch===epoch;};
      try{
        if(!await h.flush())throw Error('SAVE');if(!stillCurrent()||h.state().editing)return;s=h.state();
        const index=P.indexRows(s.cells),matches=await Promise.all(completed.map(async account=>({account,match:await E.locate(s.cells,account,s.formatting,index)})));
        if(!stillCurrent()||h.state().editing||h.state().cells!==s.cells||h.state().formatting!==s.formatting)return;
        let next={cells:s.cells,format:s.formatting};const ids=[];
        for(const {account,match} of matches){if(match.reason){blocked.set(account.id,match.reason);continue;}blocked.delete(account.id);ids.push(account.id);if(!match.alreadySaved)next=E.apply(next.cells,next.format,match,account);}
        if(!ids.length)return;if(next.cells!==s.cells)h.change(next.cells,true,next.format);
        if(!await h.flush())throw Error('SAVE');if(!stillCurrent())return;update(await call('ACK',{run:current.id,ids}));lastError='';
      }catch(error){if(stillCurrent())lastError=reason(error.message);}finally{applying=false;draw();}
    }
    async function poll(){
      if(polling||!h.state().loaded||!h.state().user)return;polling=true;
      try{update(await call('PING'));await applyResults(run);}catch(error){if(error.message!=='OUTDATED'){connected=false;if(dialog.open)lastError=reason(error.message);}}finally{polling=false;draw();}
    }
    async function start(){
      if(control('start').disabled)return;working=true;lastError='';draw();
      try{
        if(!same(h.state()))throw Error('OUTDATED');if(!await h.flush())throw Error('SAVE');const s=h.state();if(!same(s))throw Error('OUTDATED');
        if(plan.items.some(account=>P.fingerprint(s.cells[account.row])!==account.fingerprint||P.credentials(s.cells[account.row])!==account.originalCredentials||String(s.cells[account.row][0]||'').trim()!==account.voucher))throw Error('OUTDATED');
        const items=await Promise.all(plan.items.map(async account=>{const {originalCredentials,...safe}=account;return {...safe,credentialsHash:await P.credentialsHash(originalCredentials)};}));
        if(!same(h.state())||h.state().cells!==s.cells)throw Error('OUTDATED');update(await call('START',{items}));plan=null;
      }catch(error){lastError=reason(error.message);}finally{working=false;draw();}
    }
    async function action(type,extra={}){
      if(working)return;working=true;draw();try{update(await call(type,extra));lastError='';await applyResults(run);}catch(error){lastError=reason(error.message);}finally{working=false;draw();}
    }
    function dismiss(id){if(!run)return;return action('DISMISS',{run:run.id,ids:[id]});}
    async function open(){
      h.commitEdit();const s=h.state();if(!s.loaded||!s.user)return;context={owner:s.owner,epoch:s.epoch};blocked.clear();lastError='';
      try{plan=E.prepare(s.cells,s.selectedRows,h.catalog(),s.formatting);}catch(error){plan=null;lastError=reason(error.message);}
      translate();dialog.showModal();draw();await poll();
    }
    function translate(){
      dialog.dir=currentLang==='ar'?'rtl':'ltr';
      const labels={title:['جلب نتائج اختبارات Prometric','Fetch Prometric exam results'],open:['جلب نتائج Prometric','Fetch Prometric results'],start:['جلب النتائج للصفوف المحددة','Fetch selected results'],refresh:['تحديث الحالة','Refresh status'],stop:['إيقاف الجلب','Stop fetching'],recover:['استعادة نتائج التبويب المغلق','Recover results from a closed tab'],download:['تحميل إضافة Prometric المحدثة','Download the updated Prometric extension'],help:['حدد الصفوف أولًا. سيتم الدخول فقط للحسابات المحددة التي لها كود ويوزر وباسورد، وتُطابق النتيجة باسم الاختبار ولغته. يُحفظ ناجح أو راسب في عمود النتيجة، والنسبة في العمود التالي لـ AnyDesk ID مباشرة. فك ZIP وحدّث الإضافة من chrome://extensions ثم أعد تحميل TrainFlow.','Select rows first. Only selected accounts with a voucher, username and password will be accessed. Results must match the exam name and language. The outcome is saved in Result, and the percentage immediately after AnyDesk ID. Extract ZIP, update the extension at chrome://extensions, then reload TrainFlow.']};
      for(const [name,label] of Object.entries(labels))control(name).textContent=tr(...label);control('close').setAttribute('aria-label',tr('إغلاق','Close'));draw();
    }
    function reset(){dialog.close();context=plan=run=null;blocked.clear();lastError='';for(const request of pending.values()){clearTimeout(request.timer);request.reject(Error('OUTDATED'));}pending.clear();draw();}
    control('open').onclick=open;control('close').onclick=()=>dialog.close();control('start').onclick=start;control('refresh').onclick=poll;control('stop').onclick=()=>run&&action('STOP',{run:run.id});control('recover').onclick=()=>action('RECOVER');
    control('download').href=$('prometric-registration-script')?.dataset.extension||'/workspace/trainflow-prometric.zip';
    window.addEventListener('message',event=>{const message=event.data;if(event.source!==window||event.origin!==location.origin||message?.channel!=='IBTA_PROMETRIC_EXAM_EXTENSION')return;if(message.changed){poll();return;}const request=pending.get(message.id);if(!request)return;pending.delete(message.id);clearTimeout(request.timer);request.resolve(message.payload);});
    setInterval(poll,5000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll();});translate();
    return {reset,translate,poll};
  }
  return {mount};
})();
