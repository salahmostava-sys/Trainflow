const TraineeFiles=(()=>{
  'use strict';
  function mount(h){
    const {D,$,tr,node,button,host,text,action}=h;
    let importWorker=null,exportWorker=null,preview=null,selectedOwner='',generation=0,sequence=0;
    const jobs=new Map();
    const workerUrl=()=>document.getElementById('sheet-files-script').dataset.worker;
    const createWorker=()=>{const worker=new Worker(workerUrl());worker.onmessage=({data})=>{const job=jobs.get(data.id);if(!job)return;jobs.delete(data.id);data.error?job.reject(Error(data.error)):job.resolve(data.result);};worker.onerror=()=>{for(const [id,job]of jobs)if(job.worker===worker){jobs.delete(id);job.reject(Error('INVALID_XLSX'));}};return worker;};
    const stop=worker=>{if(!worker)return;worker.terminate();for(const [id,job]of jobs)if(job.worker===worker){jobs.delete(id);job.reject(Error('CANCELLED'));}};
    const request=(worker,action,payload={},transfer=[])=>new Promise((resolve,reject)=>{const id=++sequence;jobs.set(id,{worker,resolve,reject});worker.postMessage({id,action,...payload},transfer);});
    const errors={SHEET_LIMIT:['الملف يتجاوز مليون صف أو 500 عمود.','File exceeds one million rows or 500 columns.'],CELL_LIMIT:['توجد خلية تتجاوز 2000 حرف.','A cell exceeds 2,000 characters.'],HEADER_MAPPING:['تعذر مطابقة عناوين الأعمدة أو تكررت عناوينها.','Column headers could not be matched or contain duplicates.'],FORMULA_RESULT:['احفظ الملف في Excel لحساب المعادلات ثم أعد استيراده.','Save the file in Excel to calculate formulas, then import it again.'],CELL_ERROR:['الملف يحتوي على خلية بها خطأ Excel.','The file contains an Excel cell error.'],FILE_SIZE:['حجم الملف يتجاوز 20 ميجابايت.','File exceeds 20 MB.']};
    const errorText=error=>tr(...(errors[error.message]||['تعذر قراءة ملف Excel. اختر ملف XLSX صالحًا.','Could not read this Excel file. Choose a valid XLSX file.']));
    const dialog=node('dialog',undefined,{id:'sheet-xlsx-dialog',class:'sheet-file-dialog','aria-labelledby':'sheet-xlsx-title'});
    const closeButton=text(button('',()=>dialog.close()),'إغلاق','Close'),title=node('h3',undefined,{id:'sheet-xlsx-title'}),header=node('div',undefined,{class:'sheet-file-header'});header.append(title,closeButton);
    const fileLabel=node('label'),fileCaption=node('span'),file=node('input',undefined,{id:'sheet-xlsx-file',type:'file',accept:'.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});fileLabel.append(fileCaption,file);
    const sheetLabel=node('label'),sheetCaption=node('span'),sheetSelect=node('select',undefined,{id:'sheet-xlsx-sheet'});sheetLabel.append(sheetCaption,sheetSelect);sheetLabel.hidden=true;
    const headersLabel=node('label',undefined,{class:'sheet-file-checkbox'}),headers=node('input',undefined,{id:'sheet-xlsx-headers',type:'checkbox'}),headersCaption=node('span');headersLabel.append(headers,headersCaption);headersLabel.hidden=true;
    const status=node('p',undefined,{id:'sheet-xlsx-status',role:'status','aria-live':'polite'}),grid=node('div',undefined,{id:'sheet-xlsx-preview',class:'sheet-file-preview'});
    const apply=node('button',undefined,{id:'sheet-xlsx-apply',type:'button',class:'sheet-primary'});apply.disabled=true;
    dialog.append(header,fileLabel,sheetLabel,headersLabel,status,grid,apply);document.body.append(dialog);
    function translate(){title.textContent=tr('استيراد بيانات الجدول من Excel','Import table data from Excel');fileCaption.textContent=tr('ملف Excel بصيغة XLSX','Excel file (.xlsx)');sheetCaption.textContent=tr('ورقة البيانات','Worksheet');headersCaption.textContent=tr('الصف الأول يحتوي على عناوين الأعمدة','First row contains column headers');apply.textContent=tr('إضافة الصفوف إلى نهاية الجدول','Append rows to the table');}
    function renderPreview(){
      apply.disabled=true;grid.replaceChildren();if(!preview)return;
      try{
        const s=h.state(),prepared=TraineeXlsx.prepare(preview.rows,headers.checked,s.labels,s.formatting.headers);
        if(!prepared.rows.length){status.textContent=tr('ورقة البيانات فارغة.','This worksheet is empty.');return;}
        status.textContent=preview.name+' · '+prepared.rows.length+tr(' صف · ',' rows · ')+preview.width+tr(' عمود. ستضاف بعد آخر صف به بيانات.',' columns. These rows will be appended after the last populated row.');
        const table=node('table'),thead=node('thead'),headRow=node('tr'),tbody=node('tbody');
        for(let c=0;c<Math.min(12,prepared.width);c++)headRow.append(node('th',headers.checked?preview.rows[0][c]:tr(...(s.labels[c]||[D.letter(c),D.letter(c)]))));thead.append(headRow);
        for(const row of prepared.rows.slice(0,5)){const line=node('tr');for(let c=0;c<Math.min(12,prepared.width);c++)line.append(node('td',(row[c]||'').slice(0,120)));tbody.append(line);}table.append(thead,tbody);grid.append(table);apply.disabled=false;
      }catch(error){status.textContent=errorText(error);}
    }
    function showResult(result){preview=result;sheetSelect.replaceChildren(...result.sheets.map((name,i)=>node('option',name,{value:i})));sheetSelect.value=String(result.index||0);sheetLabel.hidden=result.sheets.length<2;headersLabel.hidden=false;headers.checked=TraineeXlsx.detectHeaders(result.rows,h.state().labels);renderPreview();}
    file.onchange=async()=>{
      const chosen=file.files?.[0],token=++generation;stop(importWorker);importWorker=null;preview=null;apply.disabled=true;grid.replaceChildren();sheetLabel.hidden=headersLabel.hidden=true;if(!chosen)return;
      status.textContent=tr('جارٍ قراءة ملف Excel…','Reading Excel file…');
      try{
        if(!/\.xlsx$/i.test(chosen.name))throw Error('INVALID_XLSX');if(chosen.size>20000000)throw Error('FILE_SIZE');
        const buffer=await chosen.arrayBuffer();if(token!==generation||!dialog.open)return;importWorker=createWorker();const result=await request(importWorker,'read',{buffer},[buffer]);
        if(token!==generation||!dialog.open||h.state().owner!==selectedOwner)return;showResult(result);
      }catch(error){if(token===generation&&error.message!=='CANCELLED')status.textContent=errorText(error);}
    };
    sheetSelect.onchange=async()=>{const token=++generation,index=Number(sheetSelect.value);apply.disabled=true;status.textContent=tr('جارٍ قراءة الورقة…','Reading worksheet…');try{const result=await request(importWorker,'select',{index});if(token===generation&&dialog.open)showResult({...result,index});}catch(error){if(token===generation)status.textContent=errorText(error);}};
    headers.onchange=renderPreview;
    apply.onclick=()=>{
      if(apply.disabled||!preview)return;const s=h.state();if(!s.loaded||s.owner!==selectedOwner){dialog.close();return;}
      try{
        const prepared=TraineeXlsx.prepare(preview.rows,headers.checked,s.labels,s.formatting.headers);let start=s.cells.length;while(start&&!s.cells[start-1].some(Boolean))start--;
        if(start+prepared.rows.length>D.MAX_ROWS)throw Error('SHEET_LIMIT');
        const fmt=D.format(s.formatting);Object.assign(fmt.headers,prepared.headers);h.change(D.pasteMapped(s.cells,prepared.rows,start,prepared.targets),true,fmt);
        dialog.close();h.message(tr('تمت إضافة ','Added ')+prepared.rows.length+tr(' صفًا. يمكنك التراجع باستخدام Ctrl+Z.',' rows. You can undo with Ctrl+Z.'));
      }catch(error){status.textContent=errorText(error);}
    };
    dialog.addEventListener('close',()=>{generation++;stop(importWorker);importWorker=null;preview=null;file.value='';grid.replaceChildren();status.textContent='';sheetSelect.replaceChildren();apply.disabled=true;});
    const exportButton=action('sheet-xlsx-export','تصدير Excel','Export Excel',async()=>{
      if(exportWorker)return;const owner=h.state().owner;exportButton.disabled=true;
      try{
        const s=h.state();if(!s.loaded||s.owner!==owner)return;h.message(tr('جارٍ تجهيز ملف Excel…','Preparing Excel file…'));exportWorker=createWorker();
        const result=await request(exportWorker,'write',{cells:s.cells,headers:s.labels.map(pair=>tr(...pair))});
        if(!h.state().loaded||h.state().owner!==owner)return;
        const url=URL.createObjectURL(new Blob([result.buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})),a=node('a',undefined,{href:url,download:'trainees.xlsx'});a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);h.message(tr('تم تصدير بيانات الجدول إلى Excel.','Table data exported to Excel.'));
      }catch(error){if(error.message!=='CANCELLED'&&h.state().owner===owner)h.message(errorText(error),true);}finally{stop(exportWorker);exportWorker=null;exportButton.disabled=false;}
    });
    const importButton=action('sheet-xlsx-import','استيراد Excel','Import Excel',()=>{selectedOwner=h.state().owner;status.textContent=tr('اختر ملفًا لمعاينته. البيانات الحالية ستظل كما هي.','Choose a file to preview. Existing records will be kept.');sheetLabel.hidden=headersLabel.hidden=true;dialog.showModal();});
    host.prepend(exportButton,importButton);translate();
    return {translate,close(){generation++;dialog.close();stop(importWorker);stop(exportWorker);importWorker=exportWorker=null;preview=null;grid.replaceChildren();status.textContent='';}};
  }
  return {mount};
})();
