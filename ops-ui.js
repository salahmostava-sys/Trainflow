/* Administrator operations are kept in Settings. All writes are enforced by Supabase RLS and RPCs. */
let pendingBackup=null,pendingImportCodes=[];
const opsText=(id,value)=>{document.getElementById(id).textContent=value;};

function validBackup(value){
  if(!value || (value.format && !['trainflow-backup','ibta-ops-backup'].includes(value.format)) ||
     !value.settings || typeof value.settings!=='object' || Array.isArray(value.settings) ||
     !Array.isArray(value.settings.categoryOrder) || !Array.isArray(value.settings.codeCategories) ||
     !Array.isArray(value.settings.keycodes) ||
     !Array.isArray(value.codes) || value.codes.length>20000)return false;
  const seen=new Set();
  const validCodes=value.codes.every(row=>{
    if(!row || typeof row.code!=='string' || typeof row.category!=='string' ||
       !row.code.trim() || row.code.length>200 || !row.category.trim() || row.category.length>100 ||
       (row.notes!=null && (typeof row.notes!=='string' || row.notes.length>2000)) ||
       (row.trainee_name!=null&&(typeof row.trainee_name!=='string'||row.trainee_name.length>200)))return false;
    const key=row.code.toLocaleLowerCase();
    if(seen.has(key))return false;
    seen.add(key);return true;
  });
  if(!validCodes)return false;
  if(value.traineeSheets!==undefined){
    if(!Array.isArray(value.traineeSheets)||value.traineeSheets.length>1000)return false;
    const owners=new Set();
    for(const sheet of value.traineeSheets){
      const uuid=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
      if(!sheet||typeof sheet.owner_id!=='string'||!uuid.test(sheet.owner_id)||(sheet.sheet_id!==undefined&&!uuid.test(sheet.sheet_id)))return false;
      const identity=sheet.owner_id.toLowerCase()+':'+(sheet.sheet_id||'00000000-0000-0000-0000-000000000001').toLowerCase();if(owners.has(identity))return false;owners.add(identity);
      if(sheet.sheet_name!==undefined&&(typeof sheet.sheet_name!=='string'||!sheet.sheet_name.trim()||sheet.sheet_name.length>100))return false;
      if(sheet.sheet_order!==undefined&&!Number.isInteger(sheet.sheet_order))return false;
      if(sheet.sheet_hidden!==undefined&&typeof sheet.sheet_hidden!=='boolean')return false;
      if(sheet.tab_color!=null&&!/^#[0-9a-f]{6}$/i.test(sheet.tab_color))return false;
      if(!Array.isArray(sheet.cells)||sheet.cells.length>1000000||sheet.cells.some(row=>!Array.isArray(row)||row.length<13||row.length>500||row.some(cell=>typeof cell!=='string'||cell.length>2000)))return false;
    }
  }
  if(value.supervisorStock===undefined)return true;
  if(!Array.isArray(value.supervisorStock) || value.supervisorStock.length>1000)return false;
  const categories=new Set();
  return value.supervisorStock.every(row=>{
    if(!row || typeof row.category!=='string' || !row.category.trim() || row.category.length>100 ||
       !Number.isInteger(row.remaining) || row.remaining<0 || row.remaining>1000000 ||
       categories.has(row.category))return false;
    categories.add(row.category);return true;
  });
}

document.getElementById('restore-file').addEventListener('change',async event=>{
  pendingBackup=null;document.getElementById('restore-button').disabled=true;
  const file=event.target.files?.[0];if(!file)return;
  try{
    if(file.size>10000000)throw Error('too large');
    const parsed=JSON.parse(await file.text());
    if(!validBackup(parsed))throw Error('invalid backup');
    pendingBackup=parsed;
    opsText('restore-preview',t('restorePreview')(parsed.codes.length));
    document.getElementById('restore-button').disabled=false;
  }catch{opsText('restore-preview',t('restoreInvalid'));}
});
document.getElementById('restore-button').addEventListener('click',async()=>{
  if(!pendingBackup)return;
  const ok=await (window.AppDialog?AppDialog.confirm({
    title:currentLang==='ar'?'تأكيد استعادة النسخة الاحتياطية':'Confirm Backup Restore',
    message:t('restoreConfirm')(pendingBackup.codes.length),
    confirmText:currentLang==='ar'?'استعادة':'Restore',
    cancelText:currentLang==='ar'?'إلغاء':'Cancel',
    danger:true,
    icon:'warning'
  }):confirm(t('restoreConfirm')(pendingBackup.codes.length)));
  if(!ok)return;
  try{
    await Cloud.restoreData(pendingBackup);
    pendingBackup=null;document.getElementById('restore-button').disabled=true;
    document.getElementById('restore-file').value='';
    opsText('restore-preview',t('restoreDone'));
  }catch{opsText('restore-preview',t('operationFailed')+t('genericError'));}
});

function parseCodeFile(text){
  const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  const firstCell=line=>{
    if(!line.startsWith('"'))return line.split(',')[0].trim();
    let cell='';
    for(let i=1;i<line.length;i++){
      if(line[i]==='"' && line[i+1]==='"'){cell+='"';i++;}
      else if(line[i]==='"')break;
      else cell+=line[i];
    }
    return cell.trim();
  };
  if(lines.length && /^(code|الكود|الرمز)$/i.test(firstCell(lines[0])))lines.shift();
  const existing=new Set(Cloud.existingCodes().map(code=>code.toLocaleLowerCase()));
  const seen=new Set();let duplicates=0,invalid=0;
  const codes=[];
  for(const line of lines){
    let code=firstCell(line);
    if(/^'[=+@-]/.test(code))code=code.slice(1);
    if(!code || code.length>200 || code.includes(',')){invalid++;continue;}
    const key=code.toLocaleLowerCase();
    if(seen.has(key) || existing.has(key)){duplicates++;continue;}
    seen.add(key);codes.push(code);
  }
  return {codes,duplicates,invalid};
}
document.getElementById('bulk-import-file').addEventListener('change',async event=>{
  pendingImportCodes=[];document.getElementById('bulk-import-submit').disabled=true;
  const file=event.target.files?.[0];if(!file)return;
  try{
    if(file.size>1000000)throw Error('too large');
    const preview=parseCodeFile(await file.text());
    if(preview.codes.length>5000)throw Error('too many codes');
    pendingImportCodes=preview.codes;
    opsText('bulk-import-preview',t('bulkImportPreview')(preview.codes.length,preview.duplicates,preview.invalid));
    document.getElementById('bulk-import-submit').disabled=!preview.codes.length;
  }catch{opsText('bulk-import-preview',t('genericError'));}
});
document.getElementById('bulk-import-submit').addEventListener('click',async()=>{
  if(!pendingImportCodes.length)return;
  try{
    const added=await Cloud.importCodes(document.getElementById('bulk-import-category').value,pendingImportCodes);
    pendingImportCodes=[];document.getElementById('bulk-import-file').value='';
    document.getElementById('bulk-import-submit').disabled=true;
    opsText('bulk-import-preview',t('bulkImportDone')(added));
  }catch{opsText('bulk-import-preview',t('genericError'));}
});
async function renderMemberList(){
  if(Cloud.role()!=='admin')return;
  const box=document.getElementById('member-list');if(!box)return;
  try{
    const members=await Cloud.listMembers();
    window.WorkspaceViews.members(box,{
      roles:[['copy_only','roleCopyOnly'],['operator','roleOperator'],['admin','roleAdmin']].map(([value,key])=>({value,label:t(key)})),
      statuses:[[true,'memberActive'],[false,'memberInactive']].map(([value,key])=>({value:String(value),label:t(key)})),saveLabel:t('memberSave'),
      members:members.map(member=>({...member,self:member.email.toLocaleLowerCase()===Cloud.email().toLocaleLowerCase(),save:async(role,active)=>{
        try{await Cloud.updateMember(member.email,role,active);showToast(t('saved'));await renderMemberList();}catch{showToast(t('genericError'));}
      }}))
    });
  }catch{window.WorkspaceViews.message(box,t('genericError'));}
}
async function renderAuditList(){
  if(Cloud.role()!=='admin')return;
  const box=document.getElementById('audit-list');
  try{
    const [events,members]=await Promise.all([Cloud.auditEvents(),Cloud.listMembers()]);
    const emails=new Map(members.filter(member=>member.user_id).map(member=>[member.user_id,member.email]));
    window.WorkspaceViews.audit(box,{empty:t('activityEmpty'),entries:events.map(event=>{
      const action=t({INSERT:'auditInsert',UPDATE:'auditUpdate',DELETE:'auditDelete'}[event.action]||'auditUpdate');
      const entity=t({ibta_codes:'auditCodes',ibta_members:'auditMembers',ibta_settings:'auditSettings'}[event.entity]||'auditSettings');
      return new Date(event.happened_at).toLocaleString(currentLang==='ar'?'ar-SA-u-ca-gregory':'en-US')+' · '+(emails.get(event.actor)||event.actor||'—')+' · '+action+' · '+entity+' · '+(event.record_key||'');
    })});
  }catch{window.WorkspaceViews.message(box,t('genericError'));}
}

document.getElementById('admin-tools').addEventListener('toggle',event=>{if(event.target.open&&document.getElementById('member-list'))renderMemberList();});
document.getElementById('audit-details').addEventListener('toggle',event=>{if(event.target.open)renderAuditList();});

function sortCategories(cats){
  if(!Array.isArray(cats))return [];
  const order=["Foundation","Master","BIS","Corporate","CYBP"];
  return [...cats].sort((a,b)=>{
    const cleanA=String(a||'').replace(/-\d+$/,''),cleanB=String(b||'').replace(/-\d+$/,'');
    const isCybA=cleanA.toUpperCase()==='CYBP',isCybB=cleanB.toUpperCase()==='CYBP';
    if(isCybA&&!isCybB)return 1;
    if(!isCybA&&isCybB)return -1;
    const idxA=order.indexOf(cleanA),idxB=order.indexOf(cleanB);
    if(idxA!==-1&&idxB!==-1)return idxA-idxB;
    if(idxA!==-1)return -1;
    if(idxB!==-1)return 1;
    return String(a).localeCompare(String(b));
  });
}

function inventoryMessage(categories,stock,source=null){
  categories=sortCategories(categories);
  const settings=source?.settings||Cloud.inventoryMessageSettings(),dict=TRANSLATIONS[settings.language];
  const labels=source?.labels||state.categoryLabels;
  const label=category=>labels?.[category] || labels?.[category.replace(/-\d+$/,'')] || category.replace(/-\d+$/,'');
  const mine=category=>source?(source.available[category]||0):(state.codesByCategory[category] || []).filter(code=>!state.usedCodes[code]).length;
  const theirs=category=>Object.hasOwn(stock,category)?stock[category]:dict.inventoryNotSet;
  const name=settings.name || dict.inventorySupervisorFallback;
  const overall=categories.every(category=>Object.hasOwn(stock,category))
    ? categories.reduce((sum,category)=>sum+mine(category)+stock[category],0):dict.inventoryNotSet;
  const dateStr=typeof todayStr==='function'?todayStr():new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Riyadh',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date());
  const dateHeader=dict.inventoryMessageDate?dict.inventoryMessageDate(dateStr):(settings.language==='ar'?'التاريخ: '+dateStr:'Date: '+dateStr);
  return [dateHeader,'',
    dict.inventoryMessageMine,...categories.map(category=>label(category)+': '+mine(category)),
    '',dict.inventoryMessageSupervisor(name),...categories.map(category=>label(category)+': '+theirs(category)),
    '',dict.inventoryMessageTotal,...categories.map(category=>{
      const total=Object.hasOwn(stock,category)?mine(category)+stock[category]:dict.inventoryNotSet;
      return label(category)+': '+total;
    }),dict.inventoryMessageOverall+': '+overall].join('\n');
}
function renderInventory(){
  const categories=sortCategories(Object.keys(state.codesByCategory || {})),stock=Cloud.stockSnapshot(),messageSettings=Cloud.inventoryMessageSettings();
  const categorySelect=document.getElementById('inventory-category'),previous=categorySelect.value;
  window.WorkspaceViews.options(categorySelect,{options:categories.map(value=>({value,label:displayCatName(value)}))});
  window.WorkspaceViews.stock(document.getElementById('inventory-stock-list'),{balances:categories.map(category=>({category:displayCatName(category),balance:String(Object.hasOwn(stock,category)?stock[category]:t('inventoryNotSet'))}))});
  categorySelect.value=categories.includes(previous)?previous:(categories[0] || '');
  syncInventoryAction();
  const complete=categories.length>0 && categories.every(category=>Object.hasOwn(stock,category));
  const message=inventoryMessage(categories,stock);
  const msgEl=document.getElementById('inventory-message');
  if(msgEl){
    msgEl.textContent=message;
    msgEl.dir=messageSettings.language==='ar'?'rtl':'ltr';
  }
  const hintEl=document.getElementById('inventory-message-hint');
  if(hintEl)hintEl.textContent=!complete?t('inventoryMessageHint'):'';
  const copyBtn=document.getElementById('inventory-copy-message');
  if(copyBtn)copyBtn.disabled=!complete;
}
function syncInventoryAction(){
  const category=document.getElementById('inventory-category').value;
  const stock=Cloud.stockSnapshot(),configured=Object.hasOwn(stock,category);
  document.getElementById('inventory-current-balance').textContent=t('inventoryCurrentBalance')(configured?stock[category]:t('inventoryNotSet'));
  document.getElementById('inventory-purchased-quantity').disabled=!configured;
  document.getElementById('inventory-add-purchased').disabled=!configured;
}
document.getElementById('inventory-category').addEventListener('change',()=>{
  document.getElementById('inventory-current-quantity').value='';
  document.getElementById('inventory-purchased-quantity').value='';
  document.getElementById('inventory-update-status').textContent='';
  syncInventoryAction();
});
async function saveInventoryBalance(mode,field){
  const category=document.getElementById('inventory-category').value;
  const input=document.getElementById(field),raw=input.value.trim();
  const quantity=Number(raw);
  const status=document.getElementById('inventory-update-status');
  if(!raw || !Number.isInteger(quantity) || quantity<0 || quantity>1000000 ||
     (mode==='replenishment' && quantity===0)){
    status.textContent=t('inventoryInvalidChange');return;
  }
  try{
    await Cloud.changeSupervisorStock(category,mode,quantity);
    input.value='';
    status.textContent=t('inventorySaved');
  }catch{status.textContent=t('genericError');}
}
document.getElementById('inventory-set-current').addEventListener('click',async()=>{
  const category=document.getElementById('inventory-category').value;
  const mode=Object.hasOwn(Cloud.stockSnapshot(),category)?'correction':'opening';
  await saveInventoryBalance(mode,'inventory-current-quantity');
});
document.getElementById('inventory-add-purchased').addEventListener('click',async()=>{
  await saveInventoryBalance('replenishment','inventory-purchased-quantity');
});
document.getElementById('inventory-copy-message').addEventListener('click',async()=>{
  const categories=sortCategories(Object.keys(state.codesByCategory || {})),stock=Cloud.stockSnapshot();
  const message=inventoryMessage(categories,stock);
  document.getElementById('inventory-message').textContent=message;
  if(await copyText(message))showToast(t('inventoryMessageCopied'));
});
