/* Cloudflare Pages advanced-mode JavaScript backend.
 * Only the caller's JWT is forwarded: database RLS stays authoritative.
 */
import '../session-policy.js';
const DATABASE_URL='https://xaeffreqwtozsgqajzpc.supabase.co';
const PUBLIC_KEY='sb_publishable_TB0SB3SNFP1ygpRvMoeSGg_s8o0mHeO';
const tables=new Set(['ibta_codes','ibta_settings','ibta_supervisor_stock','ibta_members','ibta_audit','ibta_trainee_sheets']);
const adminRpc=new Set(['ibta_restore_backup','ibta_import_codes','ibta_change_supervisor_stock','ibta_assign_codes','ibta_inventory_delivery_status','ibta_save_inventory_delivery']);
const userRpc=new Set(['ibta_apply_changes','ibta_claim_code','ibta_save_trainee_sheet_formatted']);
const json=(status,message)=>Response.json({message},{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
// Vercel adds catch-all routing parameters to Edge request URLs. They are not
// PostgREST filters: forwarding path=ibta_members causes PGRST100 on sign-in.
export function handleNextApi(request,env={},fetcher){
  const url=new URL(request.url);
  url.searchParams.delete('path');
  url.searchParams.delete('nxtPpath');
  return handleApi(new Request(url,request),env,fetcher);
}
export async function handleApi(request,env={},fetcher=(...args)=>globalThis.fetch(...args)){
  const url=new URL(request.url),path=url.pathname.slice('/api/data/'.length);
  const isRpc=path.startsWith('rpc/'),name=isRpc?path.slice(4):path;
  if(!(isRpc?(adminRpc.has(name)||userRpc.has(name)):tables.has(name)))return json(404,'API_NOT_FOUND');
  if(!(isRpc?['POST']:name==='ibta_members'?['GET','POST','PATCH']:['GET']).includes(request.method))return json(405,'METHOD_NOT_ALLOWED');
  const origin=request.headers.get('Origin');
  if(origin&&origin!==url.origin)return json(403,'ORIGIN_DENIED');
  const authorization=request.headers.get('Authorization')||'';
  if(!/^Bearer [A-Za-z0-9_.-]+$/.test(authorization))return json(401,'AUTH_REQUIRED');
  const databaseUrl=env.SUPABASE_URL||DATABASE_URL,key=env.SUPABASE_PUBLISHABLE_KEY||PUBLIC_KEY;
  if(!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(databaseUrl))return json(503,'SERVER_CONFIGURATION_ERROR');
  const headers={apikey:key,Authorization:authorization};
  let stage='auth';
  try{
    const auth=await fetcher(databaseUrl+'/auth/v1/user',{headers,redirect:'manual'});
    if(!auth.ok)return json(auth.status===429?429:auth.status>=500?503:401,auth.status===429?'AUTH_RATE_LIMITED':auth.status>=500?'AUTH_UNAVAILABLE':'AUTH_REQUIRED');
    const user=await auth.json();if(!user.id)return json(401,'AUTH_REQUIRED');
    if(globalThis.SessionPolicy.expired(authorization.slice(7)))return json(401,'DAILY_SIGN_IN_REQUIRED');
    // The first allowlisted login may not yet have a user_id attached.
    const query='select=role,active,user_id,email&or='+encodeURIComponent('(user_id.eq.'+user.id+',and(user_id.is.null,email.eq.'+String(user.email||'').toLowerCase()+'))');
    stage='membership';
    const membership=await fetcher(databaseUrl+'/rest/v1/ibta_members?'+query,{headers,redirect:'manual'});
    if(!membership.ok)return json(membership.status===429?429:membership.status>=500?503:403,membership.status===429?'MEMBERSHIP_RATE_LIMITED':membership.status>=500?'MEMBERSHIP_UNAVAILABLE':'IBTA_NOT_APPROVED');
    const members=await membership.json(),member=members.find(m=>m.active&&(m.user_id===user.id||m.user_id==null&&m.email===String(user.email||'').toLowerCase())&&['admin','operator','copy_only'].includes(m.role));
    if(!member)return json(403,'IBTA_NOT_APPROVED');
    if((adminRpc.has(name)||name==='ibta_members'&&request.method!=='GET')&&member.role!=='admin')return json(403,'ADMIN_REQUIRED');
    if(name==='ibta_audit'&&member.role!=='admin')return json(403,'ADMIN_REQUIRED');
    let body;
    if(request.method!=='GET'){
      if(!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))return json(415,'JSON_REQUIRED');
      // Read incrementally so an untrusted Content-Length cannot bypass the size limit.
      const reader=request.body?.getReader(),chunks=[];let bytes=0;
      if(reader)while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>12*1024*1024){await reader.cancel();return json(413,'PAYLOAD_TOO_LARGE');}chunks.push(value);}
      const combined=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){combined.set(chunk,offset);offset+=chunk.byteLength;}
      body=new TextDecoder().decode(combined);let payload;try{payload=JSON.parse(body);}catch{return json(400,'INVALID_JSON');}
      if(!payload||typeof payload!=='object'||Array.isArray(payload))return json(400,'INVALID_JSON');
      if(name==='ibta_claim_code'){
        const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Riyadh',day:'2-digit',month:'2-digit',year:'numeric'}).formatToParts(new Date());
        const part=name=>parts.find(p=>p.type===name).value;
        payload.use_date=part('day')+'/'+part('month')+'/'+part('year');body=JSON.stringify(payload);
      }
      if(name==='ibta_apply_changes'&&(!Array.isArray(payload.changes)||payload.changes.some(c=>!c||typeof c!=='object'||Array.isArray(c)||typeof c.op!=='string')))return json(400,'INVALID_CHANGES');
      if(name==='ibta_apply_changes'&&member.role!=='admin'){
        if(payload.settings_payload!=null||!Array.isArray(payload.changes)||payload.changes.some(c=>c.op!=='update'))return json(403,'ADMIN_REQUIRED');
      }
    }
    const outgoing=new Headers(headers);
    for(const name of ['accept','content-type','prefer','range','range-unit']){const value=request.headers.get(name);if(value)outgoing.set(name,value);}
    stage='database';
    const response=await fetcher(databaseUrl+'/rest/v1/'+path+url.search,{method:request.method,headers:outgoing,body,redirect:'manual'});
    if(response.status>=300&&response.status<400)return json(502,'UPSTREAM_REDIRECT_REJECTED');
    const resultHeaders=new Headers({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    for(const name of ['content-type','content-range','preference-applied']){const value=response.headers.get(name);if(value)resultHeaders.set(name,value);}
    stage='response';
    // Supabase writes often return 204. Workers may expose an empty stream,
    // but HTTP forbids any body on these status codes.
    const noBody=[204,205,304].includes(response.status);
    return new Response(noBody?null:response.body,{status:response.status,headers:resultHeaders});
  }catch(error){
    console.error('TRAINFLOW_API_FAILURE',{stage,operation:name,errorType:error?.name||'Error'});
    const reason=/illegal invocation|receiver|this.*binding/i.test(error?.message||'')?'RUNTIME':/redirect/i.test(error?.message||'')?'REDIRECT':/network|fetch|dns|connect/i.test(error?.message||'')?'NETWORK':error instanceof TypeError?'TYPE':'OTHER';
    return json(503,'SERVER_UNAVAILABLE_'+stage.toUpperCase()+'_'+reason);
  }
}
export default {async fetch(request,env){const path=new URL(request.url).pathname;
  if(path==='/api/health')return Response.json({app:'TrainFlow',runtime:'javascript-server',version:1},{headers:{'Cache-Control':'no-store'}});
  if(path.startsWith('/api/data/'))return handleApi(request,env);
  if(path.startsWith('/api/'))return json(404,'API_NOT_FOUND');
  return env.ASSETS.fetch(request);
}};
