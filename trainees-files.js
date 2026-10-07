const TraineeFiles=(()=>{
  'use strict';
  function mount(h){
    const {D,$,tr,node,text,action}=h;
    let importWorker=null,exportWorker=null,preview=null,selectedOwner='',generation=0,sequence=0;
    const jobs=new Map();
    const workerUrl=()=>document.getElementById('sheet-files-script').dataset.worker;
    const createWorker=()=>{const worker=new Worker(workerUrl());worker.onmessage=({data})=>{const job=jobs.get(data.id);if(!job)return;jobs.delete(data.id);data.error?job.reject(Error(data.error)):job.resolve(data.result);};worker.onerror=()=>{for(const [id,job]of jobs)if(job.worker===worker){jobs.delete(id);job.reject(Error('INVALID_XLSX'));}};return worker;};
    const stop=worker=>{if(!worker)return;worker.terminate();for(const [id,job]of jobs)if(job.worker===worker){jobs.delete(id);job.reject(Error('CANCELLED'));}};
    const request=(worker,action,payload={},transfer=[])=>new Promise((resolve,reject)=>{const id=++sequence;jobs.set(id,{worker,resolve,reject});worker.postMessage({id,action,...payload},transfer);});
    const errors={SHEET_LIMIT:['الملف يتجاوز مليون صف أو 500 عمود.','File exceeds one million rows or 500 columns.'],CELL_LIMIT:['توجد خلية تتجاوز 2000 حرف.','A cell exceeds 2,000 characters.'],HEADER_MAPPING:['تعذر مطابقة عناوين الأعمدة أو تكررت عناوينها.','Column headers could not be matched or contain duplicates.'],FORMULA_RESULT:['احفظ الملف في Excel لحساب المعادلات ثم أعد استيراده.','Save the file in Excel to calculate formulas, then import it again.'],CELL_ERROR:['الملف يحتوي على خلية بها خطأ Excel.','The file contains an Excel cell error.'],FILE_SIZE:['حجم الملف يتجاوز 20 ميجابايت.','File exceeds 20 MB.']};
    const errorText=error=>tr(...(errors[error.message]||['تعذر قراءة ملف Excel. اختر ملف XLSX صالحًا.','Could not read this Excel file. Choose a valid XLSX file.']));
    const dialog=$('sheet-xlsx-dialog');window.WorkspaceViews.excelDialog(dialog);
    const closeButton=$('sheet-xlsx-close'),title=$('sheet-xlsx-title'),fileCaption=$('sheet-xlsx-file-caption'),file=$('sheet-xlsx-file'),modeCaption=$('sheet-xlsx-mode-caption'),importMode=$('sheet-xlsx-mode'),modeHint=$('sheet-xlsx-mode-hint'),sheetCaption=$('sheet-xlsx-sheet-caption'),sheetSelect=$('sheet-xlsx-sheet'),sheetLabel=$('sheet-xlsx-sheet-label'),headersLabel=$('sheet-xlsx-headers-label'),headers=$('sheet-xlsx-headers'),headersCaption=$('sheet-xlsx-headers-caption'),status=$('sheet-xlsx-status'),grid=$('sheet-xlsx-preview'),apply=$('sheet-xlsx-apply');
    text(closeButton,'إغلاق','Close');closeButton.onclick=()=>dialog.close();
    function translate(){title.textContent=tr('استيراد بيانات الجدول من Excel','Import table data from Excel');fileCaption.textContent=tr('ملف Excel بصيغة XLSX','Excel file (.xlsx)');sheetCaption.textContent=tr('ورقة البيانات','Worksheet');headersCaption.textContent=tr('الصف الأول يحتوي على عناوين الأعمدة','First row contains column headers');modeCaption.textContent=tr('طريقة الاستيراد','Import method');const selected=importMode.value;window.WorkspaceViews.options(importMode,{options:[{value:'',label:tr('اختر طريقة الاستيراد','Choose import method')},{value:'append',label:tr('الإضافة إلى الشيت الحالي','Append to current sheet')},{value:'new',label:tr('بدء شيت جديد ببيانات الملف','Start a new sheet with this file')}]});importMode.value=selected;updateMode();if(preview)renderPreview();}
    function updateMode(){const fresh=importMode.value==='new';modeHint.textContent=fresh?tr('سينشئ شيت مستقل ببيانات الملف مع الاحتفاظ بالشيت الحالي.','This creates a separate worksheet with the file data and keeps the current worksheet.'):importMode.value==='append'?tr('ستضاف بيانات الملف بعد آخر صف به بيانات، مع الاحتفاظ بالشيت الحالي.','File rows will be added after the last populated row, keeping the current sheet.'):tr('اختر الإضافة للشيت الحالي أو البدء من جديد. لن تتغير البيانات أثناء المعاينة.','Choose append or start fresh. Previewing does not change your data.');apply.textContent=fresh?tr('بدء الشيت ببيانات الملف','Start sheet with file data'):tr('إضافة الصفوف إلى نهاية الجدول','Append rows to the table');}
    function prepareImport(s){const fresh=importMode.value==='new';return TraineeXlsx.prepare(preview.rows,headers.checked,fresh?s.importLabels:s.labels,fresh?{}:s.formatting.headers);}
    function renderPreview(){
      apply.disabled=true;window.WorkspaceViews.preview(grid,{headings:[],rows:[]});if(!preview)return;
      try{
        const s=h.state(),prepared=prepareImport(s);
        if(!prepared.rows.length){status.textContent=tr('ورقة البيانات فارغة.','This worksheet is empty.');return;}
        status.textContent=preview.name+' · '+prepared.rows.length+tr(' صف · ',' rows · ')+preview.width+tr(' عمود.',' columns.');
        window.WorkspaceViews.preview(grid,{headings:Array.from({length:Math.min(12,prepared.width)},(_,column)=>headers.checked?preview.rows[0][column]:tr(...(s.labels[column]||[D.letter(column),D.letter(column)]))),rows:prepared.rows.slice(0,5).map(row=>row.map(cell=>(cell||'').slice(0,120)))});apply.disabled=!importMode.value;
      }catch(error){status.textContent=errorText(error);}
    }
    function showResult(result){preview=result;window.WorkspaceViews.options(sheetSelect,{options:result.sheets.map((name,index)=>({label:name,value:String(index)}))});sheetSelect.value=String(result.index||0);sheetLabel.hidden=result.sheets.length<2;headersLabel.hidden=false;headers.checked=TraineeXlsx.detectHeaders(result.rows,h.state().labels);renderPreview();}
    file.onchange=async()=>{
      const chosen=file.files?.[0],token=++generation;stop(importWorker);importWorker=null;preview=null;apply.disabled=true;window.WorkspaceViews.preview(grid,{headings:[],rows:[]});sheetLabel.hidden=headersLabel.hidden=true;if(!chosen)return;
      status.textContent=tr('جارٍ قراءة ملف Excel…','Reading Excel file…');
      try{
        if(!/\.xlsx$/i.test(chosen.name))throw Error('INVALID_XLSX');if(chosen.size>20000000)throw Error('FILE_SIZE');
        const buffer=await chosen.arrayBuffer();if(token!==generation||!dialog.open)return;importWorker=createWorker();const result=await request(importWorker,'read',{buffer},[buffer]);
        if(token!==generation||!dialog.open||h.state().owner!==selectedOwner)return;showResult(result);
      }catch(error){if(token===generation&&error.message!=='CANCELLED')status.textContent=errorText(error);}
    };
    sheetSelect.onchange=async()=>{const token=++generation,index=Number(sheetSelect.value);apply.disabled=true;status.textContent=tr('جارٍ قراءة الورقة…','Reading worksheet…');try{const result=await request(importWorker,'select',{index});if(token===generation&&dialog.open)showResult({...result,index});}catch(error){if(token===generation)status.textContent=errorText(error);}};
    headers.onchange=renderPreview;
    importMode.onchange=()=>{updateMode();renderPreview();};
    apply.onclick=async()=>{
      if(apply.disabled||!preview)return;const s=h.state();if(!s.loaded||s.owner!==selectedOwner){dialog.close();return;}
      try{
        const prepared=prepareImport(s),fresh=importMode.value==='new';let start=fresh?0:s.cells.length;while(start&&!s.cells[start-1].some(Boolean))start--;
        if(start+prepared.rows.length>D.MAX_ROWS)throw Error('SHEET_LIMIT');
        const fmt=fresh?D.defaultFormat():D.format(s.formatting);Object.assign(fmt.headers,prepared.headers);const next=D.pasteMapped(fresh?[]:s.cells,prepared.rows,start,prepared.targets);if(fresh){if(!await h.newSheet(next,fmt))return;}else h.change(next,true,fmt);
        dialog.close();h.message(()=>(fresh?tr('تم بدء الشيت بـ','Sheet started with '):tr('تمت إضافة ','Added '))+prepared.rows.length+tr(' صفًا. يمكنك التراجع باستخدام Ctrl+Z.',' rows. You can undo with Ctrl+Z.'));
      }catch(error){status.textContent=errorText(error);}
    };
    dialog.addEventListener('close',()=>{generation++;stop(importWorker);importWorker=null;preview=null;file.value='';window.WorkspaceViews.preview(grid,{headings:[],rows:[]});status.textContent='';window.WorkspaceViews.options(sheetSelect,{options:[]});apply.disabled=true;});
    const exportButton=action('sheet-xlsx-export','تصدير Excel','Export Excel',async()=>{
      if(exportWorker)return;const owner=h.state().owner;exportButton.disabled=true;
      try{
        const s=h.state();if(!s.loaded||s.owner!==owner)return;h.message(()=>tr('جارٍ تجهيز ملف Excel…','Preparing Excel file…'));exportWorker=createWorker();
        const result=await request(exportWorker,'write',{cells:s.cells,headers:s.labels.map(pair=>tr(...pair)),format:s.formatting});
        if(!h.state().loaded||h.state().owner!==owner)return;
        const url=URL.createObjectURL(new Blob([result.buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})),a=node('a',undefined,{href:url,download:'trainees.xlsx'});a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);h.message(()=>tr('تم تصدير بيانات الجدول إلى Excel.','Table data exported to Excel.'));
      }catch(error){if(error.message!=='CANCELLED'&&h.state().owner===owner)h.message(()=>errorText(error),true);}finally{stop(exportWorker);exportWorker=null;exportButton.disabled=false;}
    });
    const importButton=action('sheet-xlsx-import','استيراد Excel','Import Excel',()=>{selectedOwner=h.state().owner;importMode.value='';updateMode();apply.disabled=true;status.textContent=tr('اختر ملفًا لمعاينته.','Choose a file to preview.');sheetLabel.hidden=headersLabel.hidden=true;dialog.showModal();});
    translate();
    return {translate,close(){generation++;dialog.close();stop(importWorker);stop(exportWorker);importWorker=exportWorker=null;preview=null;window.WorkspaceViews.preview(grid,{headings:[],rows:[]});status.textContent='';}};
  }
  return {mount};
})();
