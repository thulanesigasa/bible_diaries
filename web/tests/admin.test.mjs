import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adminConfiguration, getAdminUser, handleAdminLogin, handleAdminStats, handleAdminLogout, validateStats } from '../src/lib/admin.mjs';
import { PROJECT_URL } from '../src/lib/waitlist.mjs';
const id = '11111111-1111-4111-8111-111111111111';
const token = 'test.jwt.access_token_with_enough_characters';
const env = { NODE_ENV:'production',SUPABASE_URL:PROJECT_URL,SUPABASE_PUBLISHABLE_KEY:'test-public-key',SUPABASE_SERVICE_ROLE_KEY:'test-service-key',ADMIN_USER_IDS:id,ADMIN_RATE_LIMIT_SALT:'a'.repeat(32),SITE_URL:'https://bible-diaries.example',WAITLIST_TRUSTED_IP_HEADER:'x-test-ip' };
const user = { id,email:'admin@example.com',email_confirmed_at:'2026-10-15T08:00:00Z',is_anonymous:false };
const stats = {total:4,today:1,last7Days:3,last30Days:4,latestSignup:'2026-10-15T08:00:00Z',updatedAt:'2026-10-15T09:00:00Z',timezone:'Africa/Johannesburg',platforms:{android:1,huawei:1,ios:1,any:1},daily:Array.from({length:30},(_,i)=>({date:new Date(Date.UTC(2026,8,16+i)).toISOString().slice(0,10),count:i<4?1:0}))};
function request(body = {email:user.email,password:'a-test-password'}, headers = {}) { return new Request(env.SITE_URL+'/api/admin/login',{method:'POST',headers:{origin:env.SITE_URL,'content-type':'application/json','x-test-ip':'192.0.2.1',...headers},body:typeof body === 'string'?body:JSON.stringify(body)}); }
test('admin configuration fails closed and requires trusted project and account UUIDs',()=>{
  assert.ok(adminConfiguration(env));
  for(const [key,value] of Object.entries({ADMIN_USER_IDS:'',SUPABASE_URL:'https://wrong.supabase.co',ADMIN_RATE_LIMIT_SALT:'short',SUPABASE_PUBLISHABLE_KEY:'',SUPABASE_SERVICE_ROLE_KEY:'',SITE_URL:'http://example.com'})) assert.equal(adminConfiguration({...env,[key]:value}),null);
  assert.equal(adminConfiguration({...env,ADMIN_USER_IDS:'admin@example.com'}),null);
});
test('admin authorization revalidates with Auth, rejects unverified, anonymous and non-allowlisted users',async()=>{
  assert.deepEqual(await getAdminUser(token,{env,fetcher:async(url,options)=>{assert.equal(url,PROJECT_URL+'/auth/v1/user');assert.equal(options.headers.Authorization,'Bearer '+token);return Response.json(user);}}),{id,email:user.email});
  for(const replacement of [{...user,email_confirmed_at:null},{...user,is_anonymous:true},{...user,id:'22222222-2222-4222-8222-222222222222',user_metadata:{admin:true}},{...user,email:'invalid'}]) assert.equal(await getAdminUser(token,{env,fetcher:async()=>Response.json(replacement)}),null);
  assert.equal(await getAdminUser(token,{env,fetcher:async()=>new Response('',{status:401})}),null);
  assert.equal(await getAdminUser(undefined,{env,fetcher:async()=>{throw Error('must not fetch');}}),null);
});
test('admin login validates origin, IP, bounded JSON and credentials before Auth',async()=>{
  const fetcher = async()=>{throw Error('Must not call backend');};
  assert.equal((await handleAdminLogin(request(undefined,{origin:'https://evil.example'}),{env,fetcher})).status,403);
  assert.equal((await handleAdminLogin(request(undefined,{'x-test-ip':'fake, list'}),{env,fetcher})).status,503);
  for(const body of [null,[],{email:'bad',password:'x'},{email:user.email,password:''},{email:user.email,password:'x'.repeat(1025)},'x'.repeat(4097),'{']) assert.equal((await handleAdminLogin(request(body),{env,fetcher})).status,400);
});
test('admin login consumes durable limits before Auth and only sets a secure HttpOnly cookie',async()=>{
  const calls=[];
  const fetcher=async(url,options)=>{calls.push(url);
    if(url.includes('login_attempt')) {const body=JSON.parse(options.body);assert.match(body.p_ip_hash,/^[a-f0-9]{64}$/);assert.match(body.p_email_hash,/^[a-f0-9]{64}$/);assert.ok(!options.body.includes(user.email)&&!options.body.includes('192.0.2.1'));return Response.json(true);}
    if(url.includes('grant_type=password'))return Response.json({access_token:token,refresh_token:'must-not-be-saved',expires_in:7200});
    return Response.json(user);
  };
  const result=await handleAdminLogin(request(),{env,fetcher});
  assert.equal(result.status,200);assert.equal(calls.length,3);assert.ok(calls[0].includes('login_attempt'));
  const cookie=result.headers.get('set-cookie');
  for(const flag of ['__Host-bible-diaries-admin=','HttpOnly','Secure','SameSite=Strict','Path=/','Max-Age=3600'])assert.ok(cookie.includes(flag));
  assert.ok(!cookie.includes('must-not-be-saved'));
  assert.deepEqual(await result.json(),{success:true});
  assert.equal(result.headers.get('cache-control'),'private, no-store');
});
test('rate limits and denied admin login never return a session',async()=>{
  let calls=0;
  const limited=await handleAdminLogin(request(),{env,fetcher:async()=>{calls++;return Response.json(false);}});
  assert.equal(limited.status,429);assert.equal(calls,1);assert.equal(limited.headers.get('set-cookie'),null);
  const denied=await handleAdminLogin(request(),{env,fetcher:async url=>url.includes('login_attempt')?Response.json(true):url.includes('grant_type')?Response.json({access_token:token,expires_in:3600}):Response.json({...user,email_confirmed_at:null})});
  assert.equal(denied.status,401);assert.equal(denied.headers.get('set-cookie'),null);
});
test('stats require current authorization and expose only validated aggregate fields',async()=>{
  let calledStats=false;
  const denied=await handleAdminStats(token,{env,fetcher:async url=>{if(url.includes('waitlist_stats'))calledStats=true;return Response.json({...user,id:'stranger'});}});
  assert.equal(denied.status,401);assert.equal(calledStats,false);
  const valid=await handleAdminStats(token,{env,fetcher:async url=>url.includes('/auth/')?Response.json(user):Response.json({...stats,emails:['subscriber@example.com'],password:'hidden'})});
  assert.equal(valid.status,200);const output=await valid.json();assert.equal(output.total,4);assert.ok(!JSON.stringify(output).includes('subscriber@example.com'));assert.ok(!('password' in output));
  assert.equal(validateStats({...stats,total:5}),null);assert.equal(validateStats({...stats,timezone:'UTC'}),null);
  const failed=await handleAdminStats(token,{env,fetcher:async url=>url.includes('/auth/')?Response.json(user):new Response('internal secret',{status:500})});
  assert.equal(failed.status,503);assert.ok(!(await failed.text()).includes('internal secret'));
});
test('logout requires the exact origin, revokes remotely and clears the cookie',async()=>{
  const invalid=await handleAdminLogout(request({}, {origin:'https://evil.example'}),token,{env});assert.equal(invalid.status,403);assert.equal(invalid.headers.get('set-cookie'),null);
  let revoked=false;
  const valid=await handleAdminLogout(request(),token,{env,fetcher:async url=>{revoked=url.includes('/auth/v1/logout?scope=local');throw Error('offline');}});
  assert.equal(valid.status,200);assert.ok(revoked);assert.ok(valid.headers.get('set-cookie').includes('Max-Age=0'));
});
