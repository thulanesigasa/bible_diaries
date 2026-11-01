import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
import {boundedJson} from '../../../../supabase/functions/_shared/handler.mjs';
const url=()=>process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=()=>process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const options=()=>({httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:60*60*24*30});
function trusted(request){return request.headers.get('origin')===(process.env.APP_ORIGIN||new URL(request.url).origin)&&request.headers.get('sec-fetch-site')!=='cross-site';}
async function auth(path,token,body){return fetch(url()+'/auth/v1/'+path,{method:body?'POST':'GET',headers:{apikey:key(),authorization:`Bearer ${token||key()}`,'content-type':'application/json'},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(10000)});}
const json=(value,status=200)=>NextResponse.json(value,{status,headers:{'cache-control':'no-store'}});
export async function POST(request){
 if(!trusted(request))return json({error:'Origin not permitted.'},403);
 try{const s=await boundedJson(request,16000);if(typeof s.access_token!=='string'||typeof s.refresh_token!=='string'||s.access_token.length>3500||s.refresh_token.length>1000)return json({error:'Invalid session.'},400);
 const verified=await auth('user',s.access_token);if(!verified.ok)return json({error:'Invalid session.'},401);
 const jar=await cookies();jar.set('bd-access',s.access_token,options());jar.set('bd-refresh',s.refresh_token,options());return json({saved:true});
 }catch{return json({error:'Session service unavailable.'},503);}
}
export async function GET(request){
 if(request.headers.get('sec-fetch-site')==='cross-site')return json({error:'Origin not permitted.'},403);
 try{const jar=await cookies();let access=jar.get('bd-access')?.value,refresh=jar.get('bd-refresh')?.value;if(!access||!refresh)return json({error:'Signed out.'},401);
 let verified=await auth('user',access);let session;
 if(!verified.ok){const r=await auth('token?grant_type=refresh_token',null,{refresh_token:refresh});if(!r.ok)return json({error:'Session expired.'},401);session=await r.json();access=session.access_token;refresh=session.refresh_token;jar.set('bd-access',access,options());jar.set('bd-refresh',refresh,options());}
 else{const user=await verified.json();const payload=JSON.parse(Buffer.from(access.split('.')[1],'base64url').toString());session={access_token:access,refresh_token:refresh,user,expires_at:payload.exp,expires_in:Math.max(0,payload.exp-Math.floor(Date.now()/1000)),token_type:'bearer'};}
 const active=await fetch(url()+'/rest/v1/rpc/session_is_active',{method:'POST',headers:{apikey:key(),authorization:`Bearer ${access}`,'content-type':'application/json'},body:'{}',cache:'no-store',signal:AbortSignal.timeout(10000)});
 if(!active.ok)return json({error:'Session service unavailable.'},503);
 if((await active.json())!==true){jar.set('bd-access','',{...options(),maxAge:0});jar.set('bd-refresh','',{...options(),maxAge:0});return json({error:'Session revoked.'},401);}
 return json(session);
 }catch{return json({error:'Could not restore session.'},503);}
}
export async function DELETE(request){if(!trusted(request))return json({error:'Origin not permitted.'},403);const jar=await cookies();jar.set('bd-access','',{...options(),maxAge:0});jar.set('bd-refresh','',{...options(),maxAge:0});return json({signedOut:true});}
