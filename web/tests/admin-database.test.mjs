import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
test('admin SQL returns accurate SAST aggregates and is inaccessible to app visitors',async()=>{
  const db = new PGlite();
  try {
    await db.exec('create role anon;create role authenticated;create role service_role bypassrls;');
    await db.exec(await readFile(new URL('../database/waitlist.sql',import.meta.url),'utf8'));
    await db.exec(await readFile(new URL('../database/admin.sql',import.meta.url),'utf8'));
    await db.exec("insert into public.bible_diaries_waitlist(email,platform,consented_at) values ('today@example.com','android',now()),('two@example.com','huawei',now()-interval '2 days'),('ten@example.com','ios',now()-interval '10 days'),('old@example.com','any',now()-interval '40 days');");
    await db.exec('set role service_role;');
    let data=(await db.query('select public.bible_diaries_waitlist_stats() as data')).rows[0].data;
    assert.equal(data.total,4);assert.equal(data.today,1);assert.equal(data.last7Days,2);assert.equal(data.last30Days,3);assert.equal(data.timezone,'Africa/Johannesburg');assert.equal(data.daily.length,30);assert.equal(data.daily.reduce((n,row)=>n+row.count,0),3);assert.deepEqual(data.platforms,{android:1,huawei:1,ios:1,any:1});assert.ok(!JSON.stringify(data).includes('@example.com'));
    // Just before local midnight belongs to yesterday, even though UTC may still be the same date.
    await db.exec("insert into public.bible_diaries_waitlist(email,platform,consented_at) values ('boundary@example.com','android',((now() at time zone 'Africa/Johannesburg')::date::timestamp at time zone 'Africa/Johannesburg') - interval '1 second');");
    data=(await db.query('select public.bible_diaries_waitlist_stats() as data')).rows[0].data;
    assert.equal(data.today,1);assert.equal(data.last7Days,3);
    for(const role of ['anon','authenticated']){
      await db.exec(`reset role;set role ${role};`);
      await assert.rejects(db.query('select public.bible_diaries_waitlist_stats()'));
      await assert.rejects(db.query('select * from public.bible_diaries_admin_limits'));
      await assert.rejects(db.query('select public.bible_diaries_admin_login_attempt($1,$2)',['a'.repeat(64),'b'.repeat(64)]));
    }
  } finally { await db.close(); }
});
test('admin login limits persist across IP/account combinations and reset after the window',async()=>{
  const db=new PGlite();
  try {
    await db.exec('create role anon;create role authenticated;create role service_role bypassrls;');
    await db.exec(await readFile(new URL('../database/waitlist.sql',import.meta.url),'utf8'));
    await db.exec(await readFile(new URL('../database/admin.sql',import.meta.url),'utf8'));
    await db.exec('set role service_role;');
    const attempt=async(ip,email)=>(await db.query('select public.bible_diaries_admin_login_attempt($1,$2) as allowed',[ip,email])).rows[0].allowed;
    for(let i=0;i<5;i++)assert.equal(await attempt('a'.repeat(64),'b'.repeat(64)),true);
    assert.equal(await attempt('c'.repeat(64),'b'.repeat(64)),false,'Same account blocked from a new IP');
    for(let i=0;i<15;i++)assert.equal(await attempt('a'.repeat(64),String(i).padStart(64,'0')),true);
    assert.equal(await attempt('a'.repeat(64),'d'.repeat(64)),false,'IP limited across different accounts');
    await db.exec("update public.bible_diaries_admin_limits set window_start=now()-interval '16 minutes';");
    assert.equal(await attempt('a'.repeat(64),'b'.repeat(64)),true);
    const rls=(await db.query("select relrowsecurity from pg_class where relname='bible_diaries_admin_limits'")).rows[0];assert.equal(rls.relrowsecurity,true);
  } finally { await db.close(); }
});
