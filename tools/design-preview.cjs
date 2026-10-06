// Local UI preview only. No Supabase connection, credentials, or production data.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const mock=`const previewSheets=new Map(window.previewInitialSheets||[]);const previewCodes=[{code:'DEMO-PRIVATE-001',category:'Foundation',owner_id:'demo-user',version:1,used_on:null},{code:'DEMO-POOL-002',category:'Master',owner_id:null,version:1,used_on:null}];const Cloud={
  role:()=>window.previewRole||'admin',userId:()=> 'demo-admin',email:()=> 'admin@example.invalid',
  stockSnapshot:()=>({}),inventoryMessageSettings:()=>({name:'',language:'ar'}),
  codeSnapshot:()=>previewCodes.map(row=>({...row})),
  refresh:async()=>true,
  listMembers:async()=>[{email:'user@example.invalid',user_id:'demo-user',active:true}],
  async listTraineeSheets(owner){const first='00000000-0000-0000-0000-000000000001',items=[...previewSheets].filter(([key])=>key===owner||key.startsWith(owner+':')).map(([key,item],i)=>({sheet_id:key===owner?first:key.slice(owner.length+1),sheet_name:item.sheet_name||'Sheet 1',sheet_order:item.sheet_order??i,sheet_hidden:!!item.sheet_hidden,tab_color:item.tab_color||null}));return items.length?items.sort((a,b)=>a.sheet_order-b.sheet_order):[{sheet_id:first,sheet_name:'Sheet 1',sheet_order:0,sheet_hidden:false}];},
  async traineeSheetAction(owner,sheet,action,options={}){const first='00000000-0000-0000-0000-000000000001',key=sheet===first?owner:owner+':'+sheet;if(!previewSheets.has(owner)&&![...previewSheets.keys()].some(k=>k.startsWith(owner+':')))previewSheets.set(owner,{cells:[],version:1,sheet_name:'Sheet 1',sheet_order:0});const items=await this.listTraineeSheets(owner);if(['create','copy'].includes(action)){const id=crypto.randomUUID(),old=previewSheets.get(key);if(action==='copy'&&!old)throw Error('NOT_FOUND');previewSheets.set(owner+':'+id,{cells:action==='copy'?JSON.parse(JSON.stringify(old.cells)):[],format:action==='copy'?JSON.parse(JSON.stringify(old.format||{})):{},version:1,sheet_name:options.name||'Sheet '+(items.length+1),sheet_order:options.order??items.length});return id;}const old=previewSheets.get(key);if(!old)throw Error('NOT_FOUND');if(['delete','hide'].includes(action)&&!items.some(x=>x.sheet_id!==sheet&&!x.sheet_hidden))throw Error('LAST_VISIBLE_WORKSHEET');if(action==='delete')previewSheets.delete(key);else{if(action==='rename')old.sheet_name=options.name;if(action==='move')old.sheet_order=options.order;if(action==='color')old.tab_color=options.color;if(['hide','show'].includes(action))old.sheet_hidden=action==='hide';old.version++;}return sheet;},
  async readTrainees(owner,sheet='00000000-0000-0000-0000-000000000001'){if(window.previewReadError)throw Error('NETWORK');const key=sheet==='00000000-0000-0000-0000-000000000001'?owner:owner+':'+sheet;return JSON.parse(JSON.stringify(previewSheets.get(key)||{cells:[],version:0}));},
  async saveTrainees(owner,cells,version,format,sheet='00000000-0000-0000-0000-000000000001'){
    if(window.previewDelay)await new Promise(resolve=>setTimeout(resolve,window.previewDelay));
    if(window.previewSaveError)throw Error(window.previewSaveError);
    const key=sheet==='00000000-0000-0000-0000-000000000001'?owner:owner+':'+sheet,old=previewSheets.get(key)||{version:0};if(old.version!==version)throw Error('CONFLICT');
    previewSheets.set(key,{...old,cells:JSON.parse(JSON.stringify(cells)),format:JSON.parse(JSON.stringify(format||{})),version:version+1});return version+1;
  },
  async assignCodes(owner,items){for(const item of items){const row=previewCodes.find(r=>r.code===item.code);if(row.version!==item.version)throw Error('CONFLICT');row.owner_id=owner;row.version++;}},
  async saveVoucherName(code,name){state.voucherNames||={};state.voucherNames[code]=name;const old=previewCodes.find(x=>x.code===code);if(old)old.trainee_name=name;renderCodeGrid();return true;},
  async claimTraineeCode(category,owner,name=''){const code=(state.codesByCategory[category]||[]).find(code=>!state.usedCodes[code]);if(!code)throw Error('NO_CODE');state.usedCodes[code]=todayStr();state.voucherNames||={};state.voucherNames[code]=name;renderCodeGrid();return code;},
  persist:async()=>true,
  copyCode:async()=>{showToast('معاينة تصميم فقط — لم يتم نسخ أو حجز أي كود');return false;},
  decorate:()=>{},
  translateUi(){
    document.getElementById('cloud-status').textContent=currentLang==='ar'?'هذه الصفحة غير متصلة بقاعدة البيانات':'This page is not connected to the database';
    document.getElementById('auth-message').textContent=t('authAccessHelp');
  },
  async boot(){
    document.getElementById('startup-screen').hidden=true;
    document.getElementById('auth-box').hidden=false;
    if(location.search.includes('auth')){applyLanguage();return;}
    const categories=['Foundation','Master','BIS','CYBP','Corporate'];
    state={codesByCategory:{},usedCodes:{},codeNotes:{},categoryOrder:categories,keycodeOverrides:{},keycodeOrder:{},dateColors:{},settings:{},uiLang:currentLang};
    categories.forEach((cat,index)=>{const key=getLinkedCodesCat(cat);state.codesByCategory[key]=Array.from({length:index?4:12},(_,i)=>'DEMO-'+String(index+1)+'-'+String(i+1).padStart(4,'0'));});
    state.usedCodes['DEMO-1-0002']='20/09/2026';state.usedCodes['DEMO-1-0004']='21/09/2026';state.usedCodes['DEMO-1-0006']='21/09/2026';state.codeNotes['DEMO-1-0002']='ملاحظة تجريبية';
    DEFAULT_KEYCODES=[{title:'Sales',lang:'Arabic',code:'demo-sales',category:'Foundation'},{title:'Customer Service',lang:'Arabic',code:'demo-service',category:'Foundation'},{title:'Leadership',lang:'English',code:'demo-lead',category:'Foundation'},{title:'Project Management',lang:'Arabic',code:'demo-project',category:'Master'},{title:'Marketing',lang:'English',code:'demo-marketing',category:'Master'},{title:'Artificial Intelligence',lang:'Arabic',code:'demo-ai',category:'BIS'},{title:'CYBP',lang:'Arabic',code:'demo-cybp',category:'CYBP'},{title:'Human Resources',lang:'Arabic',code:'demo-hr',category:'Corporate'}];
    activeCategory='Foundation-100';
    document.getElementById('app').classList.add('workspace-restoring');
    document.getElementById('auth-box').hidden=true;document.getElementById('app').hidden=false;document.getElementById('cloud-tools').hidden=false;
    document.getElementById('settings-tab-inventory').hidden=false;
    document.getElementById('cred-account-val').textContent='DEMO-ACCOUNT';document.getElementById('cred-password-val').textContent='Demo-only-2026';
    ['sign-out','add-member','import-legacy','export-data'].forEach(id=>document.getElementById(id)?.addEventListener('click',()=>showToast('معاينة تصميم — الإجراء غير متاح هنا')));
    applyLanguage();
    try{await restoreWorkspaceView();}finally{document.getElementById('app').classList.remove('workspace-restoring');}
  }
};`;
http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/trainflow-prometric.zip'){res.setHeader('Content-Type','application/zip');return res.end(fs.readFileSync(path.join(__dirname,'../dist/trainflow-prometric.zip')));}
  if(pathname==='/exceljs-4.4.0.min.js'){res.setHeader('Content-Type','text/javascript');return res.end(fs.readFileSync(require.resolve('exceljs/dist/exceljs.min.js')));}
  if(['/codes-export.js','/voucher-names.js','/prometric-core.js','/prometric-registration.js','/certificate-name.js','/trainees.js','/trainees-excel.js','/trainees-borders.js','/trainees-sheets.js','/trainees-core.js','/trainees-xlsx.js','/trainees-files.js','/trainees-xlsx-worker.js','/trainees.css','/ops-ui.js','/trainee-reports.js','/session-policy.js'].includes(pathname)){
    res.setHeader('Content-Type',pathname.endsWith('.css')?'text/css':'text/javascript');
    return res.end(fs.readFileSync(path.join(__dirname,'..',pathname.slice(1))));
  }
  if(pathname==='/google-reports.gs'){res.setHeader('Content-Type','text/plain; charset=utf-8');return res.end(fs.readFileSync(path.join(__dirname,'../tools/google-reports.gs')));}
  if(pathname!=='/'){res.writeHead(404);return res.end();}
  let html=fs.readFileSync(path.join(__dirname,'../trainflow.html'),'utf8');
  html=html.replace(/<script src="https:\/\/cdn.jsdelivr.net[^>]+><\/script>/,'').replace('<script src="cloud.js"></script>','<script>'+mock+'</script>');
  res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(html);
}).listen(Number(process.env.IBTA_PREVIEW_PORT)||4174,'127.0.0.1',()=>console.log('Design-only preview ready'));
