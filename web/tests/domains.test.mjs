import { test } from "node:test";
import assert from "node:assert/strict";
import { siteRole, siteLinks } from "../src/lib/deployment.mjs";
import {
  adminConfiguration,
  getAdminUser,
  handleAdminSubscribers,
} from "../src/lib/admin.mjs";
import { handleWaitlist, PROJECT_URL } from "../src/lib/waitlist.mjs";
import {
  getModeratorUser,
  handleModerationQueue,
  handleModerationDecision,
  handleModerationLogin,
  moderationCookieName,
} from "../src/lib/moderation-admin.mjs";
const id = "11111111-1111-4111-8111-111111111111",
  token = "test.jwt.authorised_access_token_with_enough_characters";
const user = {
  factors: [
    {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      factor_type: "totp",
      status: "verified",
    },
  ],
  id,
  email: "moderator@example.invalid",
  email_confirmed_at: "2026-11-08T00:00:00Z",
  is_anonymous: false,
};
const env = {
  SITE_ROLE: "admin",
  NODE_ENV: "production",
  SITE_URL: "https://biblediaries.co.za",
  MAIN_SITE_URL: "https://biblediaries.co.za",
  WAITLIST_URL: "https://waiting.biblediaries.co.za",
  SUPABASE_URL: PROJECT_URL,
  SUPABASE_PUBLISHABLE_KEY: "public",
  SUPABASE_SERVICE_ROLE_KEY: "server",
  ADMIN_RATE_LIMIT_SALT: "a".repeat(32),
  WAITLIST_TRUSTED_IP_HEADER: "x-test-ip",
  ADMIN_USER_IDS: "",
};
const request = (path, body, origin = env.SITE_URL) =>
  new Request(env.SITE_URL + path, {
    method: body ? "POST" : "GET",
    headers: {
      origin,
      "content-type": "application/json",
      "x-test-ip": "192.0.2.1",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
function backend({ staff = true, active = true, conflict = false } = {}) {
  const calls = [];
  return {
    calls,
    fetcher: async (url, options = {}) => {
      calls.push({ url, options });
      if (url.includes("/auth/v1/factors/"))
        return Response.json(
          url.endsWith("/challenge")
            ? { id: "challenge" }
            : { access_token: token, expires_in: 3600 },
        );
      if (url.endsWith("/auth/v1/user")) return Response.json(user);
      if (url.endsWith("/rpc/waitlist_is_admin")) return Response.json(active);
      if (url.endsWith("/rpc/session_is_active")) return Response.json(active);
      if (url.endsWith("/rpc/moderation_stats"))
        return Response.json(staff ? { pending: 1 } : { error: "denied" }, {
          status: staff ? 200 : 403,
        });
      if (url.includes("/auth/v1/token?"))
        return Response.json({ access_token: token, expires_in: 3600 });
      if (url.endsWith("/rpc/bible_diaries_admin_login_attempt"))
        return Response.json(true);
      if (url.endsWith("/rpc/moderation_list"))
        return Response.json([
          {
            id,
            target: "diaries",
            version: 1,
            status: "pending",
            reason: "context",
            policy_version: "v2",
            private_content: false,
            consented: false,
            created_at: "2026-11-08T00:00:00Z",
            owner_id: "hidden-owner",
            record: {
              content: "Held public reflection",
              receiver_id: "hidden-recipient",
            },
            category_scores: { secret: 1 },
          },
        ]);
      if (url.endsWith("/rpc/moderation_action"))
        return Response.json(
          conflict ? { error: "stale" } : { success: true },
          { status: conflict ? 409 : 200 },
        );
      if (url.includes("/rest/v1/bible_diaries_waitlist?"))
        return Response.json(
          Array.from({ length: 51 }, (_, n) => ({
            email: `member${n}@example.invalid`,
            platform: "android",
            consented_at: "2026-11-08T00:00:00Z",
            ip_hash: "hidden-hash",
          })),
        );
      throw Error("Unexpected request " + url);
    },
  };
}
test("explicit host roles select signup links without trusting request host data", async () => {
  assert.equal(siteRole({}), "combined");
  assert.equal(siteLinks(env).signup, "https://waiting.biblediaries.co.za");
  assert.equal(
    siteLinks({ ...env, SITE_ROLE: "waitlist" }).signup,
    "/#waitlist",
  );
  assert.throws(() => siteRole({ SITE_ROLE: "unknown" }));
  assert.throws(() =>
    siteLinks({ ...env, WAITLIST_URL: "https://evil.example/path" }),
  );
  assert.equal(
    (
      await handleWaitlist(request("/api/waitlist", {}), {
        env,
        fetcher: () => {
          throw Error("No backend call allowed");
        },
      })
    ).status,
    404,
  );
  assert.equal(adminConfiguration({ ...env, SITE_ROLE: "waitlist" }), null);
  assert.equal(
    await getModeratorUser(token, {
      env: { ...env, SITE_ROLE: "waitlist" },
      fetcher: () => {
        throw Error();
      },
    }),
    null,
  );
});
test("moderator login uses its own cookie and live DB membership, not waitlist allowlist or editable metadata", async () => {
  let b = backend();
  const r = await handleModerationLogin(
    request("/api/moderation/login", {
      email: user.email,
      password: "test-password",
      code: "123456",
    }),
    { env: { ...env, ADMIN_USER_IDS: "" }, ...b },
  );
  assert.equal(r.status, 200);
  assert.match(r.headers.get("set-cookie"), /__Host-bible-diaries-moderation=/);
  assert.ok(r.headers.get("set-cookie").includes("HttpOnly"));
  assert.ok(!r.headers.get("set-cookie").includes("Domain="));
  assert.notEqual(moderationCookieName(env), "__Host-bible-diaries-admin");
  b = backend({ staff: false });
  assert.equal(await getModeratorUser(token, { env, ...b }), null);
  assert.equal(
    (
      await handleModerationQueue(request("/api/moderation/queue"), token, {
        env,
        ...b,
      })
    ).status,
    401,
  );
  assert.ok(!b.calls.some((c) => c.url.endsWith("/rpc/moderation_list")));
});
test("moderation API strips hidden identities, rejects sibling-origin actions and handles stale decisions", async () => {
  let b = backend();
  const r = await handleModerationQueue(
    request("/api/moderation/queue"),
    token,
    { env, ...b },
  );
  assert.equal(r.status, 200);
  const text = await r.text();
  assert.ok(!/hidden-owner|hidden-recipient|category_scores/.test(text));
  const body = {
    submission: id,
    expected_version: 1,
    action: "reject",
    note: "Please remove the targeted insult.",
  };
  assert.equal(
    (
      await handleModerationDecision(
        request(
          "/api/moderation/decision",
          body,
          "https://waiting.biblediaries.co.za",
        ),
        token,
        { env, ...b },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await handleModerationDecision(
        request("/api/moderation/decision", { ...body, action: "grant_admin" }),
        token,
        { env, ...b },
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await handleModerationDecision(
        request("/api/moderation/decision", body),
        token,
        { env, ...b },
      )
    ).status,
    200,
  );
  b = backend({ conflict: true });
  assert.equal(
    (
      await handleModerationDecision(
        request("/api/moderation/decision", body),
        token,
        { env, ...b },
      )
    ).status,
    409,
  );
});
test("subscriber list is paginated, server-only, allowlisted and denies revoked sessions and main-domain access", async () => {
  const waiting = { ...env, SITE_ROLE: "admin", ADMIN_USER_IDS: id };
  let b = backend();
  let r = await handleAdminSubscribers(token, 0, { env: waiting, ...b });
  assert.equal(r.status, 200);
  const d = await r.json();
  assert.equal(d.records.length, 50);
  assert.equal(d.hasMore, true);
  assert.equal(d.records[0].ip_hash, undefined);
  assert.ok(
    b.calls.find((c) => c.url.includes("bible_diaries_waitlist?")).options
      .headers.Authorization === "Bearer server",
  );
  b = backend({ active: false });
  r = await handleAdminSubscribers(token, 0, { env: waiting, ...b });
  assert.equal(r.status, 401);
  assert.ok(!b.calls.some((c) => c.url.includes("bible_diaries_waitlist?")));
  assert.equal(
    (
      await handleAdminSubscribers(token, 0, {
        env: { ...env, SITE_ROLE: "waitlist" },
        ...backend(),
      })
    ).status,
    401,
  );
  assert.equal(
    (await handleAdminSubscribers(token, -1, { env: waiting, ...backend() }))
      .status,
    400,
  );
  b = backend();
  const outsider = {
    ...waiting,
    ADMIN_USER_IDS: "22222222-2222-4222-8222-222222222222",
  };
  assert.equal(await getAdminUser(token, { env: outsider, ...b }), null);
});
