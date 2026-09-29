/* Administrator operations are kept in Settings. All writes are enforced by Supabase RLS and RPCs. */
let pendingBackup=null,pendingImportCodes=[];
const opsText=(id,value)=>{document.getElementById(id).textContent=value;};

function validBackup(value){
  if(!value || (value.format && value.format!=='ibta-ops-backup') ||
     !value.settings || typeof value.settings!=='object' || Array.isArray(value.settings) ||
     !Array.isArray(value.settings.categoryOrder) || !Array.isArray(value.settings.codeCategories) ||
     !Array.isArray(value.settings.keycodes) ||
     !Array.isArray(value.codes) || value.codes.length>20000)return false;
  const seen=new Set();
  return value.codes.every(row=>{
    if(!row || typeof row.code!=='string' || typeof row.category!=='string' ||
       !row.code.trim() || row.code.length>200 || !row.category.trim() || row.category.length>100 ||
       (row.notes!=null && (typeof row.notes!=='string' || row.notes.length>2000)))return false;
    const key=row.code.toLocaleLowerCase();
    if(seen.has(key))return false;
    seen.add(key);return true;
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
  if(!pendingBackup || !confirm(t('restoreConfirm')(pendingBackup.codes.length)))return;
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
document.getElementById('low-stock-save').addEventListener('click',async()=>{
  const value=Number(document.getElementById('low-stock-threshold').value);
  if(!Number.isInteger(value) || value<0 || value>10000)return;
  state.lowStockThreshold=value;
  if(await saveState()){renderStats();showToast(t('saved'));}
});

async function renderMemberList(){
  if(Cloud.role()!=='admin')return;
  const box=document.getElementById('member-list');box.innerHTML='';
  try{
    const members=await Cloud.listMembers();
    members.forEach(member=>{
      const row=document.createElement('div');row.className='ops-list-row';
      const name=document.createElement('span');name.textContent=member.email;
      const select=document.createElement('select');
      [['copy_only','roleCopyOnly'],['operator','roleOperator'],['admin','roleAdmin']].forEach(([value,key])=>{
        const option=document.createElement('option');option.value=value;option.textContent=t(key);select.appendChild(option);
      });select.value=member.role;
      const active=document.createElement('select');
      [[true,'memberActive'],[false,'memberInactive']].forEach(([value,key])=>{
        const option=document.createElement('option');option.value=String(value);option.textContent=t(key);active.appendChild(option);
      });active.value=String(member.active);
      const save=document.createElement('button');save.type='button';save.textContent=t('memberSave');
      const self=member.email.toLocaleLowerCase()===Cloud.email().toLocaleLowerCase();
      select.disabled=self;active.disabled=self;save.disabled=self;
      save.addEventListener('click',async()=>{
        try{await Cloud.updateMember(member.email,select.value,active.value==='true');showToast(t('saved'));await renderMemberList();}
        catch{showToast(t('genericError'));}
      });
      row.appendChild(name);row.appendChild(select);row.appendChild(active);row.appendChild(save);box.appendChild(row);
    });
  }catch{opsText('member-list',t('genericError'));}
}
async function renderAuditList(){
  if(Cloud.role()!=='admin')return;
  const box=document.getElementById('audit-list');box.innerHTML='';
  try{
    const [events,members]=await Promise.all([Cloud.auditEvents(),Cloud.listMembers()]);
    const emails=new Map(members.filter(m=>m.user_id).map(m=>[m.user_id,m.email]));
    if(!events.length){box.textContent=t('activityEmpty');return;}
    events.forEach(event=>{
      const row=document.createElement('div');row.className='ops-list-row';
      const action=t({INSERT:'auditInsert',UPDATE:'auditUpdate',DELETE:'auditDelete'}[event.action] || 'auditUpdate');
      const entity=t({ibta_codes:'auditCodes',ibta_members:'auditMembers',ibta_settings:'auditSettings'}[event.entity] || 'auditSettings');
      row.textContent=new Date(event.happened_at).toLocaleString(currentLang==='ar'?'ar-SA-u-ca-gregory':'en-US')+' · '+
        (emails.get(event.actor) || event.actor || '—')+' · '+action+' · '+entity+' · '+(event.record_key || '');
      box.appendChild(row);
    });
  }catch{box.textContent=t('genericError');}
}
document.getElementById('admin-tools').addEventListener('toggle',event=>{if(event.target.open)renderMemberList();});
document.getElementById('audit-details').addEventListener('toggle',event=>{if(event.target.open)renderAuditList();});
