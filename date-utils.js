/* Shared calendar-date parsing for TrainFlow. Loaded as a plain browser script
   before workspace.js, trainees.js and trainee-reports.js; also a CommonJS module
   for Node tests. The canonical stored format is DD/MM/YYYY. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.TrainflowDates=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const RIYADH='Asia/Riyadh';
  const pad=n=>String(n).padStart(2,'0');
  // Arabic-Indic (٠-٩, U+0660) and Persian (۰-۹, U+06F0) digits become ASCII;
  // bidi marks that RTL editors insert around dates are removed.
  function westernDigits(value){
    return String(value??'')
      .replace(/[\u0660-\u0669]/g,d=>String(d.charCodeAt(0)-0x0660))
      .replace(/[\u06F0-\u06F9]/g,d=>String(d.charCodeAt(0)-0x06F0))
      .replace(/[\u200e\u200f\u061c]/g,'');
  }
  function isValidDate(year,month,day){
    if(![year,month,day].every(Number.isInteger)||year<1||month<1||month>12||day<1)return false;
    const date=new Date(Date.UTC(2000,month-1,day));
    date.setUTCFullYear(year);
    return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day;
  }
  const STRICT_ISO=/^(\d{4})([-/.])(\d{1,2})\2(\d{1,2})$/;
  const STRICT_LOCAL=/^(\d{1,2})([-/.])(\d{1,2})\2(\d{4})$/;
  const EMBEDDED_ISO=/(?:^|\D)(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?!\d)/;
  const EMBEDDED_LOCAL=/(?:^|\D)(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?!\d)/;
  /* Returns {day,month,year} for a real calendar date written as DD/MM/YYYY,
     D/M/YYYY or YYYY/MM/DD with '/', '-' or '.' separators, else null.
     With {embedded:true} the date may be surrounded by other text. */
  function parse(value,{embedded=false}={}){
    if(value==null)return null;
    const text=westernDigits(value).trim();
    let year,month,day;
    if(embedded){
      const iso=text.match(EMBEDDED_ISO),local=iso?null:text.match(EMBEDDED_LOCAL);
      if(iso)[year,month,day]=iso.slice(1).map(Number);
      else if(local)[day,month,year]=local.slice(1).map(Number);
      else return null;
    }else{
      const iso=text.match(STRICT_ISO),local=iso?null:text.match(STRICT_LOCAL);
      if(iso)[year,month,day]=[iso[1],iso[3],iso[4]].map(Number);
      else if(local)[day,month,year]=[local[1],local[3],local[4]].map(Number);
      else return null;
    }
    return isValidDate(year,month,day)?{day,month,year}:null;
  }
  const format=(day,month,year)=>pad(day)+'/'+pad(month)+'/'+year;
  const formatIso=(day,month,year)=>String(year).padStart(4,'0')+'-'+pad(month)+'-'+pad(day);
  function toDisplay(value,options){const d=parse(value,options);return d?format(d.day,d.month,d.year):null;}
  function toIso(value,options){const d=parse(value,options);return d?formatIso(d.day,d.month,d.year):null;}
  function dayNumber(value,options){const d=parse(value,options);return d?Date.UTC(d.year,d.month-1,d.day):0;}
  /* Calendar date in Asia/Riyadh for an instant (default: now). */
  function riyadhParts(instant=new Date()){
    const date=instant instanceof Date?instant:new Date(instant);
    if(Number.isNaN(date.getTime()))return null;
    const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:RIYADH,day:'2-digit',month:'2-digit',year:'numeric'})
      .formatToParts(date).map(part=>[part.type,part.value]));
    return {day:Number(parts.day),month:Number(parts.month),year:Number(parts.year)};
  }
  function riyadhToday(instant){const d=riyadhParts(instant);return d?format(d.day,d.month,d.year):'';}
  function riyadhIsoDate(instant){const d=riyadhParts(instant);return d?formatIso(d.day,d.month,d.year):'';}
  return Object.freeze({westernDigits,isValidDate,parse,format,formatIso,toDisplay,toIso,dayNumber,riyadhParts,riyadhToday,riyadhIsoDate,TIME_ZONE:RIYADH});
});
