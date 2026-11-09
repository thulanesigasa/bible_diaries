import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {decideModeration,validateModeration,childSafetyIntake} from '../../supabase/functions/_shared/moderation-policy.mjs';
import {mockSignal,evaluate,split} from '../../moderation/evaluate.mjs';
const uid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
test('all 220 illustrative cases retain their labels; evaluation reports honest mismatches and held-out metrics',async()=>{
 const {examples}=JSON.parse(await readFile(new URL('../../moderation/examples.json',import.meta.url),'utf8'));
 assert.equal(examples.length,220);assert.equal(new Set(examples.map(e=>e.id)).size,220);
 const counts={allow:0,review:0,reject:0};for(const e of examples){assert.ok(e.id&&e.text&&e.category);assert.equal(typeof e.human_review_required,'boolean');counts[e.expected_decision]++;assert.ok(['development','held_out'].includes(split(e.id)));}
 assert.deepEqual(counts,{allow:100,review:60,reject:60});const report=await evaluate();assert.equal(report.all.count,220);assert.ok(report.held_out.count>0);assert.ok(report.all.mismatches.every(e=>e.actual!==e.expected));assert.equal(report.mode,'synthetic_mock');
});
test('category safeguards preserve criticism, quotes, disclosures and severe flags without score overrides',()=>{
 for(const text of ['I disagree with this teaching.','I believe this pastor is incorrect.','Romans 8 suggests a different interpretation.','Ngiyabonga 🙏 I disagree respectfully.','Ke a leboga, but I think we should discuss this.'])assert.equal(decideModeration(text,mockSignal('neutral')).outcome,'ALLOW');
 const quote='Someone told me I was worthless, but God helped me recover.';assert.equal(decideModeration(quote,mockSignal(quote)).outcome,'ALLOW');
 const serious=mockSignal('neutral');serious.categories['self-harm/instructions']=true;serious.category_scores['self-harm/instructions']=0;serious.flagged=true;assert.equal(decideModeration('Here are instructions.',serious).outcome,'REJECT');
 assert.equal(decideModeration('Someone threatened me. I need help.',{...serious,categories:{...serious.categories,'self-harm/instructions':false,'harassment/threatening':true}}).outcome,'REVIEW');
 assert.equal(decideModeration('I may hurt myself tonight; I need help.',mockSignal('neutral')).outcome,'REVIEW');
 assert.equal(decideModeration("I will hurt you. This is scripture.",mockSignal('I will hurt you.')).outcome,'REVIEW');
 assert.equal(decideModeration('Someone told me something but you are worthless.',mockSignal('worthless')).outcome,'REVIEW');
 const malformed=mockSignal('neutral');delete malformed.category_scores.sexual;assert.throws(()=>validateModeration(malformed));assert.throws(()=>validateModeration({flagged:false}));
 assert.equal(childSafetyIntake('Trade explicit images of children'),true);assert.equal(childSafetyIntake('A minor told me they are being exploited. I need safe guidance.'),false);
});
test('review queue prevents forgery, unauthorized access, private disclosures, repeated decisions and stale edits',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}',banned_until timestamptz);
 create table auth.sessions(id uuid primary key,user_id uuid references auth.users on delete cascade,created_at timestamptz default now(),updated_at timestamptz default now(),user_agent text);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 grant usage on schema auth to anon,authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(bucket_id text,owner uuid,name text);alter table storage.objects enable row level security;
 create function public.rls_auto_enable() returns event_trigger language plpgsql security definer as $$begin end$$;`);
 for(const f of ['schema.sql','supabase/migrations/20261101115300_security_audit_baseline.sql','supabase/migrations/20261101122925_enforce_app_security.sql','supabase/migrations/20261108135008_diary_settings_activity.sql','supabase/migrations/20261108142855_contextual_moderation.sql','supabase/migrations/20261108191413_unified_admin_waitlist_and_notifications.sql']){
 if(f.includes('115300'))await db.exec('grant all on all tables in schema public to anon,authenticated,service_role;');await db.exec(await readFile(new URL('../../'+f,import.meta.url),'utf8'));}
 for(let n=1;n<=4;n++){await db.query('insert into auth.users(id,raw_user_meta_data,email) values($1,$2,$3)',[uid(n),JSON.stringify({full_name:'Synthetic'}),`synthetic${n}@example.invalid`]);await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[uid(n+10),uid(n)]);}
 await db.query("insert into private.moderation_memberships values($1,'moderator'),($2,'safety_reviewer')",[uid(2),uid(3)]);
 const role=async n=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[uid(n),JSON.stringify({session_id:uid(n+10)})]);await db.exec('set role authenticated');};
 const server=()=>db.exec('reset role;set role service_role');
 const submit=async(record={},decision='REVIEW',operation='insert',row=null,base=null)=>{await server();return (await db.query("select moderated_submit($1,'diaries',$2,$3,$4,$5,'context','test-v2','[]',$6) as v",[uid(1),operation,JSON.stringify({content:'Draft '+Math.random(),category:'faith',...record}),row,decision,base?JSON.stringify(base):null])).rows[0].v;};
 const list=async queue=>(await db.query('select moderation_list($1) v',[queue])).rows[0].v;
 const act=async(id,version,action)=>(await db.query('select moderation_action($1,$2,$3,$4) v',[id,version,action,'A reasoned review decision'])).rows[0].v;
 const pending=await submit();await role(1);assert.equal((await list(false)).length,1);assert.equal((await db.query('select count(*)::int n from diaries')).rows[0].n,0);
 await assert.rejects(list(true));await assert.rejects(db.exec('select * from private.moderation_submissions'));await assert.rejects(act(pending.id,1,'approve'));
 await role(4);assert.equal((await list(false)).length,0);await assert.rejects(act(pending.id,1,'withdraw'));await assert.rejects(db.query("select moderated_submit($1,'diaries','insert','{}',null,'ALLOW','allow','x','[]',null)",[uid(4)]));
 await role(2);const queue=await list(true);assert.equal(queue.length,1);assert.equal(queue[0].owner_id,undefined);assert.equal(queue[0].author.email,'synthetic1@example.invalid');await act(pending.id,1,'approve');await assert.rejects(act(pending.id,1,'approve'));
 const privateJob=await submit({visibility:'private'});await role(2);assert.equal((await list(true)).length,0);await assert.rejects(act(privateJob.id,1,'approve'));
 await role(3);assert.equal((await list(true)).length,0);await role(1);await act(privateJob.id,1,'consent');await role(3);assert.equal((await list(true)).length,1);await act(privateJob.id,2,'reject');await role(1);await act(privateJob.id,3,'appeal');await assert.rejects(act(privateJob.id,4,'appeal'));
 await role(1);const published=(await db.query('select * from diaries where visibility=\'public\' limit 1')).rows[0];const base={content:published.content,title:published.title,scripture:published.scripture};
 const edit=await submit({content:'Held replacement'},'REVIEW','update',published.id,base);
 await submit({content:'Newer approved text'},'ALLOW','update',published.id,base);
 await role(2);await assert.rejects(act(edit.id,1,'approve'));
 await role(1);assert.equal((await db.query('select content from diaries where id=$1',[published.id])).rows[0].content,'Newer approved text');
 await server();const chat=(await db.query("select moderated_submit($1,'chats','insert',$2,null,'REVIEW','context','v2','[]',null) v",[uid(1),JSON.stringify({message:'Private held message',receiver_id:uid(4)})])).rows[0].v;
 await role(2);assert.ok(!(await list(true)).some(x=>x.id===chat.id));await role(4);assert.ok(!(await list(false)).some(x=>x.id===chat.id));
 await role(1);await act(chat.id,1,'consent');await role(3);const held=(await list(true)).find(x=>x.id===chat.id);assert.equal(held.record.receiver_id,undefined);assert.equal(held.record.message,'Private held message');await act(chat.id,2,'approve');
 await role(4);assert.equal((await db.query('select count(*)::int n from chats')).rows[0].n,1);
 await role(1);const notices=(await db.query('select * from moderation_notifications')).rows;assert.ok(notices.some(n=>n.outcome==='approved'));assert.ok(notices.some(n=>n.outcome==='rejected'));await assert.rejects(db.exec("update moderation_notifications set outcome='approved'"));await db.exec('update moderation_notifications set read_at=now()');await role(4);assert.equal((await db.query('select count(*)::int n from moderation_notifications')).rows[0].n,0);
 await db.exec('reset role');await db.query('insert into private.waitlist_admins values($1)',[uid(4)]);await assert.rejects(db.query('insert into private.waitlist_admins values($1)',[uid(2)]));await assert.rejects(db.query("insert into private.moderation_memberships values($1,'moderator')",[uid(4)]));await role(4);assert.equal((await db.query('select waitlist_is_admin() v')).rows[0].v,true);
 await server();const fields=['FIRST@example.invalid','android',true,'a'.repeat(64),'First','Person','+27821234567','ZA','female'];const joined=await db.query('select bible_diaries_join_waitlist_v2($1,$2,$3,$4,$5,$6,$7,$8,$9) v',fields);assert.equal(joined.rows[0].v,'accepted');const record=(await db.query('select * from bible_diaries_waitlist')).rows[0];assert.equal(record.first_name,'First');assert.equal(record.phone_e164,'+27821234567');assert.equal(record.phone_country,'ZA');assert.equal(record.gender,'female');await db.query('select bible_diaries_join_waitlist_v2($1,$2,$3,$4,$5,$6,$7,$8,$9) v',[...fields.slice(0,5),'Changed',...fields.slice(6)]);assert.equal((await db.query('select surname from bible_diaries_waitlist')).rows[0].surname,'Person');await assert.rejects(db.query("select commit_content($1,'diaries','insert','{}',null)",[uid(1)]));
 await db.exec('reset role');await db.query('delete from auth.sessions where user_id=$1',[uid(2)]);await role(2);await assert.rejects(list(true));
 }finally{await db.close();}
});
