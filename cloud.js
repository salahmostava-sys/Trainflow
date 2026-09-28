/* Supabase publishable key: public by design. Access is enforced by database RLS. */
const Cloud = (() => {
  const URL = 'https://xaeffreqwtozsgqajzpc.supabase.co';
  const KEY = 'sb_publishable_TB0SB3SNFP1ygpRvMoeSGg_s8o0mHeO';
  let client, rows = new Map(), config, user, role, busy = false, ready = false;
  let nextBackgroundRefresh = 0;
  let statusKey = '', statusArgs = [], statusError = false, authStatusKey = 'authAccessHelp', authStatusArgs = [];
  const BACKGROUND_REFRESH_MS = 120000;
  const $ = id => document.getElementById(id);
  const clone = value => JSON.parse(JSON.stringify(value));
  const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
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
    if(user) $('signed-in').textContent=(user.email || '')+' · '+(role==='admin'?t('adminRole'):t('userRole'));
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
    state={usedCodes:{},codesByCategory:{},codeNotes:{},keycodeOverrides:clone(p.keycodeOverrides || {}),
      keycodeOrder:clone(p.keycodeOrder || {}),categoryOrder:clone(p.categoryOrder),dateColors:clone(p.dateColors || {}),
      settings:{autoChain:!!prefs.autoChain},uiLang:prefs.uiLang==='en'?'en':'ar'};
    for(const cat of p.codeCategories || []) state.codesByCategory[cat]=[];
    for(const r of rows.values()){
      (state.codesByCategory[r.category] ||= []).push(r.code);
      if(r.used_on) state.usedCodes[r.code]=r.used_on;
      if(r.notes) state.codeNotes[r.code]=r.notes;
    }
    DEFAULT_KEYCODES=clone(p.keycodes || []);
    PROMETRIC_ACCOUNT=p.credentials?.account || '';
    PROMETRIC_PASSWORD=p.credentials?.password || '';
    $('cred-account-val').textContent=PROMETRIC_ACCOUNT;
    $('cred-password-val').textContent=PROMETRIC_PASSWORD;
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
    return {...clone(config.payload),keycodes:clone(DEFAULT_KEYCODES),categoryOrder:clone(state.categoryOrder),keycodeOverrides:clone(state.keycodeOverrides),
      keycodeOrder:clone(state.keycodeOrder),codeCategories:Object.keys(state.codesByCategory)};
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
    if($('add-codes-input')?.value.trim()) return true;
    return [...document.querySelectorAll('.kc-add-cat-input, .add-box textarea')]
      .some(input => input.value.trim());
  }
  async function enter(session){
    if(!session){ready=false;$('app').hidden=true;$('cloud-tools').hidden=true;$('auth-box').hidden=false;return;}
    user=session.user;
    const {data,error}=await client.from('ibta_members').select('role,active').eq('email',user.email.toLowerCase()).single();
    if(error || !data?.active){throw Error('IBTA_NOT_APPROVED');}
    role=data.role;
    await load();ready=true;
    $('auth-box').hidden=true;$('app').hidden=false;$('cloud-tools').hidden=false;
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
    const {error}=await client.from('ibta_members').insert({email,role:'operator',active:true});
    if(error) fail(error);else {setStatus('memberAdded',false,email);$('member-email').value='';}
  }
  async function exportData(){
    if(role!=='admin') return;
    await refresh();
    const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),settings:config.payload,codes:[...rows.values()]},null,2)],{type:'application/json'});
    const url=window.URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ibta-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();window.URL.revokeObjectURL(url);
  }
  async function boot(){
    try{
      if(!window.supabase) throw Error('IBTA_LIBRARY_LOAD_FAILED');
      client=window.supabase.createClient(URL,KEY,{auth:{storage:sessionStorage,persistSession:true,detectSessionInUrl:false}});
      $('auth-form').addEventListener('submit',e=>{e.preventDefault();authenticate(false);});
      $('sign-up').addEventListener('click',()=>authenticate(true));
      $('refresh-data').addEventListener('click',refresh);
      $('import-legacy').addEventListener('click',importLegacy);
      $('export-data').addEventListener('click',exportData);
      $('add-member').addEventListener('click',addMember);
      $('sign-out').addEventListener('click',async()=>{
        ready=false;pendingChain=null;await client.auth.signOut({scope:'local'});
        location.reload();
      });
      client.auth.onAuthStateChange((event,session)=>{
        if(event==='SIGNED_OUT'){ready=false;$('app').hidden=true;$('cloud-tools').hidden=true;$('auth-box').hidden=false;}
      });
      const {data,error}=await client.auth.getSession();if(error)throw error;
      await enter(data.session);
      setInterval(()=>{
        if(ready&&!busy&&!document.hidden&&!document.activeElement?.matches('input,textarea,select')&&!selectedCodes.size){refresh(true);}
      },30000);
      window.addEventListener('beforeunload',e=>{if(busy){e.preventDefault();e.returnValue='';}});
    }catch(e){setAuthStatus('error',e);}
  }
  return {boot,persist,copyCode,decorate,refresh,translateUi};
})();
