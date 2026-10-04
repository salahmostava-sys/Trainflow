// Local UI preview only. No Supabase connection, credentials, or production data.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const mock=`const previewSheets=new Map();const previewCodes=[{code:'DEMO-PRIVATE-001',category:'Foundation',owner_id:'demo-user',version:1,used_on:null},{code:'DEMO-POOL-002',category:'Master',owner_id:null,version:1,used_on:null}];const Cloud={
  role:()=>window.previewRole||'admin',userId:()=> 'demo-admin',email:()=> 'admin@example.invalid',
  stockSnapshot:()=>({}),inventoryMessageSettings:()=>({number:'',name:'',language:'ar'}),
  async inventoryDelivery(options){if(this.role()!=='admin')throw Error('ADMIN_REQUIRED');if(window.previewDeliveryError)throw Error(window.previewDeliveryError);const old=window.previewDelivery||{enabled:false,time:'16:59',phoneId:'',template:'',language:'ar',apiVersion:'v24.0',connected:false,last:null};if(options){window.previewDeliveryCalls=(window.previewDeliveryCalls||[]).concat({...options,token:options.token?'[provided]':''});if(options.enabled&&!(old.connected||options.token&&options.phoneId&&options.template))throw Error('WHATSAPP_NOT_CONNECTED');window.previewDelivery={...old,...options,connected:!!(options.phoneId&&options.template&&(old.connected||options.token))};delete window.previewDelivery.token;}return window.previewDelivery||old;},
  codeSnapshot:()=>previewCodes.map(row=>({...row})),
  refresh:async()=>true,
  listMembers:async()=>[{email:'user@example.invalid',user_id:'demo-user',active:true}],
  async readTrainees(owner){if(window.previewReadError)throw Error('NETWORK');return JSON.parse(JSON.stringify(previewSheets.get(owner)||{cells:[],version:0}));},
  async saveTrainees(owner,cells,version,format){
    if(window.previewDelay)await new Promise(resolve=>setTimeout(resolve,window.previewDelay));
    if(window.previewSaveError)throw Error(window.previewSaveError);
    const old=previewSheets.get(owner)||{version:0};if(old.version!==version)throw Error('CONFLICT');
    previewSheets.set(owner,{cells:JSON.parse(JSON.stringify(cells)),format:JSON.parse(JSON.stringify(format||{})),version:version+1});return version+1;
  },
  async assignCodes(owner,items){for(const item of items){const row=previewCodes.find(r=>r.code===item.code);if(row.version!==item.version)throw Error('CONFLICT');row.owner_id=owner;row.version++;}},
  persist:async()=>true,
  copyCode:async()=>{showToast('معاينة تصميم فقط — لم يتم نسخ أو حجز أي كود');return false;},
  decorate:()=>{},
  translateUi(){
    document.getElementById('signed-in').textContent=currentLang==='ar'?'معاينة التصميم · بيانات تجريبية فقط':'Design preview · sample data only';
    document.getElementById('cloud-status').textContent=currentLang==='ar'?'هذه الصفحة غير متصلة بقاعدة البيانات':'This page is not connected to the database';
    document.getElementById('auth-message').textContent=t('authAccessHelp');
  },
  boot(){
    document.getElementById('startup-screen').hidden=true;
    document.getElementById('auth-box').hidden=false;
    if(location.search.includes('auth')){applyLanguage();return;}
    const categories=['Foundation','Master','BIS','CYBP','Corporate'];
    state={codesByCategory:{},usedCodes:{},codeNotes:{},categoryOrder:categories,keycodeOverrides:{},keycodeOrder:{},dateColors:{},settings:{autoChain:false},uiLang:'ar'};
    categories.forEach((cat,index)=>{const key=getLinkedCodesCat(cat);state.codesByCategory[key]=Array.from({length:index?4:12},(_,i)=>'DEMO-'+String(index+1)+'-'+String(i+1).padStart(4,'0'));});
    state.usedCodes['DEMO-1-0002']='20/09/2026';state.usedCodes['DEMO-1-0004']='21/09/2026';state.usedCodes['DEMO-1-0006']='21/09/2026';state.codeNotes['DEMO-1-0002']='ملاحظة تجريبية';
    DEFAULT_KEYCODES=[{title:'Sales',lang:'Arabic',code:'demo-sales',category:'Foundation'},{title:'Customer Service',lang:'Arabic',code:'demo-service',category:'Foundation'},{title:'Leadership',lang:'English',code:'demo-lead',category:'Foundation'},{title:'Project Management',lang:'Arabic',code:'demo-project',category:'Master'},{title:'Marketing',lang:'English',code:'demo-marketing',category:'Master'},{title:'Artificial Intelligence',lang:'Arabic',code:'demo-ai',category:'BIS'},{title:'CYBP',lang:'Arabic',code:'demo-cybp',category:'CYBP'},{title:'Human Resources',lang:'Arabic',code:'demo-hr',category:'Corporate'}];
    currentLang='ar';activeCategory='Foundation-100';
    document.getElementById('auth-box').hidden=true;document.getElementById('app').hidden=false;document.getElementById('cloud-tools').hidden=false;
    document.getElementById('settings-tab-inventory').hidden=false;document.getElementById('inventory-whatsapp-settings').hidden=false;
    document.getElementById('cred-account-val').textContent='DEMO-ACCOUNT';document.getElementById('cred-password-val').textContent='Demo-only-2026';
    ['refresh-data','sign-out','add-member','import-legacy','export-data'].forEach(id=>document.getElementById(id).addEventListener('click',()=>showToast('معاينة تصميم — الإجراء غير متاح هنا')));
    applyLanguage();
  }
};`;
http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/exceljs-4.4.0.min.js'){res.setHeader('Content-Type','text/javascript');return res.end(fs.readFileSync(require.resolve('exceljs/dist/exceljs.min.js')));}
  if(['/inventory-delivery.js','/trainees.js','/trainees-excel.js','/trainees-core.js','/trainees-xlsx.js','/trainees-files.js','/trainees-xlsx-worker.js','/trainees.css','/ops-ui.js','/trainee-reports.js','/session-policy.js'].includes(pathname)){
    res.setHeader('Content-Type',pathname.endsWith('.css')?'text/css':'text/javascript');
    return res.end(fs.readFileSync(path.join(__dirname,'..',pathname.slice(1))));
  }
  if(pathname!=='/'){res.writeHead(404);return res.end();}
  let html=fs.readFileSync(path.join(__dirname,'../ibta-ops.html'),'utf8');
  html=html.replace(/<script src="https:\/\/cdn.jsdelivr.net[^>]+><\/script>/,'').replace('<script src="cloud.js"></script>','<script>'+mock+'</script>');
  res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(html);
}).listen(Number(process.env.IBTA_PREVIEW_PORT)||4174,'127.0.0.1',()=>console.log('Design-only preview ready'));

