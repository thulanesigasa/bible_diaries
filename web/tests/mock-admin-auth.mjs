// Test-process import only. The application has no test bypass or alternate backend setting.
import { PROJECT_URL } from '../src/lib/waitlist.mjs';
const originalFetch = globalThis.fetch;
const adminToken='test.jwt.admin_access_token_with_enough_characters';
const strangerToken='test.jwt.stranger_access_token_with_enough_characters';
const user={id:'11111111-1111-4111-8111-111111111111',email:'admin@example.com',email_confirmed_at:'2026-10-15T08:00:00Z',is_anonymous:false};
globalThis.fetch=async(input,options={})=>{
  const url=String(input);
  if(!url.startsWith(PROJECT_URL+'/'))return originalFetch(input,options);
  if(url.includes('/rpc/bible_diaries_admin_login_attempt'))return Response.json(true);
  if(url.includes('/auth/v1/token?grant_type=password')){
    const body=JSON.parse(options.body);
    if(body.password!=='test-password')return Response.json({error:'Invalid credentials'},{status:400});
    return Response.json({access_token:body.email===user.email?adminToken:strangerToken,expires_in:3600});
  }
  if(url.includes('/auth/v1/user')){
    const authorization=new Headers(options.headers).get('authorization');
    if(authorization==='Bearer '+adminToken)return Response.json(user);
    if(authorization==='Bearer '+strangerToken)return Response.json({...user,id:'22222222-2222-4222-8222-222222222222',email:'stranger@example.com',user_metadata:{admin:true}});
    return Response.json({error:'Invalid token'},{status:401});
  }
  if(url.includes('/rpc/bible_diaries_waitlist_stats'))return Response.json({total:4,today:1,last7Days:2,last30Days:4,latestSignup:new Date().toISOString(),updatedAt:new Date().toISOString(),timezone:'Africa/Johannesburg',platforms:{android:1,huawei:1,ios:1,any:1},daily:Array.from({length:30},(_,index)=>({date:new Date(Date.now()-(29-index)*86400000).toISOString().slice(0,10),count:index>=26?1:0}))});
  if(url.includes('/auth/v1/logout'))return new Response(null,{status:204});
  throw new Error('Unexpected mocked backend request');
};
