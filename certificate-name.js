/* Certificate corrections use the selected trainee; passwords are never exported. */
const TraineeCertificate=(()=>{
  'use strict';
  const HEADERS=['Student Name (as Entered During the Test):','Student User name','Exam Title','Exam Voucher Number','Exam Date','Grade Achieved','New Name to be typed on the Certificate (if changed):','ATP/ATC/Cenetr Name'];
  const CENTER='Al-Alameya For Business Solutions',SOURCE=[3,9,7,0,8,11];
  const digits=value=>String(value||'').replace(/[٠-٩۰-۹]/g,c=>String(c.charCodeAt(0)-(c<='٩'?1632:1776)));
  function examDate(value){
    const text=digits(value).trim(),match=text.match(/(?:^|\D)(\d{4})-(\d{1,2})-(\d{1,2})(?!\d)/);
    if(!match)return {display:text,iso:''};
    const [,year,month,day]=match,date=new Date(Date.UTC(+year,+month-1,+day));
    if(date.getUTCFullYear()!==+year||date.getUTCMonth()!==+month-1||date.getUTCDate()!==+day)return {display:text,iso:''};
    return {display:`${+month}/${+day}/${year}`,iso:`${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`};
  }
  function prepare(row,catalog,D){
    const exam=D.courseKeycode(row?.[7],catalog),title=String(exam?.title||'').trim(),rawLanguage=String(exam?.lang||'').trim();
    const language=/^(arabic|ar|العربية|عربي)$/i.test(rawLanguage)?'Arabic':/^(english|en|الإنجليزية|انجليزي)$/i.test(rawLanguage)?'English':rawLanguage;
    const examTitle=title&&language&&!title.toLowerCase().endsWith(' '+language.toLowerCase())?title+' '+language:title;
    const result=String(row?.[11]||'').trim(),grade={'ناجح':'Pass','راسب':'Fail','لم يدخل':'Absent'}[result]||result;
    return {values:[row?.[3]||'',row?.[9]||'',examTitle,row?.[0]||'',examDate(row?.[8]).display,grade,'',CENTER],dateISO:examDate(row?.[8]).iso,matched:!!exam&&!!title,fingerprint:JSON.stringify(SOURCE.map(c=>row?.[c]||''))};
  }
  function complete(plan,newName,percentage){
    const values=[...plan.values],name=String(newName||'').trim(),score=digits(percentage).trim();
    if(!plan.matched)throw Error('EXAM');
    if([0,1,3,4].some(c=>!values[c].trim()))throw Error('MISSING');
    if(!name||name.length>2000)throw Error('NAME');
    if(score!==''&&(!/^\d+(?:\.\d+)?$/.test(score)||+score>100))throw Error('SCORE');
    values[6]=name;if(score!=='')values[5]=(values[5]?values[5]+' ':'')+'( '+Number(score)+'% )';
    return {headers:HEADERS,values,dateISO:plan.dateISO};
  }
  function mount(h){
    const {D,$,tr,node,button}=h;
    let context=null,plan=null,worker=null,cancel=null,generation=0,busy=false;
    const dialog=node('dialog',undefined,{id:'sheet-certificate-dialog',class:'sheet-file-dialog sheet-certificate-dialog','aria-labelledby':'sheet-certificate-title'}),head=node('div',undefined,{class:'sheet-file-header'}),title=node('h3','',{id:'sheet-certificate-title'}),close=button('×',()=>dialog.close());head.append(title,close);
    const hint=node('p','',{id:'sheet-certificate-hint'}),form=node('form',undefined,{class:'sheet-certificate-fields'}),inputs=HEADERS.map((text,c)=>{const label=node('label',text,{dir:'ltr'}),input=node('input',undefined,{id:'sheet-certificate-field-'+c,type:'text',dir:'ltr','aria-label':text,maxlength:'2000'});input.readOnly=c!==6;label.append(input);form.append(label);return input;});
    inputs[6].required=true;inputs[6].autocomplete='off';
    const scoreLabel=node('label'),score=node('input',undefined,{id:'sheet-certificate-score',type:'text',inputmode:'decimal',dir:'ltr',maxlength:'8'}),scoreText=node('span');scoreLabel.append(scoreText,score);form.append(scoreLabel);
    const download=button('',exportFile,'sheet-primary');download.id='sheet-certificate-export';download.type='submit';form.append(download);
    const status=node('p','',{id:'sheet-certificate-status',role:'status'});dialog.append(head,hint,form,status);document.body.append(dialog);
    const openButton=button('',open);openButton.id='sheet-certificate-open';$('sheet-workspace').querySelector('.sheet-ribbon-top .sheet-ribbon-actions').append(openButton);
    const errorText=code=>({EXAM:tr('الدورة غير مطابقة لاختبار واحد في Keycodes. راجع الدورة وبيانات Keycodes.','Course does not match a single exam in Keycodes. Check the course and Keycodes.'),MISSING:tr('أكمل الاسم الإنجليزي واليوزر ورقم الفاوتشر وتاريخ الاختبار في صف المتدرب أولًا.','Complete the trainee’s English name, username, voucher and exam date in the sheet first.'),NAME:tr('اكتب الاسم الجديد المطلوب على الشهادة.','Enter the new certificate name.'),SCORE:tr('النسبة اختيارية، ويجب أن تكون من 0 إلى 100.','Percentage is optional and must be between 0 and 100.'),OUTDATED:tr('تغيّرت بيانات المتدرب. أغلق النافذة وافتحها من الصف المطلوب مجددًا.','Trainee data changed. Close this window and reopen it from the required row.')}[code]||tr('تعذر تجهيز الملف. حاول مجددًا.','Could not prepare the file. Please retry.'));
    function same(){const s=h.state();if(!context||!s.loaded||s.owner!==context.owner||s.epoch!==context.epoch)return false;const current=prepare(s.cells[context.row],h.catalog(),D);return current.fingerprint===plan?.fingerprint&&current.values[2]===plan?.values[2]&&current.matched===plan?.matched;}
    function translate(){title.textContent=tr('تعديل اسم الشهادة','Certificate name change');openButton.textContent=title.textContent;close.setAttribute('aria-label',tr('إغلاق','Close'));download.textContent=tr('تحميل ملف Excel','Download Excel');scoreText.textContent=tr('نسبة الدرجة % (اختياري)','Score percentage % (optional)');score.setAttribute('aria-label',scoreText.textContent);if(context)hint.textContent=tr('بيانات الصف ','Data from row ')+(context.row+1)+tr(' — الاسم الجديد يُضاف للملف فقط.',' — the new name is added to the file only.');dialog.dir=typeof currentLang!=='undefined'&&currentLang==='en'?'ltr':'rtl';}
    function validate(show=false){try{if(!same())throw Error('OUTDATED');const data=complete(plan,inputs[6].value,score.value);inputs[5].value=data.values[5];download.disabled=busy;if(show)status.textContent='';return data;}catch(error){inputs[5].value=plan?.values[5]||'';download.disabled=true;if(show||!['NAME'].includes(error.message))status.textContent=errorText(error.message);return null;}}
    function open(){h.commitEdit();const s=h.state(),index=s.view[s.cursor.r],row=s.cells[index];if(!s.loaded||!row?.[3]?.trim()){h.message(tr('حدد صف متدرب له اسم باللغة الإنجليزية أولًا.','Select a trainee row with an English name first.'),true);return;}if(dialog.open)dialog.close();context={owner:s.owner,epoch:s.epoch,row:index};plan=prepare(row,h.catalog(),D);inputs.forEach((input,c)=>input.value=plan.values[c]);score.value='';status.textContent='';busy=false;translate();dialog.showModal();validate();inputs[6].focus();}
    async function exportFile(event){event?.preventDefault();if(busy)return;const data=validate(true);if(!data)return;busy=true;download.disabled=true;inputs[6].disabled=score.disabled=true;status.textContent=tr('جارٍ تجهيز ملف Excel…','Preparing Excel file…');const token=++generation;
      try{const result=await new Promise((resolve,reject)=>{worker=new Worker($('sheet-files-script')?.dataset.worker||'trainees-xlsx-worker.js');const timer=setTimeout(()=>reject(Error('WORKER')),60000);cancel=()=>{clearTimeout(timer);reject(Error('CANCELLED'));};worker.onmessage=({data:reply})=>{clearTimeout(timer);reply.error?reject(Error(reply.error)):resolve(reply.result);};worker.onerror=()=>{clearTimeout(timer);reject(Error('WORKER'));};worker.postMessage({id:token,action:'certificate',...data});});
        if(token!==generation||!dialog.open)return;if(!same())throw Error('OUTDATED');
        const url=URL.createObjectURL(new Blob([result.buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})),link=node('a',undefined,{href:url,download:'Certificate Data Change Sheet.xlsx'});document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent=tr('تم تجهيز الملف. الاسم الأصلي في الجدول لم يتغير.','File prepared. The original sheet name is unchanged.');
      }catch(error){if(token===generation&&dialog.open)status.textContent=errorText(error.message);}
      finally{if(token===generation){worker?.terminate();worker=null;cancel=null;busy=false;inputs[6].disabled=score.disabled=false;validate();}}
    }
    form.onsubmit=exportFile;[inputs[6],score].forEach(input=>input.addEventListener('input',()=>{status.textContent='';validate();}));
    function clear(){generation++;cancel?.();worker?.terminate();worker=null;cancel=null;context=plan=null;busy=false;inputs.forEach(input=>input.value='');inputs[6].disabled=score.disabled=false;score.value='';status.textContent=hint.textContent='';download.disabled=true;}
    dialog.addEventListener('close',clear);dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
    translate();return {open,translate,reset(){dialog.close();clear();}};
  }
  const api={HEADERS,CENTER,examDate,prepare,complete,mount};if(typeof module!=='undefined')module.exports=api;return api;
})();
