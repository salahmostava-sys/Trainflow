/* Private, versioned trainee workspaces. No student data is stored in browser storage. */
const Trainees=(()=>{
  'use strict';
  const D=TraineeData,$=id=>document.getElementById(id),PAGE=100;
  const labels=[['الكود','Code'],['البريد الإلكتروني','Email'],['الاسم بالعربي','Arabic name'],['الاسم بالإنجليزي','English name'],['رقم الهوية','National ID'],['الجوال','Phone'],['الجهة','Organization'],['الاختبار','Exam'],['تاريخ الاختبار','Exam date'],['اسم المستخدم','Username'],['كلمة المرور','Password'],['النتيجة','Result'],['AnyDesk ID','AnyDesk ID']];
  const tr=(ar,en)=>currentLang==='ar'?ar:en;
  let owner='',cells=[],version=0,revision=0,savedRevision=0,loaded=false,loading=false,epoch=0;
  let timer,saving=null,history=[],future=[],view=[],page=0,sortCol=-1,sortDir=1,anchor={r:0,c:0},cursor={r:0,c:0},editing=null;
  let members=[],mode='sheet',codeMode='owned',codeBusy=false,initialized=false;
  let dragging=false,dragMoved=false;
  function node(tag,text,attrs={}){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;for(const [key,value]of Object.entries(attrs))el.setAttribute(key,value);return el;}
  function button(text,fn,cls){const b=node('button',text,{type:'button'});if(cls)b.className=cls;b.addEventListener('click',fn);return b;}
  const message=(text,error=false)=>{if(!$('sheet-status'))return;$('sheet-status').textContent=text;$('sheet-status').dataset.error=String(error);};
  const errorMessage=error=>/CONFLICT|23505/.test((error?.message||'')+' '+error?.code)?tr('تم تعديل الجدول من نافذة أخرى. انسخ تعديلاتك ثم أعد التحميل.','Another window changed this sheet. Copy your edits, then reload.'):
    tr('تعذر الحفظ أو التحميل. تعديلاتك الحالية ما زالت هنا؛ جرّب مرة أخرى.','Could not save or load. Your current edits are still here; please retry.');
  function init(){
    if(initialized)return;initialized=true;
    $('panel-trainees').innerHTML=`
      <div class="sheet-heading"><div><h2 id="sheet-title"></h2><p id="sheet-subtitle"></p></div><label class="sheet-owner" id="sheet-owner-wrap" hidden><span id="sheet-owner-label"></span><select id="sheet-owner"></select></label></div>
      <div class="sheet-subtabs"><button type="button" id="sheet-mode" aria-selected="true"></button><button type="button" id="sheet-codes-mode" aria-selected="false"></button></div>
      <div id="sheet-workspace" class="sheet-card">
        <div class="sheet-tools"><button type="button" id="sheet-add" class="sheet-primary"></button><button type="button" id="sheet-delete"></button><button type="button" id="sheet-undo"></button><button type="button" id="sheet-redo"></button><button type="button" id="sheet-copy"></button><button type="button" id="sheet-save"></button><button type="button" id="sheet-reload"></button><span class="sheet-status" id="sheet-status" role="status" aria-live="polite"></span></div>
        <div class="sheet-filters"><input id="sheet-search" type="search"><input id="sheet-org" type="search"><input id="sheet-date" type="search"><select id="sheet-result"></select><button type="button" id="sheet-clear-filters"></button></div>
        <div class="sheet-formula"><code id="sheet-address">A1</code><input id="sheet-formula" autocomplete="off" spellcheck="false" dir="auto"></div>
        <div class="sheet-scroll"><table class="sheet-grid" id="sheet-grid" role="grid" aria-label="Trainees"><thead></thead><tbody></tbody></table></div>
        <div class="sheet-footer"><p id="sheet-help"></p><div class="sheet-pages"><button type="button" id="sheet-prev">‹</button><span id="sheet-count"></span><button type="button" id="sheet-next">›</button></div></div>
      </div>
      <div id="sheet-code-workspace" hidden><div class="sheet-code-tools" id="sheet-code-admin" hidden><button type="button" id="sheet-owned"></button><button type="button" id="sheet-pool"></button><button type="button" id="sheet-assign" class="sheet-primary"></button></div><div class="sheet-code-tools"><input id="sheet-code-search" type="search"><button type="button" id="sheet-code-refresh"></button><span id="sheet-code-count"></span></div><p class="sheet-notice" id="sheet-code-notice"></p><div class="sheet-card sheet-code-list" id="sheet-code-list"></div><p id="sheet-code-status" role="status"></p></div>`;
    $('sheet-owner').addEventListener('change',async()=>{const next=$('sheet-owner').value;$('sheet-owner').value=owner;await switchOwner(next);});
    $('sheet-mode').onclick=()=>setMode('sheet');$('sheet-codes-mode').onclick=()=>setMode('codes');
    $('sheet-save').onclick=()=>flush();$('sheet-reload').onclick=()=>reload();
    $('sheet-add').onclick=()=>{commitEdit();clearFilters();const r=cells.length;if(r>=D.MAX_ROWS)return limitError();const next=cells.map(row=>[...row]);next.push(D.blank());change(next,false);render();focusCell(r,0);};
    $('sheet-delete').onclick=()=>{commitEdit();const [r1,r2]=bounds();const ids=new Set(view.slice(r1,r2+1));if(!ids.size||!confirm(tr('حذف الصفوف المحددة؟','Delete selected rows?')))return;change(cells.filter((_,i)=>!ids.has(i)));};
    $('sheet-undo').onclick=()=>undo(false);$('sheet-redo').onclick=()=>undo(true);
    $('sheet-copy').onclick=async()=>{commitEdit();if(await copyText(D.tsv(cells)))message(tr('تم نسخ الجدول بالكامل','Entire sheet copied'));};
    ['sheet-search','sheet-org','sheet-date','sheet-result'].forEach(id=>$(id).addEventListener('input',()=>{commitEdit();page=0;anchor=cursor={r:0,c:0};render();}));
    $('sheet-clear-filters').onclick=()=>{commitEdit();clearFilters();render();};
    $('sheet-prev').onclick=()=>{commitEdit();page=Math.max(0,page-1);render();};$('sheet-next').onclick=()=>{commitEdit();page++;render();};
    $('sheet-formula').addEventListener('change',()=>{if(!loaded)return;const idx=view[cursor.r];if(idx===undefined)return;try{change(D.paste(cells,[[$('sheet-formula').value]],idx,cursor.c));}catch{limitError();}});
    $('sheet-formula').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('sheet-formula').blur();focusCell(cursor.r,cursor.c);}});
    const grid=$('sheet-grid');
    grid.addEventListener('pointerdown',e=>{const td=e.target.closest('td[data-col]');if(e.button!==0||e.pointerType==='touch'||!td||editing?.el===td)return;e.preventDefault();dragging=true;dragMoved=false;selectCell(+td.dataset.v,+td.dataset.col,e.shiftKey);});
    grid.addEventListener('pointerover',e=>{const td=e.target.closest('td[data-col]');if(!dragging||!td)return;const r=+td.dataset.v,c=+td.dataset.col;if(r!==cursor.r||c!==cursor.c){dragMoved=true;cursor={r,c};paint();}});
    document.addEventListener('pointerup',()=>{dragging=false;});
    grid.addEventListener('click',e=>{if(dragMoved){dragMoved=false;return;}const td=e.target.closest('td[data-col]');if(!td||editing?.el===td)return;selectCell(+td.dataset.v,+td.dataset.col,e.shiftKey);});
    grid.addEventListener('dblclick',e=>{const td=e.target.closest('td[data-col]');if(td)beginEdit(td);});
    grid.addEventListener('keydown',keyDown);grid.addEventListener('paste',paste);
    grid.addEventListener('copy',e=>{if(editing)return;e.preventDefault();e.clipboardData.setData('text/plain',selectionText());});
    grid.addEventListener('cut',e=>{if(editing)return;e.preventDefault();e.clipboardData.setData('text/plain',selectionText());clearSelection();});
    $('sheet-owned').onclick=()=>{codeMode='owned';renderCodes();};$('sheet-pool').onclick=()=>{codeMode='pool';renderCodes();};
    $('sheet-assign').onclick=assign;$('sheet-code-search').oninput=renderCodes;
    $('sheet-code-refresh').onclick=async()=>{if(await Cloud.refresh())renderCodes();};
    window.addEventListener('beforeunload',e=>{if(hasDraft()){e.preventDefault();e.returnValue='';}});
    translate();
  }
  function translate(){
    $('trainees-tab').textContent=tr('المتدربون','Trainees');if(!initialized)return;
    const text={
      'sheet-title':['جدول المتدربين','Trainee sheet'],'sheet-subtitle':['جدول خاص بكل مستخدم · حفظ تلقائي','A private sheet for each user · Autosave'],
      'sheet-owner-label':['عرض بيانات المستخدم','View user'],'sheet-mode':['المتدربون','Trainees'],'sheet-codes-mode':['أكواد المستخدم','User codes'],
      'sheet-add':['+ صف جديد','+ Add row'],'sheet-delete':['حذف الصفوف','Delete rows'],'sheet-undo':['تراجع','Undo'],'sheet-redo':['إعادة','Redo'],
      'sheet-copy':['نسخ الجدول','Copy sheet'],'sheet-save':['حفظ الآن','Save now'],'sheet-reload':['إعادة تحميل','Reload'],'sheet-clear-filters':['مسح الفلاتر','Clear filters'],
      'sheet-help':['للكتابة: انقر مرتين أو ابدأ الكتابة · اسحب أو Shift + نقر لتحديد نطاق · Ctrl+C / Ctrl+V · Tab والأسهم للتنقل','Double-click or type to edit · Drag or Shift+click selects a range · Ctrl+C / Ctrl+V · Tab and arrow navigation'],
      'sheet-owned':['أكواد المستخدم','User codes'],'sheet-pool':['المخزون غير المخصص','Unassigned stock'],'sheet-code-refresh':['تحديث الأكواد','Refresh codes']
    };for(const [id,pair]of Object.entries(text))$(id).textContent=tr(...pair);
    for(const [id,pair]of Object.entries({'sheet-search':['بحث في الجدول…','Search sheet…'],'sheet-org':['فلترة بالجهة…','Filter organization…'],'sheet-date':['فلترة بتاريخ الاختبار…','Filter exam date…'],'sheet-code-search':['بحث عن كود…','Search codes…']})){$(id).placeholder=tr(...pair);$(id).setAttribute('aria-label',tr(...pair));}
    $('sheet-formula').setAttribute('aria-label',tr('محتوى الخلية المحددة','Selected cell value'));
    $('sheet-prev').setAttribute('aria-label',tr('الصفحة السابقة','Previous page'));$('sheet-next').setAttribute('aria-label',tr('الصفحة التالية','Next page'));
    const value=$('sheet-result').value;$('sheet-result').replaceChildren();
    [['',tr('كل النتائج','All results')],['ناجح',tr('ناجح','Passed')],['راسب',tr('راسب','Failed')],['لم يدخل',tr('لم يدخل','Absent')]].forEach(([v,label])=>$('sheet-result').append(node('option',label,{value:v})));
    $('sheet-result').value=value;$('sheet-result').setAttribute('aria-label',tr('النتيجة','Result'));
    if(!editing)render();renderCodes();
  }
  async function open(){
    init();if(loading)return;
    const admin=Cloud.role()==='admin';$('sheet-owner-wrap').hidden=!admin;$('sheet-code-admin').hidden=!admin;
    if(!Cloud.userId())return;
    if(admin){try{members=await Cloud.listMembers();}catch(error){message(errorMessage(error),true);return;}}
    else members=[];
    const selector=$('sheet-owner');selector.replaceChildren();selector.append(node('option',tr('جدولي','My sheet')+' — '+Cloud.email(),{value:Cloud.userId()}));
    members.filter(m=>m.user_id&&m.user_id!==Cloud.userId()).forEach(m=>selector.append(node('option',m.email+(m.active?'':tr(' (غير نشط)',' (inactive)')),{value:m.user_id})));
    if(!owner||!loaded)await switchOwner(owner||Cloud.userId());else selector.value=owner;
    renderCodes();
  }
  async function switchOwner(next,discard=false){
    if(loading)return false;
    commitEdit();if(!discard&&!await flush())return false;
    const token=++epoch;loading=true;$('sheet-owner').disabled=true;$('sheet-workspace').inert=true;
    message(tr('جارٍ تحميل الجدول…','Loading sheet…'));
    try{
      const data=await Cloud.readTrainees(next);if(token!==epoch)return false;
      const normalized=D.normalize(data.cells);owner=next;cells=normalized;version=Number(data.version);revision=savedRevision=0;history=[];future=[];loaded=true;
      clearFilters();anchor=cursor={r:0,c:0};$('sheet-owner').value=owner;render();renderCodes();message(tr('تم الحفظ','Saved'));return true;
    }catch(error){if(token===epoch)message(errorMessage(error),true);return false;}
    finally{if(token===epoch){loading=false;$('sheet-owner').disabled=false;$('sheet-workspace').inert=!loaded;}}
  }
  async function reload(){
    commitEdit();if(saving)await saving;
    if(hasDraft()&&!confirm(tr('إعادة التحميل ستستبدل تعديلاتك غير المحفوظة. انسخ الجدول أولًا للاحتفاظ بها. المتابعة؟','Reload replaces unsaved edits. Copy the sheet first to keep them. Continue?')))return;
    clearTimeout(timer);await switchOwner(owner||Cloud.userId(),true);
  }
  function clearFilters(){['sheet-search','sheet-org','sheet-date','sheet-result'].forEach(id=>$(id).value='');sortCol=-1;page=0;}
  function filtered(){return sortCol>=0||['sheet-search','sheet-org','sheet-date','sheet-result'].some(id=>$(id).value);}
  function buildView(){
    const search=$('sheet-search').value.toLocaleLowerCase(),org=$('sheet-org').value.toLocaleLowerCase(),date=$('sheet-date').value.toLocaleLowerCase(),result=$('sheet-result').value;
    view=cells.map((_,i)=>i).filter(i=>(!search||cells[i].some(v=>v.toLocaleLowerCase().includes(search)))&&(!org||cells[i][6].toLocaleLowerCase().includes(org))&&(!date||cells[i][8].toLocaleLowerCase().includes(date))&&(!result||cells[i][11]===result));
    if(sortCol>=0)view.sort((a,b)=>sortDir*cells[a][sortCol].localeCompare(cells[b][sortCol],currentLang,{numeric:true})||a-b);
    if(!filtered())for(let i=cells.length;i<Math.min(D.MAX_ROWS,Math.max(25,cells.length+5));i++)view.push(i);
  }
  function render(){
    if(!initialized)return;buildView();page=Math.min(page,Math.max(0,Math.ceil(view.length/PAGE)-1));
    const grid=$('sheet-grid'),thead=grid.querySelector('thead'),tbody=grid.querySelector('tbody');thead.replaceChildren();tbody.replaceChildren();
    const header=node('tr');header.append(node('th','#',{class:'sheet-rownum'}));
    labels.forEach((pair,c)=>{const th=node('th',undefined,{scope:'col'});th.append(button(String.fromCharCode(65+c)+' · '+tr(...pair)+(sortCol===c?(sortDir===1?' ↑':' ↓'):''),()=>{commitEdit();sortDir=sortCol===c?-sortDir:1;sortCol=c;page=0;anchor=cursor={r:0,c:0};render();}));header.append(th);});thead.append(header);
    for(let v=page*PAGE;v<Math.min(view.length,(page+1)*PAGE);v++){
      const idx=view[v],row=cells[idx]||D.blank(),trEl=node('tr');const number=node('th',undefined,{class:'sheet-rownum',scope:'row'});
      number.append(button(String(idx+1),e=>{commitEdit();if(e.shiftKey){cursor={r:v,c:12};anchor.c=0;}else{anchor={r:v,c:0};cursor={r:v,c:12};}paint();}));trEl.append(number);
      row.forEach((value,c)=>{const td=node('td',value,{'data-v':v,'data-col':c,tabindex:'-1',role:'gridcell',dir:'auto','aria-label':tr(...labels[c])+' '+(idx+1)});if(c===11)td.classList.add(value==='ناجح'?'sheet-result-pass':value==='راسب'?'sheet-result-fail':'sheet-result-other');trEl.append(td);});tbody.append(trEl);
    }
    $('sheet-count').textContent=tr('الصفوف: ','Rows: ')+cells.filter(r=>r.some(Boolean)).length+' · '+(page+1)+' / '+Math.max(1,Math.ceil(view.length/PAGE));
    $('sheet-prev').disabled=page===0;$('sheet-next').disabled=(page+1)*PAGE>=view.length;
    $('sheet-undo').disabled=!history.length;$('sheet-redo').disabled=!future.length;paint();
  }
  function bounds(){return [Math.min(anchor.r,cursor.r),Math.max(anchor.r,cursor.r),Math.min(anchor.c,cursor.c),Math.max(anchor.c,cursor.c)];}
  function paint(){
    const [r1,r2,c1,c2]=bounds();
    $('sheet-grid').querySelectorAll('td[data-col]').forEach(td=>{const r=+td.dataset.v,c=+td.dataset.col,current=r===cursor.r&&c===cursor.c;td.classList.toggle('sheet-selected',r>=r1&&r<=r2&&c>=c1&&c<=c2);td.classList.toggle('sheet-current',current);td.tabIndex=current?0:-1;td.setAttribute('aria-selected',String(r>=r1&&r<=r2&&c>=c1&&c<=c2));});
    $('sheet-address').textContent=String.fromCharCode(65+cursor.c)+((view[cursor.r]??0)+1);
    if(document.activeElement!==$('sheet-formula'))$('sheet-formula').value=cells[view[cursor.r]]?.[cursor.c]||'';
  }
  function selectCell(r,c,extend=false){commitEdit();cursor={r,c};if(!extend)anchor={r,c};paint();$('sheet-grid').querySelector(`td[data-v="${r}"][data-col="${c}"]`)?.focus();}
  function focusCell(r,c,extend=false){
    r=Math.max(0,Math.min(view.length-1,r));c=Math.max(0,Math.min(12,c));const nextPage=Math.floor(r/PAGE);if(page!==nextPage){page=nextPage;render();}selectCell(r,c,extend);
  }
  function beginEdit(td,initial){
    if(!loaded||loading)return;commitEdit();const r=+td.dataset.v,c=+td.dataset.col;cursor=anchor={r,c};paint();
    editing={el:td,index:view[r],column:c,old:cells[view[r]]?.[c]||''};td.contentEditable='true';td.spellcheck=false;
    if(initial!==undefined)td.textContent=initial;td.focus();
    const range=document.createRange();range.selectNodeContents(td);range.collapse(false);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
    td.addEventListener('blur',()=>commitEdit(),{once:true});
  }
  function commitEdit(cancel=false){
    if(!editing)return;const edit=editing;editing=null;edit.el.contentEditable='false';
    const value=cancel?edit.old:edit.el.textContent;edit.el.textContent=value;
    if(value===edit.old)return;
    try{change(D.paste(cells,[[value]],edit.index,edit.column),false);paint();}
    catch{edit.el.textContent=edit.old;limitError();}
  }
  function change(next,redraw=true){
    if(!loaded)return;history.push(cells.map(r=>[...r]));if(history.length>30)history.shift();future=[];cells=next;revision++;schedule();if(redraw)render();else{$('sheet-undo').disabled=false;$('sheet-redo').disabled=true;}
  }
  function undo(redo){commitEdit();const from=redo?future:history,to=redo?history:future;if(!from.length)return;to.push(cells);cells=from.pop();revision++;schedule();render();}
  function schedule(){clearTimeout(timer);message(tr('تعديلات غير محفوظة…','Unsaved changes…'));const saveWhenIdle=()=>{if(editing){timer=setTimeout(saveWhenIdle,900);return;}flush();};timer=setTimeout(saveWhenIdle,900);}
  function hasDraft(){return !!editing||revision!==savedRevision||!!saving;}
  async function flush(){
    commitEdit();clearTimeout(timer);if(saving){const ok=await saving;if(!ok)return false;return flush();}
    if(!loaded||revision===savedRevision)return true;
    const token=epoch,snapshot=revision,saveOwner=owner,data=D.normalize(cells);
    message(tr('جارٍ الحفظ…','Saving…'));
    saving=(async()=>{
      try{const result=await Cloud.saveTrainees(saveOwner,data,version);if(token!==epoch)return false;version=Number(result);savedRevision=snapshot;message(revision===savedRevision?tr('تم الحفظ','Saved'):tr('تعديلات غير محفوظة…','Unsaved changes…'));return true;}
      catch(error){if(token===epoch)message(errorMessage(error),true);return false;}
    })();const ok=await saving;saving=null;
    if(ok&&token===epoch&&revision!==savedRevision)return flush();return ok;
  }
  function limitError(){message(tr('الحد الأقصى 5000 صف و13 عمودًا و2000 حرف للخلية.','Limit: 5,000 rows, 13 columns and 2,000 characters per cell.'),true);}
  function selectionText(){const [r1,r2,c1,c2]=bounds();return D.tsv(view.slice(r1,r2+1).map(i=>(cells[i]||D.blank()).slice(c1,c2+1)));}
  function clearSelection(){if(!loaded)return;const next=cells.map(row=>[...row]);const [r1,r2,c1,c2]=bounds();for(let r=r1;r<=r2;r++){const idx=view[r];if(!next[idx])continue;for(let c=c1;c<=c2;c++)next[idx][c]='';}change(D.normalize(next));}
  function paste(e){
    if(!loaded)return;e.preventDefault();commitEdit();
    try{
      const values=D.parse(e.clipboardData.getData('text/plain'));if(filtered()&&values.length>1){message(tr('امسح الفلاتر والفرز قبل لصق عدة صفوف.','Clear filters and sorting before pasting multiple rows.'),true);return;}
      const [r,,c]=bounds(),idx=view[r];if(idx===undefined)return;
      change(D.paste(cells,values,idx,c));anchor={r,c};cursor={r:r+values.length-1,c:c+Math.max(...values.map(v=>v.length))-1};paint();
    }catch{limitError();}
  }
  function keyDown(e){
    if(!loaded)return;
    if(editing){
      if(e.key==='Escape'){e.preventDefault();commitEdit(true);focusCell(cursor.r,cursor.c);}
      else if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();commitEdit();render();focusCell(cursor.r+1,cursor.c);}
      else if(e.key==='Tab'){e.preventDefault();commitEdit();render();moveTab(e.shiftKey);}
      return;
    }
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo(e.shiftKey);return;}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();undo(true);return;}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='a'){e.preventDefault();anchor={r:0,c:0};cursor={r:Math.max(0,view.length-1),c:12};paint();return;}
    const moves={ArrowDown:[1,0],ArrowUp:[-1,0],ArrowRight:[0,1],ArrowLeft:[0,-1]};
    if(moves[e.key]){e.preventDefault();const [r,c]=moves[e.key];focusCell(cursor.r+r,cursor.c+c,e.shiftKey);return;}
    if(e.key==='Tab'){e.preventDefault();moveTab(e.shiftKey);return;}
    if(e.key==='Enter'){e.preventDefault();focusCell(cursor.r+(e.shiftKey?-1:1),cursor.c);return;}
    if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();clearSelection();return;}
    const td=e.target.closest('td[data-col]');if(td&&(e.key==='F2'||(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey))){e.preventDefault();beginEdit(td,e.key==='F2'?undefined:e.key);}
  }
  function moveTab(back){let r=cursor.r,c=cursor.c+(back?-1:1);if(c>12){c=0;r++;}if(c<0){c=12;r--;}focusCell(r,c);}
  function setMode(next){commitEdit();mode=next;$('sheet-workspace').hidden=mode!=='sheet';$('sheet-code-workspace').hidden=mode!=='codes';$('sheet-mode').setAttribute('aria-selected',String(mode==='sheet'));$('sheet-codes-mode').setAttribute('aria-selected',String(mode==='codes'));if(mode==='codes')renderCodes();}
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
    codeBusy=true;$('sheet-code-workspace').inert=true;$('sheet-owner').disabled=true;
    try{await Cloud.assignCodes(codeMode==='pool'?owner:null,items);renderCodes();$('sheet-code-status').textContent=tr('تم تحديث تخصيص الأكواد.','Code assignments updated.');}
    catch(error){$('sheet-code-status').textContent=/CONFLICT/.test(error.message||'')?tr('تغيرت الأكواد. حدّث القائمة وحاول مجددًا.','Codes changed. Refresh and try again.'):tr('تعذر تخصيص الأكواد. تأكد أن المستخدم نشط ثم حدّث القائمة.','Could not assign codes. Check that the user is active, then refresh.');}
    finally{codeBusy=false;$('sheet-code-workspace').inert=false;$('sheet-owner').disabled=false;}
  }
  function reset(){clearTimeout(timer);epoch++;owner='';cells=[];loaded=false;loading=false;editing=null;history=[];future=[];revision=savedRevision=0;if(initialized){render();$('sheet-owner').replaceChildren();$('sheet-code-list').replaceChildren();$('sheet-workspace').inert=true;}}
  return {open,translate,hasDraft,flush,reset};
})();
Trainees.translate();
