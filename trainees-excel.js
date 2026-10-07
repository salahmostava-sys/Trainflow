/* Excel-style actions over the private trainee data model and its undo history. */
const TraineeExcel=(()=>{
  'use strict';
  function mount(h){
    const {D,$,tr,node,button}=h,tools=$('sheet-workspace').querySelector('.sheet-format-tools');
    const svg=body=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true">'+body+'</svg>';
    const grid=(kind='')=>svg('<rect x="3" y="4" width="18" height="16" stroke="#84929e"/><path d="M3 9h18M3 14h18M9 4v16M15 4v16" stroke="#bbc5ce"/>'+({insert:'<path d="M3 9h18v5H3z" fill="#ccecff" stroke="#1682bb"/><path d="M1 12h9m-5-4-4 4 4 4" stroke="#1682bb"/>',delete:'<path d="M3 9h18v5H3z" fill="#ccecff" stroke="#1682bb"/><path d="m14 8 8 8m0-8-8 8" stroke="#db4141"/>',columns:'<path d="M9 4h6v16H9z" fill="#ccecff" stroke="#1682bb"/>',merge:'<path d="M3 9h18v5H3z" fill="#ccecff" stroke="#1682bb"/><path d="M5 10l2 2-2 2M19 10l-2 2 2 2" stroke="#1682bb"/>',unmerge:'<path d="M9 4v16M15 4v16" stroke="#1682bb"/>',format:'<path d="M3 9h18v5H3z" fill="#ccecff" stroke="#1682bb"/><path d="M9 1v4m6-4v4M1 9h4M1 14h4" stroke="#1682bb"/>',border:'<path d="M3 4h18v16H3z" stroke="#111" stroke-dasharray="2 2"/>'}[kind]||''));
    const funnel=svg('<path d="M3 4h18l-7 8v7l-4 2v-9z" stroke="#555"/>');
    const sort=reverse=>svg('<text x="2" y="9" stroke="none" fill="#267aa4" font-size="10">'+(reverse?'Z':'A')+'</text><text x="2" y="20" stroke="none" fill="#555" font-size="10">'+(reverse?'A':'Z')+'</text><path d="M17 3v17m-4-4 4 4 4-4"/>');
    const iconFor=id=>{
      if(id==='sheet-sort-menu-trigger')return '<svg viewBox="0 0 40 24" fill="none" stroke="#555" stroke-width="1.2" aria-hidden="true"><text x="2" y="9" stroke="none" fill="#267aa4" font-size="10">A</text><text x="2" y="20" stroke="none" fill="#555" font-size="10">Z</text><path d="M17 3v17m-4-4 4 4 4-4M23 5h15l-6 7v7l-3 2v-9z"/></svg>';
      if(/sort-menu-(ascending|descending|custom|clear)$/.test(id))return sort(id.endsWith('descending'));
      if(/sort-menu-(filter|clear-filters|reapply)$/.test(id))return funnel;
      if(id==='sheet-merge-center'||id.includes('merge-menu'))return grid(id.endsWith('unmerge')?'unmerge':'merge');
      if(id.includes('border-menu'))return grid('border');
      if(id.includes('cell-format-menu'))return grid(id.includes('column')||id.includes('cols')?'columns':'format');
      if(/sheet-(insert|add)/.test(id))return grid(id.includes('col')?'columns':'insert');
      if(/sheet-delete/.test(id))return grid('delete');
      if(id==='sheet-wrap-text')return svg('<path d="M3 5h18M3 10h12a4 4 0 0 1 0 8h-4m3-3-3 3 3 3M3 15h4"/>');
      if(id.startsWith('sheet-valign-'))return svg('<path d="M3 '+({top:5,middle:12,bottom:19}[id.slice(13)]||12)+'h18"/><path d="M6 8h12M6 12h12M6 16h12" stroke="#929ca7"/>');
      return '';
    };
    const paintLabel=el=>{const label=tr(el.dataset.excelAr,el.dataset.excelEn),icon=iconFor(el.id);el.replaceChildren();if(el.dataset.split==='true'){el.append(node('span','▾',{'aria-hidden':'true'}));el.setAttribute('aria-label',tr('خيارات الدمج','Merge options'));return;}if(icon){const image=node('span',undefined,{class:'sheet-command-icon','aria-hidden':'true'});image.innerHTML=icon;el.append(image);}el.append(node('span',el.getAttribute('aria-haspopup')==='menu'?label.replace(/ ▾$/,''):label,{class:'sheet-command-label'}));if(el.getAttribute('aria-haspopup')==='menu')el.append(node('span',el.dataset.submenu==='true'?'›':'▾',{class:'sheet-command-arrow','aria-hidden':'true'}));if(icon)el.setAttribute('aria-label',label.replace(/ ▾$/,''));};
    const text=(el,ar,en)=>{el.dataset.excelAr=ar;el.dataset.excelEn=en;paintLabel(el);return el;};
    const action=(id,ar,en,run)=>{const el=button('',()=>{h.commitEdit();if(!h.state().loaded)return;const fail=error=>h.message(()=>error.message||tr('تعذر تنفيذ العملية','Could not complete the action'),true);try{const result=run();if(result?.catch)result.catch(fail);}catch(error){fail(error);}});el.id=id;return text(el,ar,en);};
    const group=(id,ar,en)=>{const box=node('section',undefined,{id,class:'sheet-ribbon-group'}),body=node('div',undefined,{class:'sheet-ribbon-actions'});box.append(body,text(node('small'),ar,en));tools.append(box);return body;};
    const dropdowns=[];
    const closeMenus=keep=>dropdowns.forEach(({list})=>{if(list.matches(':popover-open')&&(!keep?.nodeType||!list.contains(keep)))list.hidePopover();});
    const dropdown=(host,id,ar,en,controls,submenu=false)=>{
      const box=node('div',undefined,{id,class:'sheet-command-dropdown'}),trigger=text(button('',()=>{}),ar+' ▾',en+' ▾'),list=node('div',undefined,{id:id+'-items',class:'sheet-command-popover',popover:'auto',role:'menu','data-trigger':id+'-trigger'});
      trigger.id=id+'-trigger';trigger.setAttribute('aria-haspopup','menu');trigger.setAttribute('aria-controls',list.id);trigger.setAttribute('aria-expanded','false');trigger.dataset.submenu=String(submenu);paintLabel(trigger);
      controls.forEach(el=>{if(el.tagName==='BUTTON')el.setAttribute('role','menuitem');list.append(el);});box.append(trigger);host.append(box);if(submenu){box.append(list);box.classList.add('sheet-command-submenu');trigger.setAttribute('role','menuitem');}else document.body.append(list);
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
      return box;
    };
    window.addEventListener('resize',closeMenus);document.addEventListener('scroll',e=>{if(!e.target.closest?.('.sheet-command-popover'))for(const item of dropdowns)if(item.list.matches(':popover-open'))item.place();},true);
    const separator=()=>node('hr',undefined,{role:'separator'}),caption=(ar,en)=>text(node('div',undefined,{class:'sheet-menu-heading',role:'presentation'}),ar,en);
    const menu=(host,id,ar,en,items)=>dropdown(host,id,ar.replace(' ▾',''),en.replace(' ▾',''),items.map(([key,a,e,run])=>action(id+'-'+key,a,e,run)));
    const state=()=>h.state(),style=()=>{const s=state();return s.formatting.styles[s.view[s.cursor.r]+':'+s.cursor.c]||{};};
    const ranges=s=>s.ranges||[s.bounds],rows=s=>D.selectionRows(ranges(s),s.view.length).map(r=>s.view[r]),columns=s=>D.selectionColumns(ranges(s),s.cols);
    const mutate=(run)=>{
      const s=state(),cells=s.cells.slice(),fmt=D.format(s.formatting),changed=new Set();
      const rowAt=r=>{while(cells.length<=r)cells.push(D.blank());if(!changed.has(r)){cells[r]=[...cells[r]];changed.add(r);}return cells[r];};
      run(cells,fmt,s,rowAt);h.change(D.normalize(cells),true,fmt);
    };
    const selected=(run)=>mutate((cells,fmt,s,rowAt)=>D.eachSelected(ranges(s),s.view,s.cols,(r,c)=>run(cells,fmt,r,c,s,rowAt)));
    const toggle=field=>h.formatSelection({[field]:!style()[field]});
    const font=group('sheet-excel-font','الخط والتنسيق','Font & Style'),fontName=node('select',undefined,{id:'sheet-font-family','aria-label':tr('نوع الخط','Font family')});
    for(const name of ['Arial','Calibri','Tahoma','Segoe UI','Times New Roman','IBM Plex Sans Arabic'])fontName.append(node('option',name,{value:name}));fontName.onchange=()=>h.formatSelection({font:fontName.value});font.append(fontName);
    font.append($('sheet-selection-size').closest('label')||$('sheet-selection-size'));
    font.append($('sheet-font-minus'),$('sheet-font-size'),$('sheet-font-plus'));
    $('sheet-font-minus').onclick=()=>h.formatSelection({size:Math.max(10,(style().size||state().formatting.fontSize)-1)});$('sheet-font-plus').onclick=()=>h.formatSelection({size:Math.min(32,(style().size||state().formatting.fontSize)+1)});
    const styleGroup=node('div',undefined,{class:'sheet-style-group'});
    styleGroup.append($('sheet-bold'),action('sheet-italic','I','I',()=>toggle('italic')),action('sheet-underline','U','U',()=>toggle('underline')),action('sheet-strike','شطب','Strike',()=>toggle('strike')));
    font.append(styleGroup);
    const colorGroup=node('div',undefined,{class:'sheet-color-group'});
    colorGroup.append($('sheet-fill').closest('label')||$('sheet-fill'),$('sheet-text-color').closest('label')||$('sheet-text-color'));
    font.append(colorGroup);
    const borderEditor=TraineeBorders.mount(h);
    const borders=type=>selected((cells,fmt,r,c,s)=>{const vr=s.view.indexOf(r),cols=s.cols,at=cols.indexOf(c),key=r+':'+c,old=fmt.styles[key]||{},has=(row,col)=>D.selectedCell(ranges(s),row,col);fmt.styles[key]={...old,border:type,borderTop:null,borderBottom:null,borderLeft:null,borderRight:null};delete fmt.styles[key].borders;if(type==='outline')Object.assign(fmt.styles[key],{border:'none',borderTop:!has(vr-1,c),borderBottom:!has(vr+1,c),borderLeft:!has(vr,cols[at-1]??-1),borderRight:!has(vr,cols[at+1]??D.MAX_COLS)});});
    menu(font,'sheet-border-menu','حدود ▾','Borders ▾',[...['all','outline','none','top','bottom','left','right'].map((v,i)=>[v,['كل الحدود','حدود خارجية','بدون حدود','علوي','سفلي','يسار','يمين'][i],['All borders','Outside borders','No borders','Top','Bottom','Left','Right'][i],()=>borders(v)]),['format','تنسيق الحدود…','Format borders…',()=>{closeMenus();borderEditor.open();}]]);
    const align=group('sheet-excel-alignment','المحاذاة','Alignment');align.append($('sheet-align-right').parentElement);$('sheet-wrap').remove();const vertical=node('div',undefined,{class:'sheet-align-group sheet-valign-group'});for(const [key,ar,en]of [['top','محاذاة لأعلى','Top Align'],['middle','توسيط رأسي','Middle Align'],['bottom','محاذاة لأسفل','Bottom Align']])vertical.append(action('sheet-valign-'+key,ar,en,()=>h.formatSelection({valign:key})));align.append(vertical,action('sheet-wrap-text','التفاف النص','Wrap Text',()=>h.formatSelection({wrap:!(style().wrap??state().wrap)})));
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
    menu(align,'sheet-merge-menu','دمج وتوسيط ▾','Merge & Center ▾',[
      ['center','دمج وتوسيط','Merge & Center',()=>merge('center')],['across','دمج كل صف','Merge Across',()=>merge('across')],['cells','دمج الخلايا','Merge Cells',()=>merge('cells')],['unmerge','إلغاء الدمج','Unmerge Cells',()=>merge('unmerge')],['selection','توسيط عبر التحديد','Center Across Selection',()=>merge('selection')]
    ]);
    $('sheet-merge-menu').classList.add('sheet-split-command');$('sheet-merge-menu').prepend(action('sheet-merge-center','دمج وتوسيط','Merge & Center',()=>merge('center')));$('sheet-merge-menu-trigger').dataset.split='true';paintLabel($('sheet-merge-menu-trigger'));
    const editing=group('sheet-excel-editing','الفرز والتحديد','Sort & selection');$('sheet-clear-format').remove();
    const sortDialog=node('dialog',undefined,{id:'sheet-sort-dialog',class:'sheet-file-dialog sheet-worksheet-dialog'}),sortTitle=text(node('h3'),'فرز مخصص','Custom Sort'),sortLevels=node('div',undefined,{id:'sheet-sort-levels'}),sortAdd=text(button('',()=>addSortLevel()),'إضافة مستوى','Add Level'),sortApply=text(button('',()=>{const rules=[...sortLevels.children].map(el=>({column:Number(el.firstChild.value),direction:Number(el.lastChild.value)}));if(new Set(rules.map(x=>x.column)).size!==rules.length){h.message(()=>tr('اختر أعمدة مختلفة لمستويات الفرز.','Choose different columns for sort levels.'),true);return;}h.customSort(rules);sortDialog.close();}),'تطبيق الفرز','Apply Sort'),sortCancel=text(button('',()=>sortDialog.close()),'إلغاء','Cancel');sortApply.id='sheet-sort-apply';sortAdd.id='sheet-sort-add-level';sortDialog.append(sortTitle,sortLevels,sortAdd,sortCancel,sortApply);document.body.append(sortDialog);
    function addSortLevel(){if(sortLevels.children.length>=5)return;const s=state(),line=node('div',undefined,{class:'sheet-sort-level'}),col=node('select',undefined,{'aria-label':tr('العمود','Column')}),dir=node('select',undefined,{'aria-label':tr('الترتيب','Order')});s.labels.forEach((pair,c)=>col.append(node('option',D.letter(c)+' · '+tr(...pair),{value:c})));col.value=String(sortLevels.children.length?s.cols[sortLevels.children.length]??0:s.cursor.c);dir.append(node('option',tr('تصاعدي A → Z','A to Z'),{value:1}),node('option',tr('تنازلي Z → A','Z to A'),{value:-1}));const remove=text(button('',()=>line.remove()),'حذف المستوى','Remove Level');line.append(col,remove,dir);sortLevels.append(line);}
    dropdown(editing,'sheet-sort-menu','الفرز والفلترة','Sort & Filter',[
      action('sheet-sort-menu-ascending','فرز من A إلى Z','Sort A to Z',()=>h.sort(state().cursor.c,1)),action('sheet-sort-menu-descending','فرز من Z إلى A','Sort Z to A',()=>h.sort(state().cursor.c,-1)),
      action('sheet-sort-menu-custom','فرز مخصص…','Custom Sort…',()=>{sortLevels.replaceChildren();addSortLevel();closeMenus();sortDialog.showModal();}),
      separator(),action('sheet-sort-menu-filter','إظهار / إخفاء الفلاتر','Filter',()=>{$('sheet-workspace').classList.toggle('sheet-filters-minimal');$('sheet-sort-menu-filter').setAttribute('aria-pressed',String(!$('sheet-workspace').classList.contains('sheet-filters-minimal')));}),action('sheet-sort-menu-clear-filters','مسح الفلاتر','Clear',h.clearFilters),action('sheet-sort-menu-reapply','إعادة التطبيق','Reapply',h.render),
      separator(),action('sheet-sort-menu-clear','إلغاء الفرز','Clear sort',h.resetSort),action('sheet-find-select-menu-all','تحديد الكل','Select all',()=>h.selectAll()),action('sheet-find-select-menu-row','تحديد الصف','Select row',()=>{const s=state();h.select({r:s.cursor.r,c:0},{r:s.cursor.r,c:s.cols[s.cols.length-1]});}),action('sheet-find-select-menu-column','تحديد العمود','Select column',()=>{const s=state();h.select({r:0,c:s.cursor.c},{r:Math.max(0,s.view.length-1),c:s.cursor.c});})
    ]);
    const cellsGroup=$('sheet-add-col').closest('.sheet-ribbon-group').querySelector('.sheet-ribbon-actions');
    const rowHeight=async()=>{
      const curH=String(style().height||28);
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
    dropdown(cellsGroup,'sheet-cell-format-menu','تنسيق','Format',[caption('حجم الخلية','Cell Size'),...formatActions.slice(0,5),separator(),caption('الإظهار والإخفاء','Visibility'),separator(),caption('تنظيم الشيتات','Organize Sheets'),...formatActions.slice(11)]);
    const formatList=$('sheet-cell-format-menu-items'),visibility=dropdown(formatList,'sheet-cell-format-menu-visibility','إخفاء وإظهار','Hide & Unhide',formatActions.slice(5,11),true);formatList.insertBefore(visibility,formatList.querySelectorAll('hr')[1]);
    const toolbar=$('sheet-workspace').querySelector('.sheet-tools'),essential=toolbar.querySelector('.sheet-essential-tools .sheet-ribbon-actions');
    essential.append($('sheet-select-all'),$('sheet-undo'),$('sheet-redo'));
    const viewBody=group('sheet-view-tools','عرض الجدول','View');viewBody.append($('sheet-row-size').closest('label'));
    const columnsDialog=node('dialog',undefined,{id:'sheet-columns-dialog',class:'sheet-file-dialog'}),columnBox=$('sheet-columns'),columnTitle=$('sheet-columns-title');
    const columnsButton=node('button',undefined,{id:'sheet-columns-title',type:'button'});columnsButton.textContent=columnTitle.textContent;
    const columnsClose=text(button('',()=>columnsDialog.close()),'إغلاق','Close');columnsClose.id='sheet-columns-close';columnsDialog.append(text(node('h3'),'الأعمدة الظاهرة','Visible columns'),$('sheet-column-options'),columnsClose);document.body.append(columnsDialog);columnBox.replaceWith(columnsButton);columnsButton.onclick=()=>columnsDialog.showModal();
    for(const el of [columnsButton,$('sheet-freeze'),$('sheet-direction').closest('label'),$('sheet-local-note')])viewBody.append(el);
    if($('sheet-local-note'))$('sheet-local-note').title=$('sheet-local-note').textContent;
    const shiftDialog=node('dialog',undefined,{id:'sheet-shift-dialog',class:'sheet-file-dialog sheet-worksheet-dialog'}),shiftTitle=node('h3'),shiftChoice=node('select',undefined,{id:'sheet-shift-direction'}),shiftCancel=text(button('',()=>shiftDialog.close()),'إلغاء','Cancel');let inserting=false;
    const shiftApply=text(button('',()=>{const s=state();if(s.filtered||ranges(s).length!==1){h.message(()=>tr('اختر نطاقًا واحدًا وامسح الفرز والفلاتر أولًا.','Select one range and clear sorting and filters first.'),true);return;}const [r1,r2,c1,c2]=s.bounds,next=D.shiftCells(s.cells,s.formatting,[s.view[r1],s.view[r2],c1,c2],inserting,shiftChoice.value,s.labels.length);h.change(next.cells,true,next.format);shiftDialog.close();}),'تطبيق','Apply');shiftApply.id='sheet-shift-apply';shiftDialog.append(shiftTitle,shiftChoice,shiftCancel,shiftApply);document.body.append(shiftDialog);
    const shift=insert=>{inserting=insert;const s=state();if(s.filtered||ranges(s).length!==1){h.message(()=>tr('اختر نطاقًا واحدًا وامسح الفرز والفلاتر أولًا.','Select one range and clear sorting and filters first.'),true);return;}shiftTitle.textContent=insert?tr('إدراج خلايا','Insert Cells'):tr('حذف خلايا','Delete Cells');shiftChoice.replaceChildren(...(insert?[['right','إزاحة لليمين','Shift cells right'],['down','إزاحة لأسفل','Shift cells down']]:[['left','إزاحة لليسار','Shift cells left'],['up','إزاحة لأعلى','Shift cells up']]).map(([value,ar,en])=>node('option',tr(ar,en),{value})));closeMenus();shiftDialog.showModal();};
    for(const id of ['sheet-add','sheet-delete','sheet-add-col','sheet-delete-col'])$(id).remove();
    dropdown(cellsGroup,'sheet-insert-menu','إدراج','Insert',[
      action('sheet-insert-cells','إدراج خلايا…','Insert Cells…',()=>shift(true)),action('sheet-add','إدراج صفوف','Insert Sheet Rows',()=>h.insertRow('above')),action('sheet-add-col','إدراج أعمدة','Insert Sheet Columns',()=>h.editColumns('left')),action('sheet-insert-sheet','إدراج شيت…','Insert Sheet…',()=>{closeMenus();h.worksheet('create');})]);
    dropdown(cellsGroup,'sheet-delete-menu','حذف','Delete',[
      action('sheet-delete-cells','حذف خلايا…','Delete Cells…',()=>shift(false)),action('sheet-delete','حذف الصفوف','Delete Sheet Rows',h.deleteSelectedRows),action('sheet-delete-col','حذف الأعمدة','Delete Sheet Columns',()=>h.editColumns('delete')),action('sheet-delete-sheet','حذف الشيت…','Delete Sheet…',()=>{closeMenus();h.worksheet('delete');})]);
    $('sheet-more-tools').remove();
    const makeDivider=()=>node('span',undefined,{class:'sheet-ribbon-divider','aria-hidden':'true'});
    const top=node('div',undefined,{class:'sheet-ribbon-top'}),panel=node('div',undefined,{id:'sheet-ribbon-panel-all',class:'sheet-ribbon-panel sheet-unified-ribbon',role:'region','aria-label':'أدوات الجدول / Sheet tools'}),commands=node('div',undefined,{class:'sheet-ribbon-command-row'}),formats=node('div',undefined,{class:'sheet-ribbon-format-row'});
    top.append(essential,$('sheet-status'));toolbar.prepend(top);
    for(const id of ['sheet-insert-menu','sheet-delete-menu','sheet-cell-format-menu','sheet-merge-menu','sheet-border-menu','sheet-sort-menu'])commands.append($(id));
    commands.append(makeDivider(),align.parentElement);
    formats.append(font.parentElement,makeDivider(),viewBody.parentElement);
    panel.append(commands,formats);toolbar.append(panel);
    let ribbonOpen=true;try{ribbonOpen=JSON.parse(localStorage.getItem('ibta_sheet_ribbon')||'{}').open!==false;}catch{}
    const ribbonToggle=node('button',undefined,{id:'sheet-ribbon-toggle',type:'button','aria-controls':panel.id});top.insertBefore(ribbonToggle,$('sheet-status'));
    const syncRibbon=()=>{const s=state(),open=s.expandedView?$('sheet-workspace').classList.contains('sheet-expanded-tools'):ribbonOpen;panel.hidden=!open;ribbonToggle.setAttribute('aria-expanded',String(open));text(ribbonToggle,open?'إخفاء أدوات الجدول ▴':'إظهار أدوات الجدول ▾',open?'Hide sheet tools ▴':'Show sheet tools ▾');};
    ribbonToggle.onclick=()=>{h.commitEdit();closeMenus();ribbonOpen=!ribbonOpen;try{localStorage.setItem('ibta_sheet_ribbon',JSON.stringify({open:ribbonOpen}));}catch{}syncRibbon();};syncRibbon();
    for(const child of [...toolbar.children])if(child.classList.contains('sheet-ribbon-group'))child.remove();
    tools.remove();toolbar.classList.add('sheet-clean-toolbar');
    const files=TraineeFiles.mount({...h,host:essential,text,action});
    essential.prepend(ribbonToggle);
    essential.replaceChildren(
      ribbonToggle,
      $('sheet-xlsx-export'),
      $('sheet-xlsx-import'),
      makeDivider(),
      $('sheet-undo'),
      $('sheet-redo'),
      makeDivider(),
      $('sheet-find-btn'),
      $('sheet-select-all'),
      makeDivider(),
      $('sheet-save'),
      $('sheet-reload')
    );
    return {syncRibbon,closeFiles(){closeMenus();columnsDialog.close();borderEditor.close();sortDialog.close();shiftDialog.close();files.close();},translate(){closeMenus();files.translate();borderEditor.translate();syncRibbon();if($('sheet-local-note'))$('sheet-local-note').title=$('sheet-local-note').textContent;for(const el of document.querySelectorAll('[data-excel-ar]'))paintLabel(el);},paint(s){const current=state();$('sheet-sort-menu-clear-filters').disabled=!current.filtered;$('sheet-sort-menu-reapply').disabled=!current.filtered;$('sheet-sort-menu-filter').setAttribute('aria-pressed',String(!$('sheet-workspace').classList.contains('sheet-filters-minimal')));for(const key of ['top','middle','bottom'])$('sheet-valign-'+key).setAttribute('aria-pressed',String((s.valign||'middle')===key));$('sheet-wrap-text').setAttribute('aria-pressed',String(s.wrap??current.wrap));fontName.value=s.font||'IBM Plex Sans Arabic';const size=s.size||state().formatting.fontSize;$('sheet-font-size').textContent=size+' px';$('sheet-font-minus').disabled=size<=10;$('sheet-font-plus').disabled=size>=32;for(const field of ['italic','underline','strike'])$('sheet-'+field).setAttribute('aria-pressed',String(!!s[field]));}};
  }
  return {mount};
})();
