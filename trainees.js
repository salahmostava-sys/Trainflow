/* Private, versioned trainee workspaces. No student data is stored in browser storage. */
const Trainees=(()=>{
  'use strict';
  const D=TraineeData,$=id=>document.getElementById(id);
  const baseLabels=[['الكود','Code'],['البريد الإلكتروني','Email'],['الاسم بالعربي','Arabic name'],['الاسم بالإنجليزي','English name'],['رقم الهوية / الإقامة','National / Iqama ID'],['الجوال','Phone'],['الجهة','Organization'],['الاختبار','Exam'],['تاريخ الاختبار','Exam date'],['اسم المستخدم','Username'],['كلمة المرور','Password'],['النتيجة','Result'],['AnyDesk ID','AnyDesk ID']];
  function colLetter(c){let s='';c++;while(c>0){const m=(c-1)%26;s=String.fromCharCode(65+m)+s;c=Math.floor((c-m)/26);}return s;}
  const DISPLAY_COLS=20;
  // Stored columns remain available to whole-row copy, exports and subsequent saves.
  function colCount(){let count=DISPLAY_COLS;if(cells&&cells.length&&cells[0]&&cells[0].length>count)count=cells[0].length;if(formatting&&formatting.headers){for(const k of Object.keys(formatting.headers)){const idx=Number(k);if(idx>=count)count=idx+1;}}return Math.min(D.MAX_COLS,count);}
  function getColLabel(c){if(formatting&&formatting.headers&&formatting.headers[c])return [formatting.headers[c],formatting.headers[c]];if(c<baseLabels.length)return baseLabels[c];const l=colLetter(c);return ['عمود '+l,'Column '+l];}
  function allLabels(){const n=colCount(),res=[];for(let c=0;c<n;c++)res.push(getColLabel(c));return res;}
  const labels=new Proxy(baseLabels,{get(target,prop){if(prop==='length')return colCount();if(prop==='map')return fn=>allLabels().map(fn);if(prop==='forEach')return fn=>allLabels().forEach(fn);if(prop==='filter')return fn=>allLabels().filter(fn);if(prop==='slice')return (s,e)=>allLabels().slice(s,e);if(typeof prop==='string'&&/^\d+$/.test(prop)){return getColLabel(Number(prop));}return target[prop];}});
  const tr=(ar,en)=>currentLang==='ar'?ar:en;
  let owner='',cells=[],version=0,revision=0,savedRevision=0,loaded=false,loading=false,epoch=0;
  const FIRST_SHEET='00000000-0000-0000-0000-000000000001';
  let sheetId=FIRST_SHEET,worksheets=[],sheetTools=null,worksheetBusy=false,sortRules=[];
  const workspaceIdentity=()=>sheetId===FIRST_SHEET?owner:owner+':'+sheetId;
  let timer,saving=null,history=[],future=[],view=[],sortCol=-1,sortDir=1,anchor={r:0,c:0},cursor={r:0,c:0},editing=null;
  let members=[],mode='sheet',codeMode='owned',codeBusy=false,initialized=false;
  let dragging=false,dragMoved=false,rowDragging=false,columnDragging=false,skipSelectionClick=false;
  let dragPointer=null,dragScrollFrame=0;
  let extraSelections=[],selectionKind='cell';
  let formatting=D.defaultFormat(),duplicateIds=new Map();
  let rowOffsets=[0],rowHeights=new Map(),drawnStart=-1,drawnEnd=-1,drawnColumns='',scrollFrame=0;
  const DAY_HEADER_HEIGHT=40;
  let dayHeaders=new Map();
  let visibleCache=null,headersKey='',mergeCacheFormat=null,mergeCache=[];
  let excelTools=null,prometricTools=null,examResultTools=null,certificateTools=null,formulaCache=new Map();
  const searchRows=new WeakMap();
  let lastDataRow=-1;
  let positionTimer,restoringPosition=false;
  const positionKey=()=> 'ibta_trainee_position:'+Cloud.userId()+':'+workspaceIdentity();
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
      extraSelections=[];anchor=cursor={r:adjacentVisibleRow(Math.max(0,r)-1,1),c:cols.includes(saved.column)?saved.column:cols[0]};
      const scroll=$('sheet-grid').parentElement;
      scroll.scrollTop=(rowOffsets[Math.max(0,first)]||0)+(Number.isFinite(saved.offset)?Math.max(0,Math.min(saved.offset,400)):0);
      scroll.scrollLeft=Number.isFinite(saved.left)?saved.left:0;drawRows(true);
      $('sheet-grid').querySelector(`td[data-v="${cursor.r}"][data-col="${cursor.c}"]`)?.focus({preventScroll:true});
    }finally{restoringPosition=false;}
  }
  function updateLastDataRow(){lastDataRow=cells.length-1;while(lastDataRow>=0&&!cells[lastDataRow].some(Boolean))lastDataRow--;}
  const totalInputRows=()=>Math.min(D.MAX_ROWS,Math.max(cells.length,lastDataRow+1001,(formatting.daySeparators?.at(-1)??-1)+1));
  let excelView={wrap:false,zoom:100};
  let rowSize=15;
  try{const savedRowSize=Number(localStorage.getItem('ibta_trainee_row_size'));if([15,21,28,36].includes(savedRowSize))rowSize=savedRowSize;}catch{}
  let expandedView=false,previousViewZoom=null;
  const touchPointer=matchMedia('(pointer: coarse)');
  function displayRowHeight(){
    const preferred=rowSize*4/3*(expandedView?0.8:1);
    // Keep touch targets usable at every zoom without rewriting saved density preferences.
    return touchPointer.matches?Math.max(preferred,44*100/excelView.zoom):preferred;
  }
  function setRowSize(value){
    const next=Number(value);if(![15,21,28,36].includes(next))return;
    rowSize=next;try{localStorage.setItem('ibta_trainee_row_size',String(rowSize));}catch{}
    $('sheet-row-size').value=String(rowSize);applyExcelView();
    resetRowHeights();rebuildRowOffsets();drawRows(true);
  }
  try{const pref=JSON.parse(localStorage.getItem('ibta_sheet_view')||'{}');excelView={wrap:pref.wrap===true,zoom:Number.isInteger(pref.zoom)&&pref.zoom>=50&&pref.zoom<=200?pref.zoom:100};}catch{}
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
    stopSelectionDrag();
    if(!initialized||expandedView===active)return;commitEdit();const grid=$('sheet-grid'),scroll=grid.parentElement,first=rowAtOffset(scroll.scrollTop),offset=scroll.scrollTop-rowOffsets[first],oldZoom=excelView.zoom,left=scroll.scrollLeft;
    const headBottom=grid.querySelector('thead th').getBoundingClientRect().bottom;const visualAnchor=[...grid.querySelectorAll('th[data-rowv]')].find(th=>th.parentElement.getBoundingClientRect().top>=headBottom-1);const anchorRow=visualAnchor?.dataset.rowv,anchorGap=visualAnchor?visualAnchor.parentElement.getBoundingClientRect().top-headBottom:0;
    expandedView=active;$('sheet-workspace').classList.toggle('sheet-expanded-view',active);document.body.classList.toggle('sheet-expanded-open',active);
    $('sheet-expanded').setAttribute('aria-pressed',String(active));$('sheet-workspace').classList.remove('sheet-expanded-tools');$('sheet-expanded-tools').setAttribute('aria-pressed','false');
    excelTools?.syncRibbon();
    if(active){previousViewZoom=excelView.zoom;excelView.zoom=expandedZoom();}else{excelView.zoom=previousViewZoom??excelView.zoom;previousViewZoom=null;}
    applyExcelView();resetRowHeights();rebuildRowOffsets();const top=rowOffsets[first]+offset*excelView.zoom/oldZoom;scroll.scrollTop=top;scroll.scrollLeft=left*excelView.zoom/oldZoom;drawRows(true);
    const measuredTop=rowOffsets[first]+offset*excelView.zoom/oldZoom;if(Math.abs(scroll.scrollTop-measuredTop)>1){scroll.scrollTop=measuredTop;drawRows(true);}
    if(anchorRow!==undefined){for(let i=0;i<3;i++){const th=grid.querySelector('th[data-rowv=\"'+anchorRow+'\"]');if(!th)break;const delta=th.parentElement.getBoundingClientRect().top-grid.querySelector('thead th').getBoundingClientRect().bottom-anchorGap;if(Math.abs(delta)<0.5)break;scroll.scrollTop+=delta;drawRows(true);}}
    if(active)$('sheet-expanded-close').focus({preventScroll:true});else $('sheet-expanded').focus({preventScroll:true});
  }
  function applyExcelView(){
    const grid=$('sheet-grid');if(!grid)return;
    grid.style.setProperty('--sheet-zoom',String(excelView.zoom/100));
    $('sheet-workspace').style.setProperty('--sheet-row-size',rowSize+'pt');$('sheet-workspace').style.setProperty('--sheet-row-height',displayRowHeight()+'px');
    $('sheet-zoom-slider').value=String(excelView.zoom);if(document.activeElement!==$('sheet-zoom-reset'))$('sheet-zoom-reset').value=excelView.zoom+'%';
    $('sheet-zoom-out').disabled=excelView.zoom<=50;$('sheet-zoom-in').disabled=excelView.zoom>=200;
    grid.classList.toggle('sheet-wrap-text',excelView.wrap);
  }
  let hoverTimer,hoverHideTimer,detailTimer,hoverCell=null,detailKey='',detailPage=0;
  let colWidths={};
  try{colWidths=JSON.parse(localStorage.getItem('ibta_trainee_col_widths')||'{}')||{};}catch{}
  const legacyWidths={...colWidths};
  function applySavedColWidths(){
    const ws=$('sheet-workspace');if(!ws)return;
    for(let c=0;c<D.MAX_COLS;c++)ws.style.removeProperty('--col-w-'+c);
    colWidths={...(formatting.widths||(sheetId===FIRST_SHEET?legacyWidths:{}))};
    if(formatting.defaultWidth)for(let c=0;c<colCount();c++)if(!colWidths[c])ws.style.setProperty('--col-w-'+c,formatting.defaultWidth+'px');
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
    if(loaded){const fmt=D.format(formatting);fmt.widths={...colWidths};change(cells,true,fmt);}
  }
  let cellAlignments={};
  try{cellAlignments=JSON.parse(localStorage.getItem('ibta_trainee_alignments')||'{}')||{};}catch{}
  function getCellAlign(idx,col){return formatting.styles[idx+':'+col]?.align||cellAlignments[(workspaceIdentity()||'default')+':'+idx+':'+col]||'';}
  function setCellAlign(idx,col,align){
    const key=(workspaceIdentity()||'default')+':'+idx+':'+col;
    if(!align)delete cellAlignments[key];else cellAlignments[key]=align;
  }
  function saveAlignments(){try{localStorage.setItem('ibta_trainee_alignments',JSON.stringify(cellAlignments));}catch{}}
  function setSelectionAlignment(align){
    if(!loaded||loading)return;formatSelection({align});
  }
  function shiftStylesOnInsert(fmt,insertIdx){
    const next=D.format(fmt);next.styles={};
    if(next.daySeparators)next.daySeparators=next.daySeparators.map(r=>r>=insertIdx?r+1:r).filter(r=>r<D.MAX_ROWS);
    for(const [key,style]of Object.entries(fmt.styles)){
      const [r,c]=key.split(':').map(Number);
      const target=r>=insertIdx?r+1:r;
      if(target<D.MAX_ROWS){const value={...style};if(value.mergeRows&&r<insertIdx&&r+value.mergeRows>insertIdx)value.mergeRows++;next.styles[target+':'+c]=value;}
    }
    return next;
  }
  function shiftAlignmentsOnInsert(insertIdx){
    const prefix=(workspaceIdentity()||'default')+':',updated={};
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
    if(filtered()||formatting.hiddenRows?.length){message(()=>tr('امسح الفلاتر والفرز وأظهر الصفوف قبل الإدراج.','Clear filters and sorting and unhide rows before inserting.'),true);return;}
    const selected=selectedRows(),count=Math.max(1,selected.length);
    if(cells.length+count>D.MAX_ROWS)return limitError();
    let targetIdx=view[Math.min(...selected)]??cells.length;
    if(pos==='below')targetIdx=(view[Math.max(...selected)]??cells.length)+1;
    const next=cells.slice();
    while(next.length<targetIdx)next.push(D.blank());
    next.splice(targetIdx,0,...Array.from({length:count},()=>D.blank(colCount())));
    const nextFmt=D.format(formatting);nextFmt.styles={};for(const [key,v]of Object.entries(formatting.styles)){const [r,c]=key.split(':').map(Number);const value={...v};if(value.mergeRows&&r<targetIdx&&r+value.mergeRows>targetIdx)value.mergeRows+=count;nextFmt.styles[(r>=targetIdx?r+count:r)+':'+c]=value;}
    if(nextFmt.hiddenRows)nextFmt.hiddenRows=nextFmt.hiddenRows.map(r=>r>=targetIdx?r+count:r);
    if(nextFmt.daySeparators)nextFmt.daySeparators=nextFmt.daySeparators.map(r=>r>=targetIdx?r+count:r).filter(r=>r<D.MAX_ROWS);
    change(next,true,nextFmt);
    focusCell(pos==='above'?cursor.r:cursor.r+1,cursor.c);
    message(()=>tr('تم إدراج صف جديد','New row inserted'));
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
    message(()=>tr(`تمت إضافة ${n.toLocaleString()} صف دفعة واحدة بنجاح`,`Added ${n.toLocaleString()} rows at once successfully`));
  }
  async function deleteSelectedRows(){
    commitEdit();const ids=new Set(selectedRows().map(r=>view[r]));
    if(!ids.size)return;
    const ok=await (window.AppDialog?AppDialog.confirm({
      title:tr(ids.size>1?'حذف الصفوف المحددة':'حذف الصف المحدد',ids.size>1?'Delete Selected Rows':'Delete Selected Row'),
      message:tr((ids.size>1?'حذف الصفوف المحددة؟':'حذف الصف المحدد؟'),(ids.size>1?'Delete selected rows?':'Delete selected row?')),
      confirmText:tr('حذف','Delete'),
      cancelText:tr('إلغاء','Cancel'),
      danger:true,
      icon:'trash'
    }):confirm(tr((ids.size>1?'حذف الصفوف المحددة؟':'حذف الصف المحدد؟'),(ids.size>1?'Delete selected rows?':'Delete selected row?'))));
    if(!ok)return;
    const next=D.removeRows(cells,formatting,ids);change(next.cells,true,next.format);
    message(()=>tr(ids.size>1?'تم حذف الصفوف المحددة':'تم حذف الصف المحدد',ids.size>1?'Selected rows deleted':'Selected row deleted'));
  }
  function addSeparatorRow(){
    commitEdit();
    if(!loaded||loading||worksheetBusy)return;
    if(filtered()){
      message(()=>tr('امسح الفلاتر والفرز قبل إضافة فاصل.','Clear filters and sorting before adding a separator.'),true);
      return;
    }
    const vr=cursor.r;
    if(vr<0||vr>=view.length){
      message(()=>tr('حدد صفًا أولاً لإضافة فاصل.','Select a row first to add a separator.'),true);
      return;
    }
    const r=view[vr];
    const currentRow=cells[r];
    const hasContent=Boolean(currentRow&&currentRow.some(cell=>cell&&typeof cell==='string'&&cell.trim()!==''));
    if(hasContent){
      message(()=>tr('الصف يجب أن يكون فارغًا لإضافة فاصل.','The row must be empty to add a separator.'),true);
      return;
    }
    const totalCols=colCount();
    let count=0;
    let date='';
    for(let i=r+1;i<cells.length;i++){
      const rowStyle=formatting.styles[i+':0'];
      const isNextSeparator=Boolean(
        (rowStyle?.mergeCols&&rowStyle.mergeCols>=totalCols)||
        formatting.daySeparators?.includes(i)
      );
      if(isNextSeparator)break;
      const row=cells[i];
      if(row&&row.some(cell=>cell&&typeof cell==='string'&&cell.trim()!=='')){
        count++;
        if(!date){
          const d=(row[8]||'').trim();
          if(d)date=d;
        }
      }
    }
    if(!date){
      for(let i=r+1;i<cells.length;i++){
        const rowStyle=formatting.styles[i+':0'];
        if((rowStyle?.mergeCols&&rowStyle.mergeCols>=totalCols)||formatting.daySeparators?.includes(i))break;
        const row=cells[i];
        if(!row)continue;
        for(let c=0;c<row.length;c++){
          const val=(row[c]||'').trim();
          if(/^\d{4}-\d{1,2}-\d{1,2}$|^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(val)){
            date=val;
            break;
          }
        }
        if(date)break;
      }
    }
    const formattedDate=date?dayDateLabel(date):'';
    let text='';
    if(formattedDate){
      text=tr('التاريخ: '+formattedDate+' — عدد الصفوف: '+count,'Date: '+formattedDate+' — Rows: '+count);
    }else{
      text=tr('فاصل — عدد الصفوف: '+count,'Separator — Rows: '+count);
    }
    const nextCells=D.paste(cells,[[text]],r,0);
    const nextFmt=D.format(formatting);
    for(const [k,v]of Object.entries(nextFmt.styles)){
      const [rowIdx]=k.split(':').map(Number);
      if(rowIdx===r){
        delete v.mergeRows;
        delete v.mergeCols;
        delete v.centerAcross;
      }
    }
    nextFmt.styles[r+':0']={
      ...nextFmt.styles[r+':0'],
      mergeCols:totalCols,
      mergeRows:1,
      align:'center',
      valign:'middle',
      bold:true,
      bg:'#dbeafe',
      color:'#1e40af',
      size:13
    };
    change(nextCells,true,nextFmt);
    flush();
    message(()=>tr('تمت إضافة الفاصل ودمج الصف بنجاح ✨','Separator added and row merged successfully ✨'));
  }
  async function cutSelection(){
    if(editing)return;
    if(await copySelection()){clearSelection();message(()=>tr('تم القص إلى الحافظة','Cut to clipboard'));}
  }
  async function copySelection(){
    if(editing||!loaded)return false;const text=selectionText();let copied=false;
    // Plain text works in any application; HTML keeps the selected table in Excel.
    if(navigator.clipboard?.write&&typeof ClipboardItem!=='undefined')try{
      await navigator.clipboard.write([new ClipboardItem({'text/plain':new Blob([text],{type:'text/plain'}),'text/html':new Blob([selectionHtml()],{type:'text/html'})})]);copied=true;
    }catch{}
    if(!copied)copied=await copyText(text);
    if(copied)message(()=>tr('تم النسخ إلى الحافظة','Copied to clipboard'));
    return copied;
  }
  function executePaste(values,columns=copyingWholeRows()?allColumns():visibleCols()){
    if(!values||!values.length)return;
    if(!singleSelection())return;
    if(filtered()&&values.length>1){message(()=>tr('امسح الفلاتر والفرز قبل لصق عدة صفوف.','Clear filters and sorting before pasting multiple rows.'),true);return;}
    if(!cells.length){cells=[D.blank()];revision++;}
    let [r,,c]=bounds();let idx=view[r];
    if(idx===undefined){idx=cells.length;r=Math.max(0,view.length);}
    const width=Math.max(...values.map(v=>v.length));
    const availCols=columns.filter(col=>col>=c);
    const overflowStart=(availCols.at(-1)??c-1)+1;
    const targets=Array.from({length:width},(_,col)=>col<availCols.length?availCols[col]:overflowStart+col-availCols.length);
    const maxTargetCol=targets.filter(col=>visibleCols().includes(col)).at(-1)??c;
    const valuesWithBlanks=values.map(row=>Array.from({length:width},(_,col)=>row[col]||''));
    const next=D.pasteMapped(cells,valuesWithBlanks,idx,targets);
    extraSelections=[];selectionKind='cell';change(next);anchor={r,c};cursor={r:Math.max(0,r+values.length-1),c:maxTargetCol};paint();
    message(()=>tr('تم اللصق بنجاح ('+values.length+' صف، '+width+' عمود)','Pasted successfully ('+values.length+' rows, '+width+' cols)'));
  }
  async function pasteSelection(){
    if(editing)return;
    const token=epoch,target=bounds().join(':');
    try{
      const entries=navigator.clipboard.read?await navigator.clipboard.read():[];
      const entry=entries.find(item=>item.types.includes('text/plain'));
      const text=entry?await(await entry.getType('text/plain')).text():await navigator.clipboard.readText();if(!text)return;
      const html=entry?.types.includes('text/html')?await(await entry.getType('text/html')).text():'';
      if(token!==epoch||target!==bounds().join(':')||!loaded||loading)return;
      executePaste(D.parse(text),wholeRowClipboard(html)?allColumns():undefined);
    }catch{limitError();}
  }
  function initContextMenu(){
    // Column actions keep the 13 fixed operational fields in their original positions.
    const menu=$('sheet-context-menu');

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
        case 'row-height':await excelTools.rowHeight();break;
        case 'insert-column-left':editColumns('left');break;
        case 'insert-column-right':editColumns('right');break;
        case 'delete-column':editColumns('delete');break;
        case 'clear-contents':clearSelection();break;
        case 'delete-left':deleteSelectedCells('left');break;
        case 'delete-right':deleteSelectedCells('right');break;
        case 'clear-format':formatSelection(null);break;
        case 'select-all':selectAll();break;
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
  async function editColumns(action){
    if(!loaded)return;if(!singleSelection())return;commitEdit();const [,,c1,c2]=bounds(),insert=action!=='delete';
    let start=insert?Math.max(D.BASE_WIDTH,cursor.c+((action==='right')!==(formatting.direction==='rtl')?1:0)):c1;
    const count=c2-c1+1;
    if(!insert&&start<D.BASE_WIDTH){message(()=>tr('أعمدة بيانات المتدرب الأساسية ثابتة. يمكنك إخفاؤها أو مسح محتواها.','The trainee fields are fixed. You can hide them or clear their contents.'),true);return;}
    if(!insert){
      const ok=await (window.AppDialog?AppDialog.confirm({
        title:tr('حذف الأعمدة المحددة','Delete Selected Columns'),
        message:tr('حذف الأعمدة المحددة بكل بياناتها؟ يمكنك التراجع.','Delete selected columns and their data? You can undo.'),
        confirmText:tr('حذف','Delete'),
        cancelText:tr('إلغاء','Cancel'),
        danger:true,
        icon:'trash'
      }):confirm(tr('حذف الأعمدة المحددة بكل بياناتها؟ يمكنك التراجع.','Delete selected columns and their data? You can undo.')));
      if(!ok)return;
    }
    let name='';if(insert){
      name=await (window.AppDialog?AppDialog.prompt({
        title:tr('إضافة عمود جديد','Add New Column'),
        message:tr('اسم العمود الجديد:','New column name:'),
        defaultValue:tr('عمود جديد','New column'),
        confirmText:tr('إضافة','Add'),
        cancelText:tr('إلغاء','Cancel'),
        icon:'column'
      }):prompt(tr('اسم العمود الجديد:','New column name:'),tr('عمود جديد','New column')));
      if(name===null)return;
    }
    let next;try{next=D.columns(cells,formatting,start,count,insert,colCount());}catch{limitError();return;}
    if(insert)next.format.headers[start]=name.trim()||tr('عمود جديد','New column');
    change(next.cells,false,next.format);
    const prefix=(workspaceIdentity()||'default')+':',mapped={};
    for(const [key,value]of Object.entries(cellAlignments)){if(!key.startsWith(prefix)){mapped[key]=value;continue;}const [r,c]=key.slice(prefix.length).split(':').map(Number),target=insert?(c>=start?c+count:c):(c<start?c:c>=start+count?c-count:null);if(target!==null)mapped[prefix+r+':'+target]=value;}
    cellAlignments=mapped;saveAlignments();extraSelections=[];anchor=cursor={r:cursor.r,c:Math.min(start,colCount()-1)};render();
    message(()=>tr('تم تحديث الأعمدة. يمكنك التراجع.','Columns updated. You can undo.'));
  }
  function updateContextMenuTranslations(){
    const menu=$('sheet-context-menu');if(!menu)return;
    const labels={
      'cut':tr('قص','Cut'),'copy':tr('نسخ','Copy'),'paste':tr('لصق','Paste'),
      'insert-above':tr('إدراج صف لأعلى','Insert row above'),'insert-below':tr('إدراج صف لأسفل','Insert row below'),
      'insert-1000':tr('إدراج 1000 صف في الأسفل','Insert 1,000 rows at bottom'),
      'delete-row':tr('حذف الصف','Delete row'),'clear-contents':tr('مسح المحتويات','Clear contents'),
      'row-height':tr('ارتفاع الصف…','Row Height…'),
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
    const dlg=$('sheet-find-dialog');

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
      message(()=>tr(`تم استبدال ${count} عنصر بنجاح`,`Replaced ${count} occurrences`));
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
      const newWidth=Math.max(40,Math.min(800,Math.round(startWidth+delta)));
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
  function saveRowHeight(index,height){
    const next=D.format(formatting);
    for(const [key,style]of Object.entries(next.styles))if(Number(key.split(':')[0])===index)delete style.height;
    if(height!==null){const key=index+':0';next.styles[key]={...next.styles[key],height};}
    change(cells,true,next);
  }
  function initRowResize(e,index){
    if(e.button!==0)return;e.preventDefault();e.stopPropagation();
    const token=epoch,zoom=excelView.zoom/100,startY=e.clientY,startHeight=e.currentTarget.parentElement.parentElement.getBoundingClientRect().height/zoom;
    let height=Math.round(startHeight);commitEdit();
    const move=event=>{if(token!==epoch)return;height=Math.max(20,Math.min(400,Math.round(startHeight+(event.clientY-startY)/zoom)));rowHeights.set(index,height*zoom);rebuildRowOffsets();queueDraw(true);};
    const cleanup=()=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',finish);document.removeEventListener('pointercancel',cancel);};
    const finish=()=>{cleanup();if(token===epoch&&height!==Math.round(startHeight))saveRowHeight(index,height);};
    const cancel=()=>{cleanup();if(token===epoch)render();};
    document.addEventListener('pointermove',move);document.addEventListener('pointerup',finish);document.addEventListener('pointercancel',cancel);
  }
  const visibleCols=()=>{if(visibleCache?.format===formatting)return visibleCache.cols;const hidden=new Set(formatting.hidden),cols=Array.from({length:DISPLAY_COLS},(_,c)=>c).filter(c=>!hidden.has(c));visibleCache={format:formatting,cols};return cols;};
  // Every data mutation creates a new matrix, so history can retain the old matrix safely.
  const snapshot=()=>({cells,format:D.format(formatting),alignments:{...cellAlignments}});
  function node(tag,text,attrs={}){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;for(const [key,value]of Object.entries(attrs))el.setAttribute(key,value);return el;}
  let statusTextForLanguage=()=>'',statusError=false;
  function renderMessage(){
    if(!$('sheet-status'))return;
    $('sheet-status').textContent=statusTextForLanguage();$('sheet-status').dataset.error=String(statusError);
  }
  const message=(textForLanguage,error=false)=>{statusTextForLanguage=textForLanguage;statusError=error;renderMessage();};
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
    setTimeout(()=>TraineeReports.mount(()=>({owner,sheetId,rows:cells,formatting,duplicateIds,getCellAlign,loaded:loaded&&!loading&&!worksheetBusy}),commitEdit),0);

    $('sheet-row-size').value=String(rowSize);$('sheet-row-size').onchange=()=>setRowSize($('sheet-row-size').value);
    const zoomTools=$('sheet-workspace').querySelector('.sheet-zoom-tools');

    $('sheet-expanded').onclick=()=>setExpandedView(true);$('sheet-expanded-close').onclick=()=>setExpandedView(false);
    $('sheet-expanded-tools').onclick=()=>{const show=$('sheet-workspace').classList.toggle('sheet-expanded-tools');$('sheet-expanded-tools').setAttribute('aria-pressed',String(show));excelTools?.syncRibbon();queueDraw(true);};
    $('sheet-zoom-out').onclick=()=>setZoom(excelView.zoom-10);$('sheet-zoom-in').onclick=()=>setZoom(excelView.zoom+10);
    $('sheet-zoom-slider').oninput=()=>setZoom($('sheet-zoom-slider').value);
    const zoomInput=$('sheet-zoom-reset'),commitZoom=()=>{
      const value=zoomInput.value.trim().replace(/[٠-٩]/g,d=>String(d.charCodeAt(0)-1632)).replace(/[۰-۹]/g,d=>String(d.charCodeAt(0)-1776)).replace(/[%٪]$/,'').trim();
      if(/^\d+(?:\.\d+)?$/.test(value)&&Number.isFinite(Number(value)))setZoom(Number(value));
      zoomInput.value=excelView.zoom+'%';
    };
    zoomInput.onfocus=()=>zoomInput.select();zoomInput.onblur=commitZoom;
    zoomInput.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();commitZoom();zoomInput.blur();}else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();zoomInput.value=excelView.zoom+'%';zoomInput.blur();}};
    $('sheet-address').addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();$('sheet-address').blur();paint();return;}
      if(e.key!=='Enter')return;e.preventDefault();if(!loaded)return;
      const match=/^([A-Z]+)([1-9]\d*)$/.exec($('sheet-address').value.trim().toUpperCase());
      let col=0;if(match)for(const letter of match[1])col=col*26+letter.charCodeAt(0)-64;
      const row=match?Number(match[2])-1:-1;col--;
      if(!match||row<0||row>=totalInputRows()||col<0||col>=labels.length||!visibleCols().includes(col)){message(()=>tr('اكتب عنوان خلية موجودة وعمود ظاهر، مثل D150.','Enter an existing cell in a visible column, such as D150.'),true);return;}
      commitEdit();clearFilters();render();focusCell(view.indexOf(row),col);
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
    $('sheet-font-minus').onclick=()=>adjustFont(-1);$('sheet-font-plus').onclick=()=>adjustFont(1);
    $('sheet-direction').onchange=()=>{commitEdit();const next=D.format(formatting);next.direction=$('sheet-direction').value;change(cells,true,next);};
    $('sheet-fill').onchange=()=>formatSelection({bg:$('sheet-fill').value});
    $('sheet-text-color').onchange=()=>formatSelection({color:$('sheet-text-color').value});
    $('sheet-bold').onclick=()=>formatSelection({bold:!formatting.styles[(view[cursor.r]??0)+':'+cursor.c]?.bold});
    $('sheet-align-right').onclick=()=>setSelectionAlignment('right');
    $('sheet-align-center').onclick=()=>setSelectionAlignment('center');
    $('sheet-align-left').onclick=()=>setSelectionAlignment('left');
    $('sheet-selection-size').onchange=()=>formatSelection({size:Number($('sheet-selection-size').value)});
    $('sheet-undo').onclick=()=>undo(false);$('sheet-redo').onclick=()=>undo(true);
    $('sheet-select-all').onclick=()=>selectAll();
    if($('sheet-add-separator-btn'))$('sheet-add-separator-btn').onclick=addSeparatorRow;
    ['sheet-search','sheet-org','sheet-date','sheet-result'].forEach(id=>$(id).addEventListener('input',()=>{commitEdit();extraSelections=[];anchor=cursor={r:0,c:0};render();}));
    $('sheet-duplicates-only').onchange=()=>{
      commitEdit();
      extraSelections=[];
      const idCol=visibleCols().includes(4)?4:(visibleCols()[0]??0);
      anchor=cursor={r:0,c:idCol};
      render();
      if($('sheet-duplicates-only').checked){
        let total=0;for(const rows of duplicateIds.values())total+=rows.length;
        if(total>0)message(()=>tr('تمت التصفية: عرض '+total+' سجل بهويات مكررة','Filtered: displaying '+total+' records with duplicate IDs'));
      }
    };
    $('sheet-clear-filters').onclick=()=>{commitEdit();clearFilters();render();};
    const grid=$('sheet-grid');
    const contentInput=$('sheet-cell-content');
    contentInput.addEventListener('focus',()=>{
      if(!loaded||loading)return;commitEdit();
      editing={el:contentInput,index:view[cursor.r],column:cursor.c,old:cells[view[cursor.r]]?.[cursor.c]||''};
      contentInput.value=editing.old;bindEditEvents(contentInput);
    });
    contentInput.addEventListener('keydown',e=>{
      if(e.isComposing)return;
      if(e.key==='Enter'||e.key==='Escape'){e.preventDefault();commitEdit(e.key==='Escape');focusCell(e.key==='Enter'?adjacentVisibleRow(cursor.r,1):cursor.r,cursor.c);}
    });
    grid.parentElement.addEventListener('scroll',()=>{queueDraw();schedulePosition();},{passive:true});
    touchPointer.addEventListener('change',()=>{commitEdit();applyExcelView();resetRowHeights();rebuildRowOffsets();drawRows(true);});
    new ResizeObserver(()=>{
      if(expandedView&&previousViewZoom!==null&&!editing&&!$('sheet-workspace').classList.contains('sheet-expanded-tools')){
        const zoom=expandedZoom();if(zoom!==excelView.zoom){
          const scroll=grid.parentElement,first=rowAtOffset(scroll.scrollTop),offset=scroll.scrollTop-rowOffsets[first],previous=excelView.zoom,left=scroll.scrollLeft;
          excelView.zoom=zoom;applyExcelView();resetRowHeights();rebuildRowOffsets();const top=rowOffsets[first]+offset*zoom/previous;scroll.scrollTop=top;scroll.scrollLeft=left*zoom/previous;drawRows(true);const measuredTop=rowOffsets[first]+offset*zoom/previous;if(Math.abs(scroll.scrollTop-measuredTop)>1){scroll.scrollTop=measuredTop;drawRows(true);}
        }
      }
      if(view.length>100||expandedView)queueDraw();
    }).observe(grid.parentElement);
    initDuplicateDetails();
    initTraineeDetails();
    initContextMenu();
    initFindDialog();
    grid.addEventListener('pointerdown',e=>{const td=e.target.closest('td[data-col]');if(e.target.closest('select')){commitEdit();if(td){extraSelections=[];cursor=anchor={r:+td.dataset.v,c:+td.dataset.col};paint();}return;}if(e.button!==0||e.pointerType==='touch'||!td||editing?.el===td)return;e.preventDefault();dragging=true;dragMoved=false;skipSelectionClick=true;selectCell(+td.dataset.v,+td.dataset.col,e.shiftKey,e.ctrlKey||e.metaKey);trackDragPointer(e);});
    grid.addEventListener('pointerover',e=>{
      if(columnDragging){const th=e.target.closest('thead th[data-col]');if(th&&!e.target.closest('.sheet-col-resizer')){const c=+th.dataset.col;if(c!==cursor.c){dragMoved=true;cursor={r:0,c};paint();}}return;}
      if(rowDragging){const th=e.target.closest('th[data-rowv]');if(th){const rv=+th.dataset.rowv;if(rv!==cursor.r){dragMoved=true;cursor={r:rv,c:0};paint();}}return;}
      const td=e.target.closest('td[data-col]');if(!dragging||!td)return;const r=+td.dataset.v,c=+td.dataset.col;if(r!==cursor.r||c!==cursor.c){dragMoved=true;cursor={r,c};paint();}
    });
    document.addEventListener('pointermove',e=>{if(!dragging&&!rowDragging&&!columnDragging)return;if(!(e.buttons&1)){stopSelectionDrag();return;}trackDragPointer(e);});
    document.addEventListener('pointerup',stopSelectionDrag);
    document.addEventListener('pointercancel',()=>{stopSelectionDrag();skipSelectionClick=false;});
    window.addEventListener('blur',stopSelectionDrag);
    grid.addEventListener('click',e=>{clearTimeout(detailTimer);if(e.target.closest('select'))return;const skip=skipSelectionClick;skipSelectionClick=false;if(dragMoved){dragMoved=false;return;}const td=e.target.closest('td[data-col]');if(!td||editing?.el===td)return;if(!skip)selectCell(+td.dataset.v,+td.dataset.col,e.shiftKey,e.ctrlKey||e.metaKey);if(!e.shiftKey&&!e.ctrlKey&&!e.metaKey&&td.classList.contains('sheet-id-duplicate')){const index=view[+td.dataset.v],token=epoch;detailTimer=setTimeout(()=>{if(token===epoch&&td.isConnected&&!editing)openDuplicateDetails(index);},250);}});
    grid.addEventListener('dblclick',e=>{clearTimeout(detailTimer);hideDuplicateHint();const td=e.target.closest('td[data-col]');if(td&&!isTraineeDetailCell(td))beginEdit(td);});
    grid.addEventListener('keydown',keyDown);grid.addEventListener('paste',paste);
    document.addEventListener('keydown',handleUndoShortcut);
    document.addEventListener('keydown',e=>{
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='a'){
        if(e.defaultPrevented||editing)return;
        const target=e.target;
        if(target&&(['INPUT','TEXTAREA','SELECT'].includes(target.tagName)||target.isContentEditable))return;
        const panel=$('panel-trainees');
        if(panel&&panel.classList.contains('active')&&!$('sheet-workspace')?.hidden){
          e.preventDefault();
          selectAll();
        }
      }
    });
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
      }else if(th&&th.closest('thead')){
        selectAll();
      }else if(th&&th.dataset.rowv!==undefined){
        const vr=+th.dataset.rowv;
        if(!isSelected(vr,0)||!isSelected(vr,colCount()-1))selectRow(vr,e);
      }
      openContextMenu(e.clientX,e.clientY);
    });
    $('sheet-owned').onclick=()=>{codeMode='owned';renderCodes();};$('sheet-pool').onclick=()=>{codeMode='pool';renderCodes();};
    $('sheet-assign').onclick=assign;$('sheet-code-search').oninput=renderCodes;
    $('sheet-code-refresh').onclick=async()=>{if(await Cloud.refresh())renderCodes();};
    window.addEventListener('beforeunload',e=>{savePosition();if(hasDraft()){e.preventDefault();e.returnValue='';}});
    window.addEventListener('pagehide',savePosition);
    document.addEventListener('visibilitychange',()=>{if(document.hidden){stopSelectionDrag();savePosition();}});
    if(typeof TraineeSheets!=='undefined')sheetTools=TraineeSheets.mount({$,tr,node,state:()=>({owner,sheetId,worksheets,loaded:loaded&&!loading&&!worksheetBusy}),switchSheet:id=>switchOwner(owner,false,id),action:worksheetAction});
    if(typeof TraineeExcel!=='undefined')excelTools=TraineeExcel.mount({D,$,tr,node,
      state:()=>({cells,formatting,view,owner:workspaceIdentity(),sheetId,loaded:loaded&&!loading&&!worksheetBusy,expandedView,wrap:excelView.wrap,labels:allLabels(),importLabels:baseLabels,bounds:bounds(),ranges:selectionRanges(),cursor:{...cursor},cols:visibleCols(),filtered:filtered()||!!formatting.hiddenRows?.length}),
      replaceSheet:(next,fmt)=>{change(next,false,fmt);const prefix=(workspaceIdentity()||'default')+':';for(const key of Object.keys(cellAlignments))if(key.startsWith(prefix))delete cellAlignments[key];saveAlignments();clearFilters();render();focusCell(0,0);},
      commitEdit,change,formatSelection,focusCell,render,message,cutSelection,copySelection,pasteSelection,executePaste,
      insertRow,addColumn,editColumns,deleteSelectedRows,deleteSelectedCells,clearSelection,openFindDialog,
      worksheet:(action)=>sheetTools?.open(action),
      newSheet:async(next,fmt)=>{if(!await worksheetAction('create'))return false;change(next,true,fmt);clearFilters();render();focusCell(0,0);return await flush();},
      select:(a,b)=>{commitEdit();extraSelections=[];anchor=a;cursor=b;paint();},selectAll:()=>selectAll(),
      flush,sort:(column,direction)=>{commitEdit();sortRules=[];sortCol=column;sortDir=direction;render();},customSort:rules=>{commitEdit();sortRules=rules;sortCol=-1;render();},
      resetSort:()=>{sortRules=[];sortCol=-1;render();},clearFilters:()=>{clearFilters();render();},setColumnWidth,saveColumnWidths,resetColumnWidth});
    if(typeof TraineePrometric!=='undefined')prometricTools=TraineePrometric.mount({D,$,tr,node,
      state:()=>({cells,view,owner:workspaceIdentity(),epoch,user:Cloud.userId(),loaded:loaded&&!loading,editing:!!editing,bounds:bounds(),selectedRows:selectedRows().map(r=>view[r])}),commitEdit,change,flush,focusCell,message,accountDetails:accountDetailFields,detailViewProps});
    if(typeof TraineeExamResults!=='undefined')examResultTools=TraineeExamResults.mount({$,tr,
      state:()=>({cells,formatting,owner:workspaceIdentity(),epoch,user:Cloud.userId(),loaded:loaded&&!loading&&!worksheetBusy,editing:!!editing,selectedRows:selectedRows().map(r=>view[r])}),catalog:()=>DEFAULT_KEYCODES,commitEdit,change,flush});
    if(typeof TraineeCertificate!=='undefined')certificateTools=TraineeCertificate.mount({D,$,tr,node,
      state:()=>({cells,view,owner,epoch,loaded:loaded&&!loading,cursor:{...cursor}}),catalog:()=>DEFAULT_KEYCODES,commitEdit,message});
    translate();
  }
  async function addColumn(){
    if(!loaded)return;commitEdit();const c=colCount();if(c>=D.MAX_COLS)return limitError();
    const name=await (window.AppDialog?AppDialog.prompt({
      title:tr('إضافة عمود جديد','Add New Column'),
      message:tr('اسم العمود الجديد:','New column name:'),
      defaultValue:tr('عمود ','Column ')+colLetter(c),
      confirmText:tr('إضافة','Add'),
      cancelText:tr('إلغاء','Cancel'),
      icon:'column'
    }):prompt(tr('اسم العمود الجديد:','New column name:'),tr('عمود ','Column ')+colLetter(c)));
    if(name===null)return;
    const next=D.columns(cells,formatting,c,1,true,c);next.format.headers[c]=name.trim()||tr('عمود ','Column ')+colLetter(c);
    change(next.cells,true,next.format);focusCell(cursor.r,c);
  }
  function translate(){
    ($('sidebar-trainees-label')||$('trainees-tab')).textContent=tr('المتدربون','Trainees');if(!initialized)return;
    $('sheet-cell-content').placeholder=tr('محتوى الخلية المحددة','Selected cell content');$('sheet-cell-content').setAttribute('aria-label',tr('محتوى الخلية المحددة','Selected cell content'));
    if($('sheet-more-tools'))$('sheet-more-tools').textContent=tr('التنسيق وأدوات إضافية','Formatting & more tools');
    $('sheet-zoom-label').textContent=tr('زوم الجدول','Table zoom');
  $('sheet-row-size-label').textContent=tr('حجم الصف','Row size');
  $('sheet-row-size').setAttribute('aria-label',tr('حجم الصف','Row size'));
    for(const [id,ar,en]of [['sheet-zoom-out','تصغير الجدول','Zoom out'],['sheet-zoom-in','تكبير الجدول','Zoom in'],['sheet-zoom-slider','نسبة زوم الجدول','Table zoom percentage'],['sheet-zoom-reset','اكتب نسبة الزوم من 50 إلى 200','Enter zoom percentage from 50 to 200']]){$(id).setAttribute('aria-label',tr(ar,en));$(id).title=tr(ar,en);}
    document.querySelectorAll('.sheet-ribbon-group small[data-ar]').forEach(el=>el.textContent=tr(el.dataset.ar,el.dataset.en));
    if(typeof TraineeReports!=='undefined')TraineeReports.translate();
    const text={
      'sheet-title':['جدول المتدربين','Trainee sheet'],'sheet-subtitle':['جدول خاص بكل مستخدم · حفظ تلقائي','A private sheet for each user · Autosave'],
      'sheet-expanded':['عرض موسّع · 45 صف','Expanded view · 45 rows'],'sheet-expanded-close':['رجوع للعرض العادي','Exit expanded view'],'sheet-expanded-tools':['الأدوات','Tools'],
      'sheet-owner-label':['عرض بيانات المستخدم','View user'],'sheet-mode':['المتدربون','Trainees'],'sheet-codes-mode':['أكواد المستخدم','User codes'],
      'sheet-local-note':['التنسيق وأبعاد الأعمدة تُحفظ مع الجدول؛ الزوم تفضيل لهذا الجهاز.','Formatting and column widths are saved with the sheet; zoom is a preference for this device.'],'sheet-value-label':['قيمة','Value'],'sheet-add':['+ إضافة صف','+ Add row'],'sheet-wrap':['التفاف النص','Wrap text'],
      'sheet-add-prefix':['إضافة','Add'],'sheet-add-suffix':['صف في الأسفل','more rows at bottom'],'sheet-add-bulk-btn':['+ إضافة','+ Add'],
      'sheet-delete':['حذف صف','Delete row'],'sheet-add-col':['+ إضافة عمود','+ Add column'],'sheet-delete-col':['حذف عمود','Delete column'],'sheet-undo':['تراجع','Undo'],'sheet-redo':['إعادة','Redo'],
      'sheet-select-all':['تحديد الكل','Select all'],'sheet-add-separator-btn':['إضافة فاصل','Add separator'],'sheet-copy':['نسخ الجدول','Copy sheet'],'sheet-save':['حفظ الآن','Save now'],'sheet-reload':['إعادة تحميل','Reload'],'sheet-clear-filters':['مسح الفلاتر','Clear filters'],
      'sheet-help':['للكتابة: انقر مرتين أو ابدأ الكتابة · اسحب أو Shift + نقر لتحديد نطاق · Ctrl+C / Ctrl+V · Tab والأسهم للتنقل','Double-click or type to edit · Drag or Shift+click selects a range · Ctrl+C / Ctrl+V · Tab and arrow navigation'],
      'sheet-owned':['أكواد المستخدم','User codes'],'sheet-pool':['المخزون غير المخصص','Unassigned stock'],'sheet-code-refresh':['تحديث الأكواد','Refresh codes']
      ,'sheet-fill-label':['لون الخلية','Cell fill'],'sheet-text-color-label':['لون الخط','Text color'],
      'sheet-clear-format':['مسح التنسيق','Clear formatting'],'sheet-direction-label':['الاتجاه','Direction'],'sheet-selection-size-label':['حجم المحدد','Selection size'],
      'sheet-duplicates-label':['الإقامات المكررة فقط','Duplicate IDs only'],
      'sheet-find-btn':['🔍 بحث واستبدال','🔍 Find & Replace'],
      'sheet-find-title':['بحث واستبدال في جدول المتدربين','Find & Replace in Trainees Sheet'],
      'sheet-find-label':['بحث عن:','Find:'],'sheet-replace-label':['استبدال بـ:','Replace with:'],
      'sheet-find-case-label':['مطابقة حالة الأحرف','Match case'],'sheet-find-entire-label':['مطابقة كامل الخلية','Match entire cell'],
      'sheet-find-next':['بحث عن التالي','Find Next'],'sheet-find-replace-one':['استبدال','Replace'],'sheet-find-replace-all':['استبدال الكل','Replace All']
    };for(const [id,pair]of Object.entries(text)){const el=$(id);if(el&&!el.dataset.excelAr)el.textContent=tr(...pair);}
    for(const [id,pair]of Object.entries({'sheet-search':['بحث في الجدول…','Search sheet…'],'sheet-org':['فلترة بالجهة…','Filter organization…'],'sheet-date':['فلترة بتاريخ الاختبار…','Filter exam date…'],'sheet-code-search':['بحث عن كود…','Search codes…']})){$(id)&&($(id).placeholder=tr(...pair));$(id)&&($(id).setAttribute('aria-label',tr(...pair)));}
    const value=$('sheet-result').value;window.WorkspaceViews.options($('sheet-result'),{options:[['',tr('كل النتائج','All results')],['ناجح','ناجح'],['راسب','راسب'],['لم يدخل','لم يدخل']].map(([value,label])=>({value,label}))});
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
    if($('sheet-select-all'))$('sheet-select-all').title=tr('تحديد الجدول بالكامل (Ctrl+A)','Select entire sheet (Ctrl+A)');
    if($('sheet-add-separator-btn'))$('sheet-add-separator-btn').title=tr('إضافة فاصل ودمج الصف الحالي','Add separator and merge current row');
    if($('sheet-copy'))$('sheet-copy').title=tr('نسخ كل الأعمدة بما فيها المخفية','Copy every column, including hidden columns');
    updateContextMenuTranslations();
    excelTools?.translate();
    sheetTools?.translate();
    prometricTools?.translate();
    examResultTools?.translate();
    certificateTools?.translate();
    renderMessage();
    if(!editing)render();renderCodes();
  }
  async function open(){
    init();if(loading)return;
    const admin=Cloud.role()==='admin';$('sheet-code-admin').hidden=!admin;
    if(!Cloud.userId())return;
    if(admin){try{members=await Cloud.listMembers();}catch(error){message(()=>errorMessage(error),true);return;}}
    else members=[];
    if(!owner||!loaded)await switchOwner(Cloud.userId());
    renderCodes();
    prometricTools?.poll();
    examResultTools?.poll();
  }
  async function switchOwner(next,discard=false,nextSheet=sheetId){
    if(loading)return false;
    stopSelectionDrag();
    savePosition();
    prometricTools?.reset();
    examResultTools?.reset();
    certificateTools?.reset();
    excelTools?.closeFiles();
    closeDuplicateDetails();
    commitEdit();if(!discard&&!await flush())return false;
    const token=++epoch;loading=true;$('sheet-workspace').inert=true;
    message(()=>tr('جارٍ تحميل الجدول…','Loading sheet…'));
    try{
      const list=Cloud.listTraineeSheets?await Cloud.listTraineeSheets(next):[{sheet_id:FIRST_SHEET,sheet_name:'Sheet 1',sheet_hidden:false,sheet_order:0}];
      if(!owner){try{nextSheet=localStorage.getItem('ibta_active_worksheet:'+next)||nextSheet;}catch{}}
      if(!list.some(s=>s.sheet_id===nextSheet&&!s.sheet_hidden))nextSheet=list.find(s=>!s.sheet_hidden)?.sheet_id||FIRST_SHEET;
      const data=await Cloud.readTrainees(next,nextSheet);if(token!==epoch)return false;
      const normalized=D.normalize(data.cells);owner=next;sheetId=nextSheet;worksheets=list;cells=normalized;formatting=D.format(data.format);colWidths={...(formatting.widths||(sheetId===FIRST_SHEET?legacyWidths:{}))};version=Number(data.version);revision=savedRevision=0;history=[];future=[];loaded=true;
      try{localStorage.setItem('ibta_active_worksheet:'+next,sheetId);}catch{}
      clearFilters();extraSelections=[];anchor=cursor={r:0,c:0};owner=next;render();restorePosition();renderCodes();if(typeof rememberWorkspaceView==='function')rememberWorkspaceView({sheetOwner:owner});message(()=>tr('تم الحفظ','Saved'));return true;
    }catch(error){if(token===epoch)message(()=>errorMessage(error),true);return false;}
    finally{if(token===epoch){loading=false;$('sheet-workspace').inert=!loaded;sheetTools?.paint();}}
  }
  async function worksheetAction(action,options={}){
    if(loading||worksheetBusy||!loaded)return false;commitEdit();if(!await flush())return false;
    worksheetBusy=true;$('sheet-workspace').inert=true;closeDuplicateDetails();sheetTools?.paint();const activeOwner=owner,token=epoch;
    try{
      const target=options.sheetId||sheetId;
      const result=await Cloud.traineeSheetAction(activeOwner,target,action,options);
      if(token!==epoch||owner!==activeOwner)return false;
      return await switchOwner(activeOwner,true,['create','copy'].includes(action)?result:sheetId);
    }catch(error){message(()=>/LAST_VISIBLE_WORKSHEET/.test(error.message)?tr('يجب الاحتفاظ بشيت ظاهر واحد على الأقل.','Keep at least one visible worksheet.'):errorMessage(error),true);return false;}
    finally{worksheetBusy=false;$('sheet-workspace').inert=!loaded||loading;sheetTools?.paint();}
  }
  async function reload(){
    commitEdit();if(saving)await saving;
    if(hasDraft()){
      const ok=await (window.AppDialog?AppDialog.confirm({
        title:tr('تنبيه: تعديلات غير محفوظة','Warning: Unsaved Changes'),
        message:tr('إعادة التحميل ستستبدل تعديلاتك غير المحفوظة. انسخ الجدول أولًا للاحتفاظ بها. المتابعة؟','Reload replaces unsaved edits. Copy the sheet first to keep them. Continue?'),
        confirmText:tr('متابعة إعادة التحميل','Continue Reload'),
        cancelText:tr('إلغاء','Cancel'),
        danger:true,
        icon:'warning'
      }):confirm(tr('إعادة التحميل ستستبدل تعديلاتك غير المحفوظة. انسخ الجدول أولًا للاحتفاظ بها. المتابعة؟','Reload replaces unsaved edits. Copy the sheet first to keep them. Continue?')));
      if(!ok)return;
    }
    clearTimeout(timer);await switchOwner(owner||Cloud.userId(),true);
  }
  function clearFilters(){['sheet-search','sheet-org','sheet-date','sheet-result'].forEach(id=>$(id).value='');$('sheet-duplicates-only').checked=false;sortCol=-1;sortRules=[];}
  function filtered(){return sortRules.length>0||sortCol>=0||$('sheet-duplicates-only').checked||['sheet-search','sheet-org','sheet-date','sheet-result'].some(id=>$(id).value);}
  function matchesSearch(row,search){
    if(!search)return true;
    let values=searchRows.get(row);if(!values){values=row.filter(Boolean).map(value=>value.toLocaleLowerCase());if(Object.isFrozen(row))searchRows.set(row,values);}
    return values.some(value=>value.includes(search));
  }
  function updateDuplicateFilterUI(){
    const input=$('sheet-duplicates-only');
    if(!input)return;
    const badge=$('sheet-duplicates-count');
    const wrapper=input.closest('.sheet-duplicates-filter');
    let total=0;
    for(const indices of duplicateIds.values())total+=indices.length;
    if(badge){
      badge.textContent=String(total);
      badge.classList.toggle('has-duplicates',total>0);
    }
    if(wrapper){
      wrapper.classList.toggle('active',input.checked);
      wrapper.title=total>0?
        tr('تم اكتشاف '+total+' سجل بهويات مكررة'+(input.checked?' (معروضة حالياً)':' (انقر للتصفية)'),
           total+' records with duplicate IDs found'+(input.checked?' (currently displayed)':' (click to filter)')):
        tr('لا توجد إقامات مكررة في هذا الجدول','No duplicate IDs in this sheet');
    }
  }
  function buildView(){
    const search=$('sheet-search').value.toLocaleLowerCase(),org=$('sheet-org').value.toLocaleLowerCase(),date=$('sheet-date').value.toLocaleLowerCase(),result=$('sheet-result').value;
    duplicateIds=D.duplicates(cells);
    updateDuplicateFilterUI();
    view=cells.map((_,i)=>i).filter(i=>matchesSearch(cells[i],search)&&(!org||cells[i][6].toLocaleLowerCase().includes(org))&&(!date||cells[i][8].toLocaleLowerCase().includes(date))&&(!result||cells[i][11]===result)&&(!$('sheet-duplicates-only').checked||duplicateIds.has(D.idKey(cells[i][4]))));
    const rules=sortRules.length?sortRules:sortCol>=0?[{column:sortCol,direction:sortDir}]:[];if(rules.length)view.sort((a,b)=>{for(const rule of rules){const value=rule.direction*(D.formulaValue(cells,a,rule.column,formulaCache)||'').localeCompare(D.formulaValue(cells,b,rule.column,formulaCache)||'',currentLang,{numeric:true});if(value)return value;}return a-b;});
    updateLastDataRow();if(!filtered())for(let i=cells.length;i<totalInputRows();i++)view.push(i);
    if(formatting.hiddenRows?.length){const hidden=new Set(formatting.hiddenRows);view=view.filter(r=>!hidden.has(r));}
  }
  function render(){
    if(!initialized)return;pendingRender=false;hideDuplicateHint();clearTimeout(detailTimer);formulaCache.clear();const oldView=view;buildView();buildDayLayout();if(oldView.length!==view.length||oldView.some((r,i)=>r!==view[i]))extraSelections=[];
    const scroll=$('sheet-grid').parentElement,scrollTop=scroll.scrollTop,scrollLeft=scroll.scrollLeft;
    const cols=visibleCols();if(!cols.includes(cursor.c))cursor.c=cols[0];if(!cols.includes(anchor.c))anchor.c=cursor.c;
    $('panel-trainees').dir=formatting.direction;
    $('sheet-workspace').style.setProperty('--sheet-font-size',formatting.fontSize+'px');
    $('sheet-grid').parentElement.dir=formatting.direction;
    $('sheet-direction').value=formatting.direction;$('sheet-font-size').textContent=formatting.fontSize+' px';
    $('sheet-font-minus').disabled=formatting.fontSize<=10;$('sheet-font-plus').disabled=formatting.fontSize>=32;
    applySavedColWidths();
    const grid=$('sheet-grid'),thead=grid.querySelector('thead'),tbody=grid.querySelector('tbody');
    const nextHeadersKey=JSON.stringify([currentLang,cols,allLabels()]);
    if(headersKey!==nextHeadersKey){
      headersKey=nextHeadersKey;
      window.WorkspaceViews.headers(thead,{
        selectLabel:tr('تحديد الكل','Select all'),selectTitle:tr('تحديد الجدول بالكامل (Ctrl+A)','Select all (Ctrl+A)'),
        resizeTitle:tr('اسحب لتعديل عرض العمود · انقر مرتين لاستعادة العرض الافتراضي','Drag to resize · Double click to reset'),
        onSelectAll:()=>{if(!skipSelectionClick&&!dragMoved)selectAll();skipSelectionClick=false;dragMoved=false;},
        onPointerDown:e=>{if(e.button!==0||e.pointerType==='touch')return;e.preventDefault();selectAll();},
        columns:cols.map(c=>{const pair=labels[c];return {
          column:c,label:colLetter(c)+' · '+tr(...pair),
          width:c>=baseLabels.length?'calc(var(--col-w-'+c+',160px) * var(--sheet-zoom,1))':undefined,
          title:c>=baseLabels.length?tr('انقر مرتين لتعديل اسم العمود · اسحب لتغيير العرض','Double-click to rename column · Drag to resize'):tr('اسحب أو Shift لأعمدة متجاورة · Ctrl لأعمدة متفرقة','Drag or Shift for adjacent columns · Ctrl for separate columns'),
          onSelect:e=>{if(!skipSelectionClick&&!dragMoved)selectColumn(c,e);skipSelectionClick=false;dragMoved=false;},
          onPointerDown:e=>{if(e.button!==0||e.pointerType==='touch')return;e.preventDefault();columnDragging=true;dragMoved=false;skipSelectionClick=true;selectColumn(c,e);trackDragPointer(e);},
          onRename:async e=>{if(c<baseLabels.length)return;
          if(e.target.closest('.sheet-col-resizer'))return;
          e.stopPropagation();
          const curName=formatting.headers?.[c]||tr(...pair);
          const newName=await (window.AppDialog?AppDialog.prompt({
            title:tr('تعديل اسم العمود','Rename Column'),
            message:tr('اسم العمود:','Column name:'),
            defaultValue:curName,
            confirmText:tr('تعديل','Rename'),
            cancelText:tr('إلغاء','Cancel'),
            icon:'edit'
          }):prompt(tr('اسم العمود:','Column name:'),curName));
          if(newName!==null&&newName.trim()&&newName.trim()!==curName){
            const next=D.format(formatting);if(!next.headers)next.headers={};next.headers[c]=newName.trim();change(cells,true,next);
          }
          },
          onResize:(e,th)=>initColumnResize(e,c,th),
          onResetWidth:e=>{e.stopPropagation();resetColumnWidth(c);}
        };})
      });
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
  function dayDateLabel(raw){
    const digits=raw.replace(/[٠-٩]/g,digit=>String(digit.charCodeAt(0)-1632)).replace(/[۰-۹]/g,digit=>String(digit.charCodeAt(0)-1776));
    const iso=digits.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/),local=digits.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
    if(!iso&&!local)return raw;
    const [year,month,day]=iso?iso.slice(1).map(Number):[Number(local[3]),Number(local[2]),Number(local[1])],date=new Date(Date.UTC(year,month-1,day));
    if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return raw;
    const weekday=new Intl.DateTimeFormat(currentLang==='ar'?'ar-EG':'en-GB',{weekday:'long',timeZone:'UTC'}).format(date);
    return weekday+tr(' الموافق ',' · ')+date.toLocaleDateString('en-GB',{timeZone:'UTC'});
  }
  function buildDayLayout(){
    dayHeaders=new Map();if(filtered()||!formatting.daySeparators?.length)return;
    const groups=D.manualDayGroups(cells,formatting.daySeparators);let at=0,seen=-1;
    for(let v=0;v<view.length;v++){
      const source=view[v];while(at+1<groups.length&&source>groups[at].end)at++;
      const group=groups[at];if(source<group.start||source>group.end||seen===at)continue;seen=at;
      const title=group.date?dayDateLabel(group.date):tr('مجموعة بيانات ','Data group ')+(at+1);
      dayHeaders.set(v,{title,countLabel:tr(' · صفوف بها بيانات: ',' · Rows with data: ')+group.count,
        removeLabel:tr('إزالة هذا الفاصل','Remove this separator'),onRemove:()=>removeDaySeparator(group.start)});
    }
  }
  function removeDaySeparator(source){
    commitEdit();if(!loaded||loading||worksheetBusy)return;
    const next=D.format(formatting);next.daySeparators=next.daySeparators.filter(r=>r!==source);
    change(cells,true,next);
  }
  function adjacentVisibleRow(from,direction){
    return Math.max(0,Math.min(view.length-1,from+direction));
  }
  function rebuildRowOffsets(){
    const estimate=Math.max((excelView.wrap?rowSize*4/3+8:displayRowHeight()+1)*excelView.zoom/100,formatting.fontSize*excelView.zoom/100*(excelView.wrap?1.5:1.2),touchPointer.matches?44:0);
    rowOffsets=new Float64Array(view.length+1);for(let r=0;r<view.length;r++)rowOffsets[r+1]=rowOffsets[r]+(rowHeights.get(view[r])||estimate)+(dayHeaders.has(r)?DAY_HEADER_HEIGHT:0);
  }
  function rowAtOffset(offset){let low=0,high=view.length;while(low<high){const mid=(low+high)>>1;if(rowOffsets[mid+1]<=offset)low=mid+1;else high=mid;}return Math.min(low,Math.max(0,view.length-1));}
  let forceDraw=false,pendingRender=false;
  function queueDraw(force=false){forceDraw=forceDraw||force;if(scrollFrame)return;scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;if(editing){forceDraw=true;return;}const redraw=forceDraw;forceDraw=false;if(pendingRender){pendingRender=false;render();}else drawRows(redraw);});}
  function sheetMerges(){
    if(mergeCacheFormat!==formatting){mergeCacheFormat=formatting;mergeCache=Object.entries(formatting.styles).filter(([,s])=>(s.mergeCols||1)>1||(s.mergeRows||1)>1).map(([key,s])=>{const [r,c]=key.split(':').map(Number);return {r,c,endR:r+(s.mergeRows||1)-1,endC:c+(s.mergeCols||1)-1};});}return filtered()?[]:mergeCache;
  }
  function drawRows(force=false){
    if(!initialized||editing&&!force)return;const grid=$('sheet-grid'),scroll=grid.parentElement,tbody=grid.querySelector('tbody'),cols=visibleCols();
    if(view.length===0){
      commitEdit();drawnStart=drawnEnd=0;drawnColumns='';
      const duplicates=$('sheet-duplicates-only')?.checked;
      window.WorkspaceViews.rows(tbody,{rows:[],columnCount:cols.length+1,top:0,bottom:0,empty:{
        icon:duplicates?'✅':'🔍',message:duplicates?tr('لا توجد إقامات أو هويات مكررة في هذا الجدول ✨','No duplicate IDs found in this sheet ✨'):tr('لا توجد بيانات مطابقة للفلاتر المحددة','No matching records for current filters'),
        clearLabel:duplicates?tr('إلغاء فلترة التكرار','Clear duplicate filter'):undefined,
        clear:()=>{$('sheet-duplicates-only').checked=false;$('sheet-duplicates-only').dispatchEvent(new Event('change'));}
      }});
      paint();
      updateVisibleRows();
      return;
    }
    const height=scroll.clientHeight||400,head=grid.querySelector('thead').getBoundingClientRect().height||36;
    scroll.style.setProperty('--sheet-group-width',scroll.clientWidth+'px');
    scroll.style.setProperty('--sheet-day-header-height',DAY_HEADER_HEIGHT+'px');
    const first=rowAtOffset(Math.max(0,scroll.scrollTop-head)),start=view.length<=100?0:Math.max(0,first-8),end=view.length<=100?view.length:Math.min(view.length,rowAtOffset(scroll.scrollTop+height)+10);
    const merges=sheetMerges(),columnKey=cols.join(',');
    if(!force&&start===drawnStart&&end===drawnEnd&&columnKey===drawnColumns){updateVisibleRows();return;}
    const hadFocus=grid.contains(document.activeElement),previousTop=scroll.scrollTop,previousLeft=scroll.scrollLeft;commitEdit();drawnStart=start;drawnEnd=end;drawnColumns=columnKey;
    const rows=[];
    for(let v=start;v<end;v++){
      const idx=view[v],row={viewRow:v,sourceRow:idx,height:rowHeights.get(idx),group:dayHeaders.get(v),cells:[],
        resizeTitle:tr('اسحب لتعديل ارتفاع الصف · انقر مرتين لاستعادة الارتفاع الافتراضي','Drag to change row height · Double-click to reset'),
        onResize:e=>initRowResize(e,idx),onResetHeight:e=>{e.stopPropagation();commitEdit();saveRowHeight(idx,null);},
        onSelect:e=>{if(!skipSelectionClick&&!dragMoved)selectRow(v,e);skipSelectionClick=false;dragMoved=false;},
        onPointerDown:e=>{if(e.button!==0||e.pointerType==='touch')return;e.preventDefault();e.stopPropagation();rowDragging=true;dragMoved=false;skipSelectionClick=true;selectRow(v,e);trackDragPointer(e);}
      };
      for(const c of cols){
        const merge=merges.find(m=>idx>=m.r&&idx<=m.endR&&c>=m.c&&c<=m.endC);
        const firstMergeCol=merge&&cols.find(x=>x>=merge.c&&x<=merge.endC);
        if(merge&&(c!==firstMergeCol||v!==Math.max(start,merge.r)))continue;
        const source=merge?merge.r:idx,column=merge?merge.c:c;
        const cell={column,viewRow:merge?merge.r:v,label:tr(...labels[column])+' '+(source+1),appearance:cellView(source,column)};
        if(merge){
          cell.colSpan=cols.filter(x=>x>=merge.c&&x<=merge.endC).length;cell.rowSpan=Math.min(end-1,merge.endR)-Math.max(start,merge.r)+1;
          const sum=cols.filter(x=>x>=merge.c&&x<=merge.endC).map(x=>'var(--col-w-'+x+','+(colWidths[x]||({1:190,2:220,3:220,4:105,5:105,6:200,7:220,8:140,9:150,10:110,11:85,12:120}[x]||160))+'px)');
          cell.width='calc(('+sum.join(' + ')+') * var(--sheet-zoom,1))';
        }
        row.cells.push(cell);
      }
      rows.push(row);
    }
    window.WorkspaceViews.rows(tbody,{rows,columnCount:cols.length+1,top:rowOffsets[start],bottom:rowOffsets[view.length]-rowOffsets[end]});
    const top=tbody.querySelector('[data-edge="top"]'),bottom=tbody.querySelector('[data-edge="bottom"]');
    applyExcelView();paint();
    const oldFirst=rowOffsets[first];let heightChanged=false;tbody.querySelectorAll('th[data-rowv]').forEach(th=>{const index=view[+th.dataset.rowv],height=Math.max(rowHeights.get(index)||0,th.parentElement.getBoundingClientRect().height);if(rowHeights.get(index)!==height){rowHeights.set(index,height);heightChanged=true;}});if(heightChanged)rebuildRowOffsets();
    if(start){top.style.setProperty('height',rowOffsets[start]+'px','important');top.firstChild.style.setProperty('height',rowOffsets[start]+'px','important');}
    if(end<view.length){const remaining=rowOffsets[view.length]-rowOffsets[end];bottom.style.setProperty('height',remaining+'px','important');bottom.firstChild.style.setProperty('height',remaining+'px','important');}
    scroll.scrollTop=previousTop+rowOffsets[first]-oldFirst;scroll.scrollLeft=previousLeft;
    updateVisibleRows();
    if(hadFocus){const active=grid.querySelector(`td[data-v="${cursor.r}"][data-col="${cursor.c}"]`);if(active)active.focus({preventScroll:true});else{grid.tabIndex=-1;grid.focus({preventScroll:true});}}
  }
  function updateVisibleRows(){
    if(!expandedView)return;const grid=$('sheet-grid'),scroll=grid.parentElement,top=grid.querySelector('thead th').getBoundingClientRect().bottom,bottom=scroll.getBoundingClientRect().top+scroll.clientHeight;
    let count=0;grid.querySelectorAll('th[data-rowv]').forEach(th=>{const rect=th.parentElement.getBoundingClientRect();if(rect.top>=top-1&&rect.bottom<=bottom+1)count++;});
    $('sheet-visible-rows').textContent=tr('الصفوف الظاهرة: ','Visible rows: ')+count;
  }
  function cellView(index,column){
    const raw=cells[index]?.[column]||'',format=formatting.styles[index+':'+column]||{},align=getCellAlign(index,column);
    const style={backgroundColor:format.bg||'',color:format.color||'',fontSize:'calc('+(format.size||formatting.fontSize)+'px * var(--sheet-zoom,1))',fontWeight:format.bold?'700':'',fontFamily:(format.font||D.DEFAULT_FONT.family)+', sans-serif',fontStyle:format.italic?'italic':'',textDecoration:[format.underline?'underline':'',format.strike?'line-through':''].filter(Boolean).join(' '),verticalAlign:format.valign||'middle',whiteSpace:typeof format.wrap==='boolean'?(format.wrap?'pre-wrap':'nowrap'):'',textIndent:format.indent?format.indent*8+'px':'',overflowWrap:format.wrap?'anywhere':'',textAlign:align||''};
    if(column>=baseLabels.length)style['--col-w']='calc(var(--col-w-'+column+',160px) * var(--sheet-zoom,1))';
    if(format.height){style.height=format.height*excelView.zoom/100+'px';style.minHeight=style.height;}
    const textStyle={},classes=[];
    if(format.centerAcross){classes.push('sheet-center-across-anchor');const parts=visibleCols().filter(c=>c>=column&&c<column+format.centerAcross);textStyle.width='calc(('+parts.map(c=>'var(--col-w-'+c+','+(colWidths[c]||formatting.defaultWidth||160)+'px)').join(' + ')+') * var(--sheet-zoom,1))';}
    if(align&&!format.centerAcross&&!format.rotation&&!(typeof format.wrap==='boolean'?format.wrap:excelView.wrap)){textStyle.display='flex';textStyle.justifyContent=align;}
    if(format.rotation){textStyle.display='inline-block';if(Math.abs(format.rotation)===90){textStyle.writingMode='vertical-rl';if(format.rotation===-90)textStyle.transform='rotate(180deg)';}else{textStyle.transform='rotate('+format.rotation+'deg)';style.height='70px';}}
    const duplicates=column===4&&duplicateIds.get(D.idKey(raw));if(duplicates)classes.push('sheet-id-duplicate');
    const hasName=Boolean(cells[index]?.[2]?.trim()||cells[index]?.[3]?.trim());
    if(column===0&&hasName&&!raw.trim())classes.push('sheet-code-missing');
    if(column===11&&['ناجح','راسب','لم يدخل'].includes(raw))classes.push(raw==='ناجح'?'sheet-result-pass':raw==='راسب'?'sheet-result-fail':'sheet-result-absent');
    return {raw,text:raw.startsWith('=')?String(D.formulaValue(cells,index,column,formulaCache)):raw,style,textStyle,className:classes.join(' '),align,
      duplicateLabel:duplicates?duplicates.length+'×':undefined,
      resultLabel:tr('النتيجة للصف ','Result for row ')+(index+1),
      onResultChange:(selected,td)=>{const v=+td.dataset.v;extraSelections=[];cursor=anchor={r:v,c:11};change(D.paste(cells,[[selected]],index,11));},
      onResultPointerDown:(e,td)=>{e.stopPropagation();if(e.shiftKey||e.ctrlKey||e.metaKey){e.preventDefault();dragging=true;dragMoved=false;skipSelectionClick=true;selectCell(+td.dataset.v,11,e.shiftKey,e.ctrlKey||e.metaKey);trackDragPointer(e);}},
      onResultClick:e=>{if(e.shiftKey||e.ctrlKey||e.metaKey)e.preventDefault();skipSelectionClick=false;},
      onResultFocus:td=>{const v=+td.dataset.v;if(v!==cursor.r||cursor.c!==11){extraSelections=[];cursor=anchor={r:v,c:11};paint();}}
    };
  }
  function decorateCell(td,index,column){window.WorkspaceViews.refreshCell(td,cellView(index,column));}
  let traineeHoverTimer;
  const detailResult=value=>value==='ناجح'?'pass':value==='راسب'?'fail':value==='لم يدخل'?'absent':'';
  const detailKeycode=keycode=>({label:'Key Code',value:keycode?.code||'',empty:tr('لا يوجد Key Code مطابق','No matching Key Code'),className:'sheet-detail-keycode',direction:'ltr'});
  function detailFields(row,includeKeycode=true,fieldCount){
    const fields=[];
    let end=fieldCount??row.length;if(fieldCount===undefined)while(end>0&&!row[end-1].trim())end--;
    labels.slice(0,end).forEach((pair,column)=>{
      const keycode=column===7?D.courseKeycode(row[column],DEFAULT_KEYCODES):null;
      const field={label:column===7?tr('الدورة','Course'):tr(...pair),copyName:tr(...pair),value:row[column]||'',className:({7:'sheet-detail-course',9:'sheet-detail-username',10:'sheet-detail-password',11:'sheet-detail-result'})[column]||'',result:column===11?detailResult(row[column]):undefined};
      if(column===7&&!keycode)field.note=tr('لا يوجد Key Code مطابق','No matching Key Code');
      fields.push(field);
      if(column===7&&keycode){
        if(includeKeycode)fields.push(detailKeycode(keycode));
        const category=state.keycodeOverrides?.[keycode.code]||keycode.category;
        fields.push({label:tr('الفئة','Category'),value:category?displayCatName(category):'',empty:tr('فئة غير محددة','No category'),className:'sheet-detail-category'});
      }
    });return fields;
  }
  const detailViewProps=()=>({copyLabel:tr('نسخ ','Copy '),copyTitle:tr('اضغط لنسخ ','Click to copy '),copy:async value=>{if(await copyText(value))showToast(tr('تم النسخ','Copied'));else showToast(tr('تعذر النسخ. حاول مرة أخرى.','Could not copy. Please retry.'));}});
  function accountDetailFields(row){
    const fields=detailFields(row,true,D.BASE_WIDTH);
    if(!fields.some(field=>field.className==='sheet-detail-keycode')){
      const course=fields.findIndex(field=>field.className==='sheet-detail-course');delete fields[course].note;
      fields.splice(course+1,0,detailKeycode(null),{label:tr('الفئة','Category'),value:'',empty:tr('فئة غير محددة','No category'),className:'sheet-detail-category'});
    }return fields;
  }
  function closeTraineeDetails(){clearTimeout(traineeHoverTimer);const dialog=$('sheet-trainee-dialog');if(dialog?.open)dialog.close();}
  const isTraineeDetailCell=td=>[1,2,3].includes(+td.dataset.col)&&!!cells[view[+td.dataset.v]]?.[+td.dataset.col]?.trim();
  function initTraineeDetails(){
    let activeIndex=null,activeEpoch=null;
    const dialog=$('sheet-trainee-dialog'),close=dialog.querySelector('.sheet-detail-close');close.onclick=closeTraineeDetails;close.setAttribute('aria-label',tr('إغلاق','Close'));
    dialog.addEventListener('close',()=>{if(dialog.open)return;activeIndex=activeEpoch=null;window.WorkspaceViews.clear($('sheet-trainee-record'));$('sheet-trainee-title').textContent='';});
    const show=index=>{
      if(!loaded||editing||dragging)return;
      const row=cells[index],name=row?.[3]?.trim()||row?.[2]?.trim()||row?.[1]?.trim();if(!name)return;activeIndex=index;activeEpoch=epoch;
      hideDuplicateHint();dialog.dir=currentLang==='ar'?'rtl':'ltr';
      $('sheet-trainee-title').textContent=tr('بيانات المتدرب — ','Trainee details — ')+name;
      const fields=detailFields(row,false),voucher=fields[0],loginDisplay=PROMETRIC_LOGIN_URL.replace(/(\/Login).+$/i,'$1…');
      const credentials=[];for(const name of ['sheet-detail-username','sheet-detail-password']){const at=fields.findIndex(field=>field.className===name);if(at>=0)credentials.push(...fields.splice(at,1));}
      fields.unshift({label:'Prometric login link',value:PROMETRIC_LOGIN_URL,display:loginDisplay,className:'sheet-detail-login',direction:'ltr',empty:tr('غير محدد','Not configured')},...credentials,detailKeycode(D.courseKeycode(row[7],DEFAULT_KEYCODES)),...[['Prometric Account',PROMETRIC_ACCOUNT],['Prometric Password',PROMETRIC_PASSWORD]].map(([label,value])=>({label,value,direction:'ltr',empty:tr('غير محدد','Not configured')})));
      const refreshRecord=()=>{if(dialog.open&&activeIndex===index&&activeEpoch===epoch)show(index);};
      const exam=D.courseKeycode(row[7],DEFAULT_KEYCODES),category=exam&&(state.keycodeOverrides?.[exam.code]||exam.category),codeCategory=category&&getLinkedCodesCat(category);
      const claim=async action=>{
        if(action.disabled)return;action.disabled=true;const token=epoch,selectedOwner=owner;
        try{
          if(!await flush())throw Error(tr('احفظ تعديلات الجدول أولًا.','Save sheet changes first.'));
          if(cells[index]?.[0]?.trim()){refreshRecord();return;}
          const identity=value=>JSON.stringify([value?.[1],value?.[2],value?.[3],value?.[4],value?.[7]]);
          if(identity(cells[index])!==identity(row))throw Error(tr('بيانات الصف تغيرت. افتح بيانات المتدرب من جديد.','The row changed. Reopen the trainee details.'));
          const currentRow=cells[index],traineeName=currentRow?.[3]?.trim()||currentRow?.[2]?.trim()||'';
          const code=await Cloud.claimTraineeCode(codeCategory,selectedOwner,traineeName);
          if(token!==epoch||owner!==selectedOwner)throw Error('CONFLICT');
          if(identity(cells[index])!==identity(currentRow))throw Error(tr('تم حجز الفاوتشر باسم المتدرب، لكن مكان الصف تغير. ستجد الكود باسمه في صفحة Vouchers.','The voucher was reserved with the trainee name, but the row moved. Find the named voucher on Vouchers.'));
          if(cells[index]?.[0]?.trim())throw Error(tr('خانة الكود تغيرت أثناء الحجز. لم يتم استبدال الكود الموجود.','Code changed during reservation. The existing code was preserved.'));
          change(D.paste(cells,[[code]],index,0),false);
          action.hidden=true;
          const codeCell=$('sheet-grid').querySelector(`td[data-v="${view.indexOf(index)}"][data-col="0"]`);if(codeCell)decorateCell(codeCell,index,0);paint();
          if(!await flush())throw Error(tr('تم حجز الكود لكن تعذر حفظ الجدول. اضغط حفظ الآن لإعادة محاولة حفظ نفس الكود.','Code reserved but sheet save failed. Press Save now to retry saving the same code.'));
          if(!await copyText(code))throw Error(tr('تم حفظ الكود. اضغط على قيمة الكود لنسخه.','Code saved. Click the code value to copy it.'));
          refreshRecord();showToast(tr('تم حجز الكود وحفظه ونسخه','Code reserved, saved and copied'));
        }catch(error){if(token===epoch&&owner===selectedOwner&&cells[index]?.[0]?.trim())refreshRecord();showToast(error.message||tr('تعذر جلب الكود','Could not get code'));}finally{action.disabled=!codeCategory;}
      };
      if(!row[0]?.trim())voucher.action={label:'Get',ariaLabel:tr('جلب كود الاختبار','Get exam code'),disabled:!codeCategory,title:codeCategory?displayCatName(category):tr('لا توجد فئة اختبار مطابقة','No matching exam category'),run:claim};
      window.WorkspaceViews.detailRecords($('sheet-trainee-record'),{...detailViewProps(),records:[{fields}]});
      if(!dialog.open)dialog.show();
    };
    const grid=$('sheet-grid');
    grid.addEventListener('dblclick',e=>{const td=e.target.closest('td[data-col]');if(td&&isTraineeDetailCell(td)){commitEdit();show(view[+td.dataset.v]);}});
    document.addEventListener('pointerdown',e=>{clearTimeout(traineeHoverTimer);if(dialog.open&&!dialog.contains(e.target))closeTraineeDetails();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeTraineeDetails();});
  }
  function initDuplicateDetails(){
    const hint=$('sheet-duplicate-hint'),dialog=$('sheet-duplicate-dialog'),close=dialog.querySelector('.sheet-detail-close');close.onclick=()=>dialog.close();close.setAttribute('aria-label',tr('إغلاق','Close'));
    $('sheet-detail-prev').onclick=()=>{detailPage--;renderDuplicateDetails();};$('sheet-detail-next').onclick=()=>{detailPage++;renderDuplicateDetails();};
    dialog.addEventListener('click',e=>{if(e.target===dialog){const rect=dialog.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)dialog.close();}});
    dialog.addEventListener('close',()=>{detailKey='';window.WorkspaceViews.clear($('sheet-duplicate-records'));$('sheet-duplicate-title').textContent='';$('sheet-duplicate-description').textContent='';dialog.style.width='';});
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
    const hint=$('sheet-duplicate-hint');if(hint){hint.hidden=true;window.WorkspaceViews.clear(hint);}
  }
  function closeDuplicateDetails(){closeTraineeDetails();clearTimeout(detailTimer);hideDuplicateHint();if($('sheet-duplicate-dialog')?.open)$('sheet-duplicate-dialog').close();}
  function showDuplicateHint(td){
    if(!td.isConnected||editing||$('sheet-duplicate-dialog').open||(!td.matches(':hover')&&document.activeElement!==td))return;
    const index=view[+td.dataset.v],matches=duplicateIds.get(D.idKey(cells[index]?.[4]||''));if(!matches)return;
    const hint=$('sheet-duplicate-hint');window.WorkspaceViews.clear(hint);hint.dir=formatting.direction;
    window.WorkspaceViews.duplicateHint(hint,{title:tr('مكرر ','Repeated ')+matches.length+tr(' مرات',' times'),identity:cells[index][4],note:tr('اضغط على الرقم لعرض جميع البيانات. انقر مرتين أو F2 لتعديله.','Click the ID for all details. Double-click or F2 to edit.'),
      records:matches.slice(0,10).map(i=>({title:tr('الصف ','Row ')+(i+1)+' · '+(cells[i][2]||cells[i][3]||'—'),fields:[7,9,10,11].map(column=>({label:column===7?tr('الاختبار','Exam'):tr(...labels[column]),value:cells[i][column]||'',result:column===11?detailResult(cells[i][column]):undefined}))}))});
    hint.hidden=false;td.setAttribute('aria-describedby',hint.id);
    const rect=td.getBoundingClientRect(),box=hint.getBoundingClientRect();
    hint.style.left=Math.max(8,Math.min(window.innerWidth-box.width-8,formatting.direction==='rtl'?rect.right-box.width:rect.left))+'px';
    hint.style.top=Math.max(8,Math.min(window.innerHeight-box.height-8,rect.bottom+box.height+8<=window.innerHeight?rect.bottom+8:rect.top-box.height-8))+'px';
  }
  function openDuplicateDetails(index){
    commitEdit();clearTimeout(detailTimer);hideDuplicateHint();const key=D.idKey(cells[index]?.[4]||'');if(!duplicateIds.has(key))return;
    detailKey=key;detailPage=0;renderDuplicateDetails();if(!$('sheet-duplicate-dialog').open)$('sheet-duplicate-dialog').showModal();
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
    window.WorkspaceViews.detailRecords($('sheet-duplicate-records'),{...detailViewProps(),records:pageMatches.map(i=>({title:tr('الصف ','Row ')+(i+1)+' · '+(cells[i][2]||cells[i][3]||'—'),fields:detailFields(cells[i],true,D.BASE_WIDTH)}))});
    const hasPages=pageCount>1;
    $('sheet-detail-page').style.display=hasPages?'':'none';
    $('sheet-detail-prev').style.display=hasPages?'':'none';
    $('sheet-detail-next').style.display=hasPages?'':'none';
    $('sheet-duplicate-dialog').querySelector('.sheet-detail-footer').hidden=!hasPages;
    if(hasPages){
      $('sheet-detail-page').textContent=(detailPage+1)+' / '+pageCount;
      $('sheet-detail-prev').disabled=detailPage===0;$('sheet-detail-next').disabled=(detailPage+1)*50>=count;
      $('sheet-detail-prev').setAttribute('aria-label',tr('السابق','Previous'));$('sheet-detail-next').setAttribute('aria-label',tr('التالي','Next'));
    }
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
  function singleSelection(){if(!extraSelections.length)return true;message(()=>tr('اختر منطقة واحدة متجاورة لهذه العملية.','Select one contiguous range for this action.'),true);return false;}
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
  function stopSelectionDrag(){
    dragging=rowDragging=columnDragging=false;dragPointer=null;
    cancelAnimationFrame(dragScrollFrame);dragScrollFrame=0;
  }
  function trackDragPointer(event){
    dragPointer={x:event.clientX,y:event.clientY};
    if(!dragScrollFrame)dragScrollFrame=requestAnimationFrame(scrollDragSelection);
  }
  function dragScrollSpeed(position,start,end){
    const edge=28;
    if(position<start+edge)return -Math.min(24,Math.max(1,(start+edge-position)/2));
    if(position>end-edge)return Math.min(24,Math.max(1,(position-end+edge)/2));
    return 0;
  }
  function extendDragSelection(viewport){
    const grid=$('sheet-grid'),header=grid.querySelector('thead th'),rowHeader=grid.querySelector('th[data-rowv]');
    const rowBox=rowHeader?.getBoundingClientRect(),headBox=header.getBoundingClientRect();
    const left=viewport.left+(formatting.direction==='ltr'?(rowBox?.width||46):0)+2;
    const right=viewport.right-(formatting.direction==='rtl'?(rowBox?.width||46):0)-2;
    const x=rowDragging&&rowBox?rowBox.left+rowBox.width/2:Math.max(left,Math.min(right,dragPointer.x));
    const y=columnDragging?headBox.top+headBox.height/2:Math.max(viewport.top+2,Math.min(viewport.bottom-2,dragPointer.y));
    const cell=document.elementFromPoint(x,y)?.closest(columnDragging?'thead th[data-col]':rowDragging?'th[data-rowv]':'td[data-col]');
    if(!cell||!grid.contains(cell))return;
    const next={r:columnDragging?0:Number(rowDragging?cell.dataset.rowv:cell.dataset.v),c:rowDragging?0:Number(cell.dataset.col)};
    if(next.r!==cursor.r||next.c!==cursor.c){dragMoved=true;cursor=next;paint();schedulePosition();}
  }
  function scrollDragSelection(){
    dragScrollFrame=0;if(!dragPointer||!loaded||loading)return;
    const grid=$('sheet-grid'),scroll=grid.parentElement,box=scroll.getBoundingClientRect();
    const viewport={left:Math.max(0,box.left),right:Math.min(innerWidth,box.left+scroll.clientWidth),top:Math.max(0,grid.querySelector('thead th').getBoundingClientRect().bottom),bottom:Math.min(innerHeight,box.top+scroll.clientHeight)};
    if(viewport.top>=viewport.bottom||viewport.left>=viewport.right)return;
    const dx=rowDragging?0:dragScrollSpeed(dragPointer.x,viewport.left,viewport.right),dy=columnDragging?0:dragScrollSpeed(dragPointer.y,viewport.top,viewport.bottom);
    if(!dx&&!dy)return;
    const previousLeft=scroll.scrollLeft,previousTop=scroll.scrollTop;
    scroll.scrollLeft+=dx;scroll.scrollTop+=dy;
    if(previousLeft===scroll.scrollLeft&&previousTop===scroll.scrollTop)return;
    drawRows();extendDragSelection(viewport);
    dragScrollFrame=requestAnimationFrame(scrollDragSelection);
  }
  function selectColumn(c,e){startSelection({r:Math.max(0,view.length-1),c},{r:0,c},e.shiftKey,e.ctrlKey||e.metaKey,'column');$('sheet-grid').querySelector(`td[data-v="0"][data-col="${c}"]`)?.focus();}
  function selectRow(r,e){startSelection({r,c:colCount()-1},{r,c:0},e.shiftKey,e.ctrlKey||e.metaKey,'row');const grid=$('sheet-grid');grid.tabIndex=-1;grid.focus({preventScroll:true});}
  function selectAll(){
    if(!loaded||!view.length)return;
    commitEdit();
    extraSelections=[];
    const cols=visibleCols();
    if(!cols.length)return;
    startSelection({r:0,c:cols[0]},{r:Math.max(0,view.length-1),c:cols[cols.length-1]},false,false,'all');
    $('sheet-grid').querySelector(`td[data-v="0"][data-col="${cols[0]}"]`)?.focus();
    message(()=>tr('تم تحديد الجدول بالكامل','Entire sheet selected'));
  }
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
    const contentInput=$('sheet-cell-content');contentInput.disabled=!loaded;
    if(editing?.el!==contentInput){contentInput.value=content;contentInput.title=content;}
    $('sheet-grid').setAttribute('aria-multiselectable','true');
    $('sheet-grid').querySelectorAll('thead th[data-col]').forEach(th=>th.classList.toggle('sheet-active-header',selectedCols.includes(+th.dataset.col)));
    $('sheet-grid').querySelectorAll('th[data-rowv]').forEach(th=>{th.classList.toggle('sheet-focus-row-header',+th.dataset.rowv===cursor.r);th.classList.toggle('sheet-selected-row-header',ranges.some(([a,b])=>+th.dataset.rowv>=a&&+th.dataset.rowv<=b));});
    const isAll=ranges.length===1&&ranges[0][0]===0&&ranges[0][1]===Math.max(0,view.length-1)&&selectedCols.length===cols.length;
    const cornerBtn=$('sheet-select-all-corner');
    if(cornerBtn){
      cornerBtn.classList.toggle('sheet-corner-selected',isAll);
      cornerBtn.parentElement?.classList.toggle('sheet-active-header',isAll);
      cornerBtn.setAttribute('aria-pressed',String(isAll));
    }
    $('sheet-select-all')?.setAttribute('aria-pressed',String(isAll));
    const style=formatting.styles[(view[cursor.r]??0)+':'+cursor.c]||{};
    $('sheet-bold').setAttribute('aria-pressed',String(!!style.bold));$('sheet-selection-size').value=String(style.size||formatting.fontSize);
    $('sheet-fill').value=style.bg||'#ffffff';$('sheet-text-color').value=style.color||'#16324f';
    const curAlign=getCellAlign(view[cursor.r]??0,cursor.c)||'';
    $('sheet-align-right')?.setAttribute('aria-pressed',String(curAlign==='right'));
    $('sheet-align-center')?.setAttribute('aria-pressed',String(curAlign==='center'));
    $('sheet-align-left')?.setAttribute('aria-pressed',String(curAlign==='left'));
    excelTools?.paint(style);
    updateSelectionStats();
  }
  function updateSelectionStats(){
    const statsEl=$('sheet-selection-stats');
    if(!statsEl)return;
    const ranges=selectionRanges();
    const cols=visibleCols();
    if(ranges.length===1&&ranges[0][0]===ranges[0][1]&&ranges[0][2]===ranges[0][3]){
      statsEl.textContent='';
      statsEl.title='';
      statsEl.hidden=true;
      return;
    }
    let cellCount=0,numericCount=0,nonEmptyCount=0,sum=0;
    if(ranges.length===1){
      const [r1,r2,c1,c2]=ranges[0];
      const rMin=Math.max(0,Math.min(r1,r2)),rMax=Math.min(view.length-1,Math.max(r1,r2));
      const colMatches=cols.filter(c=>c>=Math.min(c1,c2)&&c<=Math.max(c1,c2)).length;
      cellCount=(rMax>=rMin?rMax-rMin+1:0)*colMatches;
    }
    eachSelected((rowIndex,colIndex)=>{
      if(ranges.length>1)cellCount++;
      if(rowIndex===undefined||rowIndex>lastDataRow)return;
      const val=cells[rowIndex]?.[colIndex]||'';
      if(val.trim()!=='')nonEmptyCount++;
      const str=val.startsWith('=')&&colIndex!==11?String(D.formulaValue(cells,rowIndex,colIndex,formulaCache)):val;
      const num=D.number(str);
      if(num!==null){
        numericCount++;
        sum+=num;
      }
    });
    if(cellCount>1){
      const parts=[];
      parts.push(tr('العدد: ','Count: ')+cellCount.toLocaleString());
      if(numericCount>0){
        const cleanSum=Math.round((sum+Number.EPSILON)*1e8)/1e8;
        const formattedSum=cleanSum.toLocaleString(undefined,{maximumFractionDigits:4});
        parts.push(tr('المجموع: ','Sum: ')+formattedSum);
      }
      statsEl.textContent=parts.join(' · ');
      if(numericCount>1){
        const avg=Math.round(((sum/numericCount)+Number.EPSILON)*1e8)/1e8;
        const formattedAvg=avg.toLocaleString(undefined,{maximumFractionDigits:4});
        statsEl.title=parts.join(' · ')+tr(' · المتوسط: ',' · Average: ')+formattedAvg;
      }else{
        statsEl.title=statsEl.textContent;
      }
      statsEl.hidden=false;
    }else{
      statsEl.textContent='';
      statsEl.title='';
      statsEl.hidden=true;
    }
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
    window.WorkspaceViews.editCell(td,initial!==undefined?initial:editing.old);td.focus();
    bindEditEvents(td);
    if(initial!==undefined)schedule();
    const range=document.createRange();range.selectNodeContents(td);range.collapse(false);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
  }
  function bindEditEvents(el){
    el.oninput=()=>schedule();
    el.oncompositionstart=()=>{el.dataset.composing='true';clearTimeout(timer);};
    el.oncompositionend=()=>{delete el.dataset.composing;schedule();};
    el.addEventListener('blur',()=>{if(editing?.el===el)commitEdit();},{once:true});
  }
  function commitEdit(cancel=false,keepEditing=false){
    if(!editing)return;const edit=editing;
    if(!keepEditing){editing=null;edit.el.contentEditable='false';edit.el.oninput=null;edit.el.oncompositionstart=null;edit.el.oncompositionend=null;delete edit.el.dataset.composing;}
    const contentInput=edit.el===$('sheet-cell-content');
    const value=cancel?edit.old:contentInput?edit.el.value:edit.el.textContent;
    if(value!==edit.old){try{change(D.paste(cells,[[value]],edit.index,edit.column),false);if(!filtered()&&view.length<totalInputRows()){pendingRender=true;queueDraw(true);}}
      catch{limitError();}}
    if(keepEditing){edit.old=cells[edit.index]?.[edit.column]||'';if(contentInput){const td=$('sheet-grid').querySelector('td[data-v="'+cursor.r+'"][data-col="'+edit.column+'"]');if(td)decorateCell(td,edit.index,edit.column);}return;}
    if(contentInput){render();return;}
    duplicateIds=D.duplicates(cells);decorateCell(edit.el,edit.index,edit.column);
    if(edit.column===4){$('sheet-grid').querySelectorAll('td[data-col="4"]').forEach(td=>decorateCell(td,view[+td.dataset.v],4));}
    if(edit.column===2||edit.column===3){const codeTd=$('sheet-grid').querySelector('td[data-v="'+cursor.r+'"][data-col="0"]');if(codeTd)decorateCell(codeTd,edit.index,0);}
    paint();
    if(forceDraw||pendingRender)queueDraw(true);
  }
  function change(next,redraw=true,nextFormat=formatting){
    if(!loaded)return;history.push(snapshot());if(history.length>30)history.shift();future=[];cells=next;updateLastDataRow();formatting=D.format(nextFormat);formulaCache.clear();revision++;schedule();if(redraw)render();else{pendingRender=true;$('sheet-undo').disabled=false;$('sheet-redo').disabled=true;}
  }
  function undo(redo){commitEdit();const from=redo?future:history,to=redo?history:future;if(!from.length)return;to.push(snapshot());const next=from.pop();cells=next.cells;formatting=D.format(next.format);cellAlignments={...next.alignments};saveAlignments();revision++;schedule();render();if(view.length)focusCell(cursor.r,cursor.c);}
  function schedule(){clearTimeout(timer);message(()=>tr('تعديلات غير محفوظة…','Unsaved changes…'));const saveWhenIdle=()=>{if(editing?.el.dataset.composing==='true'){timer=setTimeout(saveWhenIdle,900);return;}flush(true);};timer=setTimeout(saveWhenIdle,900);}
  function hasDraft(){return !!editing||revision!==savedRevision||!!saving;}
  async function flush(keepEditing=false,force=false){
    commitEdit(false,keepEditing);clearTimeout(timer);if(saving){const ok=await saving;if(!ok)return false;return flush(keepEditing,force);}
    if(!loaded||(!force&&revision===savedRevision&&version>0))return true;
    const token=epoch,snapshot=revision,saveOwner=owner||Cloud.userId(),saveSheet=sheetId,data=D.storage(cells),saveFormat=D.format(formatting);
    message(()=>tr('جارٍ الحفظ…','Saving…'));
    saving=(async()=>{
      try{const result=await Cloud.saveTrainees(saveOwner,data,version,saveFormat,saveSheet);if(token!==epoch)return false;version=Number(result);savedRevision=snapshot;message(()=>revision===savedRevision?tr('تم الحفظ','Saved'):tr('تعديلات غير محفوظة…','Unsaved changes…'));return true;}
      catch(error){if(token===epoch)message(()=>errorMessage(error),true);return false;}
    })();const ok=await saving;saving=null;
    if(ok&&token===epoch&&revision!==savedRevision)return flush(keepEditing);return ok;
  }
  function limitError(){message(()=>tr('الحد الأقصى 1,000,000 صف و500 عمود و2000 حرف للخلية.','Limit: 1,000,000 rows, 500 columns and 2,000 characters per cell.'),true);}
  function clipboardRows(){
    const rows=selectedRows();if(!selectionRanges().every(([a,b])=>a===0&&b===view.length-1))return rows;
    // Whole columns exclude virtual input padding, while retaining explicitly formatted blank rows.
    const formatted=new Set(Object.keys(formatting.styles).map(key=>Number(key.split(':')[0])));let last=rows.length-1;
    while(last>0&&!cells[view[rows[last]]]?.some(Boolean)&&!formatted.has(view[rows[last]]))last--;return rows.slice(0,last+1);
  }
  function copyingWholeRows(){return selectionKind==='row'&&selectionRanges().every(([,,a,b])=>a===0&&b===colCount()-1);}
  function allColumns(){return Array.from({length:colCount()},(_,c)=>c);}
  function wholeRowClipboard(html){return /<table\b[^>]*\bdata-trainflow-row-values=["']true["']/i.test(html);}
  function clipboardColumns(){
    if(!copyingWholeRows())return selectedColumns();
    const rows=clipboardRows(),cols=allColumns();
    // Keep internal blanks and hidden fields in place, omitting empty trailing columns.
    while(cols.length>1&&rows.every(r=>!cells[view[r]]?.[cols.at(-1)]))cols.pop();
    return cols;
  }
  function selectionText(){const cols=clipboardColumns();return D.tsv(clipboardRows().map(r=>cols.map(c=>isSelected(r,c)?cells[view[r]]?.[c]||'':'')));}
  function selectionHtml(){
    const cols=clipboardColumns(),wholeRows=copyingWholeRows(),table=node('table');table.style.borderCollapse='collapse';
    if(wholeRows)table.dataset.trainflowRowValues='true';
    for(const r of clipboardRows()){
      const idx=view[r],row=node('tr');table.append(row);
      for(const c of cols){
        const td=node('td');row.append(td);if(!isSelected(r,c))continue;
        const value=cells[idx]?.[c]||'',style=formatting.styles[idx+':'+c]||{},result=c===11?({'ناجح':['#00b050','#ffffff'],'راسب':['#ff0000','#ffffff'],'لم يدخل':['#ffff00','#000000']}[value]):null,duplicate=c===4&&duplicateIds.has(D.idKey(value));
        const hasName=Boolean(cells[idx]?.[2]?.trim()||cells[idx]?.[3]?.trim()),codeMissing=c===0&&hasName&&!value.trim();
        td.textContent=value;if(wholeRows)continue;
        Object.assign(td.style,{backgroundColor:duplicate?'#ffc7ce':codeMissing?'#ff0000':result?.[0]||style.bg||'#ffffff',color:duplicate?'#9c0006':codeMissing?'#ffffff':result?.[1]||style.color||'#16324f',fontWeight:style.bold||result?'700':'400',fontSize:(style.size||formatting.fontSize)+'px',fontFamily:style.font||D.DEFAULT_FONT.family,fontStyle:style.italic?'italic':'normal',textDecoration:[style.underline?'underline':'',style.strike?'line-through':''].filter(Boolean).join(' ')||'none',textAlign:getCellAlign(idx,c)||(formatting.direction==='rtl'?'right':'left'),verticalAlign:style.valign||'middle',whiteSpace:style.wrap===false?'nowrap':'pre-wrap',direction:formatting.direction,textIndent:(style.indent||0)*8+'px'});
        td.style.border='1px solid #d9dee0';
      }
    }
    return table.outerHTML;
  }
  function clearSelection(){if(!loaded)return;const next=cells.slice(),changed=new Set();eachSelected((idx,c)=>{if(!next[idx])return;if(!changed.has(idx)){next[idx]=[...next[idx]];changed.add(idx);}next[idx][c]='';});change(D.normalize(next));}
  async function deleteSelectedCells(direction){
    if(!loaded)return;if(!singleSelection())return;commitEdit();
    const [r1,r2,c1,c2]=bounds(),indices=new Set(view.slice(r1,r2+1));
    if(Object.entries(formatting.styles).some(([key,s])=>{if((s.mergeRows||1)===1&&(s.mergeCols||1)===1)return false;const [r,c]=key.split(':').map(Number);return c<=c2&&c+(s.mergeCols||1)-1>=c1&&[...indices].some(i=>i>=r&&i<r+(s.mergeRows||1));})){message(()=>tr('ألغِ دمج الخلايا المحددة قبل إزاحة الخلايا.','Unmerge the selected cells before shifting cells.'),true);return;}
    const ok=await (window.AppDialog?AppDialog.confirm({
      title:tr('حذف الخلايا وإزاحتها','Delete & Shift Cells'),
      message:tr('حذف الخلايا المحددة وإزاحة باقي بيانات الصف؟ يشمل الأعمدة المخفية.','Delete selected cells and shift the remaining row data? Hidden columns are included.'),
      confirmText:tr('حذف وإزاحة','Delete & Shift'),
      cancelText:tr('إلغاء','Cancel'),
      danger:true,
      icon:'trash'
    }):confirm(tr('حذف الخلايا المحددة وإزاحة باقي بيانات الصف؟ يشمل الأعمدة المخفية.','Delete selected cells and shift the remaining row data? Hidden columns are included.')));
    if(!ok)return;
    const logical=formatting.direction==='rtl'?(direction==='left'?'right':'left'):direction;
    const next=D.deleteCells(cells,formatting,indices,c1,c2,logical,colCount());
    change(next.cells,false,next.format);
    const prefix=(workspaceIdentity()||'default')+':',shift=c2-c1+1,mapped={};
    for(const [key,value]of Object.entries(cellAlignments)){
      if(!key.startsWith(prefix)){mapped[key]=value;continue;}
      const [r,c]=key.slice(prefix.length).split(':').map(Number);
      if(!indices.has(r)){mapped[key]=value;continue;}
      const target=logical==='left'?(c<c1?c:c>c2?c-shift:null):(c>c2?c:c<c1?c+shift:null);
      if(target!==null)mapped[prefix+r+':'+target]=value;
    }
    cellAlignments=mapped;saveAlignments();render();
    message(()=>tr('تم حذف الخلايا. يمكنك التراجع.','Cells deleted. You can undo.'));
  }
  function paste(e){
    if(!loaded)return;e.preventDefault();commitEdit();
    try{
      const text=e.clipboardData.getData('text/plain');if(!text)return;
      const values=D.parse(text);executePaste(values,wholeRowClipboard(e.clipboardData.getData('text/html'))?allColumns():undefined);
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
      if(future.length){undo(true);message(()=>tr('تمت الإعادة (Redo)','Redo'));}
      else{message(()=>tr('لا توجد عمليات للإعادة','Nothing to redo'));}
      return true;
    }
    if(isCtrlZ){
      if(editing)commitEdit();
      if(history.length){
        undo(false);
        message(()=>tr('تم التراجع (Undo)','Undo'));
      }else{
        message(()=>tr('لا توجد عمليات للتراجع عنها','Nothing to undo'));
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
      else if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();commitEdit();render();focusCell(adjacentVisibleRow(cursor.r,1),cursor.c);}
      else if(e.key==='Tab'){e.preventDefault();commitEdit();render();moveTab(e.shiftKey);}
      return;
    }
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo(e.shiftKey);return;}
    if((e.ctrlKey||e.metaKey)&&(e.code==='KeyC'||e.key.toLowerCase()==='c')){e.preventDefault();void copySelection();return;}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();undo(true);return;}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='a'){e.preventDefault();selectAll();return;}
    if((e.ctrlKey||e.metaKey)&&(e.key.toLowerCase()==='f'||e.key.toLowerCase()==='h')){e.preventDefault();openFindDialog(e.key.toLowerCase()==='h');return;}
    const sign=formatting.direction==='rtl'?-1:1,cols=visibleCols();
    const moves={ArrowDown:[1,0],ArrowUp:[-1,0],ArrowRight:[0,sign],ArrowLeft:[0,-sign]};
    if(moves[e.key]){e.preventDefault();const [r,c]=moves[e.key];const col=cols[Math.max(0,Math.min(cols.length-1,cols.indexOf(cursor.c)+c))];focusCell(r?adjacentVisibleRow(cursor.r,r):cursor.r,col,e.shiftKey);return;}
    if(e.key==='Tab'){e.preventDefault();moveTab(e.shiftKey);return;}
    if(e.key==='Enter'){e.preventDefault();focusCell(adjacentVisibleRow(cursor.r,e.shiftKey?-1:1),cursor.c);return;}
    if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();clearSelection();return;}
    const td=e.target.closest('td[data-col]');if(td&&(e.key==='F2'||(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey))){e.preventDefault();beginEdit(td,e.key==='F2'?undefined:e.key);}
  }
  function moveTab(back){const cols=visibleCols();let r=cursor.r,c=cols.indexOf(cursor.c)+(back?-1:1);if(c>=cols.length){c=0;r=adjacentVisibleRow(r,1);}if(c<0){c=cols.length-1;r=adjacentVisibleRow(r,-1);}focusCell(r,cols[c]);}
  function setMode(next){commitEdit();mode=next;$('sheet-workspace')&&($('sheet-workspace').hidden=mode!=='sheet');$('sheet-code-workspace')&&($('sheet-code-workspace').hidden=mode!=='codes');$('sheet-mode')?.setAttribute('aria-selected',String(mode==='sheet'));$('sheet-codes-mode')?.setAttribute('aria-selected',String(mode==='codes'));if(mode==='codes')renderCodes();}
  function renderCodes(){
    if(!initialized)return;
    const admin=Cloud.role()==='admin',search=$('sheet-code-search').value.toLocaleLowerCase();
    const rows=Cloud.codeSnapshot().filter(r=>(admin&&codeMode==='pool'?r.owner_id==null:r.owner_id===owner)&&(!search||r.code.toLocaleLowerCase().includes(search)||r.category.toLocaleLowerCase().includes(search)));
    $('sheet-assign').textContent=codeMode==='pool'?tr('تخصيص المحدد للمستخدم','Assign selected to user'):tr('إرجاع المحدد للمخزون','Return selected to stock');
    $('sheet-code-notice').textContent=admin?tr('اختر المستخدم بالأعلى ثم خصص له الأكواد من المخزون غير المخصص. الإرجاع للمخزون متاح للأكواد غير المستخدمة فقط.','Choose a user above, then assign codes from unassigned stock. Only unused codes can be returned.'):tr('هذه الأكواد مخصصة لحسابك. تواصل مع الأدمن لإضافة أكواد.','These codes belong to your account. Ask the administrator to assign more.');
    $('sheet-code-count').textContent=tr('عدد الأكواد: ','Codes: ')+rows.length;
    window.WorkspaceViews.assignments($('sheet-code-list'),{rows,admin,owned:codeMode==='owned',labels:{empty:tr('لا توجد أكواد في هذا العرض.','No codes in this view.'),all:tr('تحديد الكل','Select all'),code:tr('الكود','Code'),category:tr('الفئة','Category'),usage:tr('الاستخدام','Usage'),unused:tr('غير مستخدم','Unused'),copy:tr('نسخ واستخدام','Copy & use')},copy:async code=>{if(await Cloud.copyCode(code))renderCodes();}});
  }
  async function assign(){
    if(codeBusy||!owner)return;
    const chosen=[...$('sheet-code-list').querySelectorAll('input[data-code]:checked')].map(el=>el.dataset.code);
    if(!chosen.length)return;if(chosen.length>250){$('sheet-code-status').textContent=tr('اختر حتى 250 كودًا في المرة.','Select up to 250 codes at a time.');return;}
    const snapshot=new Map(Cloud.codeSnapshot().map(row=>[row.code,row]));const items=chosen.map(code=>({code,version:snapshot.get(code).version}));
    const ok=await (window.AppDialog?AppDialog.confirm({
      title:codeMode==='pool'?tr('تخصيص الأكواد','Assign Codes'):tr('إرجاع الأكواد','Return Codes'),
      message:codeMode==='pool'?tr('تخصيص الأكواد المحددة للمستخدم المعروض؟','Assign selected codes to the displayed user?'):tr('إرجاع الأكواد المحددة للمخزون؟','Return selected codes to stock?'),
      confirmText:codeMode==='pool'?tr('تخصيص','Assign'):tr('إرجاع','Return'),
      cancelText:tr('إلغاء','Cancel'),
      icon:'info'
    }):confirm(codeMode==='pool'?tr('تخصيص الأكواد المحددة للمستخدم المعروض؟','Assign selected codes to the displayed user?'):tr('إرجاع الأكواد المحددة للمخزون؟','Return selected codes to stock?')));
    if(!ok)return;
    codeBusy=true;$('sheet-code-workspace').inert=true;if($('sheet-owner'))$('sheet-owner').disabled=true;
    try{await Cloud.assignCodes(codeMode==='pool'?owner:null,items);renderCodes();$('sheet-code-status').textContent=tr('تم تحديث تخصيص الأكواد.','Code assignments updated.');}
    catch(error){$('sheet-code-status').textContent=/CONFLICT/.test(error.message||'')?tr('تغيرت الأكواد. حدّث القائمة وحاول مجددًا.','Codes changed. Refresh and try again.'):tr('تعذر تخصيص الأكواد. تأكد أن المستخدم نشط ثم حدّث القائمة.','Could not assign codes. Check that the user is active, then refresh.');}
    finally{codeBusy=false;$('sheet-code-workspace').inert=false;if($('sheet-owner'))$('sheet-owner').disabled=false;}
  }
  function reset(){sheetTools?.close();sheetId=FIRST_SHEET;worksheets=[];worksheetBusy=false;prometricTools?.reset();examResultTools?.reset();certificateTools?.reset();setExpandedView(false);excelTools?.closeFiles();closeDuplicateDetails();closeContextMenu();$('sheet-find-dialog')?.close();clearTimeout(timer);epoch++;owner='';cells=[];formatting=D.defaultFormat();loaded=false;loading=false;editing=null;history=[];future=[];revision=savedRevision=0;if(initialized){$('sheet-cell-content').value='';$('sheet-cell-content').title='';if($('sheet-selection-stats')){$('sheet-selection-stats').textContent='';$('sheet-selection-stats').hidden=true;}render();if($('sheet-owner'))window.WorkspaceViews.options($('sheet-owner'),{options:[]});window.WorkspaceViews.clear($('sheet-code-list'));$('sheet-workspace').inert=true;}}
  function suspend(){prometricTools?.reset();examResultTools?.reset();certificateTools?.reset();setExpandedView(false);excelTools?.closeFiles();closeDuplicateDetails();closeContextMenu();$('sheet-find-dialog')?.close();clearTimeout(timer);}
  const cleanVoucher=s=>String(s||'').trim().toUpperCase().replace(/[\s-]/g,'');
  function clearedVoucherRows(rows,target){
    const targetClean=cleanVoucher(target);
    let matched=false;
    const clearedRows=rows.map(row=>{
      const cellCode=String(row[0]||'').trim().toUpperCase();
      if(cellCode!==target&&(!cellCode||cleanVoucher(cellCode)!==targetClean))return row;
      matched=true;
      const clearedRow=[...row];clearedRow[0]='';return clearedRow;
    });
    return {rows:clearedRows,matched};
  }
  async function removeCode(code){
    const target=String(code||'').trim().toUpperCase();
    if(!target)return false;
    const activeOwner=owner||Cloud.userId();
    if(!activeOwner)return false;
    if(!loaded&&!await switchOwner(activeOwner))throw Error('TRAINEE_CODE_SAVE_FAILED');
    const token=epoch;
    commitEdit();
    if(!await flush()||token!==epoch)throw Error('TRAINEE_CODE_SAVE_FAILED');
    const cleared=clearedVoucherRows(cells,target);
    if(!cleared.matched)return clearCodeFromOtherSheets(target,activeOwner,token);
    change(cleared.rows,true);
    if(!await flush()||token!==epoch)throw Error('TRAINEE_CODE_SAVE_FAILED');
    return true;
  }
  async function clearCodeFromOtherSheets(target,activeOwner,token){
    for(const worksheet of worksheets){
      if(worksheet.sheet_id===sheetId)continue;
      const sheetData=await Cloud.readTrainees(activeOwner,worksheet.sheet_id);
      if(token!==epoch)throw Error('TRAINEE_CODE_SAVE_FAILED');
      const cleared=clearedVoucherRows(D.normalize(sheetData.cells),target);
      if(!cleared.matched)continue;
      await Cloud.saveTrainees(activeOwner,D.storage(cleared.rows),sheetData.version,D.format(sheetData.format),worksheet.sheet_id);
      if(token!==epoch)throw Error('TRAINEE_CODE_SAVE_FAILED');
      return true;
    }
    return false;
  }
  return {open,translate,hasDraft,flush,reset,suspend,savePosition,reportColumnLabels:()=>allLabels().slice(0,DISPLAY_COLS).map(pair=>tr(...pair)),removeCode,addSeparatorRow};
})();
window.TRAINFLOW_ENGINE = Trainees;
Trainees.translate();
