import {boundedJson} from '../../supabase/functions/_shared/handler.mjs';
export function forwardEdge(name){return async request=>{
 const origin=(process.env.APP_ORIGIN||new URL(request.url).origin);
 if(request.headers.get('origin')!==origin||request.headers.get('sec-fetch-site')==='cross-site')return Response.json({error:'Origin not permitted.'},{status:403});
 const authorization=request.headers.get('authorization');if(!/^Bearer [^\s]+$/.test(authorization||''))return Response.json({error:'Sign in again.'},{status:401});
 try{const body=await boundedJson(request,name==='delete-account'?2048:32000);const response=await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${name}`,{method:'POST',headers:{authorization,apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});return new Response(await response.text(),{status:response.status,headers:{'content-type':'application/json','cache-control':'no-store'}});}
 catch(error){return Response.json({error:error.status?error.message:'Service unavailable.'},{status:error.status||503});}
};}
