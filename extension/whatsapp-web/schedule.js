/* Pure time/validation functions shared by the service worker and tests. */
const WebSchedule=(()=>{
  const DAY=86400000,SHIFT=10800000;
  function day(now=Date.now()){return new Date(now+SHIFT).toISOString().slice(0,10);}
  function at(time,now=Date.now()){const [h,m]=time.split(':').map(Number);const date=new Date(now+SHIFT);return Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate(),h-3,m);}
  function next(time,now=Date.now()){const due=at(time,now);return due>now?due:due+DAY;}
  function validConfig(c){return c&&typeof c.enabled==='boolean'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(c.time)&&(/^\d{8,15}$/.test(c.recipient)||!c.enabled&&c.recipient==='')&&typeof c.owner==='string'&&c.owner.length>0&&c.owner.length<100;}
  function validSnapshot(s,c,now=Date.now()){return s&&s.owner===c.owner&&s.recipient===c.recipient&&s.time===c.time&&s.day===day(now)&&Number.isFinite(s.at)&&now-s.at>=0&&now-s.at<300000&&typeof s.message==='string'&&s.message.length>0&&s.message.length<=8000;}
  function due(c,now=Date.now()){const diff=now-at(c.time,now);return c.enabled&&diff>=0&&diff<=120000;}
  const api={day,at,next,validConfig,validSnapshot,due};if(typeof module!=='undefined')module.exports=api;return api;
})();
