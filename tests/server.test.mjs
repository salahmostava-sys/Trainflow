import assert from 'node:assert/strict';
import {handleApi,handleNextApi} from '../server/worker.mjs';
let role='operator',active=true,calls=[],userEmail='user@example.invalid';
const token=timestamp=>'header.'+Buffer.from(JSON.stringify({amr:[{method:'password',timestamp}]})).toString('base64url')+'.signature';
const bearer='Bearer '+token(Math.floor(Date.now()/1000));
const upstream=async(url,options)=>{assert.equal(options.redirect,'manual');calls.push({url,options});if(url.includes('/auth/'))return Response.json({id:'user',email:userEmail});if(url.includes('ibta_members?select=role'))return Response.json([{role,active,user_id:'user',email:userEmail}]);return Response.json([{code:'VISIBLE'}]);};
const request=(path,options={})=>new Request('https://site.invalid/api/data/'+path,{...options,headers:{Authorization:bearer,...options.headers}});
assert.equal((await handleApi(new Request('https://site.invalid/api/data/ibta_codes'),{},upstream)).status,401);
assert.equal(calls.length,0);
assert.equal((await handleApi(request('unknown'),{},upstream)).status,404);
let response=await handleApi(request('ibta_codes?select=code'),{},upstream);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(calls.at(-1).options.headers.get('Authorization'),bearer);
active=false;assert.equal((await handleApi(request('ibta_codes'),{},upstream)).status,403);active=true;
const post={method:'POST',headers:{Authorization:bearer,Origin:'https://site.invalid','Content-Type':'application/json'},body:JSON.stringify({changes:[],settings_payload:{}})};
assert.equal((await handleApi(request('rpc/ibta_apply_changes',post),{},upstream)).status,403);
for(const operation of ['ibta_inventory_delivery_status','ibta_save_inventory_delivery']){const before=calls.length;assert.equal((await handleApi(request('rpc/'+operation,post),{},upstream)).status,404);assert.equal(calls.length,before,'Retired RPCs never reach the database');}
assert.equal((await handleApi(request('rpc/ibta_restore_backup',post),{},upstream)).status,403);
for(const operation of ['ibta_save_trainee_worksheet','ibta_trainee_worksheet_action']){assert.equal((await handleApi(request('rpc/'+operation,{...post,body:JSON.stringify({target_owner:'user'})}),{},upstream)).status,200);assert.ok(calls.at(-1).url.includes(operation));assert.equal(calls.at(-1).options.headers.get('Authorization'),bearer);}
assert.equal((await handleApi(request('rpc/ibta_claim_trainee_voucher',{...post,body:JSON.stringify({target_code:'TEST',expected_version:1,use_date:'01/01/1900',trainee_name:'Automatic trainee'})}),{},upstream)).status,200);assert.equal(JSON.parse(calls.at(-1).options.body).trainee_name,'Automatic trainee');assert.notEqual(JSON.parse(calls.at(-1).options.body).use_date,'01/01/1900');
role='admin';assert.equal((await handleApi(request('rpc/ibta_restore_backup',post),{},upstream)).status,200);
assert.equal((await handleApi(request('ibta_codes',{headers:{Authorization:bearer,Origin:'https://evil.invalid'}}),{},upstream)).status,403);
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
for(const status of [429,500,503]){
  const expected=status===429?429:503;
  assert.equal((await handleApi(request('ibta_codes'),{},async()=>Response.json({}, {status}))).status,expected,'Auth outages preserve retryable status');
  const membershipFailure=async(url,options)=>url.includes('/auth/')?upstream(url,options):Response.json({}, {status});
  assert.equal((await handleApi(request('ibta_codes'),{},membershipFailure)).status,expected,'Membership outages must not deny approval');
}
for(const memberRole of ['operator','admin']){
  role=memberRole;
  for(const changes of [null,{},[null],[1],[[]],[{}]]){
    const before=calls.length;
    const result=await handleApi(request('rpc/ibta_apply_changes',{...post,body:JSON.stringify({changes})}),{},upstream);
    assert.equal(result.status,400,'Malformed changes are client errors');
    assert.equal(calls.length-before,2,'Invalid changes never reach the database mutation');
  }
}
console.log('PASS: retryable upstream failures and malformed change validation');
for(const stale of [token(Math.floor(Date.now()/1000)-86400),'invalid.jwt']){
  const before=calls.length;
  const result=await handleApi(request('ibta_codes',{headers:{Authorization:'Bearer '+stale}}),{},upstream);
  assert.equal(result.status,401);
  assert.equal((await result.json()).message,'DAILY_SIGN_IN_REQUIRED');
  assert.equal(calls.length-before,1,'Expired sessions cannot read membership or operational data');
}
console.log('PASS: daily session expiry blocks reads on the server');
// Reproduce the deployed Vercel URL, not just the clean local Next URL.
role='admin';
const nextUpstream=async(url,options)=>{
  const target=new URL(url);
  if(target.pathname==='/rest/v1/ibta_members'&&target.searchParams.get('select')==='role,active,user_id'){
    assert.equal(target.searchParams.has('path'),false);
    assert.equal(target.searchParams.has('nxtPpath'),false);
    assert.equal(target.searchParams.get('user_id'),'eq.user');
    assert.equal(options.headers.get('Authorization'),bearer);
    return Response.json([{role,active,user_id:'user'}]);
  }
  return upstream(url,options);
};
response=await handleNextApi(request('ibta_members?select=role%2Cactive%2Cuser_id&user_id=eq.user&path=ibta_members&nxtPpath=ibta_members'),{},nextUpstream);
assert.equal(response.status,200);
assert.deepEqual(await response.json(),[{role:'admin',active:true,user_id:'user'}]);
await handleNextApi(request('ibta_codes?select=code&category=eq.Foundation%2B100&order=code.asc&offset=1000&limit=1000&path=ibta_codes'),{},upstream);
const forwarded=new URL(calls.at(-1).url);
assert.equal(forwarded.searchParams.has('path'),false);
assert.equal(forwarded.searchParams.get('category'),'eq.Foundation+100');
assert.equal(forwarded.searchParams.get('offset'),'1000');
assert.equal(forwarded.searchParams.get('order'),'code.asc');
await handleNextApi(request('rpc/ibta_restore_backup?path=rpc%2Fibta_restore_backup',post),{},upstream);
assert.equal(calls.at(-1).options.method,'POST');
assert.deepEqual(JSON.parse(calls.at(-1).options.body),JSON.parse(post.body));
assert.equal((await handleNextApi(new Request('https://site.invalid/api/data/ibta_members?path=ibta_members'),{},upstream)).status,401);
assert.equal((await handleNextApi(request('ibta_members?path=ibta_members',{headers:{Authorization:bearer,Origin:'https://evil.invalid'}}),{},upstream)).status,403);
console.log('PASS: Vercel routing parameters cannot become database filters; JWT, origin, real filters, pagination and POST body are preserved');

// Report regressions: defense in depth must retain the existing worksheet role policy.
for (const origin of [undefined, 'https://evil.invalid']) {
  const before = calls.length;
  const headers = {...post.headers}; delete headers.Origin;
  if (origin) headers.Origin = origin;
  assert.equal((await handleApi(request('rpc/ibta_claim_code', {...post, headers}), {}, upstream)).status, 403);
  assert.equal(calls.length, before, 'Rejected origins cannot call authentication or the database');
}
for (const memberRole of ['operator', 'copy_only', 'admin']) {
  role = memberRole;
  for (const operation of ['ibta_save_trainee_worksheet', 'ibta_trainee_worksheet_action', 'ibta_save_trainee_sheet_formatted']) {
    for (const owner of ['user', 'other-user']) {
      const before = calls.length;
      const allowed = owner === 'user' || role === 'admin';
      const response = await handleApi(request('rpc/' + operation, {...post, body:JSON.stringify({target_owner:owner})}), {}, upstream);
      assert.equal(response.status, allowed ? 200 : 403);
      assert.equal(calls.length - before, allowed ? 3 : 2, 'Foreign worksheets cannot reach the mutation endpoint');
    }
  }
}
role = 'copy_only';
for (const operation of ['ibta_apply_changes','ibta_set_voucher_trainee_name']) {
  const before = calls.length;
  assert.equal((await handleApi(request('rpc/' + operation, post), {}, upstream)).status, 403);
  assert.equal(calls.length - before, 2, 'Copy-only code edits cannot reach PostgREST');
}
assert.equal((await handleApi(request('rpc/ibta_claim_code', {...post,body:JSON.stringify({target_code:'TEST'})}), {}, upstream)).status, 200, 'Copy-only members keep voucher claiming');
userEmail = 'a,b."c\\d@example.invalid';
calls=[];
assert.equal((await handleApi(request('ibta_codes'), {}, upstream)).status,200);
assert.equal(new URL(calls[1].url).searchParams.get('or'), '(user_id.eq."user",and(user_id.is.null,email.eq."a,b.\\"c\\\\d@example.invalid"))', 'Membership email remains one quoted PostgREST literal');
console.log('PASS: required write origin, copy-only code restrictions, own worksheets and escaped membership filters');
