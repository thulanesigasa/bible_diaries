import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
test("launch eligibility, guardian authority, service bypass and report privacy are enforced in Postgres", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz default now(),raw_user_meta_data jsonb default '{}',banned_until timestamptz);
 create table auth.mfa_factors(id uuid default gen_random_uuid(),user_id uuid references auth.users,status text);
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
      "supabase/migrations/20261108142855_contextual_moderation.sql",
      "supabase/migrations/20261108191413_unified_admin_waitlist_and_notifications.sql",
      "supabase/migrations/20261109101535_launch_eligibility_and_reports.sql",
    ]) {
      if (f.includes("115300"))
        await db.exec(
          "grant all on all tables in schema public to anon,authenticated,service_role;",
        );
      await db.exec(
        await readFile(new URL("../../" + f, import.meta.url), "utf8"),
      );
    }

    for (let n = 1; n <= 7; n++) {
      await db.query(
        "insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
        [
          uid(n),
          `person${n}@example.invalid`,
          JSON.stringify({ full_name: "Synthetic", first_name: "Test" }),
        ],
      );
      await db.query("insert into auth.sessions(id,user_id) values($1,$2)", [
        uid(n + 10),
        uid(n),
      ]);
    }
    const role = async (n) => {
      await db.exec("reset role");
      await db.query(
        "select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",
        [uid(n), JSON.stringify({ session_id: uid(n + 10), aal: "aal2" })],
      );
      await db.exec("set role authenticated");
    };
    const rpc = async (name, args = []) =>
      (
        await db.query(
          `select ${name}(${args.map((_, i) => "$" + (i + 1)).join(",")}) v`,
          args,
        )
      ).rows[0].v;
    const setup = async (n, dob = "1990-01-01", guardian = null) => {
      await role(n);
      return rpc("complete_account_setup", [
        dob,
        guardian,
        true,
        "bd-launch-2026-11-09",
      ]);
    };
    await role(1);
    assert.equal((await rpc("eligibility_status")).setup_required, true);
    assert.equal(
      (await db.query("select private.active_member() v")).rows[0].v,
      false,
    );
    await assert.rejects(setup(1, "2020-01-01"));
    await assert.rejects(
      rpc("complete_account_setup", [
        "1990-01-01",
        null,
        false,
        "bd-launch-2026-11-09",
      ]),
    );
    assert.equal((await setup(1)).ready, true);
    await assert.rejects(setup(1));
    for (const n of [2, 3, 4, 6, 7]) await setup(n);
    const minor = await setup(5, "2011-01-01", "person4@example.invalid");
    assert.equal(minor.ready, false);
    assert.equal(minor.guardian_status, "pending");
    await db.exec("reset role");
    await db.query(
      "insert into private.moderation_memberships values($1,'moderator'),($2,'safety_reviewer')",
      [uid(2), uid(3)],
    );
    await role(1);
    await assert.rejects(rpc("guardian_decide", [uid(5), true, true, 1]));
    await role(4);
    assert.equal((await rpc("guardian_requests")).length, 1);
    await assert.rejects(rpc("guardian_decide", [uid(5), true, false, 1]));
    await rpc("guardian_decide", [uid(5), true, true, 1]);
    await role(5);
    assert.equal((await rpc("eligibility_status")).ready, true);
    await db.exec("reset role;set role service_role");
    const childPost = await rpc("moderated_submit", [
      uid(5),
      "diaries",
      "insert",
      JSON.stringify({
        content: "Teen reflection",
        category: "faith",
        visibility: "public",
      }),
      null,
      "ALLOW",
      "allow",
      "test",
      "[]",
      null,
    ]);
    await role(1);
    assert.equal(
      (
        await db.query("select id from diaries where id=$1", [
          childPost.data.id,
        ])
      ).rows.length,
      1,
    );
    await role(4);
    await rpc("guardian_decide", [uid(5), false, true, 2]);
    await assert.rejects(rpc("guardian_decide", [uid(5), true, true, 1]));
    await role(1);
    assert.equal(
      (
        await db.query("select id from diaries where id=$1", [
          childPost.data.id,
        ])
      ).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select id from profiles where id=$1", [uid(5)])).rows
        .length,
      0,
    );
    await role(5);
    assert.equal((await rpc("eligibility_status")).ready, false);
    await db.exec("reset role;set role service_role");
    await assert.rejects(
      rpc("moderated_submit", [
        uid(5),
        "diaries",
        "insert",
        JSON.stringify({ content: "blocked" }),
        null,
        "ALLOW",
        "allow",
        "test",
        "[]",
        null,
      ]),
    );
    const published = await rpc("moderated_submit", [
      uid(1),
      "diaries",
      "insert",
      JSON.stringify({
        category: "faith",
        content: "Public report target",
        visibility: "public",
      }),
      null,
      "ALLOW",
      "allow",
      "test",
      "[]",
      null,
    ]);
    const post = published.data.id;
    const privatePost = await rpc("moderated_submit", [
      uid(1),
      "diaries",
      "insert",
      JSON.stringify({
        category: "faith",
        content: "Private text",
        visibility: "private",
      }),
      null,
      "ALLOW",
      "allow",
      "test",
      "[]",
      null,
    ]);
    const chat = await rpc("moderated_submit", [
      uid(1),
      "chats",
      "insert",
      JSON.stringify({ message: "Private message", receiver_id: uid(6) }),
      null,
      "ALLOW",
      "allow",
      "test",
      "[]",
      null,
    ]);
    await role(6);
    await assert.rejects(
      rpc("submit_safety_report", [
        "diaries",
        privatePost.data.id,
        "privacy",
        "",
        false,
        false,
      ]),
    );
    await assert.rejects(
      rpc("submit_safety_report", [
        "chats",
        chat.data.id,
        "privacy",
        "",
        false,
        false,
      ]),
    );
    const report = await rpc("submit_safety_report", [
      "diaries",
      post,
      "harassment",
      "Please investigate",
      false,
      true,
    ]);
    assert.ok(report.id);
    assert.equal(
      (
        await rpc("submit_safety_report", [
          "diaries",
          post,
          "other",
          "",
          false,
          false,
        ])
      ).duplicate,
      true,
    );
    const privateReport = await rpc("submit_safety_report", [
      "chats",
      chat.data.id,
      "privacy",
      "Relevant message",
      true,
      false,
    ]);
    assert.ok(privateReport.id);
    await assert.rejects(db.exec("select * from private.safety_reports"));
    await assert.rejects(rpc("safety_report_list", [true]));
    await role(2);
    await db.query("select set_config('request.jwt.claims',$1,false)", [
      JSON.stringify({ session_id: uid(12), aal: "aal1" }),
    ]);
    await assert.rejects(rpc("safety_report_list", [true]));
    await assert.rejects(rpc("moderation_list", [true]));
    await db.exec("reset role");
    await db.query(
      "insert into auth.mfa_factors(user_id,status) values($1,'verified')",
      [uid(7)],
    );
    await role(7);
    await db.query("select set_config('request.jwt.claims',$1,false)", [
      JSON.stringify({ session_id: uid(17), aal: "aal1" }),
    ]);
    assert.equal(await rpc("account_access"), false);
    assert.equal((await rpc("eligibility_status")).mfa_required, true);
    await role(7);
    await assert.rejects(
      rpc("submit_safety_report", [
        "chats",
        chat.data.id,
        "privacy",
        "",
        true,
        false,
      ]),
    );
    assert.equal((await rpc("safety_report_list", [false])).length, 0);
    await role(2);
    let queue = await rpc("safety_report_list", [true]);
    assert.equal(queue.length, 1);
    assert.equal(queue[0].reporter_id, undefined);
    await assert.rejects(
      rpc("safety_report_action", [
        privateReport.id,
        1,
        "dismissed",
        "Insufficient evidence",
      ]),
    );
    await role(3);
    queue = await rpc("safety_report_list", [true]);
    assert.equal(queue.length, 2);
    assert.ok(queue.some((x) => x.reported_text === "Private message"));
    await rpc("safety_report_action", [
      report.id,
      1,
      "removed",
      "Removed after policy review",
    ]);
    await assert.rejects(
      rpc("safety_report_action", [
        report.id,
        1,
        "dismissed",
        "Repeated action",
      ]),
    );
    await role(6);
    const mine = await rpc("safety_report_list", [false]);
    assert.equal(mine.find((x) => x.id === report.id).status, "removed");
    assert.ok(mine.every((x) => x.reported_text === null));
    await db.exec("reset role");
    await db.query("delete from auth.sessions where user_id=$1", [uid(3)]);
    await role(3);
    await assert.rejects(rpc("safety_report_list", [true]));
    await db.exec("reset role");
    await db.query("delete from auth.users where id=$1", [uid(4)]);
    await role(5);
    const orphan = await rpc("eligibility_status");
    assert.equal(orphan.ready, false);
    assert.equal(orphan.guardian_email, null);
    assert.equal(orphan.guardian_status, "revoked");
  } finally {
    await db.close();
  }
});
