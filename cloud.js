/* Supabase publishable key: public by design. Access is enforced by database RLS. */
const Cloud = (() => {
  const SUPABASE_URL = 'https://xaeffreqwtozsgqajzpc.supabase.co';
  const KEY = 'sb_publishable_TB0SB3SNFP1ygpRvMoeSGg_s8o0mHeO';
  let client, rows = new Map(), config, user, role, busy = false, ready = false;
  let nextBackgroundRefresh = 0;
  let statusKey = '', statusArgs = [], statusError = false, authStatusKey = 'authAccessHelp', authStatusArgs = [];
  let profileStatusKey='',profileStatusError=false;
  const BACKGROUND_REFRESH_MS = 120000;
  const $ = id => document.getElementById(id);
  const clone = value => JSON.parse(JSON.stringify(value));
  const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
  const accountName = () => typeof user?.user_metadata?.full_name==='string' ? user.user_metadata.full_name.trim() : '';
  function validHttpsUrl(value,domain){
    try{
      const url=new URL(value);
      return url.protocol==='https:' && !url.username && !url.password &&
        (url.hostname===domain || url.hostname.endsWith('.'+domain));
    }catch{return false;}
  }
  function message(text, error = false){
    $('cloud-status').textContent = text;
    $('cloud-status').style.color = error ? '#b42318' : '';
  }
  function translated(key, ...args){
    const value=t(key);
    return typeof value==='function' ? value(...args) : value;
  }
  function errorText(error){
    const raw=error?.message || String(error);
    if(raw==='IBTA_AUTH_INVALID_INPUT') return t('authInvalidInput');
    if(raw==='IBTA_NOT_APPROVED') return t('authNotApproved');
    if(raw==='IBTA_CODE_NOT_FOUND') return t('codeNotFound');
    if(raw==='IBTA_CODE_USED_BY_OTHER') return t('codeUsedByOther');
    if(raw==='IBTA_NO_LEGACY_DATA') return t('noLegacyData');
    if(raw==='IBTA_INVALID_LEGACY_DATA') return t('invalidLegacyData');
    if(raw==='IBTA_INVALID_ZOOM_URL') return t('invalidZoomUrl');
    if(raw==='IBTA_INVALID_PROMETRIC_URL') return t('invalidPrometricUrl');
    if(raw==='IBTA_CREDENTIAL_REQUIRED') return t('enterCredential');
    if(raw==='IBTA_INVALID_CODE_EDIT') return t('invalidCodeEdit');
    if(raw==='IBTA_LIBRARY_LOAD_FAILED') return t('libraryLoadFailed');
    if(raw.startsWith('IBTA_DUPLICATE_CODE:')) return t('duplicateCode')(raw.slice(20));
    if(/invalid login credentials|invalid credentials/i.test(raw) || error?.code==='invalid_credentials') return t('authInvalidCredentials');
    if(/email not confirmed/i.test(raw) || error?.code==='email_not_confirmed') return t('authEmailNotConfirmed');
    if(/email rate limit|rate limit exceeded/i.test(raw) || error?.code==='over_email_send_rate_limit') return t('authEmailLimit');
    if(/user already registered/i.test(raw) || error?.code==='user_already_exists') return t('authAlreadyRegistered');
    return currentLang==='ar' && !/[\u0600-\u06ff]/.test(raw) ? t('genericError') : raw;
  }
  function renderStatus(){
    if(!statusKey) return;
    const text=statusKey==='error' ? t('operationFailed')+errorText(statusArgs[0]) : translated(statusKey,...statusArgs);
    message(text,statusError);
  }
  function setStatus(key,error=false,...args){statusKey=key;statusError=error;statusArgs=args;renderStatus();}
  function setAuthStatus(key,...args){
    authStatusKey=key;authStatusArgs=args;
    $('auth-message').textContent=key==='error' ? errorText(args[0]) : translated(key,...args);
  }
  function translateUi(){
    if(user){
      const email=user.email || '';
      const name=accountName();
      $('signed-in').textContent=(name?name+' · ':'')+email+' · '+(role==='admin'?t('adminRole'):role==='copy_only'?t('roleCopyOnly'):t('userRole'));
      $('account-menu-name').textContent=name || t('currentAccount');
      $('account-menu-email').textContent=email;
      $('account-avatar').textContent=(name || email).trim().charAt(0).toUpperCase() || 'IB';
    }
    if(profileStatusKey){
      $('profile-status').textContent=profileStatusKey==='error'?errorText(profileStatusError):t(profileStatusKey);
      $('profile-status').style.color=profileStatusKey==='error'?'#b42318':'';
    }
    $('zoom-link-val').textContent=ZOOM_URL || t('notConfigured');
    $('prometric-link-val').textContent=PROMETRIC_LOGIN_URL || t('notConfigured');
    if(ZOOM_URL) $('open-zoom').setAttribute('href',ZOOM_URL);
    else $('open-zoom').removeAttribute('href');
    renderStatus();
    setAuthStatus(authStatusKey,...authStatusArgs);
  }
  function lock(value){
    busy = value;
    $('app').inert = value;
    $('cloud-tools').inert = value;
  }
  function fail(error){
    if(/CONFLICT|duplicate key/.test(error.message || '')) setStatus('conflict',true);
    else setStatus('error',true,error);
    showToast($('cloud-status').textContent);
  }
  async function allRows(){
    const result=[];
    for(let offset=0;;offset+=1000){
      const {data,error}=await client.from('ibta_codes').select('*').order('code').range(offset,offset+999);
      if(error) throw error;
      result.push(...data);
      if(data.length<1000) return result;
    }
  }
  function project(){
    const p=config.payload;
    let prefs={};
    try{prefs=JSON.parse(localStorage.getItem('ibta_ui_preferences') || '{}') || {};}catch{}
    state={usedCodes:{},codesByCategory:{},codeNotes:{},categoryLabels:clone(p.categoryLabels || {}),keycodeOverrides:clone(p.keycodeOverrides || {}),
      keycodeOrder:clone(p.keycodeOrder || {}),categoryOrder:clone(p.categoryOrder),dateColors:clone(p.dateColors || {}),
      settings:{autoChain:!!prefs.autoChain},lowStockThreshold:Number.isInteger(p.lowStockThreshold)?p.lowStockThreshold:10,uiLang:prefs.uiLang==='en'?'en':'ar'};
    for(const cat of p.codeCategories || []) state.codesByCategory[cat]=[];
    for(const r of rows.values()){
      (state.codesByCategory[r.category] ||= []).push(r.code);
      if(r.used_on) state.usedCodes[r.code]=r.used_on;
      if(r.notes) state.codeNotes[r.code]=r.notes;
    }
    DEFAULT_KEYCODES=clone(p.keycodes || []);
    PROMETRIC_ACCOUNT=p.credentials?.account || '';
    PROMETRIC_PASSWORD=p.credentials?.password || '';
    ZOOM_URL=validHttpsUrl(p.links?.zoom,'zoom.us') ? p.links.zoom : '';
    PROMETRIC_LOGIN_URL=validHttpsUrl(p.links?.prometric,'prometric.com') ? p.links.prometric : '';
    $('cred-account-val').textContent=PROMETRIC_ACCOUNT;
    $('cred-password-val').textContent=PROMETRIC_PASSWORD;
    $('settings-prometric-account').value=PROMETRIC_ACCOUNT;
    $('settings-prometric-password').value=PROMETRIC_PASSWORD;
    $('settings-zoom-link').value=p.links?.zoom || '';
    $('settings-prometric-link').value=p.links?.prometric || '';
    $('low-stock-threshold').value=state.lowStockThreshold;
    $('profile-name').value=accountName();
    $('profile-email').value=user?.email || '';
    currentLang=state.uiLang;
    autoChainToggle.checked=state.settings.autoChain;
    if(!Object.hasOwn(state.codesByCategory,activeCategory)) activeCategory=Object.keys(state.codesByCategory)[0];
    selectedCodes.clear();
    applyLanguage();
    decorate();
  }
  function decorate(){
    const admin=role==='admin';
    document.querySelectorAll('.kc-remove-cat-btn,.kc-order-btn,.kc-col-cat select,.kc-drag-handle,.kc-add-exam,.add-box,#bulk-delete-btn,#reset-btn,.icon-btn.danger').forEach(el=>{
      el.hidden=!admin;
    });
    $('admin-tools').hidden=!admin;
    $('manage-data').hidden=!admin;
    $('settings-add-forms').hidden=!admin;
    $('prometric-settings').hidden=!admin;
    $('settings-tab-data').hidden=!admin;
    $('settings-tab-prometric').hidden=!admin;
    $('code-bulk-tools').hidden=!admin;
    document.querySelectorAll('.col-notes input').forEach(el=>{el.disabled=role==='copy_only';});
    document.querySelectorAll('.code-unmark-btn').forEach(el=>{el.hidden=role==='copy_only';});
    if(!admin && ($('settings-tab-data').getAttribute('aria-selected')==='true' || $('settings-tab-prometric').getAttribute('aria-selected')==='true')) activateSettingsTab('profile');
    translateUi();
  }
  async function load(){
    const [settings,codes]=await Promise.all([client.from('ibta_settings').select('*').eq('id',1).single(),allRows()]);
    if(settings.error) throw settings.error;
    config=settings.data;
    rows=new Map(codes.map(r=>[r.code,r]));
    project();
  }
  function metadata(){
    return {...clone(config.payload),keycodes:clone(DEFAULT_KEYCODES),categoryOrder:clone(state.categoryOrder),categoryLabels:clone(state.categoryLabels),keycodeOverrides:clone(state.keycodeOverrides),
      keycodeOrder:clone(state.keycodeOrder),codeCategories:Object.keys(state.codesByCategory),
      ...(Object.hasOwn(config.payload,'lowStockThreshold') || state.lowStockThreshold!==10 ? {lowStockThreshold:state.lowStockThreshold} : {})};
  }
  async function persist(){
    if(!ready) return true;
    if(busy) return false;
    const changes=[],seen=new Set();
    try{
      localStorage.setItem('ibta_ui_preferences',JSON.stringify({uiLang:state.uiLang,autoChain:state.settings.autoChain}));
      for(const [category,codes] of Object.entries(state.codesByCategory)) for(const code of codes){
        if(seen.has(code)) throw Error('IBTA_DUPLICATE_CODE:'+code);
        seen.add(code);
        const prior=rows.get(code),notes=state.codeNotes[code] || '',used_on=state.usedCodes[code] || null;
        if(!prior) changes.push({op:'insert',code,category,notes,used_on});
        else if(prior.notes!==notes || prior.used_on!==used_on) changes.push({op:'update',code,version:prior.version,notes,used_on});
      }
      for(const [code,prior] of rows) if(!seen.has(code)) changes.push({op:'delete',code,version:prior.version});
      const payload=metadata(), changed=!same(payload,config.payload);
      if(!changes.length&&!changed) return true;
      lock(true); setStatus('saving');
      const {error}=await client.rpc('ibta_apply_changes',{changes,settings_payload:changed?payload:null,settings_version:config.version});
      if(error) throw error;
      await load(); setStatus('saved');
      return true;
    }catch(error){
      try{await load();}catch{project();}
      fail(error); return false;
    }finally{lock(false);}
  }
  async function copyCode(code){
    if(!ready || busy) return false;
    lock(true);
    try{
      const prior=rows.get(code);
      if(!prior) throw Error('IBTA_CODE_NOT_FOUND');
      if(prior.used_on){
        if(prior.used_by!==user.id && role!=='admin') throw Error('IBTA_CODE_USED_BY_OTHER');
        if(!confirm(t('confirmCopyUsed'))) return false;
      }else{
        const {data,error}=await client.rpc('ibta_claim_code',{target_code:code,expected_version:prior.version,use_date:todayStr()});
        if(error) throw error;
        if(!data.length) throw Error('CONFLICT');
        rows.set(code,data[0]);
      }
      const copied=await copyText(code);
      await load();
      if(copied){setStatus('copyRecorded');showToast(t('copiedGeneric'));}
      else setStatus('copyReserved',true);
      return copied;
    }catch(error){
      try{await load();}catch{}
      fail(error);return false;
    }finally{lock(false);}
  }
  async function editCode(oldCode,newCode,category,usedOn,notes){
    if(!ready || busy || role!=='admin') return false;
    const prior=rows.get(oldCode);
    if(!prior) return false;
    if(!newCode || newCode.length>200 || !Object.hasOwn(state.codesByCategory,category) ||
       (usedOn && !/^\d{2}\/\d{2}\/\d{4}$/.test(usedOn)) ||
       (newCode!==oldCode && [...rows.keys()].some(code=>code.toLowerCase()===newCode.toLowerCase()))){
      fail(Error('IBTA_INVALID_CODE_EDIT')); return false;
    }
    if(newCode===oldCode && category===prior.category && usedOn===(prior.used_on || '') && notes===prior.notes) return true;
    lock(true);setStatus('saving');
    try{
      const {error}=await client.rpc('ibta_apply_changes',{changes:[{op:'replace',code:oldCode,version:prior.version,new_code:newCode,new_category:category,used_on:usedOn || null,notes}],settings_payload:null,settings_version:config.version});
      if(error) throw error;
      await load();setStatus('saved');return true;
    }catch(error){try{await load();}catch{}fail(error);return false;}
    finally{lock(false);}
  }
  async function refresh(background = false){
    if(!ready || busy) return false;
    if(background === true && (Date.now() < nextBackgroundRefresh || hasDraftInput())) return false;
    nextBackgroundRefresh = Date.now() + BACKGROUND_REFRESH_MS;
    lock(true);
    try{await load();setStatus('refreshed');return true;}
    catch(e){
      if(e.status === 429 || e.status === 503) nextBackgroundRefresh = Date.now() + 300000;
      if(background !== true) fail(e);
      return false;
    }finally{lock(false);}
  }
  function hasDraftInput(){
    if($('edit-dialog')?.open) return true;
    if($('profile-name').value!==accountName() ||
       $('profile-email').value!==(user?.email || '') ||
       $('profile-current-password').value || $('profile-new-password').value || $('profile-confirm-password').value) return true;
    if($('add-codes-input')?.value.trim()) return true;
    if(role==='admin' && config){
      const p=config.payload;
      const shared=[['settings-prometric-account',p.credentials?.account || ''],['settings-prometric-password',p.credentials?.password || ''],
        ['settings-zoom-link',p.links?.zoom || ''],['settings-prometric-link',p.links?.prometric || '']];
      if(shared.some(([id,value])=>$(id).value!==value)) return true;
    }
    return [...document.querySelectorAll('.kc-add-cat-input, .add-box textarea')]
      .some(input => input.value.trim());
  }
  async function savePrometricSettings(event){
    event.preventDefault();
    if(role!=='admin' || busy || !ready) return false;
    const account=$('settings-prometric-account').value.trim();
    const password=$('settings-prometric-password').value;
    const zoom=$('settings-zoom-link').value.trim();
    const prometric=$('settings-prometric-link').value.trim();
    try{
      if(!account || !password) throw Error('IBTA_CREDENTIAL_REQUIRED');
      if(!validHttpsUrl(zoom,'zoom.us')) throw Error('IBTA_INVALID_ZOOM_URL');
      if(!validHttpsUrl(prometric,'prometric.com')) throw Error('IBTA_INVALID_PROMETRIC_URL');
      const payload=clone(config.payload);
      payload.credentials={...(payload.credentials || {}),account,password};
      payload.links={...(payload.links || {}),zoom,prometric};
      if(same(payload,config.payload)) return true;
      lock(true);setStatus('saving');
      const {error}=await client.rpc('ibta_apply_changes',{changes:[],settings_payload:payload,settings_version:config.version});
      if(error) throw error;
      await load();setStatus('saved');showToast(t('saved'));
      return true;
    }catch(error){
      if(/CONFLICT/.test(error.message || '')) try{await load();}catch{}
      fail(error);return false;
    }finally{lock(false);}
  }
  function profileMessage(key,error=null){
    profileStatusKey=key;profileStatusError=error;translateUi();
  }
  async function saveProfileName(event){
    event.preventDefault();
    if(!ready || busy)return;
    const name=$('profile-name').value.trim();
    if(!name)return;
    if(name===accountName())return;
    lock(true);
    try{
      const {data,error}=await client.auth.updateUser({data:{full_name:name}});
      if(error)throw error;
      user=data.user || user;
      $('profile-name').value=name;
      profileMessage('profileNameSaved');
    }catch(error){profileMessage('error',error);}
    finally{lock(false);}
  }
  async function saveProfileEmail(event){
    event.preventDefault();
    if(!ready || busy)return;
    const email=$('profile-email').value.trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){profileMessage('profileInvalidEmail');return;}
    if(email===(user.email || '').toLowerCase()){profileMessage('profileSameEmail');return;}
    lock(true);
    try{
      const {data,error}=await client.auth.updateUser({email});
      if(error)throw error;
      user=data.user || user;
      $('profile-email').value=user.email || '';
      profileMessage('profileEmailSent');
    }catch(error){profileMessage('error',error);}
    finally{lock(false);}
  }
  async function saveProfilePassword(event){
    event.preventDefault();
    if(!ready || busy)return;
    const current=$('profile-current-password').value,newPassword=$('profile-new-password').value,confirm=$('profile-confirm-password').value;
    if(newPassword.length<8){profileMessage('profilePasswordShort');return;}
    if(newPassword!==confirm){profileMessage('profilePasswordMismatch');return;}
    lock(true);
    try{
      const {error}=await client.auth.updateUser({password:newPassword,current_password:current});
      if(error)throw error;
      $('profile-current-password').value='';$('profile-new-password').value='';$('profile-confirm-password').value='';
      profileMessage('profilePasswordSaved');
    }catch(error){profileMessage('error',error);}
    finally{lock(false);}
  }
  async function enter(session){
    if(!session){ready=false;$('app').hidden=true;$('cloud-tools').hidden=true;$('sign-out').hidden=true;$('auth-box').hidden=false;return;}
    user=session.user;
    let member=await client.from('ibta_members').select('role,active,user_id').eq('user_id',user.id).maybeSingle();
    if(member.error)throw member.error;
    if(!member.data)member=await client.from('ibta_members').select('role,active,user_id').eq('email',user.email.toLowerCase()).maybeSingle();
    if(member.error || !member.data?.active || (member.data.user_id && member.data.user_id!==user.id))throw Error('IBTA_NOT_APPROVED');
    role=member.data.role;
    await load();ready=true;
    $('auth-box').hidden=true;$('app').hidden=false;$('cloud-tools').hidden=false;$('sign-out').hidden=false;
    setStatus('dbConnected');
  }
  async function authenticate(signup){
    const email=$('auth-email').value.trim(),password=$('auth-password').value;
    setAuthStatus('authConnecting');
    $('auth-actions').inert=true;
    try{
      if(!email || password.length<8) throw Error('IBTA_AUTH_INVALID_INPUT');
      const result=signup?await client.auth.signUp({email,password}):await client.auth.signInWithPassword({email,password});
      if(result.error) throw result.error;
      $('auth-password').value='';
      if(result.data.session) await enter(result.data.session);
      else setAuthStatus('authSignupRequested');
    }catch(e){setAuthStatus('error',e);}finally{$('auth-actions').inert=false;}
  }
  async function importLegacy(){
    if(role!=='admin'||busy) return;
    try{
      const raw=localStorage.getItem('ibta_ops_state_v4');
      if(!raw) throw Error('IBTA_NO_LEGACY_DATA');
      const legacy=JSON.parse(raw);
      if(!legacy.codesByCategory || typeof legacy.codesByCategory!=='object') throw Error('IBTA_INVALID_LEGACY_DATA');
      if(!confirm(t('confirmImportLegacy'))) return;
      await refresh();
      for(const [cat,codes] of Object.entries(legacy.codesByCategory)){
        if(!Array.isArray(codes)) continue;
        state.codesByCategory[cat] ||= [];
        for(const code of codes){
          if(typeof code!=='string'||!code.trim()) continue;
          if(!rows.has(code)) state.codesByCategory[cat].push(code);
          if(!state.usedCodes[code] && typeof legacy.usedCodes?.[code]==='string') state.usedCodes[code]=legacy.usedCodes[code];
          if(!state.codeNotes[code] && typeof legacy.codeNotes?.[code]==='string') state.codeNotes[code]=legacy.codeNotes[code];
        }
      }
      for(const cat of legacy.categoryOrder || []) if(typeof cat==='string'&&!state.categoryOrder.includes(cat)) state.categoryOrder.push(cat);
      if(await persist()) setStatus('legacyImported');
    }catch(e){fail(e);}
  }
  async function addMember(){
    if(role!=='admin') return;
    const email=$('member-email').value.trim().toLowerCase();
    if(!email || !email.includes('@')) return;
    const memberRole=$('member-role').value;
    if(!['copy_only','operator','admin'].includes(memberRole))return;
    const {error}=await client.from('ibta_members').insert({email,role:memberRole,active:true});
    if(error) fail(error);else {setStatus('memberAdded',false,email);$('member-email').value='';if(typeof renderMemberList==='function')renderMemberList();}
  }
  async function exportData(){
    if(role!=='admin') return;
    if(!await refresh())return;
    const blob=new Blob([JSON.stringify({format:'ibta-ops-backup',version:1,exportedAt:new Date().toISOString(),settings:config.payload,codes:[...rows.values()]},null,2)],{type:'application/json'});
    const url=window.URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ibta-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();window.URL.revokeObjectURL(url);
  }
  async function exportCodesCsv(){
    if(role!=='admin')return;
    if(!await refresh())return;
    const csvCell=value=>{
      let text=String(value ?? '');
      if(/^[=+@\-\t\r]/.test(text))text="'"+text;
      return '"'+text.replaceAll('"','""')+'"';
    };
    const lines=[['Code','Category','Used On'],...[...rows.values()].map(row=>[row.code,row.category,row.used_on || ''])];
    const blob=new Blob(['\uFEFF'+lines.map(line=>line.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
    const url=window.URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ibta-codes-'+new Date().toISOString().slice(0,10)+'.csv';a.click();window.URL.revokeObjectURL(url);
  }
  async function restoreData(backup){
    if(!ready || role!=='admin')throw Error('IBTA_NOT_APPROVED');
    if(backup?.format && backup.format!=='ibta-ops-backup')throw Error('IBTA_INVALID_BACKUP');
    if(!Array.isArray(backup?.settings?.categoryOrder) || !Array.isArray(backup?.settings?.codeCategories) ||
       !Array.isArray(backup?.settings?.keycodes) || !Array.isArray(backup.codes))throw Error('IBTA_INVALID_BACKUP');
    lock(true);setStatus('saving');
    try{
      const {error}=await client.rpc('ibta_restore_backup',{backup,expected_version:config.version});
      if(error)throw error;
      await load();setStatus('saved');return true;
    }catch(error){fail(error);throw error;}
    finally{lock(false);}
  }
  async function importCodes(category,codes){
    if(!ready || role!=='admin')throw Error('IBTA_NOT_APPROVED');
    if(!Object.hasOwn(state.codesByCategory,category))throw Error('IBTA_INVALID_CATEGORY');
    lock(true);setStatus('saving');
    try{
      const {data,error}=await client.rpc('ibta_import_codes',{target_category:category,new_codes:codes});
      if(error)throw error;
      await load();setStatus('saved');return data;
    }catch(error){fail(error);throw error;}
    finally{lock(false);}
  }
  async function listMembers(){
    if(role!=='admin')return [];
    const {data,error}=await client.from('ibta_members').select('email,role,active,user_id').order('email');
    if(error)throw error;return data;
  }
  async function updateMember(email,nextRole,active){
    if(role!=='admin')throw Error('IBTA_NOT_APPROVED');
    if(!['copy_only','operator','admin'].includes(nextRole))throw Error('IBTA_INVALID_ROLE');
    const {error}=await client.from('ibta_members').update({role:nextRole,active}).eq('email',email);
    if(error)throw error;
  }
  async function auditEvents(){
    if(role!=='admin')return [];
    const {data,error}=await client.from('ibta_audit').select('id,actor,action,entity,record_key,happened_at').order('happened_at',{ascending:false}).limit(100);
    if(error)throw error;return data;
  }
  async function boot(){
    try{
      if(!window.supabase) throw Error('IBTA_LIBRARY_LOAD_FAILED');
      client=window.supabase.createClient(SUPABASE_URL,KEY,{auth:{storage:sessionStorage,persistSession:true,detectSessionInUrl:false}});
      $('auth-form').addEventListener('submit',e=>{e.preventDefault();authenticate(false);});
      $('sign-up').addEventListener('click',()=>authenticate(true));
      $('refresh-data').addEventListener('click',refresh);
      $('import-legacy').addEventListener('click',importLegacy);
      $('export-data').addEventListener('click',exportData);
      $('export-codes-csv').addEventListener('click',exportCodesCsv);
      $('add-member').addEventListener('click',addMember);
      $('prometric-settings-form').addEventListener('submit',savePrometricSettings);
      $('profile-name-form').addEventListener('submit',saveProfileName);
      $('profile-email-form').addEventListener('submit',saveProfileEmail);
      $('profile-password-form').addEventListener('submit',saveProfilePassword);
      $('sign-out').addEventListener('click',async()=>{
        ready=false;pendingChain=null;await client.auth.signOut({scope:'local'});
        location.reload();
      });
      client.auth.onAuthStateChange((event,session)=>{
        if(event==='SIGNED_OUT'){ready=false;$('app').hidden=true;$('cloud-tools').hidden=true;$('sign-out').hidden=true;$('auth-box').hidden=false;}
        if(event==='USER_UPDATED' && session?.user){user=session.user;translateUi();}
      });
      const {data,error}=await client.auth.getSession();if(error)throw error;
      await enter(data.session);
      setInterval(()=>{
        if(ready&&!busy&&!document.hidden&&!document.activeElement?.matches('input,textarea,select')&&!selectedCodes.size){refresh(true);}
      },30000);
      window.addEventListener('beforeunload',e=>{if(busy){e.preventDefault();e.returnValue='';}});
    }catch(e){setAuthStatus('error',e);}
  }
  return {boot,persist,copyCode,editCode,decorate,refresh,translateUi,restoreData,importCodes,listMembers,updateMember,auditEvents,exportCodesCsv,
    role:()=>role,email:()=>user?.email || '',existingCodes:()=>[...rows.keys()]};
})();
