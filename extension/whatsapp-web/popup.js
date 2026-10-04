const $=id=>document.getElementById(id);
function paint(data){
  if(!data||data.connected!==true||typeof data.enabled!=='boolean')throw Error(data?.error||'لم يصل رد صالح من الإضافة');
  const label={preparing:'جارٍ فتح واتساب',sending:'جارٍ إرسال الرسالة',sent:'ظهرت الرسالة كصادرة في واتساب. راجع حالة وصولها في المحادثة.',failed:'لم يتم الإرسال',unknown:'نتيجة الإرسال غير مؤكدة. راجع المحادثة.'};
  $('status').textContent=data.enabled?'مفعّل الساعة '+data.time+' بتوقيت السعودية':'متوقف على هذا الجهاز';
  if(data.last)$('status').textContent+='\n'+(label[data.last.state]||data.last.state)+(data.last.error?' · '+data.last.error:'');
  const next=data.nextSend?new Date(data.nextSend).toLocaleString('ar-SA-u-ca-gregory',{timeZone:'Asia/Riyadh'}):'';
  $('diagnostics').textContent='الإصدار '+chrome.runtime.getManifest().version+(data.recipient?'\nالرقم: '+data.recipient:'')+(next?'\nالموعد التالي: '+next+' بتوقيت السعودية':'')+'\n'+(data.prepared?'تقرير حديث جاهز':'لا يوجد تقرير حديث جاهز');
}
async function request(type){
  $('refresh').disabled=$('stop').disabled=true;$('status').textContent='جارٍ الاتصال بالإضافة…';$('diagnostics').textContent='';let timer;
  try{
    const response=await Promise.race([chrome.runtime.sendMessage({type}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('انتهت مهلة الاتصال بالإضافة')),5000);})]);
    paint(response);
  }catch(error){
    $('status').textContent='تعذر الاتصال بالإضافة. افتح chrome://extensions واضغط Reload ↻، ثم حدّث البرنامج وواتساب.';
    $('diagnostics').textContent='الإصدار '+chrome.runtime.getManifest().version+'\nسبب التعطل: '+String(error?.message||error).slice(0,250);
  }finally{clearTimeout(timer);$('refresh').disabled=$('stop').disabled=false;}
}
$('refresh').onclick=()=>request('REFRESH');
$('stop').onclick=()=>request('STOP');
void request('PING');
