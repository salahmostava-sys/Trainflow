/* Daily 17:00 Asia/Riyadh cutoff. Decode only after server-side Auth verification. */
(function(root){
  const DAY=86400000;
  function expiresAt(token){
    try{
      const part=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
      const claims=JSON.parse(atob(part.padEnd(Math.ceil(part.length/4)*4,'=')));
      const times=(claims.amr||[]).filter(m=>['password','oauth','otp','sso/saml','magiclink','email/signup','invite','recovery'].includes(m.method)&&Number.isFinite(m.timestamp)&&m.timestamp>0).map(m=>m.timestamp*1000);
      if(!times.length)return 0;
      const signedIn=Math.max(...times),day=new Date(signedIn);
      let cutoff=Date.UTC(day.getUTCFullYear(),day.getUTCMonth(),day.getUTCDate(),14);
      if(signedIn>=cutoff)cutoff+=DAY;
      return cutoff;
    }catch{return 0;}
  }
  const api={expiresAt,expired:(token,now=Date.now())=>now>=expiresAt(token)};
  root.SessionPolicy=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
