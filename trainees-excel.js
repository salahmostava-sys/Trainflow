/* Excel-style actions over the private trainee data model and its undo history. */
const TraineeExcel=(()=>{
  'use strict';
  function mount(h){
    const {D,$,tr}=h;
    const paintLabel=el=>{const label=tr(el.dataset.excelAr,el.dataset.excelEn),menu=el.getAttribute('aria-haspopup')==='menu',split=el.dataset.split==='true';
      window.WorkspaceViews.commandLabel(el,{id:el.id,label,menu,submenu:el.dataset.submenu==='true',split});
      if(split)el.setAttribute('aria-label',tr('خيارات الدمج','Merge options'));else if(menu||el.querySelector('.sheet-command-icon'))el.setAttribute('aria-label',label.replace(/ ▾$/,''));};
    const text=(el,ar,en)=>{el.dataset.excelAr=ar;el.dataset.excelEn=en;paintLabel(el);return el;};
    const action=(id,ar,en,run)=>{const el=$(id);el.onclick=()=>{h.commitEdit();if(!h.state().loaded)return;const fail=error=>h.message(()=>error.message||tr('تعذر تنفيذ العملية','Could not complete the action'),true);try{const result=run();if(result?.catch)result.catch(fail);}catch(error){fail(error);}};return text(el,ar,en);};
    const dropdowns=[];
    const closeMenus=keep=>dropdowns.forEach(({list})=>{if(list.matches(':popover-open')&&(!keep?.nodeType||!list.contains(keep)))list.hidePopover();});
    const dropdown=({id,ar,en,controls,submenu=false})=>{
      const trigger=$(id+'-trigger'),list=$(id+'-items');
      controls.forEach(el=>{if(el.tagName==='BUTTON')el.setAttribute('role','menuitem');});
      text(trigger,ar+' ▾',en+' ▾');
      const place=()=>{
        const a=trigger.getBoundingClientRect(),b=list.getBoundingClientRect(),gap=8;
        const left=submenu?(list.dir==='rtl'?(a.left-b.width-gap>=gap?a.left-b.width-gap:a.right+gap):(a.right+b.width+gap<=innerWidth?a.right+gap:a.left-b.width-gap)):(list.dir==='rtl'?a.right-b.width:a.left);
        list.style.left=Math.max(gap,Math.min(innerWidth-b.width-gap,left))+'px';
        list.style.top=Math.max(gap,Math.min(innerHeight-b.height-gap,submenu?a.top:(a.bottom+b.height+4<=innerHeight?a.bottom+4:a.top-b.height-4)))+'px';
      };
      dropdowns.push({trigger,list,place});
      trigger.onclick=()=>{if(list.matches(':popover-open')){if(!submenu)list.hidePopover();return;}h.commitEdit();closeMenus(trigger);list.dir=document.documentElement.dir==='rtl'?'rtl':'ltr';list.setAttribute('aria-label',trigger.textContent);list.showPopover();place();};
      list.addEventListener('toggle',()=>trigger.setAttribute('aria-expanded',String(list.matches(':popover-open'))));
      list.addEventListener('click',e=>{const target=e.target.closest('button:not(:disabled)');if(target&&!target.hasAttribute('aria-haspopup'))closeMenus();});
      const itemsInMenu=()=>[...list.querySelectorAll('button:not(:disabled)')].filter(el=>el.closest('.sheet-command-popover')===list);
      const focusItem=last=>{const items=itemsInMenu();(last?items.at(-1):items[0])?.focus();};
      if(submenu)trigger.addEventListener('mouseenter',()=>{if(!list.matches(':popover-open'))trigger.click();});
      trigger.addEventListener('keydown',e=>{if(submenu&&e.key===(document.documentElement.dir==='rtl'?'ArrowLeft':'ArrowRight')){e.preventDefault();e.stopPropagation();if(!list.matches(':popover-open'))trigger.click();focusItem(false);return;}if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();if(!list.matches(':popover-open'))trigger.click();focusItem(e.key==='ArrowUp');}});
      list.addEventListener('keydown',e=>{if(e.target.closest('.sheet-command-popover')!==list)return;const items=itemsInMenu(),i=items.indexOf(document.activeElement);if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();e.stopPropagation();items[e.key==='Home'?0:e.key==='End'?items.length-1:(i+(e.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus();}});
    };
    window.addEventListener('resize',closeMenus);document.addEventListener('scroll',e=>{if(!e.target.closest?.('.sheet-command-popover'))for(const item of dropdowns)if(item.list.matches(':popover-open'))item.place();},true);
    const menu=({id,ar,en,items})=>dropdown({id,ar:ar.replace(' ▾',''),en:en.replace(' ▾',''),controls:items.map(([key,a,e,run])=>action(id+'-'+key,a,e,run))});
    const state=()=>h.state(),style=()=>{const s=state();return s.formatting.styles[s.view[s.cursor.r]+':'+s.cursor.c]||{};};
    const ranges=s=>s.ranges||[s.bounds],rows=s=>D.selectionRows(ranges(s),s.view.length).map(r=>s.view[r]),columns=s=>D.selectionColumns(ranges(s),s.cols);
    const mutate=(run)=>{
      const s=state(),cells=s.cells.slice(),fmt=D.format(s.formatting),changed=new Set();
      const rowAt=r=>{while(cells.length<=r)cells.push(D.blank());if(!changed.has(r)){cells[r]=[...cells[r]];changed.add(r);}return cells[r];};
      run(cells,fmt,s,rowAt);h.change(D.normalize(cells),true,fmt);
    };
    const selected=(run)=>mutate((cells,fmt,s,rowAt)=>D.eachSelected(ranges(s),s.view,s.cols,(r,c)=>run(cells,fmt,r,c,s,rowAt)));
    const toggle=field=>h.formatSelection({[field]:!style()[field]});
    const fontName=$('sheet-font-family');fontName.onchange=()=>h.formatSelection({font:fontName.value});
    $('sheet-font-minus').onclick=()=>h.formatSelection({size:Math.max(10,(style().size||state().formatting.fontSize)-1)});$('sheet-font-plus').onclick=()=>h.formatSelection({size:Math.min(32,(style().size||state().formatting.fontSize)+1)});
    for(const [field,ar,en]of [['italic','I','I'],['underline','U','U'],['strike','شطب','Strike']])action('sheet-'+field,ar,en,()=>toggle(field));
    const borderEditor=TraineeBorders.mount(h);
    const borders=type=>selected((cells,fmt,r,c,s)=>{const vr=s.view.indexOf(r),cols=s.cols,at=cols.indexOf(c),key=r+':'+c,old=fmt.styles[key]||{},has=(row,col)=>D.selectedCell(ranges(s),row,col);fmt.styles[key]={...old,border:type,borderTop:null,borderBottom:null,borderLeft:null,borderRight:null};delete fmt.styles[key].borders;if(type==='outline')Object.assign(fmt.styles[key],{border:'none',borderTop:!has(vr-1,c),borderBottom:!has(vr+1,c),borderLeft:!has(vr,cols[at-1]??-1),borderRight:!has(vr,cols[at+1]??D.MAX_COLS)});});
    menu({id:'sheet-border-menu',ar:'حدود ▾',en:'Borders ▾',items:[...['all','outline','none','top','bottom','left','right'].map((v,i)=>[v,['كل الحدود','حدود خارجية','بدون حدود','علوي','سفلي','يسار','يمين'][i],['All borders','Outside borders','No borders','Top','Bottom','Left','Right'][i],()=>borders(v)]),['format','تنسيق الحدود…','Format borders…',()=>{closeMenus();borderEditor.open();}]]});
    for(const [key,ar,en]of [['top','محاذاة لأعلى','Top Align'],['middle','توسيط رأسي','Middle Align'],['bottom','محاذاة لأسفل','Bottom Align']])action('sheet-valign-'+key,ar,en,()=>h.formatSelection({valign:key}));
    action('sheet-wrap-text','التفاف النص','Wrap Text',()=>h.formatSelection({wrap:!(style().wrap??state().wrap)}));
    const merge=async mode=>{
      const s=state();if(ranges(s).length>1){h.message(()=>tr('اختر منطقة واحدة متجاورة للدمج.','Select one contiguous range to merge.'),true);return;}if(s.filtered){h.message(()=>tr('امسح الفلاتر والفرز قبل الدمج.','Clear filters and sorting before merging.'),true);return;}const [r1,r2,c1,c2]=s.bounds,a=s.view[r1],b=s.view[r2];
      if(mode==='selection'){mutate((cells,fmt)=>{for(const r of rows(s)){for(const c of columns(s)){const key=r+':'+c,v=fmt.styles[key]||{};delete v.centerAcross;fmt.styles[key]=v;}fmt.styles[r+':'+c1]={...fmt.styles[r+':'+c1],align:'center',centerAcross:c2-c1+1};}});return;}
      if(mode!=='unmerge'&&r1===r2&&c1===c2)return;
      const occupied=rows(s).some(r=>columns(s).some(c=>(r!==a||c!==c1)&&s.cells[r]?.[c]));
      if(mode!=='unmerge'&&occupied){
        const ok=await (window.AppDialog?AppDialog.confirm({
          title:tr('تنبيه دمج الخلايا','Merge Cells Warning'),
          message:tr('الدمج يحتفظ بقيمة أول خلية فقط. متابعة؟ يمكنك التراجع.','Merge keeps only the first cell value. Continue? You can undo.'),
          confirmText:tr('متابعة الدمج','Continue Merge'),
          cancelText:tr('إلغاء','Cancel'),
          danger:false,
          icon:'warning'
        }):confirm(tr('الدمج يحتفظ بقيمة أول خلية فقط. متابعة؟ يمكنك التراجع.','Merge keeps only the first cell value. Continue? You can undo.')));
        if(!ok)return;
      }
      mutate((cells,fmt,_,rowAt)=>{for(const [key,v]of Object.entries(fmt.styles)){const [r,c]=key.split(':').map(Number);if(r<=b&&(r+(v.mergeRows||1)-1)>=a&&c<=c2&&(c+(v.mergeCols||v.centerAcross||1)-1)>=c1){delete v.mergeRows;delete v.mergeCols;delete v.centerAcross;}}
        if(mode==='unmerge')return;
        for(const r of rows(s)){const row=rowAt(r);for(const c of columns(s)){if((mode==='across'?c!==c1:r!==a||c!==c1)){while(row.length<=c)row.push('');row[c]='';}}}
        const anchors=mode==='across'?rows(s):[a];for(const r of anchors){const key=r+':'+c1;fmt.styles[key]={...fmt.styles[key],mergeCols:c2-c1+1,mergeRows:mode==='across'?1:b-a+1,...(mode==='center'?{align:'center',valign:'middle'}:{})};}
      });
    };
    menu({id:'sheet-merge-menu',ar:'دمج وتوسيط ▾',en:'Merge & Center ▾',items:[
      ['center','دمج وتوسيط','Merge & Center',()=>merge('center')],['across','دمج كل صف','Merge Across',()=>merge('across')],['cells','دمج الخلايا','Merge Cells',()=>merge('cells')],['unmerge','إلغاء الدمج','Unmerge Cells',()=>merge('unmerge')],['selection','توسيط عبر التحديد','Center Across Selection',()=>merge('selection')]
    ]});
    action('sheet-merge-center','دمج وتوسيط','Merge & Center',()=>merge('center'));$('sheet-merge-menu-trigger').dataset.split='true';paintLabel($('sheet-merge-menu-trigger'));
    const sortDialog=$('sheet-sort-dialog'),sortLevels=$('sheet-sort-levels');
    $('sheet-sort-cancel').onclick=()=>sortDialog.close();
    $('sheet-sort-apply').onclick=()=>{const rules=[...sortLevels.children].map(el=>({column:Number(el.firstChild.value),direction:Number(el.lastChild.value)}));if(new Set(rules.map(x=>x.column)).size!==rules.length){h.message(()=>tr('اختر أعمدة مختلفة لمستويات الفرز.','Choose different columns for sort levels.'),true);return;}h.customSort(rules);sortDialog.close();};
    const resetSortLevels=()=>{const s=state();window.WorkspaceViews.sortLevels(sortLevels,{columns:s.labels.map((pair,column)=>({value:column,label:D.letter(column)+' · '+tr(...pair)})),initialColumns:[s.cursor.c],labels:{column:tr('العمود','Column'),order:tr('الترتيب','Order'),ascending:tr('تصاعدي A → Z','A to Z'),descending:tr('تنازلي Z → A','Z to A'),remove:tr('حذف المستوى','Remove Level')}});};
    dropdown({id:'sheet-sort-menu',ar:'الفرز والفلترة',en:'Sort & Filter',controls:[
      action('sheet-sort-menu-ascending','فرز من A إلى Z','Sort A to Z',()=>h.sort(state().cursor.c,1)),action('sheet-sort-menu-descending','فرز من Z إلى A','Sort Z to A',()=>h.sort(state().cursor.c,-1)),
      action('sheet-sort-menu-custom','فرز مخصص…','Custom Sort…',()=>{resetSortLevels();closeMenus();sortDialog.showModal();}),
      action('sheet-sort-menu-filter','إظهار / إخفاء الفلاتر','Filter',()=>{$('sheet-workspace').classList.toggle('sheet-filters-minimal');$('sheet-sort-menu-filter').setAttribute('aria-pressed',String(!$('sheet-workspace').classList.contains('sheet-filters-minimal')));}),action('sheet-sort-menu-clear-filters','مسح الفلاتر','Clear',h.clearFilters),action('sheet-sort-menu-reapply','إعادة التطبيق','Reapply',h.render),
      action('sheet-sort-menu-clear','إلغاء الفرز','Clear sort',h.resetSort),action('sheet-find-select-menu-all','تحديد الكل','Select all',()=>h.selectAll()),action('sheet-find-select-menu-row','تحديد الصف','Select row',()=>{const s=state();h.select({r:s.cursor.r,c:0},{r:s.cursor.r,c:s.cols[s.cols.length-1]});}),action('sheet-find-select-menu-column','تحديد العمود','Select column',()=>{const s=state();h.select({r:0,c:s.cursor.c},{r:Math.max(0,s.view.length-1),c:s.cursor.c});})
    ]});
    const rowHeight=async()=>{
      const initial=state(),row=initial.view[initial.cursor.r];
      const height=Object.entries(initial.formatting.styles).reduce((max,[key,value])=>Number(key.split(':')[0])===row?Math.max(max,value.height||0):max,0);
      const curH=String(height||28);
      const res=await (window.AppDialog?AppDialog.prompt({
        title:tr('ارتفاع الصف','Row Height'),
        message:tr('أدخل ارتفاع الصف المطلوب (20–400 بكسل):','Enter row height (20–400 px):'),
        defaultValue:curH,
        inputType:'number',
        min:20,
        max:400,
        unit:'px',
        confirmText:tr('تطبيق','Apply'),
        cancelText:tr('إلغاء','Cancel'),
        icon:'row'
      }):prompt(tr('ارتفاع الصف (20–400 بكسل):','Row height (20–400 px):'),curH));
      if(res===null)return;
      const n=Number(res);
      if(!Number.isInteger(n)||n<20||n>400)return;
      const s=state();mutate((cells,fmt)=>{const ids=new Set(rows(s));for(const [key,v]of Object.entries(fmt.styles))if(ids.has(Number(key.split(':')[0])))delete v.height;for(const r of ids){const c=s.cols[0];fmt.styles[r+':'+c]={...fmt.styles[r+':'+c],height:n};}});
    };
    const columnWidth=async auto=>{
      const s=state();let n=0;
      if(!auto){
        const res=await (window.AppDialog?AppDialog.prompt({
          title:tr('عرض العمود','Column Width'),
          message:tr('أدخل عرض العمود المطلوب (40–800 بكسل):','Enter column width (40–800 px):'),
          defaultValue:'160',
          inputType:'number',
          min:40,
          max:800,
          unit:'px',
          confirmText:tr('تطبيق','Apply'),
          cancelText:tr('إلغاء','Cancel'),
          icon:'column'
        }):prompt(tr('عرض العمود (40–800 بكسل):','Column width (40–800 px):'),'160'));
        if(res===null)return;
        n=Number(res);
        if(!Number.isFinite(n)||n<40||n>800)return;
      }
      for(const c of columns(s)){const width=auto?Math.max(60,Math.min(800,s.cells.reduce((max,row)=>Math.max(max,String(row[c]||'').length),String(D.letter(c)).length)*7+24)):n;h.setColumnWidth(c,width);}h.saveColumnWidths();h.render();
    };
    const formatEntries=[
      ['row-height','ارتفاع الصف…','Row Height…',rowHeight],['autofit-row','ضبط ارتفاع الصف تلقائيًا','AutoFit Row Height',()=>mutate((cells,fmt,s)=>{const ids=new Set(rows(s));for(const [key,v]of Object.entries(fmt.styles))if(ids.has(Number(key.split(':')[0])))delete v.height;})],['column-width','عرض العمود…','Column Width…',()=>columnWidth(false)],['autofit','ضبط عرض العمود تلقائيًا','AutoFit Column Width',()=>columnWidth(true)],
      ['default-width','العرض الافتراضي…','Default Width…',async()=>{
        const res=await (window.AppDialog?AppDialog.prompt({
          title:tr('العرض الافتراضي للأعمدة','Default Column Width'),
          message:tr('أدخل العرض الافتراضي (40–800 بكسل):','Enter default width (40–800 px):'),
          defaultValue:'160',
          inputType:'number',
          min:40,
          max:800,
          unit:'px',
          confirmText:tr('تطبيق','Apply'),
          cancelText:tr('إلغاء','Cancel'),
          icon:'column'
        }):prompt(tr('العرض الافتراضي (40–800 بكسل):','Default width (40–800 px):'),'160'));
        if(res===null)return;
        const n=Number(res);
        if(Number.isInteger(n)&&n>=40&&n<=800)mutate((cells,fmt)=>{fmt.defaultWidth=n;});
      }],
      ['hide-rows','إخفاء الصفوف','Hide Rows',()=>mutate((cells,fmt,s)=>{fmt.hiddenRows=[...new Set([...(fmt.hiddenRows||[]),...rows(s)])];})],['show-rows','إظهار كل الصفوف','Unhide Rows',()=>mutate((cells,fmt)=>{fmt.hiddenRows=[];})],
      ['hide-cols','إخفاء الأعمدة','Hide Columns',()=>mutate((cells,fmt,s)=>{const selected=columns(s);if(selected.length>=s.cols.length)return;fmt.hidden=[...new Set([...fmt.hidden,...selected])];})],['show-cols','إظهار كل الأعمدة','Unhide Columns',()=>mutate((cells,fmt)=>{fmt.hidden=[];})],
      ...[['hide-sheet','إخفاء الشيت','Hide Sheet','hide'],['show-sheet','إظهار شيت…','Unhide Sheet…','show'],['rename-sheet','إعادة تسمية الشيت…','Rename Sheet…','rename'],['move-sheet','نقل أو نسخ الشيت…','Move or Copy Sheet…','move'],['tab-color','لون التبويب…','Tab Color…','color']].map(([key,ar,en,action])=>[key,ar,en,()=>{closeMenus();h.worksheet(action);}])
    ];
    const formatActions=formatEntries.map(([key,ar,en,run])=>action('sheet-cell-format-menu-'+key,ar,en,run));
    dropdown({id:'sheet-cell-format-menu',ar:'تنسيق',en:'Format',controls:[...formatActions.slice(0,5),...formatActions.slice(11)]});
    dropdown({id:'sheet-cell-format-menu-visibility',ar:'إخفاء وإظهار',en:'Hide & Unhide',controls:formatActions.slice(5,11),submenu:true});
    const columnsDialog=$('sheet-columns-dialog');$('sheet-columns-title').onclick=()=>columnsDialog.showModal();$('sheet-columns-close').onclick=()=>columnsDialog.close();
    const shiftDialog=$('sheet-shift-dialog'),shiftTitle=$('sheet-shift-title'),shiftChoice=$('sheet-shift-direction');let inserting=false;
    $('sheet-shift-cancel').onclick=()=>shiftDialog.close();
    $('sheet-shift-apply').onclick=()=>{const s=state();if(s.filtered||ranges(s).length!==1){h.message(()=>tr('اختر نطاقًا واحدًا وامسح الفرز والفلاتر أولًا.','Select one range and clear sorting and filters first.'),true);return;}const [r1,r2,c1,c2]=s.bounds,next=D.shiftCells(s.cells,s.formatting,[s.view[r1],s.view[r2],c1,c2],inserting,shiftChoice.value,s.labels.length);h.change(next.cells,true,next.format);shiftDialog.close();};
    const shift=insert=>{inserting=insert;const s=state();if(s.filtered||ranges(s).length!==1){h.message(()=>tr('اختر نطاقًا واحدًا وامسح الفرز والفلاتر أولًا.','Select one range and clear sorting and filters first.'),true);return;}shiftTitle.textContent=insert?tr('إدراج خلايا','Insert Cells'):tr('حذف خلايا','Delete Cells');window.WorkspaceViews.options(shiftChoice,{options:(insert?[['right','إزاحة لليمين','Shift cells right'],['down','إزاحة لأسفل','Shift cells down']]:[['left','إزاحة لليسار','Shift cells left'],['up','إزاحة لأعلى','Shift cells up']]).map(([value,ar,en])=>({value,label:tr(ar,en)}))});closeMenus();shiftDialog.showModal();};
    dropdown({id:'sheet-insert-menu',ar:'إدراج',en:'Insert',controls:[
      action('sheet-insert-cells','إدراج خلايا…','Insert Cells…',()=>shift(true)),action('sheet-add','إدراج صفوف','Insert Sheet Rows',()=>h.insertRow('above')),action('sheet-add-col','إدراج أعمدة','Insert Sheet Columns',()=>h.editColumns('left')),action('sheet-insert-sheet','إدراج شيت…','Insert Sheet…',()=>{closeMenus();h.worksheet('create');})]});
    dropdown({id:'sheet-delete-menu',ar:'حذف',en:'Delete',controls:[
      action('sheet-delete-cells','حذف خلايا…','Delete Cells…',()=>shift(false)),action('sheet-delete','حذف الصفوف','Delete Sheet Rows',h.deleteSelectedRows),action('sheet-delete-col','حذف الأعمدة','Delete Sheet Columns',()=>h.editColumns('delete')),action('sheet-delete-sheet','حذف الشيت…','Delete Sheet…',()=>{closeMenus();h.worksheet('delete');})]});
    const panel=$('sheet-ribbon-panel-all');
    let ribbonOpen=!matchMedia('(max-width: 760px)').matches;try{const preference=JSON.parse(localStorage.getItem('ibta_sheet_ribbon')||'{}');if(typeof preference.open==='boolean')ribbonOpen=preference.open;}catch{}
    const ribbonToggle=$('sheet-ribbon-toggle');
    const syncRibbon=()=>{panel.setAttribute('aria-label',tr('أدوات الجدول','Sheet tools'));fontName.setAttribute('aria-label',tr('نوع الخط','Font family'));const s=state(),open=s.expandedView?$('sheet-workspace').classList.contains('sheet-expanded-tools'):ribbonOpen;panel.hidden=!open;ribbonToggle.setAttribute('aria-expanded',String(open));text(ribbonToggle,open?'إخفاء أدوات الجدول ▴':'إظهار أدوات الجدول ▾',open?'Hide sheet tools ▴':'Show sheet tools ▾');};
    ribbonToggle.onclick=()=>{h.commitEdit();closeMenus();ribbonOpen=!ribbonOpen;try{localStorage.setItem('ibta_sheet_ribbon',JSON.stringify({open:ribbonOpen}));}catch{}syncRibbon();};syncRibbon();
    const files=TraineeFiles.mount({...h,text,action});
    return {syncRibbon,rowHeight,closeFiles(){closeMenus();columnsDialog.close();borderEditor.close();sortDialog.close();shiftDialog.close();files.close();},translate(){closeMenus();files.translate();borderEditor.translate();syncRibbon();if($('sheet-local-note'))$('sheet-local-note').title=$('sheet-local-note').textContent;for(const el of document.querySelectorAll('[data-excel-ar]'))paintLabel(el);},paint(s){const current=state();$('sheet-sort-menu-clear-filters').disabled=!current.filtered;$('sheet-sort-menu-reapply').disabled=!current.filtered;$('sheet-sort-menu-filter').setAttribute('aria-pressed',String(!$('sheet-workspace').classList.contains('sheet-filters-minimal')));for(const key of ['top','middle','bottom'])$('sheet-valign-'+key).setAttribute('aria-pressed',String((s.valign||'middle')===key));$('sheet-wrap-text').setAttribute('aria-pressed',String(s.wrap??current.wrap));fontName.value=s.font||'IBM Plex Sans Arabic';const size=s.size||state().formatting.fontSize;$('sheet-font-size').textContent=size+' px';$('sheet-font-minus').disabled=size<=10;$('sheet-font-plus').disabled=size>=32;for(const field of ['italic','underline','strike'])$('sheet-'+field).setAttribute('aria-pressed',String(!!s[field]));}};
  }
  return {mount};
})();
