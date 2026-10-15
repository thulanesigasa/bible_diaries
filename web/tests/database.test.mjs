import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
test('database enforces duplicates, private access, platform constraints and durable rate limits', async () => {
  const db = new PGlite();
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
    await db.exec(await readFile(new URL('../database/waitlist.sql', import.meta.url), 'utf8'));
    const join = (email, ip = 'a'.repeat(64), platform = 'android') => db.query('select public.bible_diaries_join_waitlist($1, $2, true, $3) as result', [email, platform, ip]);
    await db.exec('set role service_role;');
    assert.equal((await join('First@Example.com')).rows[0].result, 'accepted');
    assert.equal((await join('first@example.com', 'a'.repeat(64), 'ios')).rows[0].result, 'accepted');
    const records = (await db.query('select * from public.bible_diaries_waitlist')).rows;
    assert.equal(records.length, 1); assert.equal(records[0].email, 'first@example.com'); assert.equal(records[0].platform, 'android'); assert.equal(records[0].notice_version, '2026-10-15');
    for (let i = 0; i < 3; i++) await join(`person${i}@example.com`);
    assert.equal((await join('blocked@example.com')).rows[0].result, 'rate_limited');
    assert.equal((await db.query("select count(*)::int as n from public.bible_diaries_waitlist where email = 'blocked@example.com'")).rows[0].n, 0);
    await db.exec("update public.bible_diaries_waitlist_limits set window_start = now() - interval '16 minutes';");
    assert.equal((await join('later@example.com')).rows[0].result, 'accepted');
    await assert.rejects(join('bad@example.com', 'b'.repeat(64), 'invalid'));
    await db.exec('reset role;');
    const security = (await db.query("select relname, relrowsecurity from pg_class where relname in ('bible_diaries_waitlist', 'bible_diaries_waitlist_limits')")).rows;
    assert.ok(security.every(row => row.relrowsecurity));
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role};`);
      await assert.rejects(db.query('select * from public.bible_diaries_waitlist'));
      await assert.rejects(join('stranger@example.com'));
      await db.exec('reset role;');
    }
  } finally { await db.close(); }
});
