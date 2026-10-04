/* Admin settings for the server-side daily WhatsApp inventory report. */
const InventoryDelivery=(()=>{
  const $=id=>document.getElementById(id),tr=(ar,en)=>currentLang==='ar'?ar:en;
  let revision=0,loaded=null,busy=false;
  const section=document.createElement('section');section.className='ops-card';section.id='inventory-auto-settings';
  section.innerHTML=`<h3 data-ar="الإرسال اليومي التلقائي على واتساب" data-en="Daily automatic WhatsApp message"></h3>
    <p class="ops-status" data-ar="تُرسل رسالة رصيد الأكواد إلى الرقم المحفوظ أعلاه، حتى لو الصفحة مقفولة. اختر وقتًا قبل 5 مساءً لإرسالها قبل تسجيل الخروج." data-en="Sends the inventory report to the number saved above, even when the page is closed. Choose a time before 5 PM to send before sign-out."></p>
    <div class="ops-row">
      <label class="inventory-auto-toggle"><input id="inventory-auto-enabled" type="checkbox"><span data-ar="الإرسال التلقائي" data-en="Automatic sending"></span></label>
      <label><span data-ar="الوقت بتوقيت السعودية" data-en="Time in Saudi Arabia"></span><input id="inventory-auto-time" type="time" value="16:59" required></label>
    </div>
    <p class="ops-status" id="inventory-auto-connection" role="status"></p>
    <fieldset><legend data-ar="ربط WhatsApp Business" data-en="Connect WhatsApp Business"></legend>
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
  function translate(){section.querySelectorAll('[data-ar]').forEach(el=>el.textContent=tr(el.dataset.ar,el.dataset.en));if(loaded)paintStatus(loaded);}
  function errorText(error){
    const values={WHATSAPP_NOT_CONNECTED:['أكمل ربط WhatsApp Business قبل تفعيل الإرسال.','Connect WhatsApp Business before enabling automatic sending.'],RECIPIENT_REQUIRED:['احفظ رقم المستلم في إعدادات الرسالة أعلاه أولًا.','Save the recipient number above first.'],INVALID_OPTIONS:['راجع الوقت وبيانات الخدمة المدخلة.','Check the time and service details.'],STOCK_INCOMPLETE:['أكمل أرصدة جميع الفئات في صفحة المخزون.','Set the supervisor balance for every inventory category.'],TEMPLATE_LANGUAGE_MISMATCH:['لغة القالب تختلف عن لغة رسالة المخزون.','The template language differs from the inventory message language.'],REPORT_TOO_LONG:['التقرير أكبر من حد قالب واتساب.','The report exceeds the WhatsApp template limit.'],PROVIDER_REJECTED:['رفضت خدمة واتساب الرسالة. راجع المفتاح ورقم الخدمة والقالب المعتمد.','WhatsApp rejected the message. Check the token, phone ID, and approved template.'],RESPONSE_UNAVAILABLE:['لم يصل تأكيد من الخدمة. راجع حساب واتساب قبل إعادة المحاولة.','No provider confirmation received. Check your WhatsApp account before retrying.']};
    const key=Object.keys(values).find(key=>String(error?.message||error).includes(key));return key?tr(...values[key]):tr('تعذر تحميل أو حفظ إعدادات الإرسال. حاول مجددًا.','Could not load or save sending settings. Please retry.');
  }
  function paintStatus(data){
    $('inventory-auto-connection').textContent=data.connected?tr('بيانات الخدمة محفوظة. يلزم أن يكون القالب معتمدًا والمفتاح صالحًا.','Service details saved. The template must be approved and the token valid.'):tr('خدمة الإرسال غير مربوطة؛ الإرسال التلقائي لم يبدأ.','Sending service is not connected; automatic sending has not started.');
    const last=data.last,states={queued:['في انتظار رد خدمة واتساب','Waiting for WhatsApp response'],accepted:['قبلت خدمة واتساب الرسالة؛ وصولها للمستلم يُراجع من حساب الخدمة','WhatsApp accepted the message; check delivery in your provider account'],failed:['فشل الإرسال','Sending failed'],unknown:['حالة الإرسال غير مؤكدة','Send outcome unknown']};
    $('inventory-auto-last').textContent=last?new Date(last.at).toLocaleString(currentLang==='ar'?'ar-SA-u-ca-gregory':'en-GB',{timeZone:'Asia/Riyadh'})+' · '+tr(...(states[last.state]||states.unknown))+(last.error?' · '+errorText(last.error):''):tr('لا توجد رسائل مرسلة حتى الآن.','No messages have been sent yet.');
  }
  function paint(data){loaded=data;$('inventory-auto-enabled').checked=data.enabled;$('inventory-auto-time').value=data.time;$('inventory-auto-phone-id').value=data.phoneId;$('inventory-auto-template').value=data.template;$('inventory-auto-language').value=data.language;paintStatus(data);}
  function controls(disabled){section.querySelectorAll('input,select,button').forEach(el=>el.disabled=disabled);}
  async function load(){
    if(Cloud.role()!=='admin'||busy)return;const token=++revision;busy=true;controls(true);
    try{const data=await Cloud.inventoryDelivery();if(token===revision&&Cloud.role()==='admin'){paint(data);$('inventory-auto-status').textContent='';}}
    catch(error){if(token===revision)$('inventory-auto-status').textContent=errorText(error);}
    finally{if(token===revision){busy=false;controls(false);}}
  }
  $('inventory-auto-save').onclick=async()=>{
    if(busy)return;const token=++revision,access=$('inventory-auto-token').value.trim();busy=true;controls(true);
    $('inventory-auto-status').textContent=tr('جارٍ الحفظ…','Saving…');
    try{
      const data=await Cloud.inventoryDelivery({enabled:$('inventory-auto-enabled').checked,time:$('inventory-auto-time').value,
        phoneId:$('inventory-auto-phone-id').value.trim(),template:$('inventory-auto-template').value.trim(),language:$('inventory-auto-language').value,
        apiVersion:loaded?.apiVersion||'v24.0',token:access});
      if(token===revision){paint(data);$('inventory-auto-status').textContent=data.enabled?tr('تم الحفظ. الإرسال يوميًا الساعة ','Saved. Sending daily at ')+data.time+tr(' بتوقيت السعودية.',' Saudi time.'):tr('تم الحفظ. الإرسال التلقائي متوقف.','Saved. Automatic sending is off.');}
    }catch(error){if(token===revision)$('inventory-auto-status').textContent=errorText(error);}
    finally{if(token===revision){$('inventory-auto-token').value='';busy=false;controls(false);}}
  };
  $('inventory-auto-refresh').onclick=load;
  $('inventory-auto-copy-template').onclick=async()=>{
    const body=$('inventory-auto-language').value.startsWith('en')?'Daily inventory report\nDate: {{1}}\n\nCodes with me:\n{{2}}\n\nCodes with {{3}}:\n{{4}}\n\nTotal codes:\n{{5}}\nOverall total: {{6}}':'تقرير رصيد الأكواد اليومي\nالتاريخ: {{1}}\n\nالأكواد معايا:\n{{2}}\n\nالأكواد مع {{3}}:\n{{4}}\n\nإجمالي الأكواد:\n{{5}}\nالإجمالي الكلي: {{6}}';
    if(await copyText(body))$('inventory-auto-status').textContent=tr('تم نسخ نص القالب. أضفه في حساب Meta لاعتماده.','Template copied. Submit it for approval in your Meta account.');
  };
  function reset(){revision++;busy=false;loaded=null;$('inventory-auto-token').value='';$('inventory-auto-enabled').checked=false;$('inventory-auto-phone-id').value='';$('inventory-auto-template').value='';$('inventory-auto-status').textContent='';$('inventory-auto-last').textContent='';controls(false);}
  translate();
  return {load,translate,reset};
})();
