import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {confirmationEmail,drainConfirmationQueue,handleMailCron} from '../src/lib/waitlist-mail.mjs';
import {PROJECT_URL} from '../src/lib/waitlist.mjs';
const env={SITE_ROLE:'waitlist',WAITLIST_CONFIRMATION_EMAILS:'true',SUPABASE_URL:PROJECT_URL,SUPABASE_SERVICE_ROLE_KEY:'test-server-key',RESEND_API_KEY:'test-mail-key',WAITLIST_MAIL_FROM:'updates@news.biblediaries.co.za',WAITLIST_MAIL_REPLY_TO:'support@biblediaries.co.za',WAITLIST_MAIL_CRON_SECRET:'s'.repeat(32)};
const job={id:'receipt-id',lease:'lease-id',email:'test@example.com',first_name:'<script>bad</script>',attempts:1};
test('receipt escapes names, does not assert email verification; disabled mail makes no requests',async()=>{
 const mail=confirmationEmail(job,env);assert.ok(mail.html.includes('&lt;script&gt;'));assert.ok(!mail.html.includes('<script>'));assert.match(mail.text,/does not.*verify ownership/);
 assert.deepEqual(await drainConfirmationQueue({env:{...env,WAITLIST_CONFIRMATION_EMAILS:'false'},fetcher:()=>assert.fail()}),{sent:0,retry:0,failed:0,disabled:true});
 assert.equal((await handleMailCron(new Request('https://waiting.biblediaries.co.za/api/internal/waitlist-mail'),{env,fetcher:()=>assert.fail()})).status,401);
});
test('mail worker uses stable idempotency keys and lease-fenced retry/acceptance outcomes',async()=>{
 for(const status of [200,429,503,422]){
  let finished;const fetcher=async(url,options)=>{
   if(url.endsWith('claim_waitlist_confirmation'))return Response.json(job);
   if(url.endsWith('finish_waitlist_confirmation')){finished=JSON.parse(options.body);return Response.json(true);}
   assert.equal(url,'https://api.resend.com/emails');assert.equal(options.headers['Idempotency-Key'],'bible-diaries-waitlist/receipt-id');return Response.json({id:'provider-id'},{status});
  };
  await drainConfirmationQueue({env,fetcher});assert.equal(finished.p_lease,'lease-id');assert.equal(finished.p_outcome,status===200?'sent':status===422?'failed':'retry');
 }
});
test('durable outbox queues once, enforces privilege/budget, leases, retries and deletion',async()=>{
 const db=new PGlite();try{
  await db.exec("create role anon;create role authenticated;create role service_role bypassrls;create schema private;create table public.bible_diaries_waitlist(email text primary key,first_name text);grant all on public.bible_diaries_waitlist to service_role;insert into public.bible_diaries_waitlist values('old@example.com','Old');");
  await db.exec(await readFile(new URL('../../supabase/migrations/20261112003812_waitlist_confirmation_outbox.sql',import.meta.url),'utf8'));
  assert.equal((await db.query('select count(*)::int n from private.waitlist_confirmation_outbox')).rows[0].n,0);
  await db.exec("set role service_role;insert into public.bible_diaries_waitlist values('new@example.com','New'),('next@example.com','Next');insert into public.bible_diaries_waitlist values('new@example.com','New') on conflict do nothing;");
  const claim=async()=> (await db.query('select public.claim_waitlist_confirmation(1) job')).rows[0].job;
  const first=await claim();assert.equal(first.attempts,1);assert.equal(await claim(),null);
  assert.equal((await db.query("select public.finish_waitlist_confirmation($1,gen_random_uuid(),'sent') ok",[first.id])).rows[0].ok,false);
  assert.equal((await db.query("select public.finish_waitlist_confirmation($1,$2,'retry',null,60) ok",[first.id,first.lease])).rows[0].ok,true);
  await db.exec("reset role;delete from private.waitlist_mail_budget;update private.waitlist_confirmation_outbox set available_at=now()-interval '1 minute' where status='pending';set role service_role;");
  const second=await claim();assert.ok(second);assert.notEqual(first.lease,second.lease);
  await db.exec("reset role;");
  assert.equal((await db.query("select has_function_privilege('authenticated','public.claim_waitlist_confirmation(integer)','execute') ok")).rows[0].ok,false);
  await db.exec("set role authenticated;");await assert.rejects(db.query('select * from private.waitlist_confirmation_outbox'),/permission denied/);
  await db.exec("reset role;delete from public.bible_diaries_waitlist;");assert.equal((await db.query('select count(*)::int n from private.waitlist_confirmation_outbox')).rows[0].n,0);
 }finally{await db.close();}
});
