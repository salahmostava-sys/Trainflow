/* Isolated extension world: login and score retrieval never start an exam. */
(()=>{
  'use strict';let running=false,inspectionTimer,loginSubmitted=false,signOutSubmitted=false;
  const send=payload=>chrome.runtime.sendMessage(payload);
  const attemptKey=context=>context.run+':'+context.id;
  const accountName=()=>document.getElementById('UserProfileHyperLink')?.textContent.trim()||'';
  async function report(context,payload){return send({action:'ibtaExamRecord',run:context.run,id:context.id,page:location.pathname,...payload});}
  function missingSession(){return /\/SessionTimedout\.aspx$/i.test(location.pathname)||!!document.getElementById('PageContent_LoginButton')||!!document.getElementById('PageContent_UserNameTextbox_txtTextBox');}
  async function inspect(){
    if(running)return;running=true;
    try{
      const context=await send({action:'ibtaExamContext'});if(!context?.active)return;
      if(context.stage==='login')return await login(context);
      if(!accountName())return await report(context,{error:missingSession()?'SESSION_EXPIRED':'REPORT_UNAVAILABLE'});
      if(accountName().toLowerCase()!==context.username.toLowerCase())return await report(context,{error:'WRONG_ACCOUNT'});
      await navigateScores(context);
    }catch(error){console.warn('TrainFlow results connection interrupted:',error.message);}finally{running=false;}
  }
  async function login(context){
    if(accountName()){
      if(!/\/Login\.aspx$/i.test(location.pathname)&&accountName().toLowerCase()===context.username.toLowerCase()){
        const confirmed=await report(context,{loggedIn:true,username:accountName()});
        if(confirmed?.ok)await navigateScores(context);return;
      }
      return signOut(context);
    }
    const expiredLogin=document.getElementById('PageContent_LoginButton');if(expiredLogin){expiredLogin.click();return;}
    const username=document.getElementById('PageContent_UserNameTextbox_txtTextBox'),password=document.getElementById('PageContent_PasswordTextbox_txtTextBox'),signIn=document.getElementById('PageContent_SignInButton');
    if(!username||!password||!signIn)return report(context,{error:'LOGIN_FAILED'});
    if(loginSubmitted)return;
    const attempt=attemptKey(context);
    if(sessionStorage.getItem('trainflow-score-login')===attempt)return report(context,{error:'LOGIN_FAILED'});
    loginSubmitted=true;sessionStorage.setItem('trainflow-score-login',attempt);username.value=context.username;password.value=context.password;
    for(const input of [username,password]){input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}signIn.click();
  }
  async function signOut(context){
    if(signOutSubmitted)return;
    const button=document.getElementById('SignOutLinkButton'),attempt=attemptKey(context),previous=sessionStorage.getItem('trainflow-score-signout');
    const count=previous===attempt+':1'?1:previous===attempt+':2'?2:0;
    if(!button||count>=2)return report(context,{error:'WRONG_ACCOUNT'});
    signOutSubmitted=true;sessionStorage.setItem('trainflow-score-signout',attempt+':'+(count+1));sessionStorage.removeItem('trainflow-score-login');button.click();
  }
  async function navigateScores(context){
    if(document.getElementById('PageContent_ManageReviewScoresGridView_gridView')){
      const extracted=PrometricScores.report(document,context.examTitles,context.examLanguage);
      return report(context,extracted.error?extracted:{rawScore:(extracted.result==='ناجح'?'Pass':'Fail')+' ('+extracted.score+')',examTitle:extracted.examTitle,testDate:extracted.testDate});
    }
    const controls=[...document.querySelectorAll('a[href],button,input[type="button"],input[type="submit"],[role="button"]')];
    const caption=control=>(control.getAttribute('aria-label')||(control.tagName==='INPUT'?control.value:control.textContent)).replace(/\s+/g,' ').trim().toLowerCase();
    const target=controls.find(control=>caption(control)==='history')||controls.find(control=>caption(control)==='review scores')||[...document.querySelectorAll('[id^="NavigationMenu"] a[href]')].find(link=>caption(link)==='take test');
    if(!target)return report(context,{error:'REPORT_UNAVAILABLE'});
    const navigation=attemptKey(context)+':'+location.pathname+':'+caption(target);
    if(sessionStorage.getItem('trainflow-score-navigation')===navigation)return;
    sessionStorage.setItem('trainflow-score-navigation',navigation);target.click();
  }
  new MutationObserver(()=>{clearTimeout(inspectionTimer);inspectionTimer=setTimeout(inspect,100);}).observe(document.body,{childList:true,subtree:true});
  inspect();
})();
