/* Worksheet tabs and workbook actions use the same save-before-switch path. */
const TraineeSheets=(()=>{
  'use strict';
  function mount(h){
    const {$,tr}=h,tabs=$('sheet-worksheet-tabs'),dialog=$('sheet-worksheet-dialog');
    window.WorkspaceViews.worksheetDialog(dialog);
    const title=$('sheet-worksheet-title'),name=$('sheet-worksheet-name'),target=$('sheet-worksheet-target'),copy=$('sheet-worksheet-copy'),color=$('sheet-worksheet-color'),clearColor=$('sheet-worksheet-clear-color'),status=$('sheet-worksheet-status'),cancel=$('sheet-worksheet-cancel'),apply=$('sheet-worksheet-apply'),copyLabel=copy.parentElement,clearLabel=clearColor.parentElement,copyCaption=$('sheet-worksheet-copy-caption'),clearCaption=$('sheet-worksheet-clear-caption');
    cancel.onclick=()=>dialog.close();apply.onclick=save;
    let mode='',identity='',busy=false;const labels={create:['إدراج شيت جديد','Insert Sheet'],delete:['حذف الشيت','Delete Sheet'],rename:['إعادة تسمية الشيت','Rename Sheet'],move:['نقل أو نسخ الشيت','Move or Copy Sheet'],hide:['إخفاء الشيت','Hide Sheet'],show:['إظهار شيت','Unhide Sheet'],color:['لون تبويب الشيت','Tab Color']};
    function translate(){cancel.textContent=tr('إلغاء','Cancel');apply.textContent=tr('تطبيق','Apply');copyCaption.textContent=tr('إنشاء نسخة مستقلة','Create a copy');clearCaption.textContent=tr('بدون لون','No color');name.setAttribute('aria-label',tr('اسم الشيت','Sheet name'));target.setAttribute('aria-label',tr('الشيت / الموضع','Worksheet / position'));color.setAttribute('aria-label',tr('لون التبويب','Tab color'));if(mode)title.textContent=tr(...labels[mode]);paint();}
    function paint(){const s=h.state();window.WorkspaceViews.worksheetTabs(tabs,{sheets:s.worksheets.filter(sheet=>!sheet.sheet_hidden),selected:s.sheetId,loaded:s.loaded,addLabel:tr('إدراج شيت جديد','Insert Sheet'),add:()=>open('create'),choose:id=>{if(id!==h.state().sheetId)void h.switchSheet(id);},rename:id=>{if(id===h.state().sheetId)open('rename');}});}
    function open(action){const s=h.state();if(!s.loaded)return;mode=action;identity=s.owner+':'+s.sheetId;const active=s.worksheets.find(x=>x.sheet_id===s.sheetId);name.value=action==='create'?'Sheet '+(s.worksheets.length+1):active?.sheet_name||'Sheet 1';copy.checked=false;color.value=active?.tab_color||'#0070f3';clearColor.checked=false;status.textContent='';window.WorkspaceViews.options(target,{options:action==='show'?s.worksheets.filter(sheet=>sheet.sheet_hidden).map(sheet=>({value:sheet.sheet_id,label:sheet.sheet_name})):action==='move'?[...s.worksheets.map(sheet=>({value:sheet.sheet_id,label:tr('قبل: ','Before: ')+sheet.sheet_name})),{value:'end',label:tr('النقل إلى النهاية','Move to end')}]:[]});
      if(action==='show'&&!target.options.length)status.textContent=tr('لا توجد شيتات مخفية.','There are no hidden worksheets.');if(action==='move')target.value='end';
      name.hidden=!['create','rename','move'].includes(action);target.hidden=!['move','show'].includes(action);copyLabel.hidden=action!=='move';color.hidden=clearLabel.hidden=action!=='color';apply.disabled=action==='show'&&!target.options.length;
      if(action==='delete')status.textContent=tr('سيُحذف هذا الشيت بكل بياناته وتنسيقه. الحذف لا يمكن التراجع عنه. احتفظ بنسخة احتياطية إذا احتجتها.','This worksheet and its data and formatting will be deleted. This cannot be undone. Keep a backup if needed.');
      if(action==='hide')status.textContent=tr('يمكن إظهار الشيت لاحقًا من Format.','You can unhide this worksheet later from Format.');translate();dialog.showModal();(name.hidden?apply:name).focus();if(!name.hidden)name.select();}
    async function save(){if(busy||apply.disabled)return;const s=h.state();if(identity!==s.owner+':'+s.sheetId||!s.loaded){dialog.close();return;}if(!name.hidden&&!name.value.trim()){name.reportValidity();name.focus();return;}busy=true;apply.disabled=true;cancel.disabled=true;
      try{let action=mode,options={};if(['create','rename'].includes(mode))options.name=name.value.trim();if(mode==='show')options.sheetId=target.value;if(mode==='color')options.color=clearColor.checked?null:color.value;
        if(mode==='move'){action=copy.checked?'copy':'move';if(copy.checked)options.name=name.value.trim();const before=s.worksheets.find(x=>x.sheet_id===target.value);options.order=before?before.sheet_order-1:Math.max(0,...s.worksheets.map(x=>x.sheet_order))+1;}
        if(await h.action(action,options))dialog.close();else status.textContent=tr('تعذر تنفيذ العملية؛ راجع رسالة الجدول.','Could not complete the action; check the sheet status.');
      }finally{busy=false;apply.disabled=false;cancel.disabled=false;}}
    copy.onchange=()=>{const s=h.state(),active=s.worksheets.find(x=>x.sheet_id===s.sheetId);name.value=(active?.sheet_name||'Sheet')+(copy.checked?' (Copy)':'');};dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});translate();return {open,paint,translate,close:()=>dialog.close()};
  }
  return {mount};
})();
