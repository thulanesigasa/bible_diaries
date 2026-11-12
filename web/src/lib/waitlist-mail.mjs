import {timingSafeEqual} from 'node:crypto';
import {waitlistEnabled} from './deployment.mjs';
import {PROJECT_URL} from './waitlist.mjs';
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mailbox=value=>typeof value==='string'&&value.length<255&&/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(value);
export function mailConfigured(env){return waitlistEnabled(env)&&env.WAITLIST_CONFIRMATION_EMAILS==='true'&&env.SUPABASE_URL===PROJECT_URL&&!!env.SUPABASE_SERVICE_ROLE_KEY&&!!env.RESEND_API_KEY&&mailbox(env.WAITLIST_MAIL_FROM)&&/@(?:[a-z0-9-]+\.)*biblediaries\.co\.za$/i.test(env.WAITLIST_MAIL_FROM)&&mailbox(env.WAITLIST_MAIL_REPLY_TO);}
export function confirmationEmail(job,env){
 const name=typeof job.first_name==='string'?job.first_name.slice(0,80):'';
 const support=env.WAITLIST_MAIL_REPLY_TO;
 const text=`Hi${name?' '+name:''},\n\nYou’re on the Bible Diaries waiting list. Your request for launch notifications has been recorded.\n\nBible Diaries is a space to reflect on Scripture, keep your personal diary and share encouragement with others. Google Play and Huawei AppGallery are planned first, with Apple App Store later. There is no guaranteed release date.\n\nThis does not create an app account or verify ownership of this email address.\n\nIf you didn’t request this or want to leave the list, reply to this email with “Unsubscribe”, or contact ${support}.\n\nThe Bible Diaries team`;
 return {from:`Bible Diaries <${env.WAITLIST_MAIL_FROM}>`,reply_to:support,to:[job.email],subject:'You’re on the Bible Diaries waiting list',text,html:`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your Bible Diaries waiting-list request</title></head><body style="margin:0;background:#f5f9fc;color:#172033;font-family:Arial,sans-serif"><main style="max-width:560px;margin:30px auto;background:white;padding:32px;border-top:4px solid #0284c7"><p style="font-size:13px;color:#0369a1;font-weight:bold">BIBLE DIARIES</p><h1 style="font-size:28px;line-height:1.25">There’s room for your story.</h1>${text.split('\n\n').map(p=>`<p style="font-size:15px;line-height:1.7">${escapeHtml(p).replace(/\n/g,'<br>')}</p>`).join('')}<p style="font-size:12px;color:#64748b">This receipt confirms a saved waiting-list request, not an app account or store release.</p></main></body></html>`};
}
export async function drainConfirmationQueue({env=process.env,fetcher=fetch,limit=1}={}){
 const stats={sent:0,retry:0,failed:0};if(!mailConfigured(env))return {...stats,disabled:true};
 const rpc=async(name,body)=>{const r=await fetcher(`${PROJECT_URL}/rest/v1/rpc/${name}`,{method:'POST',headers:{'Content-Type':'application/json',apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`},body:JSON.stringify(body),signal:AbortSignal.timeout(5000),cache:'no-store'});if(!r.ok)throw Error('Mail queue unavailable');return r.json();};
 for(let index=0;index<Math.min(Math.max(limit,1),5);index++){
  const job=await rpc('claim_waitlist_confirmation',{p_daily_limit:Math.min(100,Math.max(1,Number(env.WAITLIST_MAIL_DAILY_LIMIT)||40))});if(!job)break;
  let outcome='retry',provider=null,delay=Math.min(3600,60*2**job.attempts);
  try{
   const r=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`bible-diaries-waitlist/${job.id}`},body:JSON.stringify(confirmationEmail(job,env)),signal:AbortSignal.timeout(8000)});
   if(r.ok){const data=await r.json();if(typeof data.id==='string'&&data.id.length){outcome='sent';provider=data.id;}}
   else if(r.status===429){delay=Math.max(delay,Math.min(21600,Number(r.headers.get('retry-after'))||3600));}
   else if(r.status<500)outcome='failed';
  }catch{/* Retry the durable job. Never log recipient details, provider bodies or credentials. */}
  const saved=await rpc('finish_waitlist_confirmation',{p_id:job.id,p_lease:job.lease,p_outcome:outcome,p_provider_id:provider,p_retry_seconds:delay});
  if(saved)stats[outcome]++;
  if(outcome!=='sent')break;
 }
 return stats;
}
export async function handleMailCron(request,{env=process.env,fetcher=fetch}={}){
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 if(!mailConfigured(env)||typeof env.WAITLIST_MAIL_CRON_SECRET!=='string'||env.WAITLIST_MAIL_CRON_SECRET.length<32)return Response.json({error:'Mail service unavailable'},{status:503,headers});
 const received=Buffer.from(request.headers.get('authorization')||''),expected=Buffer.from('Bearer '+env.WAITLIST_MAIL_CRON_SECRET);
 if(received.length!==expected.length||!timingSafeEqual(received,expected))return Response.json({error:'Unauthorized'},{status:401,headers});
 try{return Response.json(await drainConfirmationQueue({env,fetcher,limit:1}),{headers});}catch{return Response.json({error:'Mail processing unavailable'},{status:503,headers});}
}
