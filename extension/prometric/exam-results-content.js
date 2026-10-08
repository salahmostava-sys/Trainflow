/* Isolated extension world: login and score retrieval never start an exam. */
(()=>{
  'use strict';let running=false;
  const send=payload=>chrome.runtime.sendMessage(payload);
  async function report(context,payload){await send({action:'ibtaExamRecord',run:context.run,id:context.id,...payload});}
  async function inspect(){
    if(running)return;running=true;
    try{
      const context=await send({action:'ibtaExamContext'});if(!context?.active)return;
      const profile=document.getElementById('UserProfileHyperLink');
      if(context.stage==='login')return await login(context,profile);
      if(!profile||profile.textContent.trim().toLowerCase()!==context.username.toLowerCase())return await report(context,{error:'WRONG_ACCOUNT'});
      const extracted=PrometricScores.report(document,context.examTitles,context.examLanguage);
      await report(context,extracted.error?extracted:{rawScore:(extracted.result==='ناجح'?'Pass':'Fail')+' ('+extracted.score+')',examTitle:extracted.examTitle,testDate:extracted.testDate});
    }catch(error){console.warn('TrainFlow results connection interrupted:',error.message);}finally{running=false;}
  }
  async function login(context,profile){
    if(profile){
      if(profile.textContent.trim().toLowerCase()===context.username.toLowerCase())return report(context,{loggedIn:true,username:profile.textContent.trim()});
      const signOut=document.getElementById('SignOutLinkButton');if(signOut){signOut.click();return;}return report(context,{error:'WRONG_ACCOUNT'});
    }
    const username=document.getElementById('PageContent_UserNameTextbox_txtTextBox'),password=document.getElementById('PageContent_PasswordTextbox_txtTextBox'),signIn=document.getElementById('PageContent_SignInButton');
    if(!username||!password||!signIn)return report(context,{error:'LOGIN_FAILED'});
    const attempt=context.run+':'+context.id;
    if(sessionStorage.getItem('trainflow-score-login')===attempt)return report(context,{error:'LOGIN_FAILED'});
    sessionStorage.setItem('trainflow-score-login',attempt);username.value=context.username;password.value=context.password;
    for(const input of [username,password]){input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}signIn.click();
  }
  inspect();
})();
