import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
test('app privacy, anonymous authorship, trusted writes, interactions and revoked sessions',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create schema storage;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}',banned_until timestamptz);
 create table auth.sessions(id uuid primary key,user_id uuid references auth.users on delete cascade);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 grant usage on schema auth to anon,authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(bucket_id text,owner uuid,name text); alter table storage.objects enable row level security;
 create function public.rls_auto_enable() returns event_trigger language plpgsql security definer as $$begin end$$;`);
 for(const file of ['../../schema.sql','../../supabase/migrations/20261101115300_security_audit_baseline.sql','../../supabase/migrations/20261101122925_enforce_app_security.sql']){
  if(file.includes('115300'))await db.exec('grant all on all tables in schema public to anon,authenticated,service_role;');
  await db.exec(await readFile(new URL(file,import.meta.url),'utf8'));
 }
 for(let n=1;n<=3;n++){
 await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)',[id(n),JSON.stringify({full_name:`Synthetic ${n}`,address:'private address',phone_number:'private phone'})]);
 await db.query('insert into auth.sessions values($1,$2)',[id(n+10),id(n)]);
 }
 const role=async(n)=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[id(n),JSON.stringify({session_id:id(n+10)})]);await db.exec('set role authenticated');};
 const server=async()=>{await db.exec('reset role; set role service_role');};
 await role(1);
 assert.equal((await db.query('select count(*)::int n from profile_contacts')).rows[0].n,1);
 assert.equal((await db.query('select address from profiles where id=$1',[id(2)])).rows[0].address,null);
 await db.query("update profiles set privacy_mode='private' where id=$1",[id(1)]);
 await assert.rejects(db.query('update profiles set address=$1 where id=$2',['leak',id(1)]));
 await assert.rejects(db.query('update profiles set avatar_url=$1 where id=$2',['data:image/svg+xml;base64,PHN2Zz4=',id(1)]));
 await role(2);assert.equal((await db.query('select count(*)::int n from profiles where id=$1',[id(1)])).rows[0].n,0);
 await assert.rejects(db.query("insert into diaries(author_id,content,category) values($1,'bypass','faith')",[id(2)]));
 await assert.rejects(db.query("select commit_content($1,'diaries','insert',$2)",[id(2),'{}']));
 await server();
 const create=async(record)=>(await db.query("select public.commit_content($1,'diaries','insert',$2) v",[id(1),JSON.stringify({content:'A safe reflection',category:'faith',...record})])).rows[0].v;
 const anonymous=await create({is_anonymous:true}); const hidden=await create({visibility:'private'});const locked=await create({allow_comments:false,allow_likes:false});
 await role(2);
 const a=(await db.query('select author_id,is_anonymous,public.owned_by_me(diaries) as mine from diaries where id=$1',[anonymous.id])).rows[0];
 assert.equal(a.author_id,null);assert.equal(a.is_anonymous,true);assert.equal(a.mine,false);
 assert.equal((await db.query('select count(*)::int n from diary_owners')).rows[0].n,0);
 assert.equal((await db.query('select count(*)::int n from diaries where id=$1',[hidden.id])).rows[0].n,0);
 await assert.rejects(db.query('insert into likes(user_id,post_id) values($1,$2)',[id(2),locked.id]));
 await server();
 for(const post of [locked,hidden])await assert.rejects(db.query("select public.commit_content($1,'comments','insert',$2)",[id(2),JSON.stringify({post_id:post.id,content:'blocked'})]));
 await db.query('update profiles set allow_dms=false where id=$1',[id(2)]);
 await assert.rejects(db.query("select public.commit_content($1,'chats','insert',$2)",[id(3),JSON.stringify({receiver_id:id(2),message:'blocked'})]));
 const c=(await db.query("select public.commit_content($1,'comments','insert',$2) v",[id(1),JSON.stringify({post_id:anonymous.id,content:'A thoughtful reply',is_anonymous:true})])).rows[0].v;assert.equal(c.author_id,null);
 for(let n=0;n<30;n++)assert.equal((await db.query("select consume_security_limit($1,'content') v",[id(1)])).rows[0].v,true);
 assert.equal((await db.query("select consume_security_limit($1,'content') v",[id(1)])).rows[0].v,false);
 await role(1);assert.equal((await db.query('select public.owned_by_me(diaries) mine from diaries where id=$1',[anonymous.id])).rows[0].mine,true);
 await db.exec('reset role');await db.query('delete from auth.sessions where user_id=$1',[id(1)]);
 await role(1);assert.equal((await db.query('select count(*)::int n from profiles')).rows[0].n,0);
 await server();await db.query('select purge_account_content($1)',[id(1)]);
 await db.exec('reset role');assert.equal((await db.query('select count(*)::int n from diaries')).rows[0].n,0);
 }finally{await db.close();}
});
