import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('audit baseline revokes privileged client operations while preserving signup trigger execution', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth; create schema storage;
      create table auth.users(id uuid primary key);
      create table public.profiles(id uuid primary key);
      create table public.diaries(id uuid); create table public.comments(id uuid);
      create table public.likes(id uuid); create table public.comment_likes(id uuid);
      create table public.favorites(id uuid); create table public.chats(id uuid);
      create table storage.buckets(id text, file_size_limit bigint, allowed_mime_types text[]);
      insert into storage.buckets(id) values ('avatars'),('other');
      create function public.handle_new_user() returns trigger language plpgsql security definer as $$
        begin insert into public.profiles(id) values(new.id); return new; end $$;
      create function public.rls_auto_enable() returns event_trigger language plpgsql security definer as $$begin end$$;
      create trigger signup after insert on auth.users for each row execute function public.handle_new_user();
      grant all on all tables in schema public to anon,authenticated;
      grant execute on function public.handle_new_user(),public.rls_auto_enable() to anon,authenticated;
    `);
    await db.exec(await readFile(new URL('../../supabase/migrations/20261101115300_security_audit_baseline.sql', import.meta.url), 'utf8'));
    for (const role of ['anon', 'authenticated']) {
      for (const fn of ['handle_new_user','rls_auto_enable']) {
        assert.equal((await db.query('select has_function_privilege($1,$2,\'EXECUTE\') as allowed',[role,`public.${fn}()`])).rows[0].allowed,false);
      }
      for (const table of ['profiles','diaries','comments','likes','comment_likes','favorites','chats']) {
        for (const operation of ['TRUNCATE','REFERENCES','TRIGGER']) {
          assert.equal((await db.query('select has_table_privilege($1,$2,$3) as allowed',[role,`public.${table}`,operation])).rows[0].allowed,false);
        }
        assert.equal((await db.query('select has_table_privilege($1,$2,\'SELECT\') as allowed',[role,`public.${table}`])).rows[0].allowed,true);
      }
    }
    await db.exec("insert into auth.users(id) values ('00000000-0000-4000-8000-000000000001');");
    assert.equal((await db.query('select count(*)::int as n from profiles')).rows[0].n,1);
    const avatar = (await db.query("select * from storage.buckets where id='avatars'")).rows[0];
    assert.equal(Number(avatar.file_size_limit),10485760);
    assert.deepEqual(avatar.allowed_mime_types,['image/jpeg','image/png','image/webp']);
    assert.equal((await db.query("select file_size_limit from storage.buckets where id='other'")).rows[0].file_size_limit,null);
    assert.deepEqual((await db.query("select proconfig from pg_proc where proname='handle_new_user'")).rows[0].proconfig,['search_path=pg_catalog']);
  } finally { await db.close(); }
});
