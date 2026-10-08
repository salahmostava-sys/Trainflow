/* TrainFlow page bridge; database sessions never leave the app. */
(()=>{
  'use strict';const ORIGIN='https://trainf.vercel.app';
  const post=data=>window.postMessage({channel:'IBTA_PROMETRIC_EXTENSION',...data},ORIGIN);
  const postExam=data=>window.postMessage({channel:'IBTA_PROMETRIC_EXAM_EXTENSION',...data},ORIGIN);
  window.addEventListener('message',async event=>{
    const data=event.data;
    if(event.source===window&&event.origin===ORIGIN&&data?.channel==='IBTA_PROMETRIC_EXAM_APP'&&typeof data.id==='string'&&data.id.length<=80&&['PING','START','ACK','DISMISS','RECOVER','STOP'].includes(data.payload?.type)){
      try{postExam({id:data.id,payload:await chrome.runtime.sendMessage({action:'ibtaExamRequest',payload:data.payload})});}catch{postExam({id:data.id,payload:{ok:false,error:'DISCONNECTED'}});}return;
    }
    if(event.source!==window||event.origin!==ORIGIN||data?.channel!=='IBTA_PROMETRIC_APP'||typeof data.id!=='string'||data.id.length>80)return;
    if(!['PING','START','ACK','DISMISS','RECOVER','STOP'].includes(data.payload?.type))return;
    try{const payload=await chrome.runtime.sendMessage({action:'ibtaRequest',payload:data.payload});post({id:data.id,payload});}
    catch{post({id:data.id,payload:{ok:false,error:'DISCONNECTED'}});}
  });
  chrome.runtime.onMessage.addListener((data,sender,reply)=>{if(data?.action==='ibtaChanged'){post({changed:true});reply({ok:true});}if(data?.action==='ibtaExamChanged'){postExam({changed:true});reply({ok:true});}});
})();
