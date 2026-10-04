/* Row matching for confirmed Prometric registrations. No browser or network APIs. */
(function(root){
  'use strict';
  const MAX_ITEMS=5000;
  const normalized=value=>String(value||'').normalize('NFKC').trim().replace(/\s+/g,' ');
  function fingerprint(row){return JSON.stringify([1,3,4,5,7].map(c=>normalized(row?.[c]).toLocaleLowerCase()));}
  function prepare(rows,indices){
    const items=[],skipped=[],identities=new Map();
    for(let r=0;r<rows.length;r++){const key=fingerprint(rows[r]);identities.set(key,(identities.get(key)||0)+1);}
    for(const index of new Set(indices)){
      const row=rows[index];if(!row?.some(Boolean))continue;
      const name=normalized(row[3]),email=normalized(row[1]);let reason='';
      if(row[9]?.trim()||row[10]?.trim())reason='existing';
      else if(!/^[A-Za-z][A-Za-z\s.,'’()-]*$/.test(name)||name.split(/\s+/).filter(part=>/[A-Za-z]/.test(part)).length<2)reason='name';
      else if(!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email))reason='email';
      else if(identities.get(fingerprint(row))!==1)reason='duplicate';
      if(reason){skipped.push({row:index,name,email,reason});continue;}
      items.push({id:crypto.randomUUID(),row:index,name,email,fingerprint:fingerprint(row)});
    }
    if(items.length>MAX_ITEMS)throw Error('LIMIT');
    return {items,skipped};
  }
  function indexRows(rows){const map=new Map();for(let r=0;r<rows.length;r++){const key=fingerprint(rows[r]);if(!map.has(key))map.set(key,[]);map.get(key).push(r);}return map;}
  function locate(rows,item,index=indexRows(rows)){
    const matches=index.get(item.fingerprint)||[];
    if(matches.length!==1)return {reason:matches.length?'duplicate':'missing'};
    const row=matches[0],values=rows[row];
    if(values[9]?.trim()||values[10]?.trim())return values[9]===item.username&&values[10]===item.password?{row,alreadySaved:true}:{row,reason:'existing'};
    return {row};
  }
  const api={MAX_ITEMS,fingerprint,prepare,locate,indexRows};root.PrometricData=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
