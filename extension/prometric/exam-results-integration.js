/* Results belong to one sheet and app tab until their durable-save acknowledgment. */
const IbtaExamResults=(()=>{
  'use strict';
  const LOGIN='https://tcnet1.prometric.com/Login.aspx?ClientNameSingleSite=ibtamea';
  const text=(value,max)=>typeof value==='string'&&value.length>0&&value.length<=max;
  const origin=sender=>{try{return new URL(sender.url).origin;}catch{return '';}};
  const appSender=sender=>sender?.id===chrome.runtime.id&&sender.frameId===0&&Number.isInteger(sender.tab?.id)&&origin(sender)==='https://trainf.vercel.app';
  const same=(run,payload,sender)=>run&&run.owner===payload.owner&&run.client===payload.client&&run.appTab===sender.tab.id;
  const active=run=>!!run?.items.some(account=>['pending','done'].includes(account.status));
  const current=run=>run?.items.find(account=>account.status==='pending');
  async function storedRun(){return (await chrome.storage.local.get('ibtaExamRun')).ibtaExamRun;}
  async function status(payload,sender){
    const run=await storedRun(),registration=await chrome.storage.local.get(['isRunning','singleRunning','queue']);
    if(current(run)&&run.started&&Date.now()-run.started>120000)await cancel(run,'TIMEOUT');
    const visible=same(run,payload,sender)?{...run,items:run.items.map(({username,password,...account})=>account)}:null;
    return {ok:true,capabilities:{examResults:true},version:chrome.runtime.getManifest().version,busy:!!(active(run)||registration.isRunning||registration.singleRunning||registration.queue?.some(account=>!account.status||account.status==='pending')||await IbtaRegistration.reserved()),recoverable:!!(run&&run.owner===payload.owner&&!same(run,payload,sender)),run:visible};
  }
  async function persist(run){
    await chrome.storage.local.set({ibtaExamRun:run});
    try{await chrome.tabs.sendMessage(run.appTab,{action:'ibtaExamChanged'},{frameId:0});}catch{/* A closed app tab can recover the stored results. */}
  }
  async function closeTab(run){
    const tab=run.examTab;run.examTab=null;await persist(run);
    if(Number.isInteger(tab)){try{await chrome.tabs.remove(tab);}catch{/* The user may already have closed it. */}}
  }
  async function advance(run){
    const account=current(run);
    if(!account){
      if(run.items.at(-1)?.status==='failed'&&Number.isInteger(run.examTab)){await persist(run);await chrome.tabs.update(run.examTab,{active:true});}
      else await closeTab(run);
      return;
    }
    run.stage='login';run.started=Date.now();
    if(Number.isInteger(run.examTab)){await persist(run);await chrome.tabs.update(run.examTab,{url:LOGIN});}
    else {const tab=await chrome.tabs.create({url:'about:blank',active:false});run.examTab=tab.id;await persist(run);await chrome.tabs.update(tab.id,{url:LOGIN,autoDiscardable:false});}
  }
  function accounts(items){
    if(!Array.isArray(items)||!items.length||items.length>5000)throw Error('INVALID_ROWS');
    const ids=new Set();return items.map(account=>{
      if(!account||!text(account.id,80)||ids.has(account.id)||!text(account.username,300)||!text(account.password,300)||!text(account.voucher,2000)||!text(account.fingerprint,12000)||!text(account.name,300)||!Number.isInteger(account.row)||account.row<0||account.row>=1000000||!/^[a-f0-9]{64}$/.test(account.credentialsHash||'')||!Array.isArray(account.examTitles)||!account.examTitles.length||account.examTitles.length>2||account.examTitles.some(title=>!text(title,2000)))throw Error('INVALID_ROWS');
      if(!['','Arabic','English'].includes(account.examLanguage||''))throw Error('INVALID_ROWS');
      ids.add(account.id);return {id:account.id,row:account.row,name:account.name,username:account.username,password:account.password,voucher:account.voucher,fingerprint:account.fingerprint,credentialsHash:account.credentialsHash,examTitles:account.examTitles,examLanguage:account.examLanguage||'',originalResult:String(account.originalResult||'').slice(0,2000),originalScore:String(account.originalScore||'').slice(0,2000),status:'pending'};
    });
  }
  async function start(payload,sender){
    const readiness=await status(payload,sender);if(readiness.busy)throw Error('BUSY');
    const selectedAccounts=accounts(payload.items);
    const previous=await storedRun();if(Number.isInteger(previous?.examTab))await closeTab(previous);
    const run={id:crypto.randomUUID(),owner:payload.owner,client:payload.client,appTab:sender.tab.id,items:selectedAccounts,examTab:null};
    await persist(run);
    try{await advance(run);}catch{await cancel(run,'START_FAILED');throw Error('START_FAILED');}
  }
  async function cancel(run,error){
    for(const account of run.items){delete account.username;delete account.password;if(account.status==='pending'){account.status='failed';account.error=error;}}
    await closeTab(run);
  }
  async function request(payload,sender){
    if(!appSender(sender)||!payload||!['PING','START','ACK','DISMISS','RECOVER','STOP'].includes(payload.type)||!text(payload.client,80)||!text(payload.owner,80))throw Error('FORBIDDEN');
    if(payload.type==='PING')return status(payload,sender);
    if(payload.type==='START'){await start(payload,sender);return status(payload,sender);}
    const run=await storedRun();
    if(payload.type==='RECOVER'){
      if(!run||run.owner!==payload.owner)throw Error('OUTDATED');
      if(run.appTab!==sender.tab.id){let tab;try{tab=await chrome.tabs.get(run.appTab);}catch{/* tab no longer exists */}if(tab)throw Error('ACTIVE_TAB');}
      run.client=payload.client;run.appTab=sender.tab.id;await persist(run);return status(payload,sender);
    }
    if(!same(run,payload,sender)||run.id!==payload.run)throw Error('OUTDATED');
    if(payload.type==='STOP')await cancel(run,'STOPPED');
    else {
      if(!Array.isArray(payload.ids)||payload.ids.length>5000||payload.ids.some(id=>!text(id,80)))throw Error('INVALID_ROWS');
      const ids=new Set(payload.ids);for(const account of run.items)if(ids.has(account.id)&&account.status==='done')account.status=payload.type==='ACK'?'saved':'reviewed';await persist(run);
    }
    return status(payload,sender);
  }
  async function context(sender){
    const run=await storedRun(),account=current(run);
    if(sender?.id!==chrome.runtime.id||sender.frameId!==0||origin(sender)!=='https://tcnet1.prometric.com'||sender.tab?.id!==run?.examTab||!account)return {ok:true,active:false};
    const documentAccount=run.documentAccounts?.[sender.documentId];
    if(documentAccount&&documentAccount!==account.id)return {ok:true,active:false};
    if(sender.documentId&&!documentAccount){run.documentAccounts={...run.documentAccounts,[sender.documentId]:account.id};await chrome.storage.local.set({ibtaExamRun:run});}
    if(Date.now()-run.started>120000){await finish(run,account,{error:'TIMEOUT'});return {ok:true,active:false};}
    return {ok:true,active:true,run:run.id,id:account.id,stage:run.stage,username:account.username,password:run.stage==='login'?account.password:undefined,examTitles:account.examTitles,examLanguage:account.examLanguage};
  }
  async function finish(run,account,report){
    delete account.username;delete account.password;
    if(report.error){account.status='failed';account.error=report.error;account.page=report.page;account.testDate=report.testDate||'';}
    else {account.status='done';Object.assign(account,report);}
    await persist(run);await advance(run);
  }
  async function record(message,sender){
    const trusted=await context(sender);if(!trusted.active||trusted.run!==message.run||trusted.id!==message.id)throw Error('FORBIDDEN');
    const run=await storedRun(),account=current(run);
    if(message.error){if(!['LOGIN_FAILED','WRONG_ACCOUNT','SESSION_EXPIRED','REPORT_UNAVAILABLE','PAGINATED_RESULTS','AMBIGUOUS_RESULTS','NO_MATCHING_RESULT','UNCONFIRMED_RESULT'].includes(message.error))throw Error('INVALID_RESULT');await finish(run,account,{error:message.error,page:String(message.page||'').slice(0,200),testDate:message.error==='AMBIGUOUS_RESULTS'?String(message.testDate||'').slice(0,200):''});}
    else if(message.loggedIn===true&&run.stage==='login'){
      if(String(message.username).toLowerCase()!==account.username.toLowerCase())throw Error('WRONG_ACCOUNT');run.stage='scores';await persist(run);
    }else {
      const parsed=PrometricScores.outcome(message.rawScore);
      if(run.stage!=='scores'||new URL(sender.url).pathname!=='/Candidate/ManageReviewScores.aspx'||!parsed||!text(message.examTitle,2000)||!PrometricScores.matchesTitle(message.examTitle,account.examTitles,account.examLanguage))throw Error('INVALID_RESULT');
      await finish(run,account,{...parsed,examTitle:message.examTitle,testDate:String(message.testDate||'').slice(0,200)});
    }
    return {ok:true};
  }
  async function tabClosed(tab){const run=await storedRun();if(run?.examTab===tab)await cancel(run,'TAB_CLOSED');}
  return {request,context,record,tabClosed,reserved:async()=>active(await storedRun())};
})();
