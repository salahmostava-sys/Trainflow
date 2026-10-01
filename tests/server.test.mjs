import assert from 'node:assert/strict';
import {handleApi} from '../server/worker.mjs';
let role='operator',active=true,calls=[];
const upstream=async(url,options)=>{assert.equal(options.redirect,'manual');calls.push({url,options});if(url.includes('/auth/'))return Response.json({id:'user',email:'user@example.invalid'});if(url.includes('ibta_members?select=role'))return Response.json([{role,active,user_id:'user',email:'user@example.invalid'}]);return Response.json([{code:'VISIBLE'}]);};
const request=(path,options={})=>new Request('https://site.invalid/api/data/'+path,{headers:{Authorization:'Bearer valid.jwt',...options.headers},...options});
assert.equal((await handleApi(new Request('https://site.invalid/api/data/ibta_codes'),{},upstream)).status,401);
assert.equal(calls.length,0);
assert.equal((await handleApi(request('unknown'),{},upstream)).status,404);
let response=await handleApi(request('ibta_codes?select=code'),{},upstream);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(calls.at(-1).options.headers.get('Authorization'),'Bearer valid.jwt');
active=false;assert.equal((await handleApi(request('ibta_codes'),{},upstream)).status,403);active=true;
const post={method:'POST',headers:{Authorization:'Bearer valid.jwt','Content-Type':'application/json'},body:JSON.stringify({changes:[],settings_payload:{}})};
assert.equal((await handleApi(request('rpc/ibta_apply_changes',post),{},upstream)).status,403);
assert.equal((await handleApi(request('rpc/ibta_restore_backup',post),{},upstream)).status,403);
role='admin';assert.equal((await handleApi(request('rpc/ibta_restore_backup',post),{},upstream)).status,200);
assert.equal((await handleApi(request('ibta_codes',{headers:{Authorization:'Bearer valid.jwt',Origin:'https://evil.invalid'}}),{},upstream)).status,403);
assert.equal((await handleApi(request('rpc/ibta_claim_code',{...post,body:'{'}),{},upstream)).status,400);
assert.equal((await handleApi(request('rpc/ibta_claim_code',{...post,body:JSON.stringify({target_code:'TEST',expected_version:1,use_date:'01/01/1900'})}),{},upstream)).status,200);
assert.notEqual(JSON.parse(calls.at(-1).options.body).use_date,'01/01/1900');
assert.equal((await handleApi(request('ibta_codes'),{},async()=>Response.json({}, {status:401}))).status,401);
console.log('PASS: server authentication, inactive membership, admin permissions, JWT forwarding, routes, origin, malformed JSON and no-cache');
for(const status of [204,205]){
  const emptyStream=async(url,options)=>url.includes('/auth/')||url.includes('ibta_members?select=role')?upstream(url,options):{status,headers:new Headers(),body:new ReadableStream({start(c){c.close();}})};
  const response=await handleApi(request('rpc/ibta_restore_backup',post),{},emptyStream);
  assert.equal(response.status,status);assert.equal(response.body,null);
}
console.log('PASS: empty database responses do not become SERVER_UNAVAILABLE');
