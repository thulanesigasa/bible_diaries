import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createPasswordCapture } from "../../mobile/src/lib/password-capture.mjs";
import { isQuietTime } from "../../shared/diary-settings.mjs";
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
test("capture guard releases after pending enable and rapid field transitions", async () => {
  const calls = [];
  let release;
  const pending = new Promise((r) => (release = r));
  const guard = createPasswordCapture(
    {
      preventScreenCaptureAsync: async () => {
        calls.push("enable");
        await pending;
      },
      allowScreenCaptureAsync: async () => calls.push("disable"),
    },
    "test",
  );
  guard.focus();
  guard.blur();
  guard.focus();
  const done = guard.dispose();
  release();
  await done;
  assert.deepEqual(calls, ["enable", "enable", "disable"]);
});
test("quiet hours use local time, wrap midnight and include start but exclude end", () => {
  const settings = {
    quiet_enabled: true,
    quiet_start: "22:00",
    quiet_end: "07:00",
  };
  assert.equal(isQuietTime(settings, new Date(2026, 0, 1, 22)), true);
  assert.equal(isQuietTime(settings, new Date(2026, 0, 1, 6, 59)), true);
  assert.equal(isQuietTime(settings, new Date(2026, 0, 1, 7)), false);
});
test("activity and achievements are owner-only, non-forgeable, anonymous-aware and block-aware", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}',banned_until timestamptz);
 create table auth.sessions(id uuid primary key,user_id uuid references auth.users on delete cascade,created_at timestamptz default now(),updated_at timestamptz default now(),user_agent text);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 grant usage on schema auth to anon,authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(bucket_id text,owner uuid,name text);alter table storage.objects enable row level security;
 create function public.rls_auto_enable() returns event_trigger language plpgsql security definer as $$begin end$$;`);
    for (const f of [
      "schema.sql",
      "supabase/migrations/20261101115300_security_audit_baseline.sql",
      "supabase/migrations/20261101122925_enforce_app_security.sql",
      "supabase/migrations/20261108135008_diary_settings_activity.sql",
    ]) {
      if (f.includes("115300"))
        await db.exec(
          "grant all on all tables in schema public to anon,authenticated,service_role;",
        );
      await db.exec(
        await readFile(new URL("../../" + f, import.meta.url), "utf8"),
      );
    }
    for (let n = 1; n <= 3; n++) {
      await db.query(
        "insert into auth.users(id,raw_user_meta_data) values($1,$2)",
        [id(n), JSON.stringify({ full_name: "Synthetic " + n })],
      );
      await db.query("insert into auth.sessions(id,user_id) values($1,$2)", [
        id(n + 10),
        id(n),
      ]);
    }
    const role = async (n) => {
      await db.exec("reset role");
      await db.query(
        "select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",
        [id(n), JSON.stringify({ session_id: id(n + 10) })],
      );
      await db.exec("set role authenticated");
    };
    const server = () => db.exec("reset role;set role service_role");
    await role(2);
    await db.query("insert into reflection_subscriptions values($1,$2)", [
      id(2),
      id(1),
    ]);
    await server();
    const create = async (actor, record = {}) =>
      (
        await db.query("select commit_content($1,'diaries','insert',$2) p", [
          id(actor),
          JSON.stringify({
            content: "A real reflection",
            category: "faith",
            ...record,
          }),
        ])
      ).rows[0].p;
    const post = await create(1);
    await role(1);
    assert.equal(
      (await db.query("select count(*)::int n from diary_achievements")).rows[0]
        .n,
      1,
    );
    await assert.rejects(
      db.query(
        "insert into diary_achievements(user_id,achievement_id) values($1,$2)",
        [id(1), "reflection-50"],
      ),
    );
    await role(2);
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from diary_activity where kind='post'",
        )
      ).rows[0].n,
      1,
    );
    await db.query("insert into likes values($1,$2)", [post.id, id(2)]);
    await db.query("insert into favorites(user_id,post_id) values($1,$2)", [
      id(2),
      post.id,
    ]);
    await db.query(
      "insert into reflection_shares(user_id,post_id) values($1,$2)",
      [id(2), post.id],
    );
    await assert.rejects(
      db.query(
        "insert into diary_activity(recipient_id,post_id,kind,source_key) values($1,$2,$3,$4)",
        [id(1), post.id, "like", "forged"],
      ),
    );
    await server();
    await db.query("select commit_content($1,'comments','insert',$2)", [
      id(2),
      JSON.stringify({
        post_id: post.id,
        content: "Anonymous encouragement",
        is_anonymous: true,
      }),
    ]);
    await role(1);
    const activity = (
      await db.query(
        "select id,actor_id,post_id,kind,read_at from diary_activity order by kind",
      )
    ).rows;
    assert.equal(activity.length, 4);
    assert.equal(activity.find((x) => x.kind === "bookmark").actor_id, null);
    assert.equal(activity.find((x) => x.kind === "comment").actor_id, null);
    assert.equal(activity.find((x) => x.kind === "like").actor_id, id(2));
    await assert.rejects(db.query("select source_key from diary_activity"));
    await assert.rejects(
      db.query("update diary_activity set actor_id=$1", [id(3)]),
    );
    await db.exec("update diary_activity set read_at=now()");
    await role(3);
    assert.equal(
      (await db.query("select count(*)::int n from diary_activity")).rows[0].n,
      0,
    );
    assert.equal(
      (await db.query("select count(*)::int n from diary_achievements")).rows[0]
        .n,
      0,
    );
    await role(1);
    await db.query(
      "insert into blocked_accounts(user_id,blocked_user_id) values($1,$2)",
      [id(1), id(2)],
    );
    await role(1);
    assert.equal(
      (await db.query("select count(*)::int n from diary_activity")).rows[0].n,
      0,
    );
    await role(2);
    assert.equal(
      (
        await db.query("select count(*)::int n from diaries where id=$1", [
          post.id,
        ])
      ).rows[0].n,
      0,
    );
    await server();
    await assert.rejects(
      db.query("select commit_content($1,'chats','insert',$2)", [
        id(2),
        JSON.stringify({ receiver_id: id(1), message: "blocked" }),
      ]),
    );
    await role(1);
    await db.query(
      "insert into diary_settings(user_id,notify_likes) values($1,false)",
      [id(1)],
    );
    const sessions = (await db.query("select my_diary_sessions() s")).rows[0].s;
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].current, true);
    await db.exec("reset role");
    await db.query("delete from auth.sessions where user_id=$1", [id(1)]);
    await role(1);
    assert.equal(
      (await db.query("select count(*)::int n from diary_achievements")).rows[0]
        .n,
      0,
    );
  } finally {
    await db.close();
  }
});

test("PIN hashing, lockout escalation and encrypted backup interoperability", async () => {
  const { derivePinHash, constantTimeEqual, failedPinAttempt, encryptBackup } =
    await import("../../mobile/src/lib/security-crypto.mjs");
  const { webcrypto } = await import("node:crypto");
  const salt = webcrypto.getRandomValues(new Uint8Array(16)),
    iv = webcrypto.getRandomValues(new Uint8Array(12));
  const hex = (a) => Buffer.from(a).toString("hex");
  const hash = await derivePinHash("123456", hex(salt));
  assert.equal(
    constantTimeEqual(hash, await derivePinHash("123456", hex(salt))),
    true,
  );
  assert.equal(
    constantTimeEqual(hash, await derivePinHash("123457", hex(salt))),
    false,
  );
  assert.equal(failedPinAttempt(3, 1000).retryAt, 0);
  assert.equal(failedPinAttempt(4, 1000).retryAt, 31000);
  assert.equal(failedPinAttempt(99, 1000).retryAt, 901000);
  const password = "A long export passphrase",
    text = '{"reflections":["private"]}',
    backup = JSON.parse(await encryptBackup(text, password, salt, iv));
  const keyMaterial = await webcrypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  const key = await webcrypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: backup.iterations, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
  const ciphertext = Buffer.from(backup.ciphertext, "hex");
  assert.equal(
    new TextDecoder().decode(
      await webcrypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext),
    ),
    text,
  );
  ciphertext[0] ^= 1;
  await assert.rejects(
    webcrypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext),
  );
  await assert.rejects(encryptBackup(text, "short", salt, iv));
});
