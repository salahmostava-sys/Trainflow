/* Only change metadata travels over Realtime; data is read through the authenticated API. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.WorkspaceLive=api;})(globalThis,()=>{
  'use strict';
  let connectionId=0;
  function connect({client,owner,onRefresh,onStatus}){
    const pending=new Set();let timer,running=false,closed=false,connectionStatus='connecting';
    const channel=client.channel('trainflow-live-'+owner+'-'+(++connectionId));
    function schedule(delay=100){if(!closed&&!running&&!timer&&pending.size)timer=setTimeout(flush,delay);}
    function queue(scope){if(closed)return;pending.add(scope);schedule();}
    async function flush(){
      timer=null;if(closed)return;running=true;let retryDelay=1000;
      const scopes=[...pending];pending.clear();
      for(const scope of scopes){
        if(closed)break;
        try{if(!await onRefresh(scope)&&!closed){pending.add(scope);onStatus('pending');}}
        catch(error){if(!closed){pending.add(scope);retryDelay=5000;onStatus('retrying');console.warn('TrainFlow live refresh failed:',error.message);}}
      }
      running=false;if(!closed&&!pending.size)onStatus(connectionStatus);schedule(retryDelay);
    }
    channel.on('postgres_changes',{event:'*',schema:'public',table:'ibta_live_changes'},event=>{
      if(event.new?.key)queue(event.new.owner_id||'workspace');
    }).subscribe(status=>{
      if(closed)return;
      connectionStatus=status==='SUBSCRIBED'?'connected':'reconnecting';onStatus(connectionStatus);
      // Catch up after initial connection or a gap without relying on missed socket events.
      if(status==='SUBSCRIBED'){queue('workspace');queue('sheets');}
    });
    return {wake:()=>{queue('workspace');queue('sheets');},close:()=>{
      closed=true;clearTimeout(timer);pending.clear();void client.removeChannel(channel);
    }};
  }
  return {connect};
});
