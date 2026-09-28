// Local UI preview only. No Supabase connection, credentials, or production data.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const mock=`const Cloud={
  persist:async()=>true,
  copyCode:async()=>{showToast('معاينة تصميم فقط — لم يتم نسخ أو حجز أي كود');return false;},
  decorate:()=>{},
  translateUi(){
    document.getElementById('signed-in').textContent=currentLang==='ar'?'معاينة التصميم · بيانات تجريبية فقط':'Design preview · sample data only';
    document.getElementById('cloud-status').textContent=currentLang==='ar'?'هذه الصفحة غير متصلة بقاعدة البيانات':'This page is not connected to the database';
    document.getElementById('auth-message').textContent=t('authAccessHelp');
  },
  boot(){
    if(location.search.includes('auth')){applyLanguage();return;}
    const categories=['Foundation','Master','BIS','CYBP','Corporate'];
    state={codesByCategory:{},usedCodes:{},codeNotes:{},categoryOrder:categories,keycodeOverrides:{},keycodeOrder:{},dateColors:{},settings:{autoChain:false},uiLang:'ar'};
    categories.forEach((cat,index)=>{const key=getLinkedCodesCat(cat);state.codesByCategory[key]=Array.from({length:index?4:12},(_,i)=>'DEMO-'+String(index+1)+'-'+String(i+1).padStart(4,'0'));});
    state.usedCodes['DEMO-1-0002']='20/09/2026';state.usedCodes['DEMO-1-0004']='21/09/2026';state.usedCodes['DEMO-1-0006']='21/09/2026';state.codeNotes['DEMO-1-0002']='ملاحظة تجريبية';
    DEFAULT_KEYCODES=[{title:'Sales',lang:'Arabic',code:'demo-sales',category:'Foundation'},{title:'Customer Service',lang:'Arabic',code:'demo-service',category:'Foundation'},{title:'Leadership',lang:'English',code:'demo-lead',category:'Foundation'},{title:'Project Management',lang:'Arabic',code:'demo-project',category:'Master'},{title:'Marketing',lang:'English',code:'demo-marketing',category:'Master'},{title:'Artificial Intelligence',lang:'Arabic',code:'demo-ai',category:'BIS'},{title:'CYBP',lang:'Arabic',code:'demo-cybp',category:'CYBP'},{title:'Human Resources',lang:'Arabic',code:'demo-hr',category:'Corporate'}];
    currentLang='ar';activeCategory='Foundation-100';
    document.getElementById('auth-box').hidden=true;document.getElementById('app').hidden=false;document.getElementById('cloud-tools').hidden=false;
    document.getElementById('cred-account-val').textContent='DEMO-ACCOUNT';document.getElementById('cred-password-val').textContent='Demo-only-2026';
    ['refresh-data','sign-out','add-member','import-legacy','export-data'].forEach(id=>document.getElementById(id).addEventListener('click',()=>showToast('معاينة تصميم — الإجراء غير متاح هنا')));
    applyLanguage();
  }
};`;
http.createServer((req,res)=>{
  if(new URL(req.url,'http://localhost').pathname!=='/'){res.writeHead(404);return res.end();}
  let html=fs.readFileSync(path.join(__dirname,'../ibta-ops.html'),'utf8');
  html=html.replace(/<script src="https:\/\/cdn.jsdelivr.net[^>]+><\/script>/,'').replace('<script src="cloud.js"></script>','<script>'+mock+'</script>');
  res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(html);
}).listen(4174,'127.0.0.1',()=>console.log('Design-only preview: http://127.0.0.1:4174'));

