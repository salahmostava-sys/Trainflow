/* Private, versioned trainee workspaces. No student data is stored in browser storage. */
const Trainees=(()=>{
  'use strict';
  const D=TraineeData,$=id=>document.getElementById(id);
  const baseLabels=[['الكود','Code'],['البريد الإلكتروني','Email'],['الاسم بالعربي','Arabic name'],['الاسم بالإنجليزي','English name'],['رقم الهوية / الإقامة','National / Iqama ID'],['الجوال','Phone'],['الجهة','Organization'],['الاختبار','Exam'],['تاريخ الاختبار','Exam date'],['اسم المستخدم','Username'],['كلمة المرور','Password'],['النتيجة','Result'],['AnyDesk ID','AnyDesk ID']];
  function colLetter(c){let s='';c++;while(c>0){const m=(c-1)%26;s=String.fromCharCode(65+m)+s;c=Math.floor((c-m)/26);}return s;}
  function colCount(){let count=52;if(cells&&cells.length&&cells[0]&&cells[0].length>count)count=cells[0].length;if(formatting&&formatting.headers){for(const k of Object.keys(formatting.headers)){const idx=Number(k);if(idx>=count)count=idx+1;}}return Math.min(D.MAX_COLS,count);}
  function getColLabel(c){if(formatting&&formatting.headers&&formatting.headers[c])return [formatting.headers[c],formatting.headers[c]];if(c<baseLabels.length)return baseLabels[c];const l=colLetter(c);return ['عمود '+l,'Column '+l];}
  function allLabels(){const n=colCount(),res=[];for(let c=0;c<n;c++)res.push(getColLabel(c));return res;}
  const labels=new Proxy(baseLabels,{get(target,prop){if(prop==='length')return colCount();if(prop==='map')return fn=>allLabels().map(fn);if(prop==='forEach')return fn=>allLabels().forEach(fn);if(prop==='filter')return fn=>allLabels().filter(fn);if(prop==='slice')return (s,e)=>allLabels().slice(s,e);if(typeof prop==='string'&&/^\d+$/.test(prop)){return getColLabel(Number(prop));}return target[prop];}});
  const tr=(ar,en)=>currentLang==='ar'?ar:en;
  let owner='',cells=[],version=0,revision=0,savedRevision=0,loaded=false,loading=false,epoch=0;
  let timer,saving=null,history=[],future=[],view=[],sortCol=-1,sortDir=1,anchor={r:0,c:0},cursor={r:0,c:0},editing=null;
  let members=[],mode='sheet',codeMode='owned',codeBusy=false,initialized=false;
  let dragging=false,dragMoved=false,rowDragging=false,columnDragging=false,skipSelectionClick=false;
  let extraSelections=[],selectionKind='cell';
  let formatting=D.defaultFormat(),duplicateIds=new Map();
  let rowOffsets=[0],rowHeights=new Map(),drawnStart=-1,drawnEnd=-1,drawnColumns='',scrollFrame=0;
  let visibleCache=null,columnOptionsKey='',headersKey='',mergeCacheFormat=null,mergeCache=[];
  let excelTools=null,prometricTools=null,certificateTools=null,formulaCache=new Map();
  const searchRows=new WeakMap();
  let lastDataRow=-1;
  let positionTimer,restoringPosition=false;
  const positionKey=()=> 'ibta_trainee_position:'+Cloud.userId()+':'+owner;
  function savePosition(){
    clearTimeout(positionTimer);if(!initialized||!loaded||loading||restoringPosition||!owner||!view.length)return;
    const scroll=$('sheet-grid').parentElement;if(!$('panel-trainees').classList.contains('active')||!scroll.clientHeight)return;const first=rowAtOffset(scroll.scrollTop);
    try{localStorage.setItem(positionKey(),JSON.stringify({row:view[cursor.r]??0,column:cursor.c,firstRow:view[first]??0,offset:Math.max(0,scroll.scrollTop-rowOffsets[first]),left:scroll.scrollLeft}));}catch{}
  }
  function schedulePosition(){if(loaded&&!loading&&!restoringPosition){clearTimeout(positionTimer);positionTimer=setTimeout(savePosition,200);}}
  function restorePosition(){
    let saved;try{saved=JSON.parse(localStorage.getItem(positionKey())||'null');}catch{}if(!saved||!view.length)return;
    const valid=value=>Number.isInteger(value)&&value>=0&&value<D.MAX_ROWS;
    if(!valid(saved.row)||!valid(saved.firstRow)||!Number.isInteger(saved.column)||saved.column<0||saved.column>=D.MAX_COLS)return;
    restoringPosition=true;
    try{
      const r=view.indexOf(Math.min(saved.row,totalInputRows()-1)),first=view.indexOf(Math.min(saved.firstRow,totalInputRows()-1)),cols=visibleCols();
      extraSelections=[];anchor=cursor={r:Math.max(0,r),c:cols.includes(saved.column)?saved.column:cols[0]};
      const scroll=$('sheet-grid').parentElement;
      scroll.scrollTop=(rowOffsets[Math.max(0,first)]||0)+(Number.isFinite(saved.offset)?Math.max(0,Math.min(saved.offset,400)):0);
      scroll.scrollLeft=Number.isFinite(saved.left)?saved.left:0;drawRows(true);
      $('sheet-grid').querySelector(`td[data-v="${cursor.r}"][data-col="${cursor.c}"]`)?.focus({preventScroll:true});
    }finally{restoringPosition=false;}
  }
  function updateLastDataRow(){lastDataRow=cells.length-1;while(lastDataRow>=0&&!cells[lastDataRow].some(Boolean))lastDataRow--;}
  const totalInputRows=()=>Math.min(D.MAX_ROWS,Math.max(cells.length,lastDataRow+1001));
  let excelView={wrap:false,freeze:false,zoom:100};
  let expandedView=false,previousViewZoom=null;
  try{const pref=JSON.parse(localStorage.getItem('ibta_sheet_view')||'{}');excelView={wrap:pref.wrap===true,freeze:pref.freeze===true,zoom:Number.isInteger(pref.zoom)&&pref.zoom>=50&&pref.zoom<=200?pref.zoom:100};}catch{}
  function setZoom(value){
    if(expandedView)previousViewZoom=null;
    const previous=excelView.zoom,scroll=$('sheet-grid').parentElement,numeric=Number(value);
    excelView.zoom=Math.max(50,Math.min(200,Math.round(Number.isFinite(numeric)?numeric:previous)));
    applyExcelView();scroll.scrollLeft*=excelView.zoom/previous;scroll.scrollTop*=excelView.zoom/previous;resetRowHeights();rebuildRowOffsets();drawRows(true);
    saveExcelView();
  }
  function saveExcelView(){try{localStorage.setItem('ibta_sheet_view',JSON.stringify({...excelView,zoom:previousViewZoom??excelView.zoom}));}catch{}}
  function expandedZoom(){const scroll=$('sheet-grid').parentElement,head=$('sheet-grid').querySelector('thead').getBoundingClientRect().height;const row=Math.max(16,formatting.fontSize*1.2);return Math.max(50,Math.min(previousViewZoom??excelView.zoom,Math.floor(((scroll.clientHeight-head-18)/45-1)/row*10)*10));}
  function setExpandedView(active){
    if(!initialized||expandedView===active)return;commitEdit();const grid=$('sheet-grid'),scroll=grid.parentElement,first=rowAtOffset(scroll.scrollTop),offset=scroll.scrollTop-rowOffsets[first],oldZoom=excelView.zoom,left=scroll.scrollLeft;
    expandedView=active;$('sheet-workspace').classList.toggle('sheet-expanded-view',active);document.body.classList.toggle('sheet-expanded-open',active);
    $('sheet-expanded').setAttribute('aria-pressed',String(active));$('sheet-workspace').classList.remove('sheet-expanded-tools');$('sheet-expanded-tools').setAttribute('aria-pressed','false');
    excelTools?.syncRibbon();
    if(typeof TraineeReports!=='undefined')TraineeReports.syncExpanded?.(active);
    if(active){previousViewZoom=excelView.zoom;excelView.zoom=expandedZoom();}else{excelView.zoom=previousViewZoom??excelView.zoom;previousViewZoom=null;}
    applyExcelView();resetRowHeights();rebuildRowOffsets();const top=rowOffsets[first]+offset*excelView.zoom/oldZoom;scroll.scrollTop=top;scroll.scrollLeft=left*excelView.zoom/oldZoom;drawRows(true);
    const measuredTop=rowOffsets[first]+offset*excelView.zoom/oldZoom;if(Math.abs(scroll.scrollTop-measuredTop)>1){scroll.scrollTop=measuredTop;drawRows(true);}
    if(active)$('sheet-expanded-close').focus({preventScroll:true});else $('sheet-expanded').focus({preventScroll:true});
  }
  function applyExcelView(){
    const grid=$('sheet-grid');if(!grid)return;
    grid.style.setProperty('--sheet-zoom',String(excelView.zoom/100));
    $('sheet-zoom-slider').value=String(excelView.zoom);if(document.activeElement!==$('sheet-zoom-reset'))$('sheet-zoom-reset').value=excelView.zoom+'%';
    $('sheet-zoom-out').disabled=excelView.zoom<=50;$('sheet-zoom-in').disabled=excelView.zoom>=200;
    grid.classList.toggle('sheet-wrap-text',excelView.wrap);
    grid.classList.toggle('sheet-freeze-column',excelView.freeze);
    grid.querySelectorAll('.sheet-frozen-cell').forEach(el=>el.classList.remove('sheet-frozen-cell'));
    const first=visibleCols()[0];grid.querySelectorAll('[data-col="'+first+'"]').forEach(el=>el.classList.add('sheet-frozen-cell'));
    for(const key of ['wrap','freeze'])$('sheet-'+key)?.setAttribute('aria-pressed',String(excelView[key]));
  }
  let hoverTimer,hoverHideTimer,detailTimer,hoverCell=null,detailKey='',detailPage=0,detailSource=-1;
  let colWidths={};
  try{colWidths=JSON.parse(localStorage.getItem('ibta_trainee_col_widths')||'{}')||{};}catch{}
  function applySavedColWidths(){
    const ws=$('sheet-workspace');if(!ws)return;
    Object.entries(colWidths).forEach(([c,w])=>{ws.style.setProperty('--col-w-'+c,w+'px');});
  }
  function setColumnWidth(c,width){
    colWidths[c]=Math.round(width);
    const ws=$('sheet-workspace');if(ws)ws.style.setProperty('--col-w-'+c,width+'px');
    queueDraw(true);
  }
  function resetColumnWidth(c){
    delete colWidths[c];
    const ws=$('sheet-workspace');if(ws)ws.style.removeProperty('--col-w-'+c);
    saveColumnWidths();
  }
  function saveColumnWidths(){
    try{localStorage.setItem('ibta_trainee_col_widths',JSON.stringify(colWidths));}catch{}
  }
  let cellAlignments={};
  try{cellAlignments=JSON.parse(localStorage.getItem('ibta_trainee_alignments')||'{}')||{};}catch{}
  function getCellAlign(idx,col){return formatting.styles[idx+':'+col]?.align||cellAlignments[(owner||'default')+':'+idx+':'+col]||'';}
  function setCellAlign(idx,col,align){
    const key=(owner||'default')+':'+idx+':'+col;
    if(!align)delete cellAlignments[key];else cellAlignments[key]=align;
  }
  function saveAlignments(){try{localStorage.setItem('ibta_trainee_alignments',JSON.stringify(cellAlignments));}catch{}}
  function setSelectionAlignment(align){
    if(!loaded||loading)return;formatSelection({align});
  }
  function shiftStylesOnInsert(fmt,insertIdx){
    const next=D.format(fmt);next.styles={};
    for(const [key,style]of Object.entries(fmt.styles)){
      const [r,c]=key.split(':').map(Number);
      const target=r>=insertIdx?r+1:r;
      if(target<D.MAX_ROWS){const value={...style};if(value.mergeRows&&r<insertIdx&&r+value.mergeRows>insertIdx)value.mergeRows++;next.styles[target+':'+c]=value;}
    }
    return next;
  }
  function shiftAlignmentsOnInsert(insertIdx){
    const prefix=(owner||'default')+':',updated={};
    for(const [key,val]of Object.entries(cellAlignments)){
      if(key.startsWith(prefix)){
        const rest=key.slice(prefix.length);
        const [r,c]=rest.split(':').map(Number);
        const target=r>=insertIdx?r+1:r;
        updated[prefix+target+':'+c]=val;
      }else updated[key]=val;
    }
    cellAlignments=updated;saveAlignments();
  }
  function insertRow(pos='above'){
    commitEdit();
    if(cells.length>=D.MAX_ROWS)return limitError();
    let targetIdx=view[cursor.r]??cells.length;
    if(pos==='below')targetIdx++;
    const next=cells.slice();
    while(next.length<targetIdx)next.push(D.blank());
    next.splice(targetIdx,0,D.blank());
    const nextFmt=shiftStylesOnInsert(formatting,targetIdx);
    shiftAlignmentsOnInsert(targetIdx);
    change(next,true,nextFmt);
    focusCell(pos==='above'?cursor.r:cursor.r+1,cursor.c);
    message(tr('تم إدراج صف جديد','New row inserted'));
  }
  function addBulkRows(count=1000){
    commitEdit();clearFilters();
    const n=Math.max(1,Math.min(Number(count)||1000,D.MAX_ROWS-cells.length));
    if(cells.length+n>D.MAX_ROWS)return limitError();
    const startIdx=cells.length;
    const newRows=Array.from({length:n},()=>D.blank());
    const next=cells.concat(newRows);
    change(next,false);
    render();
    focusCell(startIdx,0);
    message(tr(`تمت إضافة ${n.toLocaleString()} صف دفعة واحدة بنجاح`,`Added ${n.toLocaleString()} rows at once successfully`));
  }
  function deleteSelectedRows(){
    commitEdit();const ids=new Set(selectedRows().map(r=>view[r]));
    if(!ids.size||!confirm(tr((ids.size>1?'حذف الصفوف المحددة؟':'حذف الصف المحدد؟'),(ids.size>1?'Delete selected rows?':'Delete selected row?'))))return;
    const next=D.removeRows(cells,formatting,ids);change(next.cells,true,next.format);
    message(tr(ids.size>1?'تم حذف الصفوف المحددة':'تم حذف الصف المحدد',ids.size>1?'Selected rows deleted':'Selected row deleted'));
  }
  async function cutSelection(){
    if(editing)return;
    if(await copySelection()){clearSelection();message(tr('تم القص إلى الحافظة','Cut to clipboard'));}
  }
  async function copySelection(){
    if(editing||!loaded)return false;const text=selectionText();let copied=false;
    // Plain text works in any application; HTML keeps the selected table in Excel.
    if(navigator.clipboard?.write&&typeof ClipboardItem!=='undefined')try{
      await navigator.clipboard.write([new ClipboardItem({'text/plain':new Blob([text],{type:'text/plain'}),'text/html':new Blob([selectionHtml()],{type:'text/html'})})]);copied=true;
    }catch{}
    if(!copied)copied=await copyText(text);
    if(copied)message(tr('تم النسخ إلى الحافظة','Copied to clipboard'));
    return copied;
  }
  function executePaste(values){
    if(!values||!values.length)return;
    if(!singleSelection())return;
    if(filtered()&&values.length>1){message(tr('امسح الفلاتر والفرز قبل لصق عدة صفوف.','Clear filters and sorting before pasting multiple rows.'),true);return;}
    if(!cells.length){cells=[D.blank()];revision++;}
    let [r,,c]=bounds();let idx=view[r];
    if(idx===undefined){idx=cells.length;r=Math.max(0,view.length);}
    const width=Math.max(...values.map(v=>v.length));
    const availCols=visibleCols().filter(col=>col>=c);
    const targets=Array.from({length:width},(_,col)=>col<availCols.length?availCols[col]:(colCount()+col-availCols.length)),maxTargetCol=Math.max(...targets);
    const valuesWithBlanks=values.map(row=>Array.from({length:width},(_,col)=>row[col]||''));
    const next=D.pasteMapped(cells,valuesWithBlanks,idx,targets);
    extraSelections=[];change(next);anchor={r,c};cursor={r:Math.max(0,r+values.length-1),c:maxTargetCol};paint();
    message(tr('تم اللصق بنجاح ('+values.length+' صف، '+width+' عمود)','Pasted successfully ('+values.length+' rows, '+width+' cols)'));
  }
  async function pasteSelection(){
    if(editing)return;
    try{
      const text=await navigator.clipboard.readText();if(!text)return;
      const values=D.parse(text);executePaste(values);
    }catch{limitError();}
  }
  function initContextMenu(){
    // Column actions keep the 13 fixed operational fields in their original positions.
    if($('sheet-context-menu'))return;
    const menu=node('div',undefined,{id:'sheet-context-menu',class:'sheet-context-menu',hidden:''});
    menu.innerHTML=`
      <button type="button" data-action="cut"><span>✂️ <span class="sheet-menu-label"></span></span><span class="sheet-menu-shortcut">Ctrl+X</span></button>
      <button type="button" data-action="copy"><span>📋 <span class="sheet-menu-label"></span></span><span class="sheet-menu-shortcut">Ctrl+C</span></button>
      <button type="button" data-action="paste"><span>📄 <span class="sheet-menu-label"></span></span><span class="sheet-menu-shortcut">Ctrl+V</span></button>
      <hr>
      <button type="button" data-action="insert-above"><span>⬆️ <span class="sheet-menu-label"></span></span></button>
      <button type="button" data-action="insert-below"><span>⬇️ <span class="sheet-menu-label"></span></span></button>
      <button type="button" data-action="insert-1000"><span>➕ <span class="sheet-menu-label"></span></span></button>
      <button type="button" data-action="delete-row"><span>🗑️ <span class="sheet-menu-label"></span></span></button>
      <button type="button" data-action="insert-column-left"><span>← <span class="sheet-menu-label"></span></span></button>
      <button type="button" data-action="insert-column-right"><span>→ <span class="sheet-menu-label"></span></span></button>
      <button type="button" data-action="delete-column"><span>🗑️ <span class="sheet-menu-label"></span></span></button>
      <hr>
      <button type="button" data-action="clear-contents"><span>🧹 <span class="sheet-menu-label"></span></span><span class="sheet-menu-shortcut">Del</span></button>
      <button type="button" data-action="delete-left"><span>← <span class="sheet-menu-label"></span></span></button>
      <button type="button" data-action="delete-right"><span>→ <span class="sheet-menu-label"></span></span></button>
      <button type="button" data-action="clear-format"><span>✨ <span class="sheet-menu-label"></span></span></button>
      <hr>
      <button type="button" data-action="select-all"><span>☑️ <span class="sheet-menu-label"></span></span><span class="sheet-menu-shortcut">Ctrl+A</span></button>
    `;
    document.body.append(menu);
    menu.addEventListener('click',async e=>{
      const btn=e.target.closest('button[data-action]');if(!btn)return;
      const action=btn.dataset.action;closeContextMenu();
      switch(action){
        case 'cut':await cutSelection();break;
        case 'copy':await copySelection();break;
        case 'paste':await pasteSelection();break;
        case 'insert-above':insertRow('above');break;
        case 'insert-below':insertRow('below');break;
        case 'insert-1000':addBulkRows(1000);break;
        case 'delete-row':deleteSelectedRows();break;
        case 'insert-column-left':editColumns('left');break;
        case 'insert-column-right':editColumns('right');break;
        case 'delete-column':editColumns('delete');break;
        case 'clear-contents':clearSelection();break;
        case 'delete-left':deleteSelectedCells('left');break;
        case 'delete-right':deleteSelectedCells('right');break;
        case 'clear-format':formatSelection(null);break;
        case 'select-all':extraSelections=[];anchor={r:0,c:0};cursor={r:Math.max(0,view.length-1),c:colCount()-1};paint();break;
      }
    });
    document.addEventListener('pointerdown',e=>{if(!e.target.closest('#sheet-context-menu'))closeContextMenu();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeContextMenu();});
  }
  function openContextMenu(clientX,clientY){
    const menu=$('sheet-context-menu');if(!menu)return;
    const remove=menu.querySelector('[data-action="delete-column"]');remove.disabled=bounds()[2]<D.BASE_WIDTH;remove.title=remove.disabled?tr('الأعمدة الأساسية ثابتة؛ يمكن إخفاؤها.','Core columns are fixed; they can be hidden.') : '';
    menu.hidden=false;
    const menuW=menu.offsetWidth||190,menuH=menu.offsetHeight||270;
    let x=clientX,y=clientY;
    if(x+menuW>window.innerWidth-10)x=Math.max(10,window.innerWidth-menuW-10);
    if(y+menuH>window.innerHeight-10)y=Math.max(10,window.innerHeight-menuH-10);
    menu.style.left=x+'px';menu.style.top=y+'px';
  }
  function closeContextMenu(){const menu=$('sheet-context-menu');if(menu)menu.hidden=true;}
  function editColumns(action){
    if(!loaded)return;if(!singleSelection())return;commitEdit();const [,,c1,c2]=bounds(),insert=action!=='delete';
    let start=insert?Math.max(D.BASE_WIDTH,cursor.c+((action==='right')!==(formatting.direction==='rtl')?1:0)):c1;
    const count=insert?1:c2-c1+1;
    if(!insert&&(start<D.BASE_WIDTH||!confirm(tr('حذف الأعمدة المحددة بكل بياناتها؟ يمكنك التراجع.','Delete selected columns and their data? You can undo.'))))return;
    let name='';if(insert){name=prompt(tr('اسم العمود الجديد:','New column name:'),tr('عمود جديد','New column'));if(name===null)return;}
    let next;try{next=D.columns(cells,formatting,start,count,insert,colCount());}catch{limitError();return;}
    if(insert)next.format.headers[start]=name.trim()||tr('عمود جديد','New column');
    change(next.cells,false,next.format);
    const prefix=(owner||'default')+':',mapped={};
    for(const [key,value]of Object.entries(cellAlignments)){if(!key.startsWith(prefix)){mapped[key]=value;continue;}const [r,c]=key.slice(prefix.length).split(':').map(Number),target=insert?(c>=start?c+count:c):(c<start?c:c>=start+count?c-count:null);if(target!==null)mapped[prefix+r+':'+target]=value;}
    cellAlignments=mapped;saveAlignments();extraSelections=[];anchor=cursor={r:cursor.r,c:Math.min(start,colCount()-1)};render();
    message(tr('تم تحديث الأعمدة. يمكنك التراجع.','Columns updated. You can undo.'));
  }
  function updateContextMenuTranslations(){
    const menu=$('sheet-context-menu');if(!menu)return;
    const labels={
      'cut':tr('قص','Cut'),'copy':tr('نسخ','Copy'),'paste':tr('لصق','Paste'),
      'insert-above':tr('إدراج صف لأعلى','Insert row above'),'insert-below':tr('إدراج صف لأسفل','Insert row below'),
      'insert-1000':tr('إدراج 1000 صف في الأسفل','Insert 1,000 rows at bottom'),
      'delete-row':tr('حذف الصف','Delete row'),'clear-contents':tr('مسح المحتويات','Clear contents'),
      'clear-format':tr('مسح التنسيق','Clear formatting'),
      'insert-column-left':tr('إضافة عمود على اليسار','Insert column left'),
      'insert-column-right':tr('إضافة عمود على اليمين','Insert column right'),
      'delete-column':tr('حذف الأعمدة المحددة','Delete selected columns'),
      'delete-left':tr('حذف الخلايا وإزاحة لليسار','Delete cells and shift left'),
      'delete-right':tr('حذف الخلايا وإزاحة لليمين','Delete cells and shift right'),
      'select-all':tr('تحديد الكل','Select all')
    };
    menu.querySelectorAll('button[data-action]').forEach(b=>{
      const act=b.dataset.action,span=b.querySelector('.sheet-menu-label');
      if(span&&labels[act])span.textContent=labels[act];
    });
  }
  function initFindDialog(){
    if($('sheet-find-dialog'))return;
    const dlg=node('dialog',undefined,{id:'sheet-find-dialog',class:'sheet-find-dialog','aria-labelledby':'sheet-find-title'});
    dlg.innerHTML=`
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border);padding-bottom:10px;">
        <h3 id="sheet-find-title" style="margin:0;font-size:15px;font-weight:700;"></h3>
        <button type="button" id="sheet-find-close" style="border:0;background:transparent;font-size:18px;cursor:pointer;color:var(--muted);padding:2px 8px;line-height:1;" aria-label="Close">✕</button>
      </div>
      <div class="sheet-find-body">
        <div class="sheet-find-row">
          <label for="sheet-find-input" id="sheet-find-label"></label>
          <input type="text" id="sheet-find-input" autocomplete="off" spellcheck="false">
        </div>
        <div class="sheet-find-row">
          <label for="sheet-replace-input" id="sheet-replace-label"></label>
          <input type="text" id="sheet-replace-input" autocomplete="off" spellcheck="false">
        </div>
        <div class="sheet-find-options">
          <label><input type="checkbox" id="sheet-find-case"><span id="sheet-find-case-label"></span></label>
          <label><input type="checkbox" id="sheet-find-entire"><span id="sheet-find-entire-label"></span></label>
        </div>
        <p id="sheet-find-status" class="sheet-find-status" role="status"></p>
        <div class="sheet-find-actions">
          <button type="button" id="sheet-find-next" class="sheet-primary"></button>
          <button type="button" id="sheet-find-replace-one"></button>
          <button type="button" id="sheet-find-replace-all"></button>
        </div>
      </div>
    `;
    document.body.append(dlg);
    $('sheet-find-close').onclick=()=>dlg.close();
    $('sheet-find-next').onclick=findNext;
    $('sheet-find-replace-one').onclick=replaceOne;
    $('sheet-find-replace-all').onclick=replaceAll;
    $('sheet-find-input').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();findNext();}});
    $('sheet-replace-input').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();replaceOne();}});
    dlg.addEventListener('click',e=>{
      if(e.target===dlg){
        const rect=dlg.getBoundingClientRect();
        if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)dlg.close();
      }
    });
  }
  function openFindDialog(isReplace=false){
    commitEdit();const dlg=$('sheet-find-dialog');if(!dlg)return;
    dlg.dir=formatting.direction;$('sheet-find-status').textContent='';
    if(!dlg.open)dlg.showModal();
    if(isReplace){$('sheet-replace-input')?.focus();}
    else{$('sheet-find-input')?.focus();$('sheet-find-input')?.select();}
  }
  function findNext(){
    const query=$('sheet-find-input').value;
    if(!query){$('sheet-find-status').textContent=tr('يرجى كتابة نص للبحث','Please enter search text');return null;}
    const matchCase=$('sheet-find-case').checked,matchEntire=$('sheet-find-entire').checked;
    const q=matchCase?query:query.toLowerCase(),cols=visibleCols();
    if(!cols.length||!view.length){$('sheet-find-status').textContent=tr('لا توجد خلايا متاحة للبحث','No visible cells to search');return null;}
    const total=view.length*cols.length,curColIdx=Math.max(0,cols.indexOf(cursor.c));
    const startPos=cursor.r*cols.length+curColIdx+1;
    for(let k=0;k<total;k++){
      const pos=(startPos+k)%total,vr=Math.floor(pos/cols.length),c=cols[pos%cols.length],idx=view[vr];
      const cellVal=cells[idx]?.[c]||'',val=matchCase?cellVal:cellVal.toLowerCase();
      const isMatch=matchEntire?val===q:val.includes(q);
      if(isMatch){
        focusCell(vr,c);
        $('sheet-find-status').textContent=tr(`تم العثور على: ${String.fromCharCode(65+c)}${idx+1}`,`Found at ${String.fromCharCode(65+c)}${idx+1}`);
        return {vr,c,idx,val:cellVal};
      }
    }
    $('sheet-find-status').textContent=tr('لم يتم العثور على أي نتائج مطابقة','No matches found');
    return null;
  }
  function replaceOne(){
    const query=$('sheet-find-input').value;
    if(!query){$('sheet-find-status').textContent=tr('يرجى كتابة نص للبحث','Please enter search text');return;}
    const replacement=$('sheet-replace-input').value,matchCase=$('sheet-find-case').checked,matchEntire=$('sheet-find-entire').checked;
    const q=matchCase?query:query.toLowerCase(),curIdx=view[cursor.r],curVal=cells[curIdx]?.[cursor.c]||'';
    const val=matchCase?curVal:curVal.toLowerCase(),matches=matchEntire?val===q:val.includes(q);
    if(matches){
      let newVal='';
      if(matchEntire)newVal=replacement;
      else if(matchCase)newVal=curVal.replace(query,replacement);
      else{
        const regex=new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i');
        newVal=curVal.replace(regex,replacement);
      }
      change(D.paste(cells,[[newVal]],curIdx,cursor.c));
      render();
      $('sheet-find-status').textContent=tr('تم استبدال الخلية المحددة','Replaced current cell');
    }
    findNext();
  }
  function replaceAll(){
    const query=$('sheet-find-input').value;
    if(!query){$('sheet-find-status').textContent=tr('يرجى كتابة نص للبحث','Please enter search text');return;}
    const replacement=$('sheet-replace-input').value,matchCase=$('sheet-find-case').checked,matchEntire=$('sheet-find-entire').checked;
    const q=matchCase?query:query.toLowerCase(),cols=visibleCols();
    let count=0,next=cells.map(r=>[...r]);
    const regex=matchCase?null:new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi');
    for(let i=0;i<next.length;i++){
      for(const c of cols){
        const cellVal=next[i][c]||'';if(!cellVal)continue;
        const val=matchCase?cellVal:cellVal.toLowerCase(),matches=matchEntire?val===q:val.includes(q);
        if(matches){
          if(matchEntire)next[i][c]=replacement;
          else if(matchCase)next[i][c]=cellVal.replaceAll(query,replacement);
          else next[i][c]=cellVal.replace(regex,replacement);
          count++;
        }
      }
    }
    if(count>0){
      change(D.normalize(next));render();
      $('sheet-find-status').textContent=tr(`تم استبدال ${count} عنصر بنجاح`,`Replaced ${count} occurrences`);
      message(tr(`تم استبدال ${count} عنصر بنجاح`,`Replaced ${count} occurrences`));
    }else{
      $('sheet-find-status').textContent=tr('لم يتم العثور على أي نتائج للاستبدال','No occurrences found to replace');
    }
  }
  function initColumnResize(e,colIndex,thEl){
    e.preventDefault();e.stopPropagation();
    const zoom=excelView.zoom/100,startX=e.clientX,startWidth=thEl.getBoundingClientRect().width/zoom;
    const isRtl=formatting.direction==='rtl';
    const resizer=thEl.querySelector('.sheet-col-resizer');
    resizer?.classList.add('sheet-resizing');
    function onPointerMove(moveEvent){
      const delta=(moveEvent.clientX-startX)*(isRtl?-1:1)/zoom;
      const newWidth=Math.max(45,Math.min(600,Math.round(startWidth+delta)));
      setColumnWidth(colIndex,newWidth);
    }
    function onPointerUp(){
      resizer?.classList.remove('sheet-resizing');
      document.removeEventListener('pointermove',onPointerMove);
      document.removeEventListener('pointerup',onPointerUp);
      saveColumnWidths();
    }
    document.addEventListener('pointermove',onPointerMove);
    document.addEventListener('pointerup',onPointerUp);
  }
  const visibleCols=()=>{const width=cells[0]?.length||0;if(visibleCache?.format===formatting&&visibleCache.width===width)return visibleCache.cols;const hidden=new Set(formatting.hidden),cols=Array.from({length:colCount()},(_,c)=>c).filter(c=>!hidden.has(c));visibleCache={format:formatting,width,cols};return cols;};
  // Every data mutation creates a new matrix, so history can retain the old matrix safely.
  const snapshot=()=>({cells,format:D.format(formatting),alignments:{...cellAlignments}});
  function node(tag,text,attrs={}){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;for(const [key,value]of Object.entries(attrs))el.setAttribute(key,value);return el;}
  function button(text,fn,cls){const b=node('button',text,{type:'button'});if(cls)b.className=cls;b.addEventListener('click',fn);return b;}
  const message=(text,error=false)=>{if(!$('sheet-status'))return;$('sheet-status').textContent=text;$('sheet-status').dataset.error=String(error);};
  const errorMessage=error=>{
    const code=String(error?.code||''),message=String(error?.message||'');
    if(/CONFLICT|23505/.test(message+' '+code))return tr('تم تعديل الجدول من نافذة أخرى. انسخ تعديلاتك ثم أعد التحميل.','Another window changed this sheet. Copy your edits, then reload.');
    if(/Invalid sheet|PAYLOAD_TOO_LARGE|CELL_LIMIT/.test(message))return tr('حجم الجدول أو بيانات التنسيق تجاوزت الحدود المسموحة. تعديلاتك ما زالت هنا؛ انسخها قبل إعادة التحميل.','Sheet size or formatting exceeds the allowed limits. Your edits are still here; copy them before reloading.');
    if(/AUTH_REQUIRED|ADMIN_REQUIRED|IBTA_NOT_APPROVED|permission denied/.test(message))return tr('تعذر الوصول للجدول بصلاحيات الحساب الحالية. انسخ تعديلاتك قبل إعادة تسجيل الدخول.','Your account cannot access this sheet. Copy your edits before signing in again.');
    const diagnostic=/^[A-Z][A-Z0-9_]{2,60}$/.test(message)?message:/^[A-Z0-9]{4,10}$/.test(code)?code:'';
    return tr('تعذر الحفظ أو التحميل. تعديلاتك الحالية ما زالت هنا؛ جرّب مرة أخرى.','Could not save or load. Your current edits are still here; please retry.')+(diagnostic?' ['+diagnostic+']':'');
  };
  function init(){
    if(initialized)return;initialized=true;
    setTimeout(()=>TraineeReports.mount($('sheet-workspace'),()=>({owner,rows:cells}),async()=>{commitEdit();return await flush();}),0);
    $('panel-trainees').innerHTML=`
      <div class="sheet-heading"><div><h2 id="sheet-title"></h2><p id="sheet-subtitle"></p></div></div>
      <div id="sheet-workspace" class="sheet-card">
        <div class="sheet-tools"><button type="button" id="sheet-add" class="sheet-primary"></button><button type="button" id="sheet-delete"></button><div class="sheet-add-col-wrap"><button type="button" id="sheet-add-col" class="sheet-primary"></button><div id="sheet-add-col-popover" class="sheet-add-col-popover" hidden></div></div><button type="button" id="sheet-find-btn"></button><button type="button" id="sheet-undo"></button><button type="button" id="sheet-redo"></button><button type="button" id="sheet-copy"></button><button type="button" id="sheet-save"></button><button type="button" id="sheet-reload"></button><span class="sheet-status" id="sheet-status" role="status" aria-live="polite"></span></div>
        <div class="sheet-format-tools">
          <details id="sheet-columns"><summary id="sheet-columns-title"></summary><div id="sheet-column-options"></div></details>
          <button type="button" id="sheet-font-minus">A−</button><output id="sheet-font-size"></output><button type="button" id="sheet-font-plus">A+</button>
          <label><span id="sheet-selection-size-label"></span><select id="sheet-selection-size"></select></label>
          <button type="button" id="sheet-bold"><b>B</b></button>
          <div class="sheet-align-group" role="group">
            <button type="button" id="sheet-align-right" title="محاذاة لليمين"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="3" y1="5" x2="21" y2="5"></line><line x1="9" y1="12" x2="21" y2="12"></line><line x1="5" y1="19" x2="21" y2="19"></line></svg></button>
            <button type="button" id="sheet-align-center" title="توسيط"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="4" y1="5" x2="20" y2="5"></line><line x1="7" y1="12" x2="17" y2="12"></line><line x1="5" y1="19" x2="19" y2="19"></line></svg></button>
            <button type="button" id="sheet-align-left" title="محاذاة لليسار"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="3" y1="5" x2="21" y2="5"></line><line x1="3" y1="12" x2="15" y2="12"></line><line x1="3" y1="19" x2="19" y2="19"></line></svg></button>
          </div>
          <label><span id="sheet-fill-label"></span><input type="color" id="sheet-fill" value="#ffffff"></label>
          <label><span id="sheet-text-color-label"></span><input type="color" id="sheet-text-color" value="#16324f"></label>
          <button type="button" id="sheet-clear-format"></button><button type="button" id="sheet-wrap" aria-pressed="false">التفاف النص / Wrap text</button><button type="button" id="sheet-freeze" aria-pressed="false">تثبيت أول عمود / Freeze first column</button><label><span id="sheet-direction-label"></span><select id="sheet-direction"><option value="rtl">يمين ← يسار</option><option value="ltr">Left → Right</option></select></label>
        </div>
        <div class="sheet-filters"><input id="sheet-search" type="search"><input id="sheet-org" type="search"><input id="sheet-date" type="search"><select id="sheet-result"></select><label class="sheet-duplicates-filter"><input type="checkbox" id="sheet-duplicates-only"><span id="sheet-duplicates-label"></span></label><button type="button" id="sheet-clear-filters"></button></div>
        <div class="sheet-scroll"><table class="sheet-grid" id="sheet-grid" role="grid" aria-label="Trainees"><thead></thead><tbody></tbody></table></div>
        <div class="sheet-add-rows-bar">
          <span id="sheet-add-prefix"></span>
          <input type="number" id="sheet-add-bulk-count" value="1000" min="1" max="100000" step="100" class="sheet-add-bulk-input" aria-label="عدد الصفوف المراد إضافتها">
          <span id="sheet-add-suffix"></span>
          <button type="button" id="sheet-add-bulk-btn" class="sheet-primary"></button>
        </div>
        <div class="sheet-footer"><p id="sheet-help"></p><span id="sheet-count"></span></div>
      </div>
      <div id="sheet-code-workspace" hidden><div class="sheet-code-tools" id="sheet-code-admin" hidden><button type="button" id="sheet-owned"></button><button type="button" id="sheet-pool"></button><button type="button" id="sheet-assign" class="sheet-primary"></button></div><div class="sheet-code-tools"><input id="sheet-code-search" type="search"><button type="button" id="sheet-code-refresh"></button><span id="sheet-code-count"></span></div><p class="sheet-notice" id="sheet-code-notice"></p><div class="sheet-card sheet-code-list" id="sheet-code-list"></div><p id="sheet-code-status" role="status"></p></div>`;
    const toolbar=$('sheet-workspace').querySelector('.sheet-tools');
    toolbar.append(node('button',undefined,{id:'sheet-delete-col',type:'button'}));
    for(const [label,ids] of [['الحافظة / Clipboard',['sheet-copy','sheet-undo','sheet-redo']],['الصفوف والأعمدة / Rows & columns',['sheet-add','sheet-delete','sheet-add-col','sheet-delete-col']],['تحرير وحفظ / Edit & save',['sheet-find-btn','sheet-save','sheet-reload']]]){
      const group=node('div',undefined,{class:'sheet-ribbon-group'}),actions=node('div',undefined,{class:'sheet-ribbon-actions'});
      for(const id of ids){const el=$(id);actions.append(id==='sheet-add-col'?el.parentElement:el);}
      const caption=node('small');caption.dataset.ar=label.split(' / ')[0];caption.dataset.en=label.split(' / ')[1];caption.textContent=tr(caption.dataset.ar,caption.dataset.en);
      group.append(actions,caption);if(ids.includes('sheet-save'))group.classList.add('sheet-essential-tools');toolbar.append(group);
    }
    toolbar.append($('sheet-status'));
    const localNote=node('small',undefined,{id:'sheet-local-note',class:'sheet-local-note'});$('sheet-workspace').querySelector('.sheet-format-tools').append(localNote);
    const more=button(tr('التنسيق وأدوات إضافية','Formatting & more tools'),()=>{const expanded=$('sheet-workspace').classList.toggle('sheet-show-tools');more.setAttribute('aria-expanded',String(expanded));});more.id='sheet-more-tools';more.className='sheet-mobile-toggle';more.setAttribute('aria-expanded','false');toolbar.before(more);
    for(const key of ['wrap','freeze'])$('sheet-'+key).onclick=()=>{commitEdit();excelView[key]=!excelView[key];saveExcelView();applyExcelView();resetRowHeights();rebuildRowOffsets();drawRows(true);};
    const zoomTools=node('div',undefined,{class:'sheet-zoom-tools',dir:'ltr'});
    zoomTools.innerHTML='<span id="sheet-zoom-label"></span><button type="button" id="sheet-zoom-out">−</button><input type="range" id="sheet-zoom-slider" min="50" max="200" step="1" value="100"><button type="button" id="sheet-zoom-in">+</button><input type="text" inputmode="numeric" autocomplete="off" spellcheck="false" id="sheet-zoom-reset" value="100%">';
    $('sheet-workspace').querySelector('.sheet-footer').append(zoomTools);
    const expandedButton=button('',()=>setExpandedView(true));expandedButton.id='sheet-expanded';expandedButton.setAttribute('aria-pressed','false');zoomTools.prepend(expandedButton);
    const expandedBar=node('div',undefined,{class:'sheet-expanded-bar'}),exit=button('',()=>setExpandedView(false)),expandedTools=button('',()=>{const show=$('sheet-workspace').classList.toggle('sheet-expanded-tools');expandedTools.setAttribute('aria-pressed',String(show));excelTools?.syncRibbon();queueDraw(true);});exit.id='sheet-expanded-close';expandedTools.id='sheet-expanded-tools';expandedTools.setAttribute('aria-pressed','false');expandedBar.append(exit,expandedTools,node('output',undefined,{id:'sheet-visible-rows',role:'status'}));$('sheet-workspace').prepend(expandedBar);
    $('sheet-zoom-out').onclick=()=>setZoom(excelView.zoom-10);$('sheet-zoom-in').onclick=()=>setZoom(excelView.zoom+10);
    $('sheet-zoom-slider').oninput=()=>setZoom($('sheet-zoom-slider').value);
    const zoomInput=$('sheet-zoom-reset'),commitZoom=()=>{
      const value=zoomInput.value.trim().replace(/[٠-٩]/g,d=>String(d.charCodeAt(0)-1632)).replace(/[۰-۹]/g,d=>String(d.charCodeAt(0)-1776)).replace(/[%٪]$/,'').trim();
      if(/^\d+(?:\.\d+)?$/.test(value)&&Number.isFinite(Number(value)))setZoom(Number(value));
      zoomInput.value=excelView.zoom+'%';
    };
    zoomInput.onfocus=()=>zoomInput.select();zoomInput.onblur=commitZoom;
    zoomInput.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();commitZoom();zoomInput.blur();}else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();zoomInput.value=excelView.zoom+'%';zoomInput.blur();}};
    const search=$('sheet-search'),searchGroup=node('div',undefined,{class:'sheet-search-group'});search.replaceWith(searchGroup);searchGroup.append(node('input',undefined,{id:'sheet-address',value:'A1','aria-label':'عنوان الخلية / Cell address',title:'D150',autocomplete:'off',spellcheck:'false',dir:'ltr'}),node('input',undefined,{id:'sheet-cell-content',type:'text',readonly:'',dir:'auto',autocomplete:'off',spellcheck:'false'}),search);
    $('sheet-address').addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();$('sheet-address').blur();paint();return;}
      if(e.key!=='Enter')return;e.preventDefault();if(!loaded)return;
      const match=/^([A-Z]+)([1-9]\d*)$/.exec($('sheet-address').value.trim().toUpperCase());
      let col=0;if(match)for(const letter of match[1])col=col*26+letter.charCodeAt(0)-64;
      const row=match?Number(match[2])-1:-1;col--;
      if(!match||row<0||row>=totalInputRows()||col<0||col>=labels.length||!visibleCols().includes(col)){message(tr('اكتب عنوان خلية موجودة وعمود ظاهر، مثل D150.','Enter an existing cell in a visible column, such as D150.'),true);return;}
      commitEdit();clearFilters();render();focusCell(row,col);
    });
    $('sheet-owner')?.addEventListener('change',async()=>{const next=$('sheet-owner').value;$('sheet-owner').value=owner;await switchOwner(next);});
    if($('sheet-mode'))$('sheet-mode').onclick=()=>setMode('sheet');if($('sheet-codes-mode'))$('sheet-codes-mode').onclick=()=>setMode('codes');
    $('sheet-save').onclick=()=>flush();$('sheet-reload').onclick=()=>reload();
    $('sheet-add').onclick=()=>{commitEdit();clearFilters();const r=cells.length;if(r>=D.MAX_ROWS)return limitError();const next=cells.slice();next.push(D.blank());change(next,false);render();focusCell(r,0);};

    $('sheet-add-bulk-btn').onclick=()=>{const count=Number($('sheet-add-bulk-count').value)||1000;addBulkRows(count);};
    $('sheet-add-bulk-count').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addBulkRows(Number($('sheet-add-bulk-count').value)||1000);}});
    $('sheet-delete').onclick=deleteSelectedRows;
    $('sheet-delete-col').onclick=()=>editColumns('delete');
    $('sheet-find-btn').onclick=()=>openFindDialog();
    $('sheet-add-col').onclick=(e)=>{e.stopPropagation();commitEdit();toggleAddColumnMenu();};
    document.addEventListener('click',e=>{if(!e.target.closest('.sheet-add-col-wrap')){$('sheet-add-col-popover')&&($('sheet-add-col-popover').hidden=true);}});
    $('sheet-font-minus').onclick=()=>adjustFont(-1);$('sheet-font-plus').onclick=()=>adjustFont(1);
    $('sheet-direction').onchange=()=>{commitEdit();const next=D.format(formatting);next.direction=$('sheet-direction').value;change(cells,true,next);};
    $('sheet-fill').onchange=()=>formatSelection({bg:$('sheet-fill').value});
    $('sheet-text-color').onchange=()=>formatSelection({color:$('sheet-text-color').value});
    $('sheet-bold').onclick=()=>formatSelection({bold:!formatting.styles[(view[cursor.r]??0)+':'+cursor.c]?.bold});
    $('sheet-align-right').onclick=()=>setSelectionAlignment('right');
    $('sheet-align-center').onclick=()=>setSelectionAlignment('center');
    $('sheet-align-left').onclick=()=>setSelectionAlignment('left');
    $('sheet-clear-format').onclick=()=>formatSelection(null);
    $('sheet-selection-size').onchange=()=>formatSelection({size:Number($('sheet-selection-size').value)});
    for(let size=10;size<=32;size++)$('sheet-selection-size').append(node('option',String(size),{value:size}));
    $('sheet-undo').onclick=()=>undo(false);$('sheet-redo').onclick=()=>undo(true);
    $('sheet-copy').onclick=async()=>{commitEdit();if(await copyText(D.tsv(cells)))message(tr('تم نسخ الجدول بالكامل','Entire sheet copied'));};
    ['sheet-search','sheet-org','sheet-date','sheet-result'].forEach(id=>$(id).addEventListener('input',()=>{commitEdit();extraSelections=[];anchor=cursor={r:0,c:0};render();}));
    $('sheet-duplicates-only').onchange=()=>{commitEdit();extraSelections=[];anchor=cursor={r:0,c:0};render();};
    $('sheet-clear-filters').onclick=()=>{commitEdit();clearFilters();render();};
    const grid=$('sheet-grid');
    grid.parentElement.addEventListener('scroll',()=>{queueDraw();schedulePosition();},{passive:true});
    new ResizeObserver(()=>{
      if(expandedView&&previousViewZoom!==null&&!editing&&!$('sheet-workspace').classList.contains('sheet-expanded-tools')){
        const zoom=expandedZoom();if(zoom!==excelView.zoom){
          const scroll=grid.parentElement,first=rowAtOffset(scroll.scrollTop),offset=scroll.scrollTop-rowOffsets[first],previous=excelView.zoom,left=scroll.scrollLeft;
          excelView.zoom=zoom;applyExcelView();resetRowHeights();rebuildRowOffsets();const top=rowOffsets[first]+offset*zoom/previous;scroll.scrollTop=top;scroll.scrollLeft=left*zoom/previous;drawRows(true);const measuredTop=rowOffsets[first]+offset*zoom/previous;if(Math.abs(scroll.scrollTop-measuredTop)>1){scroll.scrollTop=measuredTop;drawRows(true);}
        }
      }
      if(view.length>100||visibleCols().length>80||expandedView)queueDraw();
    }).observe(grid.parentElement);
    initDuplicateDetails();
    initTraineeDetails();
    initContextMenu();
    initFindDialog();
    grid.addEventListener('pointerdown',e=>{const td=e.target.closest('td[data-col]');if(e.target.closest('select')){commitEdit();if(td){extraSelections=[];cursor=anchor={r:+td.dataset.v,c:+td.dataset.col};paint();}return;}if(e.button!==0||e.pointerType==='touch'||!td||editing?.el===td)return;e.preventDefault();dragging=true;dragMoved=false;skipSelectionClick=true;selectCell(+td.dataset.v,+td.dataset.col,e.shiftKey,e.ctrlKey||e.metaKey);});
    grid.addEventListener('pointerover',e=>{
      if(columnDragging){const th=e.target.closest('thead th[data-col]');if(th&&!e.target.closest('.sheet-col-resizer')){const c=+th.dataset.col;if(c!==cursor.c){dragMoved=true;cursor={r:0,c};paint();}}return;}
      if(rowDragging){const th=e.target.closest('th[data-rowv]');if(th){const rv=+th.dataset.rowv;if(rv!==cursor.r){dragMoved=true;cursor={r:rv,c:colCount()-1};paint();}}return;}
      const td=e.target.closest('td[data-col]');if(!dragging||!td)return;const r=+td.dataset.v,c=+td.dataset.col;if(r!==cursor.r||c!==cursor.c){dragMoved=true;cursor={r,c};paint();}
    });
    document.addEventListener('pointerup',()=>{dragging=false;rowDragging=false;columnDragging=false;});
    document.addEventListener('pointercancel',()=>{dragging=false;rowDragging=false;columnDragging=false;skipSelectionClick=false;});
    grid.addEventListener('click',e=>{clearTimeout(detailTimer);if(e.target.closest('select'))return;const skip=skipSelectionClick;skipSelectionClick=false;if(dragMoved){dragMoved=false;return;}const td=e.target.closest('td[data-col]');if(!td||editing?.el===td)return;if(!skip)selectCell(+td.dataset.v,+td.dataset.col,e.shiftKey,e.ctrlKey||e.metaKey);if(!e.shiftKey&&!e.ctrlKey&&!e.metaKey&&td.classList.contains('sheet-id-duplicate')){const index=view[+td.dataset.v],token=epoch;detailTimer=setTimeout(()=>{if(token===epoch&&td.isConnected&&!editing)openDuplicateDetails(index);},250);}});
    grid.addEventListener('dblclick',e=>{clearTimeout(detailTimer);hideDuplicateHint();const td=e.target.closest('td[data-col]');if(td&&!(+td.dataset.col===3&&cells[view[+td.dataset.v]]?.[3]))beginEdit(td);});
    grid.addEventListener('keydown',keyDown);grid.addEventListener('paste',paste);
    document.addEventListener('keydown',handleUndoShortcut);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&expandedView&&!e.defaultPrevented&&!editing&&!document.querySelector('dialog[open]')&&$('sheet-context-menu')?.hidden!==false)setExpandedView(false);});
    grid.addEventListener('copy',e=>{if(editing)return;e.preventDefault();e.clipboardData.setData('text/plain',selectionText());e.clipboardData.setData('text/html',selectionHtml());});
    grid.addEventListener('cut',e=>{if(editing)return;e.preventDefault();e.clipboardData.setData('text/plain',selectionText());e.clipboardData.setData('text/html',selectionHtml());clearSelection();});
    grid.addEventListener('contextmenu',e=>{
      const td=e.target.closest('td[data-col]'),th=e.target.closest('th.sheet-rownum'),header=e.target.closest('thead th[data-col]');
      if(!td&&!th&&!header)return;
      e.preventDefault();
      if(td){
        const vr=+td.dataset.v,vc=+td.dataset.col;
        if(!isSelected(vr,vc))selectCell(vr,vc);
      }else if(header){
        const c=+header.dataset.col;if(!isSelected(0,c)||!isSelected(Math.max(0,view.length-1),c))selectColumn(c,e);
      }else if(th&&th.parentElement){
        const firstTd=th.parentElement.querySelector('td[data-col]');
        if(firstTd){
          const vr=+firstTd.dataset.v;
          if(!isSelected(vr,0)||!isSelected(vr,colCount()-1))selectRow(vr,e);
        }
      }
      openContextMenu(e.clientX,e.clientY);
    });
    $('sheet-owned').onclick=()=>{codeMode='owned';renderCodes();};$('sheet-pool').onclick=()=>{codeMode='pool';renderCodes();};
    $('sheet-assign').onclick=assign;$('sheet-code-search').oninput=renderCodes;
    $('sheet-code-refresh').onclick=async()=>{if(await Cloud.refresh())renderCodes();};
    window.addEventListener('beforeunload',e=>{savePosition();if(hasDraft()){e.preventDefault();e.returnValue='';}});
    window.addEventListener('pagehide',savePosition);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)savePosition();});
    if(typeof TraineeExcel!=='undefined')excelTools=TraineeExcel.mount({D,$,tr,node,button,
      state:()=>({cells,formatting,view,owner,loaded:loaded&&!loading,expandedView,labels:allLabels(),importLabels:baseLabels,bounds:bounds(),ranges:selectionRanges(),cursor:{...cursor},cols:visibleCols(),filtered:filtered()}),
      replaceSheet:(next,fmt)=>{change(next,false,fmt);const prefix=(owner||'default')+':';for(const key of Object.keys(cellAlignments))if(key.startsWith(prefix))delete cellAlignments[key];saveAlignments();clearFilters();render();focusCell(0,0);},
      commitEdit,change,formatSelection,focusCell,render,message,cutSelection,copySelection,pasteSelection,executePaste,
      insertRow,addColumn,editColumns,deleteSelectedRows,deleteSelectedCells,clearSelection,openFindDialog,
      select:(a,b)=>{commitEdit();extraSelections=[];anchor=a;cursor=b;paint();},
      flush,sort:(column,direction)=>{commitEdit();sortCol=column;sortDir=direction;render();},
      resetSort:()=>{sortCol=-1;render();},setColumnWidth,saveColumnWidths,resetColumnWidth});
    if(typeof TraineePrometric!=='undefined')prometricTools=TraineePrometric.mount({D,$,tr,node,button,
      state:()=>({cells,view,owner,epoch,user:Cloud.userId(),loaded:loaded&&!loading,editing:!!editing,bounds:bounds(),selectedRows:selectedRows().map(r=>view[r])}),commitEdit,change,flush,focusCell,message});
    if(typeof TraineeCertificate!=='undefined')certificateTools=TraineeCertificate.mount({D,$,tr,node,button,
      state:()=>({cells,view,owner,epoch,loaded:loaded&&!loading,cursor:{...cursor}}),catalog:()=>DEFAULT_KEYCODES,commitEdit,message});
    translate();
  }
  function addColumn(){
    if(!loaded)return;commitEdit();const c=colCount();if(c>=D.MAX_COLS)return limitError();
    const name=prompt(tr('اسم العمود الجديد:','New column name:'),tr('عمود ','Column ')+colLetter(c));if(name===null)return;
    const next=D.columns(cells,formatting,c,1,true,c);next.format.headers[c]=name.trim()||tr('عمود ','Column ')+colLetter(c);
    change(next.cells,true,next.format);focusCell(cursor.r,c);
  }
  function toggleAddColumnMenu(force){
    const popover=$('sheet-add-col-popover');
    if(!popover)return;
    const shouldOpen=force!==undefined?force:popover.hidden;
    if(!shouldOpen){popover.hidden=true;return;}
    popover.innerHTML='';
    const createBtn=button('+ '+tr('إنشاء عمود جديد','Create new column'),()=>{
      commitEdit();
      const newColIdx=colCount();
      if(newColIdx>=D.MAX_COLS){limitError();return;}
      const letter=colLetter(newColIdx);
      const colName=prompt(tr('اسم العمود الجديد (اختياري):','New column name (optional):'),tr('عمود ','Column ')+letter);
      if(colName===null)return;
      const nextFormat=D.format(formatting);
      if(colName&&colName.trim()){
        if(!nextFormat.headers)nextFormat.headers={};
        nextFormat.headers[newColIdx]=colName.trim();
      }
      const nextCells=cells.map(row=>{const r=[...row];while(r.length<=newColIdx)r.push('');return r;});
      if(!nextCells.length)nextCells.push(D.blank(newColIdx+1));
      change(nextCells,true,nextFormat);
      popover.hidden=true;
      focusCell(cursor.r,newColIdx);
      message(tr('تمت إضافة عمود جديد: ','New column added: ')+(nextFormat.headers?.[newColIdx]||letter));
    },'sheet-create-col-btn');
    popover.append(createBtn);

    const hiddenCols=formatting.hidden||[];
    if(hiddenCols.length>0){
      const sep=node('div',undefined,{style:'border-top:1px solid var(--border);margin:4px 0;'});
      const title=node('div',tr('أعمدة مخفية لإظهارها:','Hidden columns to restore:'),{style:'font-weight:700;font-size:11.5px;color:var(--muted);padding:4px;'});
      popover.append(sep,title);
      hiddenCols.forEach(c=>{
        const colName=tr(...labels[c]);
        const btn=button('+ '+colName,()=>{
          commitEdit();
          const next=D.format(formatting);
          next.hidden=next.hidden.filter(i=>i!==c);
          change(cells,true,next);
          popover.hidden=true;
          focusCell(cursor.r,c);
          message(tr('تمت استعادة عمود '+colName,'Column restored: '+colName));
        });
        popover.append(btn);
      });
      if(hiddenCols.length>1){
        const allBtn=button(tr('إظهار كافة الأعمدة','Show all columns'),()=>{
          commitEdit();
          const next=D.format(formatting);
          next.hidden=[];
          change(cells,true,next);
          popover.hidden=true;
          message(tr('تم إظهار كافة الأعمدة','All columns are now visible'));
        },'sheet-add-all-btn');
        popover.append(allBtn);
      }
    }
    popover.hidden=false;
  }
  function translate(){
    ($('sidebar-trainees-label')||$('trainees-tab')).textContent=tr('المتدربون','Trainees');if(!initialized)return;
    $('sheet-cell-content').placeholder=tr('محتوى الخلية المحددة','Selected cell content');$('sheet-cell-content').setAttribute('aria-label',tr('محتوى الخلية المحددة','Selected cell content'));
    if($('sheet-more-tools'))$('sheet-more-tools').textContent=tr('التنسيق وأدوات إضافية','Formatting & more tools');
    $('sheet-zoom-label').textContent=tr('زوم الجدول','Table zoom');
    for(const [id,ar,en]of [['sheet-zoom-out','تصغير الجدول','Zoom out'],['sheet-zoom-in','تكبير الجدول','Zoom in'],['sheet-zoom-slider','نسبة زوم الجدول','Table zoom percentage'],['sheet-zoom-reset','اكتب نسبة الزوم من 50 إلى 200','Enter zoom percentage from 50 to 200']]){$(id).setAttribute('aria-label',tr(ar,en));$(id).title=tr(ar,en);}
    document.querySelectorAll('.sheet-ribbon-group small[data-ar]').forEach(el=>el.textContent=tr(el.dataset.ar,el.dataset.en));
    if(typeof TraineeReports!=='undefined')TraineeReports.translate();
    const text={
      'sheet-title':['جدول المتدربين','Trainee sheet'],'sheet-subtitle':['جدول خاص بكل مستخدم · حفظ تلقائي','A private sheet for each user · Autosave'],
      'sheet-expanded':['عرض موسّع · 45 صف','Expanded view · 45 rows'],'sheet-expanded-close':['رجوع للعرض العادي','Exit expanded view'],'sheet-expanded-tools':['الأدوات','Tools'],
      'sheet-owner-label':['عرض بيانات المستخدم','View user'],'sheet-mode':['المتدربون','Trainees'],'sheet-codes-mode':['أكواد المستخدم','User codes'],
      'sheet-local-note':['التنسيق يُحفظ مع الجدول؛ الزوم وتثبيت الأعمدة وعرضها تفضيلات لهذا الجهاز.','Formatting is saved with the sheet; zoom, frozen columns and widths are preferences for this device.'],'sheet-value-label':['قيمة','Value'],'sheet-add':['+ إضافة صف','+ Add row'],'sheet-wrap':['التفاف النص','Wrap text'],'sheet-freeze':['تثبيت أول عمود','Freeze first column'],
      'sheet-add-prefix':['إضافة','Add'],'sheet-add-suffix':['صف في الأسفل','more rows at bottom'],'sheet-add-bulk-btn':['+ إضافة','+ Add'],
      'sheet-delete':['حذف صف','Delete row'],'sheet-add-col':['+ إضافة عمود','+ Add column'],'sheet-delete-col':['حذف عمود','Delete column'],'sheet-undo':['تراجع','Undo'],'sheet-redo':['إعادة','Redo'],
      'sheet-copy':['نسخ الجدول','Copy sheet'],'sheet-save':['حفظ الآن','Save now'],'sheet-reload':['إعادة تحميل','Reload'],'sheet-clear-filters':['مسح الفلاتر','Clear filters'],
      'sheet-help':['للكتابة: انقر مرتين أو ابدأ الكتابة · اسحب أو Shift + نقر لتحديد نطاق · Ctrl+C / Ctrl+V · Tab والأسهم للتنقل','Double-click or type to edit · Drag or Shift+click selects a range · Ctrl+C / Ctrl+V · Tab and arrow navigation'],
      'sheet-owned':['أكواد المستخدم','User codes'],'sheet-pool':['المخزون غير المخصص','Unassigned stock'],'sheet-code-refresh':['تحديث الأكواد','Refresh codes']
      ,'sheet-columns-title':['إظهار / إخفاء الأعمدة','Show / hide columns'],'sheet-fill-label':['لون الخلية','Cell fill'],'sheet-text-color-label':['لون الخط','Text color'],
      'sheet-clear-format':['مسح التنسيق','Clear formatting'],'sheet-direction-label':['الاتجاه','Direction'],'sheet-selection-size-label':['حجم المحدد','Selection size'],
      'sheet-duplicates-label':['الإقامات المكررة فقط','Duplicate IDs only'],
      'sheet-find-btn':['🔍 بحث واستبدال','🔍 Find & Replace'],
      'sheet-find-title':['بحث واستبدال في جدول المتدربين','Find & Replace in Trainees Sheet'],
      'sheet-find-label':['بحث عن:','Find:'],'sheet-replace-label':['استبدال بـ:','Replace with:'],
      'sheet-find-case-label':['مطابقة حالة الأحرف','Match case'],'sheet-find-entire-label':['مطابقة كامل الخلية','Match entire cell'],
      'sheet-find-next':['بحث عن التالي','Find Next'],'sheet-find-replace-one':['استبدال','Replace'],'sheet-find-replace-all':['استبدال الكل','Replace All']
    };for(const [id,pair]of Object.entries(text))$(id)&&($(id).textContent=tr(...pair));
    for(const [id,pair]of Object.entries({'sheet-search':['بحث في الجدول…','Search sheet…'],'sheet-org':['فلترة بالجهة…','Filter organization…'],'sheet-date':['فلترة بتاريخ الاختبار…','Filter exam date…'],'sheet-code-search':['بحث عن كود…','Search codes…']})){$(id)&&($(id).placeholder=tr(...pair));$(id)&&($(id).setAttribute('aria-label',tr(...pair)));}
    const value=$('sheet-result').value;$('sheet-result').replaceChildren();
    [['',tr('كل النتائج','All results')],['ناجح','ناجح'],['راسب','راسب'],['لم يدخل','لم يدخل']].forEach(([v,label])=>$('sheet-result').append(node('option',label,{value:v})));
    $('sheet-result').value=value;$('sheet-result').setAttribute('aria-label',tr('النتيجة','Result'));
    $('sheet-font-minus').title=tr('تصغير خط الجدول','Smaller sheet text');$('sheet-font-plus').title=tr('تكبير خط الجدول','Larger sheet text');$('sheet-bold').title=tr('خط عريض للمحدد','Bold selection');
    $('sheet-add').title=tr('إضافة صف جديد في نهاية الجدول','Add new row at the end of the sheet');
    $('sheet-add-bulk-btn')&&($('sheet-add-bulk-btn').title=tr('إضافة العدد المحدد من الصفوف في أسفل الجدول','Add specified number of rows at the bottom'));
    $('sheet-delete').title=tr('حذف الصفوف أو الصف المحدد حالياً','Delete current row');
    $('sheet-add-col').title=tr('إضافة عمود إلى جدول المتدربين','Add column to sheet');
    $('sheet-find-btn')&&($('sheet-find-btn').title=tr('بحث واستبدال (Ctrl+F / Ctrl+H)','Find and replace (Ctrl+F / Ctrl+H)'));
    $('sheet-align-right')&&($('sheet-align-right').title=tr('محاذاة لليمين','Align right'));
    $('sheet-align-center')&&($('sheet-align-center').title=tr('توسيط','Align center'));
    $('sheet-align-left')&&($('sheet-align-left').title=tr('محاذاة لليسار','Align left'));
    if($('sheet-copy'))$('sheet-copy').title=tr('نسخ كل الأعمدة بما فيها المخفية','Copy every column, including hidden columns');
    updateContextMenuTranslations();
    excelTools?.translate();
    prometricTools?.translate();
    certificateTools?.translate();
    if(!editing)render();renderCodes();
  }
  async function open(){
    init();if(loading)return;
    const admin=Cloud.role()==='admin';$('sheet-code-admin').hidden=!admin;
    if(!Cloud.userId())return;
    if(admin){try{members=await Cloud.listMembers();}catch(error){message(errorMessage(error),true);return;}}
    else members=[];
    if(!owner||!loaded)await switchOwner(Cloud.userId());
    renderCodes();
    prometricTools?.poll();
  }
  async function switchOwner(next,discard=false){
    if(loading)return false;
    savePosition();
    prometricTools?.reset();
    certificateTools?.reset();
    excelTools?.closeFiles();
    closeDuplicateDetails();
    commitEdit();if(!discard&&!await flush())return false;
    const token=++epoch;loading=true;$('sheet-workspace').inert=true;
    message(tr('جارٍ تحميل الجدول…','Loading sheet…'));
    try{
      const data=await Cloud.readTrainees(next);if(token!==epoch)return false;
      const normalized=D.normalize(data.cells);owner=next;cells=normalized;formatting=D.format(data.format);version=Number(data.version);revision=savedRevision=0;history=[];future=[];loaded=true;
      clearFilters();extraSelections=[];anchor=cursor={r:0,c:0};owner=next;render();restorePosition();renderCodes();if(typeof rememberWorkspaceView==='function')rememberWorkspaceView({sheetOwner:owner});message(tr('تم الحفظ','Saved'));return true;
    }catch(error){if(token===epoch)message(errorMessage(error),true);return false;}
    finally{if(token===epoch){loading=false;$('sheet-workspace').inert=!loaded;}}
  }
  async function reload(){
    commitEdit();if(saving)await saving;
    if(hasDraft()&&!confirm(tr('إعادة التحميل ستستبدل تعديلاتك غير المحفوظة. انسخ الجدول أولًا للاحتفاظ بها. المتابعة؟','Reload replaces unsaved edits. Copy the sheet first to keep them. Continue?')))return;
    clearTimeout(timer);await switchOwner(owner||Cloud.userId(),true);
  }
  function clearFilters(){['sheet-search','sheet-org','sheet-date','sheet-result'].forEach(id=>$(id).value='');$('sheet-duplicates-only').checked=false;sortCol=-1;}
  function filtered(){return sortCol>=0||$('sheet-duplicates-only').checked||['sheet-search','sheet-org','sheet-date','sheet-result'].some(id=>$(id).value);}
  function matchesSearch(row,search){
    if(!search)return true;
    let values=searchRows.get(row);if(!values){values=row.filter(Boolean).map(value=>value.toLocaleLowerCase());if(Object.isFrozen(row))searchRows.set(row,values);}
    return values.some(value=>value.includes(search));
  }
  function buildView(){
    const search=$('sheet-search').value.toLocaleLowerCase(),org=$('sheet-org').value.toLocaleLowerCase(),date=$('sheet-date').value.toLocaleLowerCase(),result=$('sheet-result').value;
    duplicateIds=D.duplicates(cells);
    view=cells.map((_,i)=>i).filter(i=>matchesSearch(cells[i],search)&&(!org||cells[i][6].toLocaleLowerCase().includes(org))&&(!date||cells[i][8].toLocaleLowerCase().includes(date))&&(!result||cells[i][11]===result)&&(!$('sheet-duplicates-only').checked||duplicateIds.has(D.idKey(cells[i][4]))));
    if(sortCol>=0)view.sort((a,b)=>sortDir*(cells[a][sortCol]||'').localeCompare(cells[b][sortCol]||'',currentLang,{numeric:true})||a-b);
    updateLastDataRow();if(!filtered())for(let i=cells.length;i<totalInputRows();i++)view.push(i);
  }
  function render(){
    if(!initialized)return;hideDuplicateHint();clearTimeout(detailTimer);formulaCache.clear();const oldView=view;buildView();if(oldView.length!==view.length||oldView.some((r,i)=>r!==view[i]))extraSelections=[];
    const scroll=$('sheet-grid').parentElement,scrollTop=scroll.scrollTop,scrollLeft=scroll.scrollLeft;
    const cols=visibleCols();if(!cols.includes(cursor.c))cursor.c=cols[0];if(!cols.includes(anchor.c))anchor.c=cursor.c;
    $('panel-trainees').dir=formatting.direction;
    $('sheet-workspace').style.setProperty('--sheet-font-size',formatting.fontSize+'px');
    $('sheet-grid').parentElement.dir=formatting.direction;
    $('sheet-direction').value=formatting.direction;$('sheet-font-size').textContent=formatting.fontSize+' px';
    $('sheet-font-minus').disabled=formatting.fontSize<=10;$('sheet-font-plus').disabled=formatting.fontSize>=32;
    renderColumnOptions();
    applySavedColWidths();
    const grid=$('sheet-grid'),thead=grid.querySelector('thead'),tbody=grid.querySelector('tbody');
    const nextHeadersKey=JSON.stringify([currentLang,cols,allLabels()]);
    if(headersKey!==nextHeadersKey){headersKey=nextHeadersKey;thead.replaceChildren();
    const header=node('tr');header.append(node('th','#',{class:'sheet-rownum'}));
    labels.forEach((pair,c)=>{
      if(!cols.includes(c))return;
      const th=node('th',undefined,{scope:'col','data-col':c});if(c>=baseLabels.length)th.style.setProperty('--col-w','calc(var(--col-w-'+c+',160px) * var(--sheet-zoom,1))');
      const columnBtn=button(colLetter(c)+' · '+tr(...pair),e=>{if(!skipSelectionClick&&!dragMoved)selectColumn(c,e);skipSelectionClick=false;dragMoved=false;});
      columnBtn.addEventListener('pointerdown',e=>{if(e.button!==0||e.pointerType==='touch')return;e.preventDefault();columnDragging=true;dragMoved=false;skipSelectionClick=true;selectColumn(c,e);});th.append(columnBtn);
      th.title=tr('اسحب أو Shift لأعمدة متجاورة · Ctrl لأعمدة متفرقة','Drag or Shift for adjacent columns · Ctrl for separate columns');
      if(c>=baseLabels.length){
        th.title=tr('انقر مرتين لتعديل اسم العمود · اسحب لتغيير العرض','Double-click to rename column · Drag to resize');
        th.addEventListener('dblclick',e=>{
          if(e.target.closest('.sheet-col-resizer'))return;
          e.stopPropagation();
          const curName=formatting.headers?.[c]||tr(...pair);
          const newName=prompt(tr('اسم العمود:','Column name:'),curName);
          if(newName!==null&&newName.trim()&&newName.trim()!==curName){
            const next=D.format(formatting);if(!next.headers)next.headers={};next.headers[c]=newName.trim();change(cells,true,next);
          }
        });
      }
      const resizer=node('div',undefined,{class:'sheet-col-resizer','data-resizer-col':c,title:tr('اسحب لتعديل عرض العمود · انقر مرتين للضبط التلقائي','Drag to resize · Double click to reset')});
      resizer.addEventListener('pointerdown',e=>initColumnResize(e,c,th));
      resizer.addEventListener('dblclick',e=>{e.stopPropagation();resetColumnWidth(c);});
      th.append(resizer);
      header.append(th);
    });
    thead.append(header);
    }
    resetRowHeights();rebuildRowOffsets();scroll.scrollTop=scrollTop;scroll.scrollLeft=scrollLeft;drawRows(true);
    scroll.scrollTop=scrollTop;scroll.scrollLeft=scrollLeft;
    grid.setAttribute('aria-rowcount',String(view.length+1));
    $('sheet-count').textContent=tr('سجلات: ','Records: ')+cells.filter(r=>r.some(Boolean)).length+tr(' · إجمالي الصفوف: ',' · Total rows: ')+cells.length;
    $('sheet-undo').disabled=!history.length;$('sheet-redo').disabled=!future.length;
    if($('sheet-duplicate-dialog')?.open)renderDuplicateDetails();
  }
  function resetRowHeights(){
    rowHeights.clear();for(const [key,style]of Object.entries(formatting.styles)){const r=Number(key.split(':')[0]),height=Math.max((style.height||0)*excelView.zoom/100,style.rotation?70:0);if(height)rowHeights.set(r,Math.max(rowHeights.get(r)||0,height));}
  }
  function rebuildRowOffsets(){
    const estimate=Math.max((excelView.wrap?28:expandedView?17:21)*excelView.zoom/100,formatting.fontSize*excelView.zoom/100*(excelView.wrap?1.5:1.2));
    rowOffsets=new Float64Array(view.length+1);for(let r=0;r<view.length;r++)rowOffsets[r+1]=rowOffsets[r]+(rowHeights.get(view[r])||estimate);
  }
  function rowAtOffset(offset){let low=0,high=view.length;while(low<high){const mid=(low+high)>>1;if(rowOffsets[mid+1]<=offset)low=mid+1;else high=mid;}return Math.min(low,Math.max(0,view.length-1));}
  let forceDraw=false,pendingRender=false;
  function queueDraw(force=false){forceDraw=forceDraw||force;if(scrollFrame)return;scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;if(editing){forceDraw=true;return;}const redraw=forceDraw;forceDraw=false;if(pendingRender){pendingRender=false;render();}else drawRows(redraw);});}
  function sheetMerges(){
    if(mergeCacheFormat!==formatting){mergeCacheFormat=formatting;mergeCache=Object.entries(formatting.styles).filter(([,s])=>(s.mergeCols||1)>1||(s.mergeRows||1)>1).map(([key,s])=>{const [r,c]=key.split(':').map(Number);return {r,c,endR:r+(s.mergeRows||1)-1,endC:c+(s.mergeCols||1)-1};});}return filtered()?[]:mergeCache;
  }
  function columnWindow(cols,merges,start,end){
    if(cols.length<=80)return cols.map(c=>({c}));
    const grid=$('sheet-grid'),scroll=grid.parentElement,rect=scroll.getBoundingClientRect(),widths=new Map(),shown=new Set();
    grid.querySelectorAll('thead th[data-col]').forEach(th=>{const c=+th.dataset.col,box=th.getBoundingClientRect();widths.set(c,box.width);if(box.right>=rect.left-320&&box.left<=rect.right+320)shown.add(c);});
    if(excelView.freeze)shown.add(cols[0]);
    // Keep a merge intact when any part intersects the row/column viewport.
    for(const m of merges)if(m.r<end&&m.endR>=start&&cols.some(c=>shown.has(c)&&c>=m.c&&c<=m.endC))for(const c of cols)if(c>=m.c&&c<=m.endC)shown.add(c);
    const segments=[];for(const c of cols){if(shown.has(c))segments.push({c});else{const last=segments[segments.length-1];if(last?.gap){last.count++;last.width+=widths.get(c)||160;}else segments.push({gap:true,count:1,width:widths.get(c)||160});}}return segments;
  }
  function drawRows(force=false){
    if(!initialized||editing&&!force)return;const grid=$('sheet-grid'),scroll=grid.parentElement,tbody=grid.querySelector('tbody'),cols=visibleCols();
    const height=scroll.clientHeight||400,head=grid.querySelector('thead').getBoundingClientRect().height||36;
    const first=rowAtOffset(Math.max(0,scroll.scrollTop-head)),start=view.length<=100?0:Math.max(0,first-8),end=view.length<=100?view.length:Math.min(view.length,rowAtOffset(scroll.scrollTop+height)+10);
    const merges=sheetMerges(),segments=columnWindow(cols,merges,start,end),columnKey=segments.map(s=>s.gap?'gap:'+s.count+':'+s.width:s.c).join(',');
    if(!force&&start===drawnStart&&end===drawnEnd&&columnKey===drawnColumns){updateVisibleRows();return;}
    const hadFocus=grid.contains(document.activeElement),previousTop=scroll.scrollTop,previousLeft=scroll.scrollLeft;commitEdit();drawnStart=start;drawnEnd=end;drawnColumns=columnKey;const fragment=document.createDocumentFragment();
    const spacer=(height)=>{const row=node('tr',undefined,{class:'sheet-spacer','aria-hidden':'true'}),cell=node('td',undefined,{colspan:cols.length+1});row.style.setProperty('height',height+'px','important');cell.style.setProperty('height',height+'px','important');row.append(cell);return row;};
    const top=spacer(rowOffsets[start]),bottom=spacer(rowOffsets[view.length]-rowOffsets[end]);if(start)fragment.append(top);
    for(let v=start;v<end;v++){
      const idx=view[v],trEl=node('tr');if(rowHeights.has(idx))trEl.style.setProperty('height',rowHeights.get(idx)+'px','important');const number=node('th',undefined,{class:'sheet-rownum',scope:'row','data-rowv':v});
      const rowBtn=button(String(idx+1),e=>{if(!skipSelectionClick&&!dragMoved)selectRow(v,e);skipSelectionClick=false;dragMoved=false;});
      rowBtn.addEventListener('pointerdown',e=>{if(e.button!==0||e.pointerType==='touch')return;e.preventDefault();e.stopPropagation();rowDragging=true;dragMoved=false;skipSelectionClick=true;selectRow(v,e);});
      number.append(rowBtn);trEl.append(number);
      trEl.setAttribute('aria-rowindex',String(v+2));
      segments.forEach(segment=>{
        if(segment.gap){const gap=node('td',undefined,{class:'sheet-column-spacer',colspan:segment.count,'aria-hidden':'true'});gap.style.setProperty('--gap-width',segment.width+'px');trEl.append(gap);return;}
        const c=segment.c;
        const merge=merges.find(m=>idx>=m.r&&idx<=m.endR&&c>=m.c&&c<=m.endC);
        const firstMergeCol=merge&&cols.find(x=>x>=merge.c&&x<=merge.endC);
        if(merge&&(c!==firstMergeCol||v!==Math.max(start,merge.r)))return;
        const source=merge?merge.r:idx,column=merge?merge.c:c;
        const td=node('td',undefined,{'data-v':merge?merge.r:v,'data-col':column,tabindex:'-1',role:'gridcell',dir:'auto','aria-label':tr(...labels[column])+' '+(source+1)});decorateCell(td,source,column);
        if(merge){td.colSpan=cols.filter(x=>x>=merge.c&&x<=merge.endC).length;td.rowSpan=Math.min(end-1,merge.endR)-Math.max(start,merge.r)+1;td.classList.add('sheet-merged');const sum=cols.filter(x=>x>=merge.c&&x<=merge.endC).map(x=>'var(--col-w-'+x+','+(colWidths[x]||({1:190,2:220,3:220,4:105,5:105,6:200,7:220,8:140,9:150,10:110,11:85,12:120}[x]||160))+'px)');td.style.setProperty('--col-w','calc(('+sum.join(' + ')+') * var(--sheet-zoom,1))');}
        trEl.append(td);
      });fragment.append(trEl);
    }
    if(end<view.length)fragment.append(bottom);tbody.replaceChildren(fragment);applyExcelView();paint();
    const oldFirst=rowOffsets[first];let heightChanged=false;tbody.querySelectorAll('th[data-rowv]').forEach(th=>{const index=view[+th.dataset.rowv],height=Math.max(rowHeights.get(index)||0,th.parentElement.getBoundingClientRect().height);if(rowHeights.get(index)!==height){rowHeights.set(index,height);heightChanged=true;}});if(heightChanged)rebuildRowOffsets();
    if(start){top.style.setProperty('height',rowOffsets[start]+'px','important');top.firstChild.style.setProperty('height',rowOffsets[start]+'px','important');}
    if(end<view.length){const remaining=rowOffsets[view.length]-rowOffsets[end];bottom.style.setProperty('height',remaining+'px','important');bottom.firstChild.style.setProperty('height',remaining+'px','important');}
    scroll.scrollTop=previousTop+rowOffsets[first]-oldFirst;scroll.scrollLeft=previousLeft;
    updateVisibleRows();
    if(hadFocus){const active=grid.querySelector(`td[data-v="${cursor.r}"][data-col="${cursor.c}"]`);if(active)active.focus({preventScroll:true});else{grid.tabIndex=-1;grid.focus({preventScroll:true});}}
  }
  function updateVisibleRows(){
    if(!expandedView)return;const grid=$('sheet-grid'),scroll=grid.parentElement,top=grid.querySelector('thead').getBoundingClientRect().bottom,bottom=scroll.getBoundingClientRect().top+scroll.clientHeight;
    let count=0;grid.querySelectorAll('th[data-rowv]').forEach(th=>{const rect=th.parentElement.getBoundingClientRect();if(rect.top>=top-1&&rect.bottom<=bottom+1)count++;});
    $('sheet-visible-rows').textContent=tr('الصفوف الظاهرة: ','Visible rows: ')+count;
  }
  function decorateCell(td,index,column){
    const value=cells[index]?.[column]||'',style=formatting.styles[index+':'+column]||{};
    td.replaceChildren();if(column>=baseLabels.length)td.style.setProperty('--col-w','calc(var(--col-w-'+column+',160px) * var(--sheet-zoom,1))');td.style.backgroundColor=style.bg||'';td.style.color=style.color||'';
    td.style.fontSize='calc('+(style.size||formatting.fontSize)+'px * var(--sheet-zoom,1))';td.style.fontWeight=style.bold?'700':'';
    td.style.fontFamily=style.font?style.font+', sans-serif':'';td.style.fontStyle=style.italic?'italic':'';td.style.textDecoration=[style.underline?'underline':'',style.strike?'line-through':''].filter(Boolean).join(' ')||'';
    td.style.verticalAlign=style.valign||'middle';td.style.whiteSpace=typeof style.wrap==='boolean'?(style.wrap?'pre-wrap':'nowrap'):'';td.style.textIndent=style.indent?style.indent*8+'px':'';
    td.style.overflowWrap=style.wrap?'anywhere':'';
    for(const side of ['Top','Bottom','Left','Right'])td.style['border'+side]=style['border'+side]===true?'1px solid #475569':style['border'+side]===false||style.border==='none'?'0':style.border==='all'||style.border==='outline'||style.border===side.toLowerCase()?'1px solid #475569':'';
    for(const key of ['height','min-height']){if(style.height)td.style.setProperty(key,style.height*excelView.zoom/100+'px','important');else td.style.removeProperty(key);}
    const align=getCellAlign(index,column);
    if(align)td.style.textAlign=align;else td.style.removeProperty('text-align');
    td.classList.remove('sheet-result-pass','sheet-result-fail','sheet-result-absent','sheet-id-duplicate');td.removeAttribute('title');td.removeAttribute('aria-haspopup');
    if(column===11){
      const select=node('select',undefined,{'aria-label':tr('النتيجة للصف ','Result for row ')+(index+1),class:'sheet-result-select',dir:'rtl'});
      if(align){select.style.setProperty('text-align',align,'important');select.style.setProperty('text-align-last',align,'important');}
      ['', 'ناجح','راسب','لم يدخل',...(!['','ناجح','راسب','لم يدخل'].includes(value)?[value]:[])].forEach(v=>select.append(node('option',v||'—',{value:v})));
      select.value=value;
      if(value==='ناجح'||value==='راسب'||value==='لم يدخل')td.classList.add(value==='ناجح'?'sheet-result-pass':value==='راسب'?'sheet-result-fail':'sheet-result-absent');
      select.onchange=()=>{const v=+td.dataset.v;extraSelections=[];cursor=anchor={r:v,c:11};change(D.paste(cells,[[select.value]],index,11));};
      select.addEventListener('pointerdown',e=>{e.stopPropagation();if(e.shiftKey||e.ctrlKey||e.metaKey){e.preventDefault();dragging=true;dragMoved=false;skipSelectionClick=true;selectCell(+td.dataset.v,11,e.shiftKey,e.ctrlKey||e.metaKey);}});
      select.addEventListener('click',e=>{if(e.shiftKey||e.ctrlKey||e.metaKey)e.preventDefault();skipSelectionClick=false;});
      select.addEventListener('focus',()=>{const v=+td.dataset.v;if(v!==cursor.r||cursor.c!==11){extraSelections=[];cursor=anchor={r:v,c:11};paint();}});
      td.addEventListener('click',()=>{try{select.showPicker?.();}catch{}});
      td.append(select);
    }else{
      const span=node('span',value.startsWith('=')?D.formulaValue(cells,index,column,formulaCache):value,{class:'sheet-cell-value'});td.append(span);
      // Table text alignment falls back to the text direction when a nowrap line overflows.
      // Physical flex alignment keeps long exam names aligned to the requested cell edge.
      if(align&&!style.rotation&&!(typeof style.wrap==='boolean'?style.wrap:excelView.wrap)){span.style.display='flex';span.style.justifyContent=align;}
      if(value.startsWith('=')){td.dataset.formula=value;td.title=value;}else delete td.dataset.formula;
      if(style.rotation){span.style.display='inline-block';if(Math.abs(style.rotation)===90){span.style.writingMode='vertical-rl';if(style.rotation===-90)span.style.transform='rotate(180deg)';}else{span.style.transform='rotate('+style.rotation+'deg)';td.style.setProperty('height','70px','important');}}
      if(column===4){const duplicates=duplicateIds.get(D.idKey(value));if(duplicates){td.classList.add('sheet-id-duplicate');td.append(node('span',tr('مكرر ×','Duplicate ×')+duplicates.length,{class:'sheet-duplicate-badge'}));td.setAttribute('aria-haspopup','dialog');}}
    }
  }
  function resultBadge(value){
    const badge=node('span',value||'—',{class:'sheet-detail-result',dir:'rtl'});
    badge.dataset.result=value==='ناجح'?'pass':value==='راسب'?'fail':value==='لم يدخل'?'absent':'';return badge;
  }
  let traineeHoverTimer;
  function copyDetailValue(value,label,extraClass='',direction='auto',displayValue=value){
    if(!value)return node('span','—');
    const control=button(displayValue,async()=>{if(await copyText(value))showToast(tr('تم النسخ','Copied'));else showToast(tr('تعذر النسخ. حاول مرة أخرى.','Could not copy. Please retry.'));},'sheet-detail-copy-value '+extraClass);
    control.dir=direction;control.title=tr('اضغط لنسخ ','Click to copy ')+label;control.setAttribute('aria-label',tr('نسخ ','Copy ')+label);
    return control;
  }
  function appendDetailField(dl,row,pair,column,includeKeycode=true){
    const keycode=column===7?D.courseKeycode(row[column],DEFAULT_KEYCODES):null;
    dl.append(node('dt',column===7?tr('الدورة','Course'):tr(...pair)));const dd=node('dd',undefined,{dir:'auto'});
    dd.append(copyDetailValue(row[column],tr(...pair),column===11?'sheet-detail-result':''));
    if(column===11){const badge=dd.firstChild;badge.dataset.result=row[column]==='ناجح'?'pass':row[column]==='راسب'?'fail':row[column]==='لم يدخل'?'absent':'';}
    if(column===7){
      dl.append(dd);
      if(keycode){
        if(includeKeycode)appendDetailKeycode(dl,keycode);
        const category=state.keycodeOverrides?.[keycode.code]||keycode.category;
        const categoryValue=node('dd',undefined,{class:'sheet-detail-category-value',dir:'auto'});
        categoryValue.append(category?copyDetailValue(displayCatName(category),tr('الفئة','Category'),'sheet-detail-category'):node('span',tr('فئة غير محددة','No category')));
        dl.append(node('dt',tr('الفئة','Category')),categoryValue);
      }else dd.append(node('div',tr('لا يوجد كي كود مطابق','No matching keycode')));
      return;
    }
    dl.append(dd);
  }
  function appendDetailKeycode(dl,keycode){
    const dd=node('dd',undefined,{dir:'ltr'});dd.append(keycode?copyDetailValue(keycode.code,tr('كي كود الدورة','Course keycode'),'sheet-detail-keycode','ltr'):node('span',tr('لا يوجد كي كود مطابق','No matching keycode')));
    dl.append(node('dt',tr('كي كود','Keycode')),dd);
  }
  function appendPrometricDetails(dl){
    for(const [label,value]of [['Prometric Account',PROMETRIC_ACCOUNT],['Prometric Password',PROMETRIC_PASSWORD]]){
      const dd=node('dd',undefined,{dir:'ltr'});dd.append(value?copyDetailValue(value,label,'','ltr'):node('span',tr('غير محدد','Not configured')));dl.append(node('dt',label,{dir:'ltr'}),dd);
    }
  }
  function closeTraineeDetails(){clearTimeout(traineeHoverTimer);const dialog=$('sheet-trainee-dialog');if(dialog?.open)dialog.close();}
  function initTraineeDetails(){
    let activeIndex=null,activeEpoch=null;
    const dialog=node('dialog',undefined,{id:'sheet-trainee-dialog',class:'sheet-duplicate-dialog sheet-trainee-dialog','aria-labelledby':'sheet-trainee-title'});
    const head=node('div',undefined,{class:'sheet-detail-header'}),close=button('×',closeTraineeDetails,'sheet-detail-close');
    close.setAttribute('aria-label',tr('إغلاق','Close'));head.append(node('h2','',{id:'sheet-trainee-title'}),close);
    dialog.append(head,node('div',undefined,{id:'sheet-trainee-record',class:'sheet-detail-record'}));document.body.append(dialog);
    dialog.addEventListener('close',()=>{if(dialog.open)return;activeIndex=activeEpoch=null;$('sheet-trainee-record').replaceChildren();$('sheet-trainee-title').textContent='';});
    const show=index=>{
      if(!loaded||editing||dragging)return;
      const row=cells[index];if(!row?.[3])return;activeIndex=index;activeEpoch=epoch;
      hideDuplicateHint();dialog.dir=currentLang==='ar'?'rtl':'ltr';
      $('sheet-trainee-title').textContent=tr('بيانات المتدرب — ','Trainee details — ')+row[3];
      const dl=node('dl'),login=node('dd',undefined,{dir:'ltr'}),loginDisplay=PROMETRIC_LOGIN_URL.replace(/(\/Login).+$/i,'$1…');login.append(PROMETRIC_LOGIN_URL?copyDetailValue(PROMETRIC_LOGIN_URL,'Prometric login link','sheet-detail-login','ltr',loginDisplay):node('span',tr('غير محدد','Not configured')));
      dl.append(node('dt','Prometric login link',{dir:'ltr'}),login);appendDetailKeycode(dl,D.courseKeycode(row[7],DEFAULT_KEYCODES));appendPrometricDetails(dl);appendDetailField(dl,row,labels[0],0);
      const codeValue=dl.lastElementChild;
      labels.forEach((pair,c)=>{if(c===0||c>=baseLabels.length&&!row[c]&&!formatting.headers[c])return;appendDetailField(dl,row,pair,c,false);});
      $('sheet-trainee-record').replaceChildren(dl);
      if(prometricTools&&!row[9]?.trim()&&!row[10]?.trim())$('sheet-trainee-record').append(button(tr('إنشاء حساب Prometric','Create Prometric account'),()=>{closeTraineeDetails();prometricTools.open([index]);},'sheet-primary sheet-create-prometric'));
      const refreshRecord=()=>{if(dialog.open&&activeIndex===index&&activeEpoch===epoch)show(index);};
      const exam=D.courseKeycode(row[7],DEFAULT_KEYCODES),category=exam&&(state.keycodeOverrides?.[exam.code]||exam.category),codeCategory=category&&getLinkedCodesCat(category);
      const action=button('Get',async()=>{
        if(action.disabled)return;action.disabled=true;const token=epoch,selectedOwner=owner;
        try{
          if(!await flush())throw Error(tr('احفظ تعديلات الجدول أولًا.','Save sheet changes first.'));
          if(cells[index]?.[0]?.trim()){refreshRecord();return;}
          const code=await Cloud.claimTraineeCode(codeCategory,selectedOwner);
          if(token!==epoch||owner!==selectedOwner)throw Error('CONFLICT');
          if(cells[index]?.[0]?.trim())throw Error(tr('خانة الكود تغيرت أثناء الحجز. لم يتم استبدال الكود الموجود.','Code changed during reservation. The existing code was preserved.'));
          change(D.paste(cells,[[code]],index,0),false);
          action.hidden=true;
          const codeCell=$('sheet-grid').querySelector(`td[data-v="${view.indexOf(index)}"][data-col="0"]`);if(codeCell)decorateCell(codeCell,index,0);paint();
          if(!await flush())throw Error(tr('تم حجز الكود لكن تعذر حفظ الجدول. اضغط حفظ الآن لإعادة محاولة حفظ نفس الكود.','Code reserved but sheet save failed. Press Save now to retry saving the same code.'));
          if(!await copyText(code))throw Error(tr('تم حفظ الكود. اضغط على قيمة الكود لنسخه.','Code saved. Click the code value to copy it.'));
          refreshRecord();showToast(tr('تم حجز الكود وحفظه ونسخه','Code reserved, saved and copied'));
        }catch(error){if(token===epoch&&owner===selectedOwner&&cells[index]?.[0]?.trim())refreshRecord();showToast(error.message||tr('تعذر جلب الكود','Could not get code'));}finally{action.disabled=!codeCategory;}
      },'sheet-get-exam-code');
      action.dir='ltr';action.setAttribute('aria-label',tr('جلب كود الاختبار','Get exam code'));
      action.disabled=!codeCategory;action.title=codeCategory?displayCatName(category):tr('لا توجد فئة اختبار مطابقة','No matching exam category');
      if(!row[0]?.trim())codeValue.replaceChildren(action);if(!dialog.open)dialog.show();
    };
    const grid=$('sheet-grid');
    grid.addEventListener('dblclick',e=>{const td=e.target.closest('td[data-col="3"]');if(td){commitEdit();show(view[+td.dataset.v]);}});
    document.addEventListener('pointerdown',e=>{clearTimeout(traineeHoverTimer);if(dialog.open&&!dialog.contains(e.target))closeTraineeDetails();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeTraineeDetails();});
  }
  function initDuplicateDetails(){
    const hint=node('div',undefined,{id:'sheet-duplicate-hint',class:'sheet-duplicate-hint',role:'tooltip',hidden:''});document.body.append(hint);
    const dialog=node('dialog',undefined,{id:'sheet-duplicate-dialog',class:'sheet-duplicate-dialog','aria-labelledby':'sheet-duplicate-title'});
    const head=node('div',undefined,{class:'sheet-detail-header'});head.append(node('h2','',{id:'sheet-duplicate-title'}),button('×',()=>dialog.close(),'sheet-detail-close'));
    head.lastChild.setAttribute('aria-label',tr('إغلاق','Close'));dialog.append(head,node('p','',{id:'sheet-duplicate-description'}),node('div',undefined,{id:'sheet-duplicate-records'}));
    const footer=node('div',undefined,{class:'sheet-detail-footer'}),prev=button('‹',()=>{detailPage--;renderDuplicateDetails();}),next=button('›',()=>{detailPage++;renderDuplicateDetails();});
    prev.id='sheet-detail-prev';next.id='sheet-detail-next';
    const edit=button(tr('تعديل رقم الهوية','Edit ID'),()=>{const index=detailSource;dialog.close();clearFilters();render();focusCell(index,4);const td=$('sheet-grid').querySelector(`td[data-v="${index}"][data-col="4"]`);if(td)beginEdit(td);});edit.id='sheet-detail-edit';
    footer.append(prev,node('span','',{id:'sheet-detail-page'}),next,edit);dialog.append(footer);document.body.append(dialog);
    dialog.addEventListener('click',e=>{if(e.target===dialog){const rect=dialog.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)dialog.close();}});
    dialog.addEventListener('close',()=>{detailKey='';$('sheet-duplicate-records').replaceChildren();$('sheet-duplicate-title').textContent='';$('sheet-duplicate-description').textContent='';dialog.style.width='';});
    const grid=$('sheet-grid');
    const start=e=>{const td=e.target.closest('td.sheet-id-duplicate');if(!td||editing||dragging||dialog.open)return;if(td===hoverCell&&!hint.hidden){clearTimeout(hoverHideTimer);return;}hideDuplicateHint();hoverCell=td;hoverTimer=setTimeout(()=>showDuplicateHint(td),180);};
    grid.addEventListener('pointerover',start);grid.addEventListener('focusin',start);
    const leave=e=>{if(hoverCell?.contains(e.relatedTarget)||hint.contains(e.relatedTarget))return;clearTimeout(hoverTimer);hoverHideTimer=setTimeout(hideDuplicateHint,100);};
    grid.addEventListener('pointerout',leave);grid.addEventListener('focusout',leave);
    grid.addEventListener('pointerdown',()=>{clearTimeout(detailTimer);hideDuplicateHint();});grid.parentElement.addEventListener('scroll',()=>{if(!hint.hidden)hideDuplicateHint();});
    hint.addEventListener('pointerenter',()=>clearTimeout(hoverHideTimer));hint.addEventListener('pointerleave',hideDuplicateHint);
    window.addEventListener('resize',hideDuplicateHint);
    document.addEventListener('keydown',e=>{if(e.key==='Escape')hideDuplicateHint();});
  }
  function hideDuplicateHint(){
    clearTimeout(hoverTimer);clearTimeout(hoverHideTimer);hoverCell?.removeAttribute('aria-describedby');hoverCell=null;
    const hint=$('sheet-duplicate-hint');if(hint){hint.hidden=true;hint.replaceChildren();}
  }
  function closeDuplicateDetails(){closeTraineeDetails();clearTimeout(detailTimer);hideDuplicateHint();if($('sheet-duplicate-dialog')?.open)$('sheet-duplicate-dialog').close();}
  function showDuplicateHint(td){
    if(!td.isConnected||editing||$('sheet-duplicate-dialog').open||(!td.matches(':hover')&&document.activeElement!==td))return;
    const index=view[+td.dataset.v],matches=duplicateIds.get(D.idKey(cells[index]?.[4]||''));if(!matches)return;
    const hint=$('sheet-duplicate-hint');hint.replaceChildren();hint.dir=formatting.direction;
    hint.append(node('strong',tr('مكرر ','Repeated ')+matches.length+tr(' مرات',' times')),node('div',cells[index][4],{class:'sheet-detail-id',dir:'ltr'}));
    matches.slice(0,10).forEach(i=>{const row=cells[i],card=node('div',undefined,{class:'sheet-hint-record'});card.append(node('strong',tr('الصف ','Row ')+(i+1)+' · '+(row[2]||row[3]||'—')));const dl=node('dl');for(const c of [7,9,10,11]){dl.append(node('dt',c===7?tr('الاختبار','Exam'):tr(...labels[c])));const dd=node('dd');dd.dir='auto';dd.append(c===11?resultBadge(row[c]):node('span',row[c]||'—'));dl.append(dd);}card.append(dl);hint.append(card);});
    hint.append(node('p',tr('اضغط على الرقم لعرض جميع البيانات. انقر مرتين أو F2 لتعديله.','Click the ID for all details. Double-click or F2 to edit.')));
    hint.hidden=false;td.setAttribute('aria-describedby',hint.id);
    const rect=td.getBoundingClientRect(),box=hint.getBoundingClientRect();
    hint.style.left=Math.max(8,Math.min(window.innerWidth-box.width-8,formatting.direction==='rtl'?rect.right-box.width:rect.left))+'px';
    hint.style.top=Math.max(8,Math.min(window.innerHeight-box.height-8,rect.bottom+box.height+8<=window.innerHeight?rect.bottom+8:rect.top-box.height-8))+'px';
  }
  function openDuplicateDetails(index){
    commitEdit();clearTimeout(detailTimer);hideDuplicateHint();const key=D.idKey(cells[index]?.[4]||'');if(!duplicateIds.has(key))return;
    detailKey=key;detailPage=0;detailSource=index;renderDuplicateDetails();if(!$('sheet-duplicate-dialog').open)$('sheet-duplicate-dialog').showModal();
  }
  function renderDuplicateDetails(){
    const matches=duplicateIds.get(detailKey)||[];if(!matches.length){closeDuplicateDetails();return;}
    const dialog=$('sheet-duplicate-dialog');dialog.dir=formatting.direction;
    const count=matches.length;
    dialog.style.width=count<=1?'min(520px,calc(100vw - 24px))':count===2?'min(920px,calc(100vw - 24px))':count===3?'min(1240px,calc(100vw - 24px))':'min(1560px,calc(100vw - 24px))';
    const showAll=count<=50;const pageCount=showAll?1:Math.ceil(count/50);
    detailPage=Math.max(0,Math.min(detailPage,pageCount-1));
    const pageMatches=showAll?matches:matches.slice(detailPage*50,detailPage*50+50);
    $('sheet-duplicate-title').textContent=tr('بيانات الهوية / الإقامة: ','National / Iqama ID: ')+detailKey;
    $('sheet-duplicate-description').textContent=tr('مكرر ','Repeated ')+count+tr(' مرات في جدول المستخدم المعروض.',' times in the selected user’s sheet.');
    const box=$('sheet-duplicate-records');box.replaceChildren();
    pageMatches.forEach(i=>{const card=node('section',undefined,{class:'sheet-detail-record'});card.append(node('h3',tr('الصف ','Row ')+(i+1)+' · '+(cells[i][2]||cells[i][3]||'—')));const dl=node('dl');labels.forEach((pair,c)=>{if(c>=baseLabels.length&&!cells[i][c]&&!formatting.headers[c])return;appendDetailField(dl,cells[i],pair,c);});card.append(dl);box.append(card);});
    const hasPages=pageCount>1;
    $('sheet-detail-page').style.display=hasPages?'':'none';
    $('sheet-detail-prev').style.display=hasPages?'':'none';
    $('sheet-detail-next').style.display=hasPages?'':'none';
    if(hasPages){
      $('sheet-detail-page').textContent=(detailPage+1)+' / '+pageCount;
      $('sheet-detail-prev').disabled=detailPage===0;$('sheet-detail-next').disabled=(detailPage+1)*50>=count;
      $('sheet-detail-prev').setAttribute('aria-label',tr('السابق','Previous'));$('sheet-detail-next').setAttribute('aria-label',tr('التالي','Next'));
    }
    $('sheet-detail-edit').textContent=tr('تعديل رقم الهوية','Edit ID');
  }
  function renderColumnOptions(){
    const key=JSON.stringify([currentLang,allLabels(),formatting.hidden]);if(columnOptionsKey===key)return;columnOptionsKey=key;
    const box=$('sheet-column-options');box.replaceChildren();
    box.append(button(tr('إظهار الكل','Show all'),()=>{commitEdit();const next=D.format(formatting);next.hidden=[];change(cells,true,next);}));
    labels.forEach((pair,c)=>{const label=node('label'),input=node('input',undefined,{type:'checkbox','data-column-toggle':c});input.checked=!formatting.hidden.includes(c);input.disabled=input.checked&&visibleCols().length===1;input.onchange=()=>{commitEdit();const next=D.format(formatting);next.hidden=input.checked?next.hidden.filter(i=>i!==c):[...next.hidden,c];change(cells,true,next);};label.append(input,node('span',tr(...pair)));box.append(label);});
  }
  function adjustFont(delta){commitEdit();const next=D.format(formatting);next.fontSize=Math.max(10,Math.min(32,next.fontSize+delta));change(cells,true,next);}
  function formatSelection(style){
    commitEdit();const next=D.format(formatting);
    eachSelected((index,c)=>{
        const key=index+':'+c;
        if(style===null){delete next.styles[key];setCellAlign(index,c,null);}
        else next.styles[key]={...next.styles[key],...style};
    });
    if(style===null)saveAlignments();
    change(cells,true,next);
  }
  function bounds(){return [Math.min(anchor.r,cursor.r),Math.max(anchor.r,cursor.r),Math.min(anchor.c,cursor.c),Math.max(anchor.c,cursor.c)];}
  function selectionRanges(){return [...extraSelections,bounds()];}
  function isSelected(r,c){return D.selectedCell(selectionRanges(),r,c);}
  function selectedRows(){return D.selectionRows(selectionRanges(),view.length);}
  function selectedColumns(){return D.selectionColumns(selectionRanges(),visibleCols());}
  function eachSelected(run){D.eachSelected(selectionRanges(),view,visibleCols(),run);}
  function singleSelection(){if(!extraSelections.length)return true;message(tr('اختر منطقة واحدة متجاورة لهذه العملية.','Select one contiguous range for this action.'),true);return false;}
  function startSelection(a,b,extend=false,additive=false,kind='cell'){
    commitEdit();
    if(extend&&selectionKind===kind){cursor=b;}
    else{
      const next=[Math.min(a.r,b.r),Math.max(a.r,b.r),Math.min(a.c,b.c),Math.max(a.c,b.c)];
      const previous=additive?selectionRanges():[],match=previous.findIndex(range=>range.every((value,i)=>value===next[i]));
      if(match>=0&&previous.length>1){previous.splice(match,1);const last=previous.pop();extraSelections=previous;anchor={r:last[0],c:last[2]};cursor={r:last[1],c:last[3]};}
      else if(match>=0){extraSelections=[];anchor=a;cursor=b;}
      else{extraSelections=previous;anchor=a;cursor=b;}
    }
    selectionKind=kind;paint();schedulePosition();
  }
  function selectColumn(c,e){startSelection({r:Math.max(0,view.length-1),c},{r:0,c},e.shiftKey,e.ctrlKey||e.metaKey,'column');$('sheet-grid').querySelector(`td[data-v="0"][data-col="${c}"]`)?.focus();}
  function selectRow(r,e){startSelection({r,c:0},{r,c:colCount()-1},e.shiftKey,e.ctrlKey||e.metaKey,'row');}
  function paint(){
    if($('sheet-data-tools'))$('sheet-data-tools').hidden=Cloud.role()!=='admin';
    const ranges=selectionRanges(),[r1,r2,c1,c2]=bounds();
    const cols=visibleCols(),selectedCols=selectedColumns(),rtl=formatting.direction==='rtl';
    const origin=cursor.r===0&&anchor.r===view.length-1?{r:0,c:anchor.c}:anchor;
    $('sheet-delete-col').disabled=!loaded||c1<D.BASE_WIDTH;
    $('sheet-delete-col').title=c1<D.BASE_WIDTH?tr('الأعمدة الأساسية ثابتة؛ يمكن إخفاؤها.','Core columns are fixed; they can be hidden.'):tr('حذف الأعمدة المحددة بكل بياناتها','Delete selected columns and their data');
    $('sheet-grid').querySelectorAll('td[data-col]').forEach(td=>{
      const r=+td.dataset.v,c=+td.dataset.col,current=r===cursor.r&&c===cursor.c,selected=isSelected(r,c),endRow=r+td.rowSpan-1,endCol=cols[cols.indexOf(c)+td.colSpan-1]??c;
      const top=selected&&!isSelected(r-1,c),bottom=selected&&!isSelected(endRow+1,c),first=selected&&!isSelected(r,cols[cols.indexOf(c)-1]??-1),last=selected&&!isSelected(r,cols[cols.indexOf(endCol)+1]??colCount());
      td.classList.toggle('sheet-selected',selected);td.classList.toggle('sheet-current',current);td.classList.toggle('sheet-focus-axis',r===cursor.r||c===cursor.c);
      td.classList.toggle('sheet-selection-origin',selected&&((origin.r>=r&&origin.r<=endRow&&origin.c>=c&&origin.c<=endCol)||extraSelections.some(([a,,b])=>a>=r&&a<=endRow&&b>=c&&b<=endCol)));
      td.classList.toggle('sheet-selection-top',top);td.classList.toggle('sheet-selection-bottom',bottom);
      td.classList.toggle('sheet-selection-left',rtl?last:first);td.classList.toggle('sheet-selection-right',rtl?first:last);
      td.classList.toggle('sheet-selection-corner',bottom&&last);td.classList.toggle('sheet-selection-rtl',rtl);
      td.tabIndex=current?0:-1;td.setAttribute('aria-selected',String(selected));
    });
    if(document.activeElement!==$('sheet-address'))$('sheet-address').value=colLetter(cursor.c)+((view[cursor.r]??0)+1);
    const activeRow=view[cursor.r],raw=cells[activeRow]?.[cursor.c]||'';
    const content=activeRow===undefined?'':raw.startsWith('=')&&cursor.c!==11?String(D.formulaValue(cells,activeRow,cursor.c,formulaCache)):raw;
    $('sheet-cell-content').value=content;$('sheet-cell-content').title=content;
    $('sheet-grid').setAttribute('aria-multiselectable','true');
    $('sheet-grid').querySelectorAll('thead th[data-col]').forEach(th=>th.classList.toggle('sheet-active-header',selectedCols.includes(+th.dataset.col)));
    $('sheet-grid').querySelectorAll('th[data-rowv]').forEach(th=>{th.classList.toggle('sheet-focus-row-header',+th.dataset.rowv===cursor.r);th.classList.toggle('sheet-selected-row-header',ranges.some(([a,b])=>+th.dataset.rowv>=a&&+th.dataset.rowv<=b));});
    const style=formatting.styles[(view[cursor.r]??0)+':'+cursor.c]||{};
    $('sheet-bold').setAttribute('aria-pressed',String(!!style.bold));$('sheet-selection-size').value=String(style.size||formatting.fontSize);
    $('sheet-fill').value=style.bg||'#ffffff';$('sheet-text-color').value=style.color||'#16324f';
    const curAlign=getCellAlign(view[cursor.r]??0,cursor.c)||'';
    $('sheet-align-right')?.setAttribute('aria-pressed',String(curAlign==='right'));
    $('sheet-align-center')?.setAttribute('aria-pressed',String(curAlign==='center'));
    $('sheet-align-left')?.setAttribute('aria-pressed',String(curAlign==='left'));
    excelTools?.paint(style);
  }
  function selectCell(r,c,extend=false,additive=false){startSelection({r,c},{r,c},extend,additive);$('sheet-grid').querySelector(`td[data-v="${r}"][data-col="${c}"]`)?.focus();}
  function focusCell(r,c,extend=false){
    r=Math.max(0,Math.min(view.length-1,r));c=Math.max(0,Math.min(colCount()-1,c));if(!visibleCols().includes(c))c=visibleCols()[0];
    const grid=$('sheet-grid'),scroll=grid.parentElement;
    if(r<drawnStart||r>=drawnEnd){commitEdit();scroll.scrollTop=rowOffsets[r]||0;drawRows(true);}
    if(!grid.querySelector(`td[data-v="${r}"][data-col="${c}"]`)){commitEdit();const header=grid.querySelector(`thead th[data-col="${c}"]`),box=header?.getBoundingClientRect(),viewport=scroll.getBoundingClientRect();if(box){if(box.right>viewport.right)scroll.scrollLeft+=box.right-viewport.right;else if(box.left<viewport.left+46)scroll.scrollLeft+=box.left-viewport.left-46;}drawRows(true);}selectCell(r,c,extend);
  }
  function beginEdit(td,initial){
    if(!loaded||loading)return;commitEdit();const r=+td.dataset.v,c=+td.dataset.col;extraSelections=[];cursor=anchor={r,c};paint();
    if(c===11){td.querySelector('select')?.focus();return;}
    editing={el:td,index:view[r],column:c,old:cells[view[r]]?.[c]||''};td.contentEditable='true';td.spellcheck=false;
    schedulePosition();
    td.textContent=initial!==undefined?initial:editing.old;td.focus();
    td.oninput=()=>schedule();
    td.oncompositionstart=()=>{td.dataset.composing='true';clearTimeout(timer);};
    td.oncompositionend=()=>{delete td.dataset.composing;schedule();};
    if(initial!==undefined)schedule();
    const range=document.createRange();range.selectNodeContents(td);range.collapse(false);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
    td.addEventListener('blur',()=>commitEdit(),{once:true});
  }
  function commitEdit(cancel=false,keepEditing=false){
    if(!editing)return;const edit=editing;
    if(!keepEditing){editing=null;edit.el.contentEditable='false';edit.el.oninput=null;edit.el.oncompositionstart=null;edit.el.oncompositionend=null;delete edit.el.dataset.composing;}
    const value=cancel?edit.old:edit.el.textContent;if(!keepEditing)edit.el.textContent=value;
    if(value!==edit.old){try{change(D.paste(cells,[[value]],edit.index,edit.column),false);if(!filtered()&&view.length<totalInputRows()){pendingRender=true;queueDraw(true);}}
      catch{limitError();}}
    if(keepEditing){edit.old=cells[edit.index]?.[edit.column]||'';return;}
    duplicateIds=D.duplicates(cells);decorateCell(edit.el,edit.index,edit.column);
    if(edit.column===4){$('sheet-grid').querySelectorAll('td[data-col="4"]').forEach(td=>decorateCell(td,view[+td.dataset.v],4));}
    paint();
    if(forceDraw)queueDraw(true);
  }
  function change(next,redraw=true,nextFormat=formatting){
    if(!loaded)return;history.push(snapshot());if(history.length>30)history.shift();future=[];cells=next;updateLastDataRow();formatting=D.format(nextFormat);formulaCache.clear();revision++;schedule();if(redraw)render();else{$('sheet-undo').disabled=false;$('sheet-redo').disabled=true;}
  }
  function undo(redo){commitEdit();const from=redo?future:history,to=redo?history:future;if(!from.length)return;to.push(snapshot());const next=from.pop();cells=next.cells;formatting=D.format(next.format);cellAlignments={...next.alignments};saveAlignments();revision++;schedule();render();if(view.length)focusCell(cursor.r,cursor.c);}
  function schedule(){clearTimeout(timer);message(tr('تعديلات غير محفوظة…','Unsaved changes…'));const saveWhenIdle=()=>{if(editing?.el.dataset.composing==='true'){timer=setTimeout(saveWhenIdle,900);return;}flush(true);};timer=setTimeout(saveWhenIdle,900);}
  function hasDraft(){return !!editing||revision!==savedRevision||!!saving;}
  async function flush(keepEditing=false){
    commitEdit(false,keepEditing);clearTimeout(timer);if(saving){const ok=await saving;if(!ok)return false;return flush(keepEditing);}
    if(!loaded||revision===savedRevision)return true;
    const token=epoch,snapshot=revision,saveOwner=owner,data=D.storage(cells),saveFormat=D.format(formatting);
    message(tr('جارٍ الحفظ…','Saving…'));
    saving=(async()=>{
      try{const result=await Cloud.saveTrainees(saveOwner,data,version,saveFormat);if(token!==epoch)return false;version=Number(result);savedRevision=snapshot;message(revision===savedRevision?tr('تم الحفظ','Saved'):tr('تعديلات غير محفوظة…','Unsaved changes…'));return true;}
      catch(error){if(token===epoch)message(errorMessage(error),true);return false;}
    })();const ok=await saving;saving=null;
    if(ok&&token===epoch&&revision!==savedRevision)return flush(keepEditing);return ok;
  }
  function limitError(){message(tr('الحد الأقصى 1,000,000 صف و500 عمود و2000 حرف للخلية.','Limit: 1,000,000 rows, 500 columns and 2,000 characters per cell.'),true);}
  function clipboardRows(){
    const rows=selectedRows();if(!selectionRanges().every(([a,b])=>a===0&&b===view.length-1))return rows;
    // Whole columns exclude virtual input padding, while retaining explicitly formatted blank rows.
    const formatted=new Set(Object.keys(formatting.styles).map(key=>Number(key.split(':')[0])));let last=rows.length-1;
    while(last>0&&!cells[view[rows[last]]]?.some(Boolean)&&!formatted.has(view[rows[last]]))last--;return rows.slice(0,last+1);
  }
  function selectionText(){const cols=selectedColumns();return D.tsv(clipboardRows().map(r=>cols.map(c=>isSelected(r,c)?cells[view[r]]?.[c]||'':'')));}
  function selectionHtml(){
    const cols=selectedColumns(),table=node('table');table.style.borderCollapse='collapse';
    for(const r of clipboardRows()){
      const idx=view[r],row=node('tr');table.append(row);
      for(const c of cols){
        const td=node('td');row.append(td);if(!isSelected(r,c))continue;
        const value=cells[idx]?.[c]||'',style=formatting.styles[idx+':'+c]||{},result=c===11?({'ناجح':['#00b050','#ffffff'],'راسب':['#ff0000','#ffffff'],'لم يدخل':['#ffff00','#000000']}[value]):null,duplicate=c===4&&duplicateIds.has(D.idKey(value));
        td.textContent=value;Object.assign(td.style,{backgroundColor:duplicate?'#ffc7ce':result?.[0]||style.bg||'#ffffff',color:duplicate?'#9c0006':result?.[1]||style.color||'#16324f',fontWeight:style.bold||result?'700':'400',fontSize:(style.size||formatting.fontSize)+'px',fontFamily:style.font||'IBM Plex Sans Arabic',fontStyle:style.italic?'italic':'normal',textDecoration:[style.underline?'underline':'',style.strike?'line-through':''].filter(Boolean).join(' ')||'none',textAlign:getCellAlign(idx,c)||(formatting.direction==='rtl'?'right':'left'),verticalAlign:style.valign||'middle',whiteSpace:style.wrap===false?'nowrap':'pre-wrap',direction:formatting.direction,textIndent:(style.indent||0)*8+'px'});
        for(const side of ['Top','Bottom','Left','Right'])td.style['border'+side]=style['border'+side]===true?'1px solid #475569':style['border'+side]===false||style.border==='none'?'0':style.border==='all'||style.border==='outline'||style.border===side.toLowerCase()?'1px solid #475569':'1px solid #dbe7f7';
      }
    }
    return table.outerHTML;
  }
  function clearSelection(){if(!loaded)return;const next=cells.slice(),changed=new Set();eachSelected((idx,c)=>{if(!next[idx])return;if(!changed.has(idx)){next[idx]=[...next[idx]];changed.add(idx);}next[idx][c]='';});change(D.normalize(next));}
  function deleteSelectedCells(direction){
    if(!loaded)return;if(!singleSelection())return;commitEdit();
    const [r1,r2,c1,c2]=bounds(),indices=new Set(view.slice(r1,r2+1));
    if(Object.entries(formatting.styles).some(([key,s])=>{if((s.mergeRows||1)===1&&(s.mergeCols||1)===1)return false;const [r,c]=key.split(':').map(Number);return c<=c2&&c+(s.mergeCols||1)-1>=c1&&[...indices].some(i=>i>=r&&i<r+(s.mergeRows||1));})){message(tr('ألغِ دمج الخلايا المحددة قبل إزاحة الخلايا.','Unmerge the selected cells before shifting cells.'),true);return;}
    if(!confirm(tr('حذف الخلايا المحددة وإزاحة باقي بيانات الصف؟ يشمل الأعمدة المخفية.','Delete selected cells and shift the remaining row data? Hidden columns are included.')))return;
    const logical=formatting.direction==='rtl'?(direction==='left'?'right':'left'):direction;
    const next=D.deleteCells(cells,formatting,indices,c1,c2,logical,colCount());
    change(next.cells,false,next.format);
    const prefix=(owner||'default')+':',shift=c2-c1+1,mapped={};
    for(const [key,value]of Object.entries(cellAlignments)){
      if(!key.startsWith(prefix)){mapped[key]=value;continue;}
      const [r,c]=key.slice(prefix.length).split(':').map(Number);
      if(!indices.has(r)){mapped[key]=value;continue;}
      const target=logical==='left'?(c<c1?c:c>c2?c-shift:null):(c>c2?c:c<c1?c+shift:null);
      if(target!==null)mapped[prefix+r+':'+target]=value;
    }
    cellAlignments=mapped;saveAlignments();render();
    message(tr('تم حذف الخلايا. يمكنك التراجع.','Cells deleted. You can undo.'));
  }
  function paste(e){
    if(!loaded)return;e.preventDefault();commitEdit();
    try{
      const text=e.clipboardData.getData('text/plain');if(!text)return;
      const values=D.parse(text);executePaste(values);
    }catch{limitError();}
  }
  function handleUndoShortcut(e){
    if(e.defaultPrevented||e.isComposing)return false;
    if(!loaded)return false;
    const panel=$('panel-trainees');
    if(!panel||!panel.classList.contains('active')||panel.hidden)return false;
    const activeDlg=document.querySelector('dialog[open]');
    if(activeDlg)return false;
    const activeId=document.activeElement?.id;
    if(activeId==='sheet-cell-content'||activeId==='sheet-search'||activeId==='sheet-org'||activeId==='sheet-date'||activeId==='sheet-code-search'||activeId==='sheet-add-bulk-count')return false;

    const isCtrlZ=(e.ctrlKey||e.metaKey)&&(e.code==='KeyZ'||e.key.toLowerCase()==='z');
    const isCtrlY=(e.ctrlKey||e.metaKey)&&(e.code==='KeyY'||e.key.toLowerCase()==='y');
    if(!isCtrlZ&&!isCtrlY)return false;

    e.preventDefault();
    if(isCtrlY||(isCtrlZ&&e.shiftKey)){
      if(editing)commitEdit();
      if(future.length){undo(true);message(tr('تمت الإعادة (Redo)','Redo'));}
      else{message(tr('لا توجد عمليات للإعادة','Nothing to redo'));}
      return true;
    }
    if(isCtrlZ){
      if(editing)commitEdit();
      if(history.length){
        undo(false);
        message(tr('تم التراجع (Undo)','Undo'));
      }else{
        message(tr('لا توجد عمليات للتراجع عنها','Nothing to undo'));
      }
      return true;
    }
    return false;
  }
  function keyDown(e){
    if(e.defaultPrevented)return;
    if(!loaded)return;
    if(handleUndoShortcut(e))return;
    clearTimeout(detailTimer);
    if((e.ctrlKey||e.metaKey)&&['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();commitEdit();if(pendingRender){pendingRender=false;render();}if(!view.length)return;let destination=0;if(e.key==='ArrowDown'){destination=view.length-1;while(destination>0&&view[destination]>lastDataRow)destination--;}focusCell(destination,cursor.c,e.shiftKey);return;}
    if(!editing&&e.key==='Enter'&&cursor.c===4&&duplicateIds.has(D.idKey(cells[view[cursor.r]]?.[4]||''))){e.preventDefault();openDuplicateDetails(view[cursor.r]);return;}
    if(e.target.matches('select')){if(e.key==='Tab'){e.preventDefault();const td=e.target.closest('td');extraSelections=[];cursor=anchor={r:+td.dataset.v,c:+td.dataset.col};moveTab(e.shiftKey);}return;}
    if(editing){
      if(e.key==='Escape'){e.preventDefault();commitEdit(true);focusCell(cursor.r,cursor.c);}
      else if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();commitEdit();render();focusCell(cursor.r+1,cursor.c);}
      else if(e.key==='Tab'){e.preventDefault();commitEdit();render();moveTab(e.shiftKey);}
      return;
    }
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo(e.shiftKey);return;}
    if((e.ctrlKey||e.metaKey)&&(e.code==='KeyC'||e.key.toLowerCase()==='c')){e.preventDefault();void copySelection();return;}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();undo(true);return;}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='a'){e.preventDefault();extraSelections=[];anchor={r:0,c:0};cursor={r:Math.max(0,view.length-1),c:colCount()-1};paint();return;}
    if((e.ctrlKey||e.metaKey)&&(e.key.toLowerCase()==='f'||e.key.toLowerCase()==='h')){e.preventDefault();openFindDialog(e.key.toLowerCase()==='h');return;}
    const sign=formatting.direction==='rtl'?-1:1,cols=visibleCols();
    const moves={ArrowDown:[1,0],ArrowUp:[-1,0],ArrowRight:[0,sign],ArrowLeft:[0,-sign]};
    if(moves[e.key]){e.preventDefault();const [r,c]=moves[e.key];const col=cols[Math.max(0,Math.min(cols.length-1,cols.indexOf(cursor.c)+c))];focusCell(cursor.r+r,col,e.shiftKey);return;}
    if(e.key==='Tab'){e.preventDefault();moveTab(e.shiftKey);return;}
    if(e.key==='Enter'){e.preventDefault();focusCell(cursor.r+(e.shiftKey?-1:1),cursor.c);return;}
    if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();clearSelection();return;}
    const td=e.target.closest('td[data-col]');if(td&&(e.key==='F2'||(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey))){e.preventDefault();beginEdit(td,e.key==='F2'?undefined:e.key);}
  }
  function moveTab(back){const cols=visibleCols();let r=cursor.r,c=cols.indexOf(cursor.c)+(back?-1:1);if(c>=cols.length){c=0;r++;}if(c<0){c=cols.length-1;r--;}focusCell(r,cols[c]);}
  function setMode(next){commitEdit();mode=next;$('sheet-workspace')&&($('sheet-workspace').hidden=mode!=='sheet');$('sheet-code-workspace')&&($('sheet-code-workspace').hidden=mode!=='codes');$('sheet-mode')?.setAttribute('aria-selected',String(mode==='sheet'));$('sheet-codes-mode')?.setAttribute('aria-selected',String(mode==='codes'));if(mode==='codes')renderCodes();}
  function renderCodes(){
    if(!initialized)return;
    const admin=Cloud.role()==='admin',search=$('sheet-code-search').value.toLocaleLowerCase();
    const rows=Cloud.codeSnapshot().filter(r=>(admin&&codeMode==='pool'?r.owner_id==null:r.owner_id===owner)&&(!search||r.code.toLocaleLowerCase().includes(search)||r.category.toLocaleLowerCase().includes(search)));
    $('sheet-assign').textContent=codeMode==='pool'?tr('تخصيص المحدد للمستخدم','Assign selected to user'):tr('إرجاع المحدد للمخزون','Return selected to stock');
    $('sheet-code-notice').textContent=admin?tr('اختر المستخدم بالأعلى ثم خصص له الأكواد من المخزون غير المخصص. الإرجاع للمخزون متاح للأكواد غير المستخدمة فقط.','Choose a user above, then assign codes from unassigned stock. Only unused codes can be returned.'):tr('هذه الأكواد مخصصة لحسابك. تواصل مع الأدمن لإضافة أكواد.','These codes belong to your account. Ask the administrator to assign more.');
    $('sheet-code-count').textContent=tr('عدد الأكواد: ','Codes: ')+rows.length;
    const box=$('sheet-code-list');box.replaceChildren();if(!rows.length){box.append(node('div',tr('لا توجد أكواد في هذا العرض.','No codes in this view.'),{class:'sheet-empty'}));return;}
    const table=node('table',undefined,{class:'sheet-codes-table'}),thead=node('thead'),trEl=node('tr');
    if(admin){const th=node('th'),all=node('input',undefined,{type:'checkbox','aria-label':tr('تحديد الكل','Select all')});all.onchange=()=>box.querySelectorAll('input[data-code]').forEach(el=>{if(!el.disabled)el.checked=all.checked;});th.append(all);trEl.append(th);}
    [tr('الكود','Code'),tr('الفئة','Category'),tr('الاستخدام','Usage'),''].forEach(label=>trEl.append(node('th',label)));thead.append(trEl);table.append(thead);const body=node('tbody');
    rows.forEach(row=>{const r=node('tr');if(admin){const td=node('td'),check=node('input',undefined,{type:'checkbox','data-code':row.code,'aria-label':row.code});check.disabled=codeMode==='owned'&&!!row.used_on;td.append(check);r.append(td);}
      r.append(node('td',row.code,{dir:'ltr'}),node('td',row.category),node('td',row.used_on||tr('غير مستخدم','Unused')));
      const action=node('td');action.append(button(tr('نسخ واستخدام','Copy & use'),async()=>{if(await Cloud.copyCode(row.code))renderCodes();}));r.append(action);body.append(r);});table.append(body);box.append(table);
  }
  async function assign(){
    if(codeBusy||!owner)return;
    const chosen=[...$('sheet-code-list').querySelectorAll('input[data-code]:checked')].map(el=>el.dataset.code);
    if(!chosen.length)return;if(chosen.length>250){$('sheet-code-status').textContent=tr('اختر حتى 250 كودًا في المرة.','Select up to 250 codes at a time.');return;}
    const snapshot=new Map(Cloud.codeSnapshot().map(row=>[row.code,row]));const items=chosen.map(code=>({code,version:snapshot.get(code).version}));
    if(!confirm(codeMode==='pool'?tr('تخصيص الأكواد المحددة للمستخدم المعروض؟','Assign selected codes to the displayed user?'):tr('إرجاع الأكواد المحددة للمخزون؟','Return selected codes to stock?')))return;
    codeBusy=true;$('sheet-code-workspace').inert=true;if($('sheet-owner'))$('sheet-owner').disabled=true;
    try{await Cloud.assignCodes(codeMode==='pool'?owner:null,items);renderCodes();$('sheet-code-status').textContent=tr('تم تحديث تخصيص الأكواد.','Code assignments updated.');}
    catch(error){$('sheet-code-status').textContent=/CONFLICT/.test(error.message||'')?tr('تغيرت الأكواد. حدّث القائمة وحاول مجددًا.','Codes changed. Refresh and try again.'):tr('تعذر تخصيص الأكواد. تأكد أن المستخدم نشط ثم حدّث القائمة.','Could not assign codes. Check that the user is active, then refresh.');}
    finally{codeBusy=false;$('sheet-code-workspace').inert=false;if($('sheet-owner'))$('sheet-owner').disabled=false;}
  }
  function reset(){prometricTools?.reset();certificateTools?.reset();setExpandedView(false);excelTools?.closeFiles();closeDuplicateDetails();closeContextMenu();$('sheet-find-dialog')?.close();clearTimeout(timer);epoch++;owner='';cells=[];formatting=D.defaultFormat();loaded=false;loading=false;editing=null;history=[];future=[];revision=savedRevision=0;if(initialized){$('sheet-cell-content').value='';$('sheet-cell-content').title='';render();$('sheet-owner')?.replaceChildren();$('sheet-code-list').replaceChildren();$('sheet-workspace').inert=true;}}
  function suspend(){prometricTools?.reset();certificateTools?.reset();setExpandedView(false);excelTools?.closeFiles();closeDuplicateDetails();closeContextMenu();$('sheet-find-dialog')?.close();clearTimeout(timer);}
  return {open,translate,hasDraft,flush,reset,suspend,savePosition};
})();
Trainees.translate();
