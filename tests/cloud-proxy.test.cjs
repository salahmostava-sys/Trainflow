const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');

test('an unavailable API never retries a database mutation directly', async()=>{
  const requests=[];
  let sdkFetch;
  const context=vm.createContext({URL,Request,Response,console,currentLang:'en',t:key=>key,sessionStorage:{},localStorage:{getItem:()=>null},
    location:{origin:'https://workspace.invalid'},
    document:{getElementById:()=>({addEventListener(){}}),addEventListener(){}},setInterval(){},
    window:{addEventListener(){},supabase:{createClient(_url,_key,options){sdkFetch=options.global.fetch;return {auth:{onAuthStateChange(){},getSession:async()=>({data:{session:null}})}};}}},
    fetch:async(input,init)=>{requests.push({url:String(input),init});return new Response('',{status:503});},
  });
  vm.runInContext(fs.readFileSync(require.resolve('../cloud.js'),'utf8'),context);
  // Boot captures the real SDK fetch adapter through the public SDK boundary.
  await vm.runInContext('Cloud.boot()',context);
  for(const status of [404,405,502,503]){
    requests.length=0;
    context.fetch=async(input,init)=>{requests.push({url:String(input),init});return new Response('',{status});};
    const init={method:'POST',headers:{Authorization:'Bearer caller'},body:'{"changes":[]}'};
    const response=await sdkFetch('https://xaeffreqwtozsgqajzpc.supabase.co/rest/v1/rpc/ibta_apply_changes',init);
    assert.equal(response.status,status);
    assert.equal(requests.length,1);
    assert.equal(requests[0].url,'https://workspace.invalid/api/data/rpc/ibta_apply_changes');
    assert.equal(requests[0].init,init,'The caller JWT and mutation body are forwarded unchanged');
  }
});
