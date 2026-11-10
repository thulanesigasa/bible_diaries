import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {rootRole} from '../../../lib/site-domains.mjs';
import {shellTemplate,nonceHtml,appPolicy} from '../../../lib/app-shell.mjs';
export const dynamic='force-dynamic';
export async function GET(request){
 if(rootRole()!=='app')return new Response('Not found',{status:404});
 const path=new URL(request.url).searchParams.get('path')||'/';
 const template=shellTemplate(path),nonce=randomBytes(18).toString('base64');
 try{const html=await readFile(join(process.cwd(),'.browser-ui',template),'utf8');return new Response(nonceHtml(html,nonce),{status:template==='+not-found.html'?404:200,headers:{'content-type':'text/html; charset=utf-8','cache-control':'private, no-store','content-security-policy':appPolicy(nonce,process.env.NEXT_PUBLIC_SUPABASE_URL||'https://fspfwidfdnqvpgmipate.supabase.co'),'x-robots-tag':'noindex, nofollow'}});}
 catch{return new Response('The web app build is unavailable. Run npm run build:browser before starting this service.',{status:503,headers:{'content-type':'text/plain','cache-control':'no-store'}});}
}
