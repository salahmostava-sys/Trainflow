/* Deploy in your own Google account. Script properties hold approved destinations.
 * Requests read saved records through the caller's Supabase JWT and existing RLS.
 * Never configure a service-role key. Never log incoming parameters.
 */
function doPost(e) {
  var lock=LockService.getScriptLock();
  try {
    var p=JSON.parse(e.parameter.payload||'{}'),props=PropertiesService.getScriptProperties();
    if(!['operations','success'].includes(p.kind)||!/^\d{4}-\d{2}-\d{2}$/.test(p.date)||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.owner)||typeof p.token!=='string')throw Error('طلب غير صالح');
    var match=/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([\w-]+)/.exec(p.destination||'');
    var approved=props.getProperty(p.kind==='operations'?'OPERATIONS_ID':'SUCCESS_ID');
    if(!match||match[1]!==approved)throw Error('رابط التقرير لا يطابق إعدادات أداة الربط');
    var url=props.getProperty('SUPABASE_URL'),key=props.getProperty('SUPABASE_PUBLISHABLE_KEY');
    if(!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url||'')||!key)throw Error('أكمل إعدادات Supabase');
    function read(path){var response=UrlFetchApp.fetch(url+'/rest/v1/'+path,{headers:{apikey:key,Authorization:'Bearer '+p.token},muteHttpExceptions:true});if(response.getResponseCode()!==200)throw Error('تعذر قراءة البيانات؛ سجل الدخول مجددًا وتأكد من صلاحيات الحساب');return JSON.parse(response.getContentText());}
    var worksheet=p.sheet||'00000000-0000-0000-0000-000000000001';
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(worksheet))throw Error('معرّف الشيت غير صالح');
    var sheets=read('ibta_trainee_sheets?select=cells&owner_id=eq.'+encodeURIComponent(p.owner)+'&sheet_id=eq.'+encodeURIComponent(worksheet));
    if(sheets.length!==1)throw Error('جدول المتدربين غير موجود أو غير مسموح لحسابك');
    var sourceCells=sheets[0].cells;
    var codes=[],offset=0;
    do{var batch=read('ibta_codes?select=code,used_at,used_on&owner_id=eq.'+encodeURIComponent(p.owner)+'&used_on=not.is.null&order=code&limit=1000&offset='+offset);codes=codes.concat(batch);offset+=batch.length;}while(batch.length===1000);
    var normalize=v=>String(v||'').trim().toUpperCase(),lookup=new Map();
    codes.forEach(c=>{var date=c.used_at?Utilities.formatDate(new Date(c.used_at),'Asia/Riyadh','yyyy-MM-dd'):String(c.used_on||'').split('/').reverse().join('-');if(date===p.date)lookup.set(normalize(c.code),c);});
    var attempts=sourceCells.filter(r=>lookup.has(normalize(r[0]))),seen=new Set();
    attempts.forEach(r=>{var id=normalize(r[0]);if(seen.has(id))throw Error('نفس Voucher موجود في أكثر من صف؛ صحح التكرار أولًا');seen.add(id);});
    var missing=codes.filter(c=>lookup.has(normalize(c.code))&&!seen.has(normalize(c.code))).length;
    if(p.kind==='success')attempts=attempts.filter(r=>r[11]==='ناجح');
    lock.waitLock(30000);
    var book=SpreadsheetApp.openById(approved),tabName=props.getProperty(p.kind==='operations'?'OPERATIONS_TAB':'SUCCESS_TAB'),tab=tabName?book.getSheetByName(tabName):book.getSheets()[0];
    if(!tab)throw Error('تبويب التقرير غير موجود: '+tabName+'؛ راجع اسم التبويب في '+(p.kind==='operations'?'OPERATIONS_TAB':'SUCCESS_TAB'));
    var header=Number(props.getProperty('HEADER_ROW')||1),last=tab.getLastRow(),width=tab.getLastColumn();
    if(!Number.isInteger(header)||header<1||header>tab.getMaxRows())throw Error('HEADER_ROW يجب أن يكون رقم صف العناوين داخل التقرير');
    var location='التبويب «'+tab.getName()+'»، الصف '+header;
    if(width<1)throw Error('التقرير فارغ في '+location+'؛ أضف عناوين التقرير أو حدد التبويب الصحيح');
    var headings=tab.getRange(header,1,1,width).getDisplayValues()[0];
    var voucher=headings.findIndex(h=>headerKey(h)==='voucher');
    if(voucher<0)throw Error('لم أجد عمود VOUCHER في '+location+'؛ تأكد من HEADER_ROW و'+(p.kind==='operations'?'OPERATIONS_TAB':'SUCCESS_TAB')+' (بدون اسم تبويب يُستخدم أول تبويب في الملف)');
    var existing=new Set(last>header?tab.getRange(header+1,voucher+1,last-header,1).getDisplayValues().flat().map(normalize):[]);
    var fresh=attempts.filter(r=>!existing.has(normalize(r[0])));
    function headerKey(h){return String(h).replace(/[\s\u200b-\u200f\u061c\ufeff_\u0640\u064b-\u065f\u0670]/g,'').replace(/[أإآٱ]/g,'ا').toLowerCase();}
    var mapping={'voucher':0,'الإيميل':1,'الايميل':1,'البريدالإلكتروني':1,'الاسمباللغةالعربية':2,'الاسمبالعربي':2,'الاسمباللغةالإنجليزية':3,'الاسمباللغةالانجليزية':3,'الاسمبالإنجليزي':3,'رقمالهوية/الإقامة':4,'رقمالهوية/الاقامة':4,'رقمالهوية':4,'رقمالهاتف':5,'رقمالجوال':5,'الجوال':5,'الجهة':6,'الإختبار':7,'الاختبار':7,'الحالة':11};
    var normalizedMapping={};Object.keys(mapping).forEach(h=>normalizedMapping[headerKey(h)]=mapping[h]);mapping=normalizedMapping;
    var required=p.kind==='success'?[0,2,11]:[0,1,2,3,4,5,6,7,11];
    var mapped=headings.map(h=>mapping[headerKey(h)]);
    var columnNames={0:'VOUCHER',1:'الإيميل',2:'الاسم باللغة العربية',3:'الاسم باللغة الإنجليزية',4:'رقم الهوية / الإقامة',5:'رقم الجوال',6:'الجهة',7:'الإختبار',11:'الحالة'},missingColumns=required.filter(c=>!mapped.includes(c)).map(c=>columnNames[c]);
    if(!headings.some(h=>headerKey(h)==='تاريخالاختبار'))missingColumns.push('تاريخ الإختبار');
    if(missingColumns.length)throw Error('أعمدة التقرير المطلوبة غير الموجودة في '+location+': '+missingColumns.join('، '));
    var values=fresh.map(r=>headings.map(h=>{var k=headerKey(h);if(k==='تاريخالاختبار')return p.date.split('-').reverse().join('/');return mapping[k]===undefined?'':String(r[mapping[k]]||'');}));
    if(values.length){var start=Math.max(last+1,header+1),end=start+values.length-1;if(end>tab.getMaxRows())tab.insertRowsAfter(tab.getMaxRows(),end-tab.getMaxRows());
      var range=tab.getRange(start,1,values.length,width);
      if(last>header){var template=tab.getRange(last,1,1,width);template.copyTo(range,SpreadsheetApp.CopyPasteType.PASTE_FORMAT,false);template.copyTo(range,SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION,false);}
      range.setNumberFormat('@');
      // Escape formula-like values before writing imported text.
      range.setValues(values.map(r=>r.map(v=>/^[=+\-@]/.test(v)?"'"+v:v)));
      SpreadsheetApp.flush();
    }
    return reportPage('تمت إضافة '+fresh.length+' محاولة. الموجود مسبقًا: '+(attempts.length-fresh.length)+'. أكواد بدون بيانات متدرب: '+missing+'.');
  }catch(error){return reportPage('لم يكتمل الرفع: '+error.message);}finally{if(lock.hasLock())lock.releaseLock();}
}
function reportPage(message){return HtmlService.createHtmlOutput('<html dir="rtl"><meta charset="utf-8"><h2>تقرير الاختبارات</h2><p>'+String(message).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'</p><p>يمكنك إغلاق هذه النافذة والعودة للموقع.</p></html>');}
