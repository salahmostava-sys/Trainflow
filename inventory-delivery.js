/* Admin settings for daily WhatsApp inventory delivery: local Chrome or Meta. */
const InventoryDelivery=(()=>{
  const $=id=>document.getElementById(id),tr=(ar,en)=>currentLang==='ar'?ar:en;
  let revision=0,loaded=null,busy=false,extension=null,snapshotBusy=false;
  const post=(type,payload)=>window.postMessage({channel:'IBTA_WEB_APP',type,payload},location.origin);
  const section=document.createElement('section');section.className='ops-card';section.id='inventory-auto-settings';
  section.innerHTML=`<h3 data-ar="الإرسال اليومي التلقائي على واتساب" data-en="Daily automatic WhatsApp message"></h3>
    <p class="ops-status" data-ar="تُرسل رسالة رصيد الأكواد إلى الرقم المحفوظ أعلاه. اختر وقتًا قبل 5 مساءً لإرسالها قبل تسجيل الخروج." data-en="Sends the inventory report to the number saved above. Choose a time before 5 PM to send before sign-out."></p>
    <div class="ops-row">
      <label><span data-ar="طريقة الإرسال" data-en="Sending method"></span><select id="inventory-auto-provider"><option value="web">WhatsApp Web — Chrome</option><option value="meta">WhatsApp Business API</option></select></label>
      <label class="inventory-auto-toggle"><input id="inventory-auto-enabled" type="checkbox"><span data-ar="الإرسال التلقائي" data-en="Automatic sending"></span></label>
      <label><span data-ar="الوقت بتوقيت السعودية" data-en="Time in Saudi Arabia"></span><input id="inventory-auto-time" type="time" value="16:59" required></label>
    </div>
    <p class="ops-status" id="inventory-auto-connection" role="status"></p>
    <fieldset id="inventory-auto-web"><legend data-ar="ربط واتساب ويب على هذا الجهاز" data-en="Connect WhatsApp Web on this device"></legend>
      <p class="ops-status" data-ar="ثبّت الإضافة مرة واحدة في Chrome المفتوح عليه واتساب ويب. لازم الجهاز وChrome وواتساب يفضلوا شغالين، وتسجيل الدخول للبرنامج يكون صالحًا قبل الموعد. فعّل الإرسال على جهاز واحد فقط." data-en="Install the extension in your WhatsApp Web Chrome profile. Keep the device, Chrome and WhatsApp running, and sign into IBTA before the send time. Enable sending on one device only."></p>
      <a id="inventory-auto-download" href="ibta-whatsapp-web.zip" download data-ar="تحميل إضافة Chrome" data-en="Download Chrome extension"></a>
      <ol><li data-ar="فك ضغط الملف في مجلد ثابت." data-en="Extract the downloaded ZIP into a permanent folder."></li><li data-ar="افتح chrome://extensions وفعل Developer mode." data-en="Open chrome://extensions and enable Developer mode."></li><li data-ar="اضغط Load unpacked واختر المجلد، ثم حدّث صفحة البرنامج." data-en="Click Load unpacked, select the extracted folder, then reload IBTA."></li></ol>
    </fieldset>
    <fieldset id="inventory-auto-meta" hidden><legend data-ar="ربط WhatsApp Business" data-en="Connect WhatsApp Business"></legend>
      <p class="ops-status" data-ar="أضف بيانات حساب Meta وقالب رسالة معتمد. اترك مفتاح الوصول فارغًا للاحتفاظ بالمفتاح المحفوظ." data-en="Add your Meta account details and an approved message template. Leave the access token blank to keep the saved token."></p>
      <div class="ops-row">
        <label><span>Phone Number ID</span><input id="inventory-auto-phone-id" type="text" inputmode="numeric" dir="ltr" maxlength="30" autocomplete="off"></label>
        <label><span data-ar="اسم القالب المعتمد" data-en="Approved template name"></span><input id="inventory-auto-template" type="text" dir="ltr" maxlength="100" autocomplete="off" placeholder="ibta_inventory_daily"></label>
        <label><span data-ar="لغة القالب" data-en="Template language"></span><select id="inventory-auto-language"><option value="ar">العربية (ar)</option><option value="en_US">English (en_US)</option><option value="en_GB">English (en_GB)</option><option value="en">English (en)</option></select></label>
        <label><span>Access token</span><input id="inventory-auto-token" type="password" dir="ltr" maxlength="4096" autocomplete="new-password"></label>
      </div>
      <p class="ops-status" data-ar="القالب يحتوي على 6 متغيرات: التاريخ، الرصيد معايا، اسم المشرف، رصيد المشرف، مجموع كل فئة، والإجمالي الكلي." data-en="The template uses 6 variables: date, available codes, supervisor name, supervisor balances, category totals, and overall total."></p>
      <div class="ops-row"><button id="inventory-auto-copy-template" type="button" data-ar="نسخ نص القالب لاعتماده" data-en="Copy template text for approval"></button><a href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" target="_blank" rel="noopener noreferrer" data-ar="دليل تجهيز حساب الخدمة" data-en="Sending account setup guide"></a></div>
    </fieldset>
    <div class="ops-row"><button id="inventory-auto-save" type="button" data-ar="حفظ إعدادات الإرسال" data-en="Save sending settings"></button><button id="inventory-auto-refresh" type="button" data-ar="تحديث حالة الإرسال" data-en="Refresh send status"></button></div>
    <p class="ops-status" id="inventory-auto-status" role="status" aria-live="polite"></p>
    <p class="ops-status" id="inventory-auto-last"></p>`;
  $('inventory-whatsapp-settings').after(section);
  $('inventory-auto-download').href=$('inventory-delivery-script').dataset.extension;
  function translate(){section.querySelectorAll('[data-ar]').forEach(el=>el.textContent=tr(el.dataset.ar,el.dataset.en));if(loaded)paintStatus(loaded);}
  function errorText(error){
    const localErrors={EXTENSION_REQUIRED:['ثبّت إضافة Chrome ثم حدّث صفحة البرنامج قبل تفعيل الإرسال.','Install the Chrome extension and reload IBTA before enabling sending.'],FRESH_REPORT_REQUIRED:['تعذر تجهيز تقرير حديث. تأكد من تسجيل الدخول للبرنامج قبل الموعد.','A fresh report was unavailable. Sign into IBTA before the send time.'],WHATSAPP_NOT_READY:['واتساب غير جاهز. افتحه وتأكد من تسجيل الدخول.','WhatsApp is not ready. Open it and check that you are signed in.'],MESSAGE_MISMATCH:['الرسالة في واتساب لا تطابق التقرير؛ لم تُرسل.','The WhatsApp draft differs from the report; nothing was sent.'],SEND_UNCONFIRMED:['لم يمكن تأكيد الإرسال. راجع محادثة المستلم.','Could not confirm sending. Check the recipient chat.'],WHATSAPP_OPEN_FAILED:['تعذر فتح واتساب ويب.','Could not open WhatsApp Web.']};
    if(localErrors[error?.message||error])return tr(...localErrors[error?.message||error]);
    const values={WHATSAPP_NOT_CONNECTED:['أكمل ربط WhatsApp Business قبل تفعيل الإرسال.','Connect WhatsApp Business before enabling automatic sending.'],RECIPIENT_REQUIRED:['احفظ رقم المستلم في إعدادات الرسالة أعلاه أولًا.','Save the recipient number above first.'],INVALID_OPTIONS:['راجع الوقت وبيانات الخدمة المدخلة.','Check the time and service details.'],STOCK_INCOMPLETE:['أكمل أرصدة جميع الفئات في صفحة المخزون.','Set the supervisor balance for every inventory category.'],TEMPLATE_LANGUAGE_MISMATCH:['لغة القالب تختلف عن لغة رسالة المخزون.','The template language differs from the inventory message language.'],REPORT_TOO_LONG:['التقرير أكبر من حد قالب واتساب.','The report exceeds the WhatsApp template limit.'],PROVIDER_REJECTED:['رفضت خدمة واتساب الرسالة. راجع المفتاح ورقم الخدمة والقالب المعتمد.','WhatsApp rejected the message. Check the token, phone ID, and approved template.'],RESPONSE_UNAVAILABLE:['لم يصل تأكيد من الخدمة. راجع حساب واتساب قبل إعادة المحاولة.','No provider confirmation received. Check your WhatsApp account before retrying.']};
    const key=Object.keys(values).find(key=>String(error?.message||error).includes(key));return key?tr(...values[key]):tr('تعذر تحميل أو حفظ إعدادات الإرسال. حاول مجددًا.','Could not load or save sending settings. Please retry.');
  }
  function paintStatus(data){
    const web=$('inventory-auto-provider').value==='web';$('inventory-auto-web').hidden=!web;$('inventory-auto-meta').hidden=web;
    $('inventory-auto-connection').textContent=web?(extension?.connected?(extension.enabled&&extension.owner===Cloud.userId()?tr('الإضافة متصلة والإرسال مفعّل على هذا الجهاز.','Extension connected; sending is enabled on this device.'):tr('الإضافة متصلة. احفظ الإعدادات لتفعيل الإرسال على هذا الجهاز.','Extension connected. Save settings to enable sending on this device.')):tr('ثبّت إضافة Chrome ثم حدّث الصفحة. الإرسال التلقائي لم يبدأ على هذا الجهاز.','Install the Chrome extension, then reload. Automatic sending has not started on this device.')):(data.connected?tr('بيانات الخدمة محفوظة. يلزم أن يكون القالب معتمدًا والمفتاح صالحًا.','Service details saved. The template must be approved and the token valid.'):tr('خدمة الإرسال غير مربوطة؛ الإرسال التلقائي لم يبدأ.','Sending service is not connected; automatic sending has not started.'));
    const last=web?extension?.last:data.last,states={preparing:['جارٍ فتح واتساب','Opening WhatsApp'],sending:['جارٍ الإرسال','Sending'],sent:['ظهرت الرسالة كصادرة في واتساب؛ راجع وصولها في المحادثة','Message shown as outgoing in WhatsApp; check delivery in the chat'],queued:['في انتظار رد خدمة واتساب','Waiting for WhatsApp response'],accepted:['قبلت خدمة واتساب الرسالة؛ وصولها للمستلم يُراجع من حساب الخدمة','WhatsApp accepted the message; check delivery in your provider account'],failed:['فشل الإرسال','Sending failed'],unknown:['حالة الإرسال غير مؤكدة','Send outcome unknown']};
    $('inventory-auto-last').textContent=last?new Date(last.at).toLocaleString(currentLang==='ar'?'ar-SA-u-ca-gregory':'en-GB',{timeZone:'Asia/Riyadh'})+' · '+tr(...(states[last.state]||states.unknown))+(last.error?' · '+errorText(last.error):''):tr('لا توجد رسائل مرسلة حتى الآن.','No messages have been sent yet.');
  }
  function paint(data){loaded=data;$('inventory-auto-provider').value=data.provider||'meta';$('inventory-auto-enabled').checked=data.enabled;$('inventory-auto-time').value=data.time;$('inventory-auto-phone-id').value=data.phoneId;$('inventory-auto-template').value=data.template;$('inventory-auto-language').value=data.language;paintStatus(data);}
  function controls(disabled){section.querySelectorAll('input,select,button').forEach(el=>el.disabled=disabled);}
  async function load(){
    if(Cloud.role()!=='admin'||busy)return;const token=++revision;busy=true;controls(true);
    post('PING');
    try{const data=await Cloud.inventoryDelivery();if(token===revision&&Cloud.role()==='admin'){paint(data);$('inventory-auto-status').textContent='';}}
    catch(error){if(token===revision)$('inventory-auto-status').textContent=errorText(error);}
    finally{if(token===revision){busy=false;controls(false);}}
  }
  $('inventory-auto-save').onclick=async()=>{
    if(busy)return;const token=++revision,access=$('inventory-auto-token').value.trim();busy=true;controls(true);
    $('inventory-auto-status').textContent=tr('جارٍ الحفظ…','Saving…');
    try{
      const provider=$('inventory-auto-provider').value;
      if(provider==='web'&&$('inventory-auto-enabled').checked&&!extension?.connected)throw Error('EXTENSION_REQUIRED');
      const data=await Cloud.inventoryDelivery({provider,enabled:$('inventory-auto-enabled').checked,time:$('inventory-auto-time').value,
        phoneId:provider==='meta'?$('inventory-auto-phone-id').value.trim():loaded?.phoneId||'',template:provider==='meta'?$('inventory-auto-template').value.trim():loaded?.template||'',language:provider==='meta'?$('inventory-auto-language').value:loaded?.language||'ar',
        apiVersion:loaded?.apiVersion||'v24.0',token:provider==='meta'?access:''});
      if(token===revision){paint(data);$('inventory-auto-status').textContent=data.enabled?tr('تم الحفظ. الإرسال يوميًا الساعة ','Saved. Sending daily at ')+data.time+tr(' بتوقيت السعودية.',' Saudi time.'):tr('تم الحفظ. الإرسال التلقائي متوقف.','Saved. Automatic sending is off.');post('CONFIG',{enabled:data.enabled&&provider==='web',time:data.time,recipient:Cloud.inventoryMessageSettings().number,owner:Cloud.userId()});if(provider==='web')void publishSnapshot();}
    }catch(error){if(token===revision)$('inventory-auto-status').textContent=errorText(error);}
    finally{if(token===revision){$('inventory-auto-token').value='';busy=false;controls(false);}}
  };
  $('inventory-auto-refresh').onclick=load;
  $('inventory-auto-provider').onchange=()=>paintStatus(loaded||{});
  async function publishSnapshot(){
    if(snapshotBusy||!extension?.connected||!Cloud.inventoryDeliveryEligible?.())return;snapshotBusy=true;const owner=Cloud.userId();
    try{
      const [cfg,source]=await Promise.all([Cloud.inventoryDelivery(),Cloud.inventoryReportSnapshot()]);
      if(!Cloud.inventoryDeliveryEligible()||owner!==Cloud.userId())return;
      const config={enabled:cfg.enabled&&cfg.provider==='web',time:cfg.time,recipient:source.settings.number,owner};
      const complete=source.categories.length>0&&source.categories.every(category=>Object.hasOwn(source.stock,category));
      const at=Date.now(),report=config.enabled&&complete?{owner,recipient:config.recipient,time:config.time,at,day:new Date(at+10800000).toISOString().slice(0,10),message:inventoryMessage(source.categories,source.stock,source)}:null;
      post('SNAPSHOT',{config,report});
    }catch{ /* The extension rejects an absent or stale report at send time. */ }
    finally{snapshotBusy=false;}
  }
  window.addEventListener('message',event=>{
    if(event.source!==window||event.origin!==location.origin||event.data?.channel!=='IBTA_WEB_EXTENSION')return;
    if(event.data.type==='STATE'){extension=event.data.payload?.connected?event.data.payload:null;if(loaded)paintStatus(loaded);if(event.data.reason==='PING'&&extension?.enabled&&extension.owner===Cloud.userId())void publishSnapshot();}
    if(event.data.type==='DISCONNECTED'){extension=null;if(loaded)paintStatus(loaded);}
    if(event.data.type==='REQUEST_SNAPSHOT')void publishSnapshot();
  });
  $('inventory-auto-copy-template').onclick=async()=>{
    const body=$('inventory-auto-language').value.startsWith('en')?'Daily inventory report\nDate: {{1}}\n\nCodes with me:\n{{2}}\n\nCodes with {{3}}:\n{{4}}\n\nTotal codes:\n{{5}}\nOverall total: {{6}}':'تقرير رصيد الأكواد اليومي\nالتاريخ: {{1}}\n\nالأكواد معايا:\n{{2}}\n\nالأكواد مع {{3}}:\n{{4}}\n\nإجمالي الأكواد:\n{{5}}\nالإجمالي الكلي: {{6}}';
    if(await copyText(body))$('inventory-auto-status').textContent=tr('تم نسخ نص القالب. أضفه في حساب Meta لاعتماده.','Template copied. Submit it for approval in your Meta account.');
  };
  function reset(){revision++;busy=false;loaded=null;$('inventory-auto-token').value='';$('inventory-auto-enabled').checked=false;$('inventory-auto-phone-id').value='';$('inventory-auto-template').value='';$('inventory-auto-status').textContent='';$('inventory-auto-last').textContent='';controls(false);}
  translate();post('PING');
  return {load,translate,reset,ready(){post('PING');void publishSnapshot();}};
})();
