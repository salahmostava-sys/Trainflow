/* Supabase publishable key: public by design. Access is enforced by database RLS. */
const Cloud = (() => {
  const URL = 'https://xaeffreqwtozsgqajzpc.supabase.co';
  const KEY = 'sb_publishable_TB0SB3SNFP1ygpRvMoeSGg_s8o0mHeO';
  let client, rows = new Map(), config, user, role, busy = false, ready = false;
  let nextBackgroundRefresh = 0;
  const BACKGROUND_REFRESH_MS = 120000;
  const $ = id => document.getElementById(id);
  const clone = value => JSON.parse(JSON.stringify(value));
  const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
  function message(text, error = false){
    $('cloud-status').textContent = text;
    $('cloud-status').style.color = error ? '#b42318' : '';
  }
  function lock(value){
    busy = value;
    $('app').inert = value;
    $('cloud-tools').inert = value;
  }
  function fail(error){
    const text = /CONFLICT|duplicate key/.test(error.message || '')
      ? 'تغيّرت البيانات بواسطة مستخدم آخر. تم تحميل أحدث نسخة؛ أعد تنفيذ التعديل.'
      : 'تعذر إكمال العملية: ' + (error.message || error);
    message(text,true);
    showToast(text);
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
      settings:{autoChain:!!prefs.autoChain},uiLang:prefs.uiLang==='ar'?'ar':'en'};
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
    document.querySelectorAll('.kc-remove-cat-btn,.kc-order-btn,.kc-col-cat select,.kc-drag-handle,.add-box,#bulk-delete-btn,#reset-btn,.icon-btn.danger').forEach(el=>{
      el.hidden=!admin;
    });
    $('admin-tools').hidden=!admin;
    $('signed-in').textContent=(user?.email || '')+' · '+(admin?'مدير':'مستخدم');
  }
  async function load(){
    const [settings,codes]=await Promise.all([client.from('ibta_settings').select('*').eq('id',1).single(),allRows()]);
    if(settings.error) throw settings.error;
    config=settings.data;
    rows=new Map(codes.map(r=>[r.code,r]));
    project();
  }
  function metadata(){
    return {...clone(config.payload),categoryOrder:clone(state.categoryOrder),keycodeOverrides:clone(state.keycodeOverrides),
      keycodeOrder:clone(state.keycodeOrder),codeCategories:Object.keys(state.codesByCategory)};
  }
  async function persist(){
    if(!ready) return true;
    if(busy) return false;
    const changes=[],seen=new Set();
    try{
      localStorage.setItem('ibta_ui_preferences',JSON.stringify({uiLang:state.uiLang,autoChain:state.settings.autoChain}));
      for(const [category,codes] of Object.entries(state.codesByCategory)) for(const code of codes){
        if(seen.has(code)) throw Error('الكود موجود في أكثر من فئة: '+code);
        seen.add(code);
        const prior=rows.get(code),notes=state.codeNotes[code] || '',used_on=state.usedCodes[code] || null;
        if(!prior) changes.push({op:'insert',code,category,notes,used_on});
        else if(prior.notes!==notes || prior.used_on!==used_on) changes.push({op:'update',code,version:prior.version,notes,used_on});
      }
      for(const [code,prior] of rows) if(!seen.has(code)) changes.push({op:'delete',code,version:prior.version});
      const payload=metadata(), changed=!same(payload,config.payload);
      if(!changes.length&&!changed) return true;
      lock(true); message('جارٍ الحفظ…');
      const {error}=await client.rpc('ibta_apply_changes',{changes,settings_payload:changed?payload:null,settings_version:config.version});
      if(error) throw error;
      await load(); message('تم الحفظ في قاعدة البيانات');
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
      if(!prior) throw Error('الكود غير موجود. حدّث البيانات.');
      if(prior.used_on){
        if(prior.used_by!==user.id && role!=='admin') throw Error('هذا الكود مستخدم بواسطة شخص آخر.');
        if(!confirm('هذا الكود مستخدم بالفعل. هل تريد نسخه مرة أخرى؟')) return false;
      }else{
        const {data,error}=await client.rpc('ibta_claim_code',{target_code:code,expected_version:prior.version,use_date:todayStr()});
        if(error) throw error;
        if(!data.length) throw Error('CONFLICT');
        rows.set(code,data[0]);
      }
      const copied=await copyText(code);
      await load();
      if(copied){message('تم نسخ الكود وتسجيل استخدامه');showToast(t('copiedGeneric'));}
      else message('تم حجز الكود لحسابك لكن النسخ فشل. اضغط عليه لإعادة النسخ أو ألغِ علامة الاستخدام.',true);
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
    try{await load();message('تم تحديث البيانات');return true;}
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
    if(error || !data?.active){throw Error('حسابك غير معتمد. اطلب من المدير إضافة بريدك إلى المستخدمين.');}
    role=data.role;
    await load();ready=true;
    $('auth-box').hidden=true;$('app').hidden=false;$('cloud-tools').hidden=false;
    message('متصل بقاعدة البيانات');
  }
  async function authenticate(signup){
    const email=$('auth-email').value.trim(),password=$('auth-password').value;
    $('auth-message').textContent='جارٍ الاتصال…';
    $('auth-actions').inert=true;
    try{
      if(!email || password.length<8) throw Error('أدخل البريد وكلمة مرور من 8 أحرف على الأقل.');
      const result=signup?await client.auth.signUp({email,password}):await client.auth.signInWithPassword({email,password});
      if(result.error) throw result.error;
      $('auth-password').value='';
      if(result.data.session) await enter(result.data.session);
      else $('auth-message').textContent='تم طلب إنشاء الحساب. أكّد بريدك من رسالة Supabase، ثم ارجع هنا وسجّل الدخول.';
    }catch(e){$('auth-message').textContent=e.message;}finally{$('auth-actions').inert=false;}
  }
  async function importLegacy(){
    if(role!=='admin'||busy) return;
    try{
      const raw=localStorage.getItem('ibta_ops_state_v4');
      if(!raw) throw Error('لا توجد بيانات قديمة في هذا المتصفح. افتح النسخة الجديدة في المتصفح الذي استخدمت فيه البرنامج سابقًا.');
      const legacy=JSON.parse(raw);
      if(!legacy.codesByCategory || typeof legacy.codesByCategory!=='object') throw Error('صيغة البيانات القديمة غير صحيحة.');
      if(!confirm('دمج الأكواد القديمة والملاحظات وعلامات الاستخدام مع قاعدة البيانات؟ لن تُحذف أي أكواد سحابية.')) return;
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
      if(await persist()) message('تم دمج البيانات القديمة. النسخة المحلية الأصلية محفوظة.');
    }catch(e){fail(e);}
  }
  async function addMember(){
    if(role!=='admin') return;
    const email=$('member-email').value.trim().toLowerCase();
    if(!email || !email.includes('@')) return;
    const {error}=await client.from('ibta_members').insert({email,role:'operator',active:true});
    if(error) fail(error);else {message('تم اعتماد '+email+'؛ يستطيع إنشاء حسابه وتأكيد بريده.');$('member-email').value='';}
  }
  async function exportData(){
    if(role!=='admin') return;
    await refresh();
    const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),settings:config.payload,codes:[...rows.values()]},null,2)],{type:'application/json'});
    const url=window.URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ibta-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();window.URL.revokeObjectURL(url);
  }
  async function boot(){
    try{
      if(!window.supabase) throw Error('تعذر تحميل مكتبة الاتصال. تحقق من الإنترنت ثم أعد تحميل الصفحة.');
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
    }catch(e){$('auth-message').textContent=e.message;}
  }
  return {boot,persist,copyCode,decorate,refresh};
})();
