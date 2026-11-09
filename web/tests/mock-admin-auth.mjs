// Test-process import only. The application has no test bypass or alternate backend setting.
import { PROJECT_URL } from "../src/lib/waitlist.mjs";
const originalFetch = globalThis.fetch;
const adminToken = "test.jwt.admin_access_token_with_enough_characters";
const mainToken = "test.jwt.main_admin_access_token_with_enough_characters";
const strangerToken = "test.jwt.stranger_access_token_with_enough_characters";
const user = {
  factors: [
    {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      factor_type: "totp",
      status: "verified",
    },
  ],
  id: "11111111-1111-4111-8111-111111111111",
  email: "admin@example.com",
  email_confirmed_at: "2026-10-15T08:00:00Z",
  is_anonymous: false,
};
globalThis.fetch = async (input, options = {}) => {
  const url = String(input);
  if (!url.startsWith(PROJECT_URL + "/")) return originalFetch(input, options);
  if (url.includes("/rpc/waitlist_is_admin"))
    return Response.json(
      new Headers(options.headers).get("authorization") ===
        "Bearer " + adminToken,
    );
  if (url.includes("/rpc/session_is_active")) return Response.json(true);
  if (url.includes("/rpc/bible_diaries_admin_login_attempt"))
    return Response.json(true);
  if (url.includes("/auth/v1/token?grant_type=password")) {
    const body = JSON.parse(options.body);
    if (body.password !== "test-password")
      return Response.json({ error: "Invalid credentials" }, { status: 400 });
    return Response.json({
      access_token:
        body.email === user.email
          ? adminToken
          : body.email === "mainadmin@example.invalid"
            ? mainToken
            : strangerToken,
      expires_in: 3600,
    });
  }
  if (url.includes("/auth/v1/factors/"))
    return Response.json(
      url.endsWith("/challenge")
        ? { id: "challenge" }
        : {
            access_token: new Headers(options.headers)
              .get("authorization")
              .slice(7),
            expires_in: 3600,
          },
    );
  if (url.includes("/rpc/safety_report_list")) return Response.json([]);
  if (url.includes("/auth/v1/user")) {
    const authorization = new Headers(options.headers).get("authorization");
    if (authorization === "Bearer " + adminToken) return Response.json(user);
    if (authorization === "Bearer " + mainToken)
      return Response.json({
        ...user,
        id: "33333333-3333-4333-8333-333333333333",
        email: "mainadmin@example.invalid",
      });
    if (authorization === "Bearer " + strangerToken)
      return Response.json({
        ...user,
        id: "22222222-2222-4222-8222-222222222222",
        email: "stranger@example.com",
        user_metadata: { admin: true },
      });
    return Response.json({ error: "Invalid token" }, { status: 401 });
  }
  if (url.includes("/rpc/bible_diaries_waitlist_stats"))
    return Response.json({
      total: 4,
      today: 1,
      last7Days: 2,
      last30Days: 4,
      latestSignup: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timezone: "Africa/Johannesburg",
      platforms: { android: 1, huawei: 1, ios: 1, any: 1 },
      daily: Array.from({ length: 30 }, (_, index) => ({
        date: new Date(Date.now() - (29 - index) * 86400000)
          .toISOString()
          .slice(0, 10),
        count: index >= 26 ? 1 : 0,
      })),
    });
  if (url.includes("/rpc/moderation_stats"))
    return new Headers(options.headers).get("authorization") ===
      "Bearer " + mainToken
      ? Response.json({ pending: 1 })
      : Response.json({ error: "denied" }, { status: 403 });
  if (url.includes("/rpc/moderation_list"))
    return Response.json([
      {
        id: "33333333-3333-4333-8333-333333333333",
        target: "diaries",
        status: "pending",
        version: 1,
        reason: "context",
        policy_version: "v2",
        categories: ["harassment"],
        private_content: false,
        consented: false,
        created_at: new Date().toISOString(),
        owner_id: "hidden-owner",
        author: {
          first_name: "Test",
          surname: "Author",
          email: "author@example.invalid",
        },
        record: {
          content: "Synthetic held reflection",
          receiver_id: "hidden-recipient",
        },
      },
    ]);
  if (url.includes("/rpc/moderation_action"))
    return Response.json({ success: true });
  if (url.includes("/rest/v1/bible_diaries_waitlist?"))
    return Response.json(
      Array.from({ length: 4 }, (_, n) => ({
        first_name: "Waiting",
        surname: "Member",
        phone_e164: "+27821234567",
        phone_country: "ZA",
        gender: "female",
        email: `subscriber${n}@example.invalid`,
        platform: "android",
        consented_at: new Date().toISOString(),
      })),
    );
  if (url.includes("/auth/v1/logout"))
    return new Response(null, { status: 204 });
  throw new Error("Unexpected mocked backend request");
};
