import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
test('activity snapshot and private signals isolate owners and omit hidden bookmark identity',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema private;create schema realtime;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function private.active_member() returns boolean language sql stable as $$select auth.uid() is not null$$;
 create function realtime.topic() returns text language sql stable as $$select current_setting('realtime.topic',true)$$;
 create table realtime.messages(extension text,topic text,payload jsonb);alter table realtime.messages enable row level security;
 create function realtime.send(payload jsonb,event text,topic text,private boolean default true) returns void language sql as $$insert into realtime.messages values('broadcast',topic,payload)$$;
 create table public.diary_activity(id uuid default gen_random_uuid(),recipient_id uuid,actor_id uuid,post_id uuid,kind text,created_at timestamptz default now(),read_at timestamptz,source_key text);
 create table public.moderation_notifications(id uuid default gen_random_uuid(),user_id uuid,outcome text,target text,content_id uuid,created_at timestamptz default now(),read_at timestamptz);
 create table public.diary_settings(user_id uuid,notify_likes boolean);
 alter table public.diary_activity enable row level security;alter table public.moderation_notifications enable row level security;alter table public.diary_settings enable row level security;
 create policy owner on public.diary_activity for select to authenticated using(recipient_id=auth.uid());
 create policy owner on public.moderation_notifications for select to authenticated using(user_id=auth.uid());
 create policy owner on public.diary_settings for select to authenticated using(user_id=auth.uid());
 grant usage on schema auth,private,realtime to authenticated;grant select on realtime.messages,public.moderation_notifications,public.diary_settings to authenticated;
 grant select(id,recipient_id,actor_id,post_id,kind,created_at,read_at) on public.diary_activity to authenticated;`);
 await db.exec(await readFile(new URL('../../supabase/migrations/20261112003805_activity_live_notifications.sql',import.meta.url),'utf8'));
 await db.query("insert into public.diary_activity(recipient_id,actor_id,kind,source_key) values($1,$2,'bookmark','secret-actor-key'),($2,$1,'like','other-secret')",[a,b]);
 await db.query("insert into public.moderation_notifications(user_id,outcome,target) values($1,'approved','diaries')",[a]);
 await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('realtime.topic',$2,false)",[a,'diary-activity:'+a]);
 await db.exec('set role authenticated');
 const snapshot=(await db.query('select public.diary_notification_snapshot() data')).rows[0].data;
 assert.equal(snapshot.unread,2);assert.equal(snapshot.community.length,1);assert.equal(snapshot.system.length,1);
 assert.ok(!JSON.stringify(snapshot).includes('secret'));assert.ok(!('actor_id' in snapshot.community[0]));
 const messages=(await db.query('select * from realtime.messages')).rows;assert.equal(messages.length,2);assert.ok(messages.every(x=>x.topic==='diary-activity:'+a));assert.deepEqual(messages[0].payload,{changed:true});
 await assert.rejects(db.query("insert into realtime.messages values('broadcast','forged','{}')"),/permission denied/);
 await db.exec('reset role');assert.equal((await db.query("select has_function_privilege('anon','public.diary_notification_snapshot()','execute') ok")).rows[0].ok,false);
 }finally{await db.close();}
});
