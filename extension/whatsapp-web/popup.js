async function paint(data){const label={preparing:'جارٍ فتح واتساب',sending:'جارٍ إرسال الرسالة',sent:'ظهرت الرسالة كصادرة في واتساب. راجع حالة وصولها في المحادثة.',failed:'لم يتم الإرسال',unknown:'نتيجة الإرسال غير مؤكدة. راجع المحادثة.'};document.getElementById('status').textContent=(data.enabled?'مفعّل الساعة '+data.time+' بتوقيت السعودية':'متوقف على هذا الجهاز')+(data.last?'\n'+(label[data.last.state]||data.last.state)+(data.last.error?' · '+data.last.error):'');}
chrome.runtime.sendMessage({type:'PING'}).then(paint);
document.getElementById('refresh').onclick=()=>chrome.runtime.sendMessage({type:'REFRESH'}).then(paint);
document.getElementById('stop').onclick=()=>chrome.runtime.sendMessage({type:'STOP'}).then(paint);
