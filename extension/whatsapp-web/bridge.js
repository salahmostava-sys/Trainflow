(() => {
  const ORIGIN='https://trainf.vercel.app';
  const post=data=>window.postMessage({channel:'IBTA_WEB_EXTENSION',...data},ORIGIN);
  window.addEventListener('message',async event=>{
    if(event.source!==window||event.origin!==ORIGIN||event.data?.channel!=='IBTA_WEB_APP')return;
    const data=event.data;
    if(!['PING','CONFIG','SNAPSHOT'].includes(data.type))return;
    try{const result=await chrome.runtime.sendMessage({type:data.type,payload:data.payload});post({type:'STATE',reason:data.type,payload:result});}catch{post({type:'DISCONNECTED'});}
  });
  chrome.runtime.onMessage.addListener((data,sender,reply)=>{
    if(data.type==='REQUEST_SNAPSHOT'){post({type:'REQUEST_SNAPSHOT'});reply({requested:true});}
    if(data.type==='STATE'){post({type:'STATE',reason:'STATUS',payload:data.payload});reply({received:true});}
  });
  chrome.runtime.sendMessage({type:'PING'}).then(payload=>post({type:'STATE',reason:'PING',payload})).catch(()=>{});
})();
