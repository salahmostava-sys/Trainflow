/* Uses only the exact message prefilled by WhatsApp's phone/text deep link. */
(async()=>{
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  let job;
  for(let i=0;i<10;i++){try{job=(await chrome.runtime.sendMessage({type:'GET_JOB'}))?.job;}catch{return;}if(job)break;await sleep(500);}
  if(!job)return;
  const normalized=value=>String(value||'').replace(/\r\n/g,'\n').replace(/\u00a0/g,' ').trim();
  const result=(state,error='')=>chrome.runtime.sendMessage({type:'RESULT',id:job.id,state,error}).catch(()=>{});
  const deadline=Math.min(job.due+115000,Date.now()+85000);
  let composer,send;
  while(Date.now()<deadline){
    composer=document.querySelector('#main footer [contenteditable="true"][role="textbox"]');
    send=[...document.querySelectorAll('#main footer [role="button"],#main footer button')].find(el=>['Send','Send message','Send (Enter)','إرسال','إرسال رسالة','Enviar','Envoyer'].includes(el.getAttribute('aria-label'))||el.querySelector('[data-icon="send"],[data-icon="wds-ic-send-filled"]'));
    const blocked=[...document.querySelectorAll('[role="dialog"]')].some(el=>el.getClientRects().length>0);
    if(!blocked&&composer&&send&&normalized(composer.innerText)===normalized(job.message))break;
    await sleep(500);
  }
  if(!composer||!send)return result('failed','WHATSAPP_NOT_READY');
  if(normalized(composer.innerText)!==normalized(job.message))return result('failed','MESSAGE_MISMATCH');
  if([...document.querySelectorAll('[role="dialog"]')].some(el=>el.getClientRects().length>0))return result('failed','WHATSAPP_NOT_READY');
  let approval;try{approval=await chrome.runtime.sendMessage({type:'CAN_SEND',id:job.id});}catch{return;}
  if(!approval?.allowed)return;
  // Recheck after approval. Never overwrite a user's draft or press Enter blindly.
  if(normalized(composer.innerText)!==normalized(job.message))return result('failed','MESSAGE_MISMATCH');
  const before=new Set(document.querySelectorAll('#main .message-out'));send.click();
  while(Date.now()<deadline){
    const outgoing=[...document.querySelectorAll('#main .message-out')].find(el=>!before.has(el)&&normalized(el.innerText).includes(normalized(job.message)));
    if(outgoing&&normalized(composer.innerText)==='')return result('sent');
    await sleep(500);
  }
  return result('unknown','SEND_UNCONFIRMED');
})();
