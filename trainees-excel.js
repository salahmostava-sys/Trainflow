/* Excel-style actions over the private trainee data model and its undo history. */
const TraineeExcel=(()=>{
  'use strict';
  function mount(h){
    const {D,$,tr,node,button}=h,tools=$('sheet-workspace').querySelector('.sheet-format-tools');
    const text=(el,ar,en)=>{el.dataset.excelAr=ar;el.dataset.excelEn=en;el.textContent=tr(ar,en);return el;};
    const action=(id,ar,en,run)=>{const el=button('',()=>{h.commitEdit();if(!h.state().loaded)return;const fail=error=>h.message(error.message||tr('تعذر تنفيذ العملية','Could not complete the action'),true);try{const result=run();if(result?.catch)result.catch(fail);}catch(error){fail(error);}});el.id=id;return text(el,ar,en);};
    const group=(id,ar,en)=>{const box=node('section',undefined,{id,class:'sheet-ribbon-group'}),body=node('div',undefined,{class:'sheet-ribbon-actions'});box.append(body,text(node('small'),ar,en));tools.append(box);return body;};
    const dropdowns=[];
    const closeMenus=()=>dropdowns.forEach(({list})=>{if(list.matches(':popover-open'))list.hidePopover();});
    const dropdown=(host,id,ar,en,controls)=>{
      const box=node('div',undefined,{id,class:'sheet-command-dropdown'}),trigger=text(button('',()=>{}),ar+' ▾',en+' ▾'),list=node('div',undefined,{id:id+'-items',class:'sheet-command-popover',popover:'auto',role:'menu','data-trigger':id+'-trigger'});
      trigger.id=id+'-trigger';trigger.setAttribute('aria-haspopup','menu');trigger.setAttribute('aria-controls',list.id);trigger.setAttribute('aria-expanded','false');
      controls.forEach(el=>{el.setAttribute('role','menuitem');list.append(el);});box.append(trigger);host.append(box);document.body.append(list);
      const place=()=>{
        const a=trigger.getBoundingClientRect(),b=list.getBoundingClientRect(),gap=8;
        list.style.left=Math.max(gap,Math.min(innerWidth-b.width-gap,list.dir==='rtl'?a.right-b.width:a.left))+'px';
        list.style.top=Math.max(gap,Math.min(innerHeight-b.height-gap,a.bottom+b.height+4<=innerHeight?a.bottom+4:a.top-b.height-4))+'px';
      };
      dropdowns.push({trigger,list,place});
      trigger.onclick=()=>{if(list.matches(':popover-open')){list.hidePopover();return;}h.commitEdit();closeMenus();list.dir=document.documentElement.dir==='rtl'?'rtl':'ltr';list.setAttribute('aria-label',trigger.textContent);list.showPopover();place();};
      list.addEventListener('toggle',()=>trigger.setAttribute('aria-expanded',String(list.matches(':popover-open'))));
      list.addEventListener('click',e=>{if(e.target.closest('button:not(:disabled)'))list.hidePopover();});
      const focusItem=last=>{const items=[...list.querySelectorAll('button:not(:disabled)')];(last?items.at(-1):items[0])?.focus();};
      trigger.addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();if(!list.matches(':popover-open'))trigger.click();focusItem(e.key==='ArrowUp');}});
      list.addEventListener('keydown',e=>{const items=[...list.querySelectorAll('button:not(:disabled)')],i=items.indexOf(document.activeElement);if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();items[e.key==='Home'?0:e.key==='End'?items.length-1:(i+(e.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus();}});
      return box;
    };
    window.addEventListener('resize',closeMenus);document.addEventListener('scroll',e=>{if(!e.target.closest?.('.sheet-command-popover'))for(const item of dropdowns)if(item.list.matches(':popover-open'))item.place();},true);
    const menu=(host,id,ar,en,items)=>dropdown(host,id,ar.replace(' ▾',''),en.replace(' ▾',''),items.map(([key,a,e,run])=>action(id+'-'+key,a,e,run)));
    const state=()=>h.state(),style=()=>{const s=state();return s.formatting.styles[s.view[s.cursor.r]+':'+s.cursor.c]||{};};
    const rows=s=>s.view.slice(s.bounds[0],s.bounds[1]+1),columns=s=>s.cols.filter(c=>c>=s.bounds[2]&&c<=s.bounds[3]);
    const mutate=(run)=>{
      const s=state(),cells=s.cells.slice(),fmt=D.format(s.formatting),changed=new Set();
      const rowAt=r=>{while(cells.length<=r)cells.push(D.blank());if(!changed.has(r)){cells[r]=[...cells[r]];changed.add(r);}return cells[r];};
      run(cells,fmt,s,rowAt);h.change(D.normalize(cells),true,fmt);
    };
    const selected=(run)=>mutate((cells,fmt,s,rowAt)=>{const cols=columns(s);for(const r of rows(s))for(const c of cols)run(cells,fmt,r,c,s,rowAt);});
    const toggle=field=>h.formatSelection({[field]:!style()[field]});
    const font=group('sheet-excel-font','الخط','Font'),fontName=node('select',undefined,{id:'sheet-font-family','aria-label':tr('نوع الخط','Font family')});
    for(const name of ['Arial','Calibri','Tahoma','Segoe UI','Times New Roman','IBM Plex Sans Arabic'])fontName.append(node('option',name,{value:name}));fontName.onchange=()=>h.formatSelection({font:fontName.value});font.append(fontName);
    for(const id of ['sheet-selection-size','sheet-font-minus','sheet-font-size','sheet-font-plus','sheet-bold','sheet-fill','sheet-text-color']){const el=$(id);font.append(el.closest('label')||el);}
    $('sheet-font-minus').onclick=()=>h.formatSelection({size:Math.max(10,(style().size||state().formatting.fontSize)-1)});$('sheet-font-plus').onclick=()=>h.formatSelection({size:Math.min(32,(style().size||state().formatting.fontSize)+1)});
    font.append(action('sheet-italic','I','I',()=>toggle('italic')),action('sheet-underline','U','U',()=>toggle('underline')),action('sheet-strike','شطب','Strike',()=>toggle('strike')));
    const borders=type=>selected((cells,fmt,r,c,s)=>{const [r1,r2,c1,c2]=s.bounds,key=r+':'+c,old=fmt.styles[key]||{};fmt.styles[key]={...old,border:type,borderTop:null,borderBottom:null,borderLeft:null,borderRight:null};if(type==='outline')Object.assign(fmt.styles[key],{border:'none',borderTop:r===s.view[r1],borderBottom:r===s.view[r2],borderLeft:c===c1,borderRight:c===c2});});
    menu(font,'sheet-border-menu','حدود ▾','Borders ▾',['all','outline','none','top','bottom','left','right'].map((v,i)=>[v,['كل الحدود','حدود خارجية','بدون حدود','علوي','سفلي','يسار','يمين'][i],['All borders','Outside borders','No borders','Top','Bottom','Left','Right'][i],()=>borders(v)]));
    const align=group('sheet-excel-alignment','المحاذاة','Alignment');align.append($('sheet-align-right').parentElement);$('sheet-wrap').remove();
    const merge=mode=>{
      const s=state();if(s.filtered){h.message(tr('امسح الفلاتر والفرز قبل الدمج.','Clear filters and sorting before merging.'),true);return;}const [r1,r2,c1,c2]=s.bounds,a=s.view[r1],b=s.view[r2];
      if(mode!=='unmerge'&&r1===r2&&c1===c2)return;
      const occupied=rows(s).some(r=>columns(s).some(c=>(r!==a||c!==c1)&&s.cells[r]?.[c]));if(mode!=='unmerge'&&occupied&&!confirm(tr('الدمج يحتفظ بقيمة أول خلية فقط. متابعة؟ يمكنك التراجع.','Merge keeps only the first cell value. Continue? You can undo.')))return;
      mutate((cells,fmt,_,rowAt)=>{for(const [key,v]of Object.entries(fmt.styles)){const [r,c]=key.split(':').map(Number);if(r<=b&&(r+(v.mergeRows||1)-1)>=a&&c<=c2&&(c+(v.mergeCols||1)-1)>=c1){delete v.mergeRows;delete v.mergeCols;}}
        if(mode==='unmerge')return;
        for(const r of rows(s)){const row=rowAt(r);for(const c of columns(s)){if((mode==='across'?c!==c1:r!==a||c!==c1)){while(row.length<=c)row.push('');row[c]='';}}}
        const anchors=mode==='across'?rows(s):[a];for(const r of anchors){const key=r+':'+c1;fmt.styles[key]={...fmt.styles[key],mergeCols:c2-c1+1,mergeRows:mode==='across'?1:b-a+1,...(mode==='center'?{align:'center',valign:'middle'}:{})};}
      });
    };
    menu(align,'sheet-merge-menu','دمج وتوسيط ▾','Merge & Center ▾',[
      ['center','دمج وتوسيط','Merge & Center',()=>merge('center')],['across','دمج كل صف','Merge Across',()=>merge('across')],['cells','دمج الخلايا','Merge Cells',()=>merge('cells')],['unmerge','إلغاء الدمج','Unmerge',()=>merge('unmerge')]
    ]);
    const editing=group('sheet-excel-editing','الفرز والتحديد','Sort & selection');$('sheet-clear-format').remove();
    dropdown(editing,'sheet-sort-menu','الفرز والتحديد','Sort & selection',[
      action('sheet-sort-menu-ascending','تصاعدي A → Z','Sort A → Z',()=>h.sort(state().cursor.c,1)),action('sheet-sort-menu-descending','تنازلي Z → A','Sort Z → A',()=>h.sort(state().cursor.c,-1)),action('sheet-sort-menu-clear','إلغاء الفرز','Clear sort',h.resetSort),
      action('sheet-find-select-menu-all','تحديد الكل','Select all',()=>{const s=state();h.select({r:0,c:0},{r:Math.max(0,s.view.length-1),c:s.cols[s.cols.length-1]});}),action('sheet-find-select-menu-row','تحديد الصف','Select row',()=>{const s=state();h.select({r:s.cursor.r,c:0},{r:s.cursor.r,c:s.cols[s.cols.length-1]});}),action('sheet-find-select-menu-column','تحديد العمود','Select column',()=>{const s=state();h.select({r:0,c:s.cursor.c},{r:Math.max(0,s.view.length-1),c:s.cursor.c});})
    ]);
    const cellsGroup=$('sheet-add-col').closest('.sheet-ribbon-group').querySelector('.sheet-ribbon-actions');
    const rowHeight=()=>{const n=Number(prompt(tr('ارتفاع الصف (20–400 بكسل):','Row height (20–400 px):'),String(style().height||28)));if(!Number.isInteger(n)||n<20||n>400)return;const s=state();mutate((cells,fmt)=>{for(const r of rows(s)){const c=s.cols[0];fmt.styles[r+':'+c]={...fmt.styles[r+':'+c],height:n};}});};
    const columnWidth=auto=>{const s=state();let n=0;if(!auto){n=Number(prompt(tr('عرض العمود (40–800 بكسل):','Column width (40–800 px):'),'160'));if(!Number.isFinite(n)||n<40||n>800)return;}for(const c of columns(s)){const width=auto?Math.max(60,Math.min(800,s.cells.reduce((max,row)=>Math.max(max,String(row[c]||'').length),String(D.letter(c)).length)*7+24)):n;h.setColumnWidth(c,width);}h.saveColumnWidths();h.render();};
    menu(cellsGroup,'sheet-cell-format-menu','تنسيق ▾','Format ▾',[
      ['row-height','ارتفاع الصف','Row height',rowHeight],['column-width','عرض العمود','Column width',()=>columnWidth(false)],['autofit','ضبط العرض تلقائيًا','AutoFit width',()=>columnWidth(true)]
    ]);
    const toolbar=$('sheet-workspace').querySelector('.sheet-tools'),essential=toolbar.querySelector('.sheet-essential-tools .sheet-ribbon-actions');
    essential.append($('sheet-undo'),$('sheet-redo'));
    const viewBody=group('sheet-view-tools','عرض الجدول','View');
    const columnsDialog=node('dialog',undefined,{id:'sheet-columns-dialog',class:'sheet-file-dialog'}),columnBox=$('sheet-columns'),columnTitle=$('sheet-columns-title');
    const columnsButton=node('button',undefined,{id:'sheet-columns-title',type:'button'});columnsButton.textContent=columnTitle.textContent;
    const columnsClose=text(button('',()=>columnsDialog.close()),'إغلاق','Close');columnsClose.id='sheet-columns-close';columnsDialog.append(text(node('h3'),'الأعمدة الظاهرة','Visible columns'),$('sheet-column-options'),columnsClose);document.body.append(columnsDialog);columnBox.replaceWith(columnsButton);columnsButton.onclick=()=>columnsDialog.showModal();
    for(const el of [columnsButton,$('sheet-freeze'),$('sheet-direction').closest('label'),$('sheet-local-note')])viewBody.append(el);
    const addColumn=$('sheet-add-col'),addWrap=addColumn.parentElement;addWrap.replaceWith(addColumn);addColumn.onclick=h.addColumn;
    dropdown(cellsGroup,'sheet-rows-columns-menu','الصفوف والأعمدة','Rows & columns',['sheet-add','sheet-delete','sheet-add-col','sheet-delete-col'].map($));
    $('sheet-more-tools').remove();
    const top=node('div',undefined,{class:'sheet-ribbon-top'}),panel=node('div',undefined,{id:'sheet-ribbon-panel-all',class:'sheet-ribbon-panel sheet-unified-ribbon',role:'region','aria-label':'أدوات الجدول / Sheet tools'}),commands=node('div',undefined,{class:'sheet-ribbon-command-row'}),formats=node('div',undefined,{class:'sheet-ribbon-format-row'});
    top.append(essential,$('sheet-status'));toolbar.prepend(top);
    for(const id of ['sheet-rows-columns-menu','sheet-cell-format-menu','sheet-merge-menu','sheet-border-menu','sheet-sort-menu'])commands.append($(id));
    formats.append(font.parentElement,align.parentElement,viewBody.parentElement);panel.append(commands,formats);toolbar.append(panel);
    let ribbonOpen=true;try{ribbonOpen=JSON.parse(localStorage.getItem('ibta_sheet_ribbon')||'{}').open!==false;}catch{}
    const ribbonToggle=node('button',undefined,{id:'sheet-ribbon-toggle',type:'button','aria-controls':panel.id});top.insertBefore(ribbonToggle,$('sheet-status'));
    const syncRibbon=()=>{const s=state(),open=s.expandedView?$('sheet-workspace').classList.contains('sheet-expanded-tools'):ribbonOpen;panel.hidden=!open;ribbonToggle.setAttribute('aria-expanded',String(open));text(ribbonToggle,open?'إخفاء أدوات الجدول ▴':'إظهار أدوات الجدول ▾',open?'Hide sheet tools ▴':'Show sheet tools ▾');};
    ribbonToggle.onclick=()=>{h.commitEdit();closeMenus();ribbonOpen=!ribbonOpen;try{localStorage.setItem('ibta_sheet_ribbon',JSON.stringify({open:ribbonOpen}));}catch{}syncRibbon();};syncRibbon();
    for(const child of [...toolbar.children])if(child.classList.contains('sheet-ribbon-group'))child.remove();
    tools.remove();toolbar.classList.add('sheet-clean-toolbar');
    const files=TraineeFiles.mount({...h,host:essential,text,action});
    essential.prepend(ribbonToggle);
    return {syncRibbon,closeFiles(){closeMenus();columnsDialog.close();files.close();},translate(){closeMenus();files.translate();syncRibbon();for(const el of document.querySelectorAll('[data-excel-ar]'))el.textContent=tr(el.dataset.excelAr,el.dataset.excelEn);},paint(s){fontName.value=s.font||'IBM Plex Sans Arabic';const size=s.size||state().formatting.fontSize;$('sheet-font-size').textContent=size+' px';$('sheet-font-minus').disabled=size<=10;$('sheet-font-plus').disabled=size>=32;for(const field of ['italic','underline','strike'])$('sheet-'+field).setAttribute('aria-pressed',String(!!s[field]));}};
  }
  return {mount};
})();
