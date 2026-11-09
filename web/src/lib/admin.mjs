import { adminEnabled } from "./deployment.mjs";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { PROJECT_URL, normalizeEmail } from "./waitlist.mjs";
import { siteOrigin } from "./seo.mjs";

export function adminCookieName(env = process.env) {
  return env.NODE_ENV === "production"
    ? "__Host-bible-diaries-admin"
    : "bible-diaries-admin";
}
export function adminConfiguration(env = process.env) {
  if (!adminEnabled(env)) return null;
  const ids = (env.ADMIN_USER_IDS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const key = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY;
  const secret = env.SUPABASE_SERVICE_ROLE_KEY;
  const salt = env.ADMIN_RATE_LIMIT_SALT;
  const ipHeader = env.WAITLIST_TRUSTED_IP_HEADER;
  if (
    env.SUPABASE_URL !== PROJECT_URL ||
    !ids.length ||
    ids.some(
      (id) =>
        !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
          id,
        ),
    ) ||
    !key ||
    !secret ||
    !salt ||
    salt.length < 32 ||
    !ipHeader ||
    !/^[a-z0-9-]+$/i.test(ipHeader)
  )
    return null;
  try {
    const origin = siteOrigin(env);
    if (
      !origin ||
      (env.NODE_ENV === "production" && !origin.startsWith("https://"))
    )
      return null;
    return { ids, key, secret, salt, ipHeader, origin };
  } catch {
    return null;
  }
}
export function privateReply(status, body) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
export async function getAdminUser(
  token,
  { env = process.env, fetcher = fetch } = {},
) {
  const config = adminConfiguration(env);
  if (
    !config ||
    typeof token !== "string" ||
    token.length > 8192 ||
    !/^[A-Za-z0-9_.-]{20,}$/.test(token)
  )
    return null;
  try {
    const response = await fetcher(`${PROJECT_URL}/auth/v1/user`, {
      headers: { apikey: config.key, Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const user = await response.json();
    // Validate with Auth on every protected request. Never authorize user_metadata or a decoded-only JWT.
    if (
      !config.ids.includes(user.id) ||
      !normalizeEmail(user.email) ||
      typeof user.email_confirmed_at !== "string" ||
      !Number.isFinite(Date.parse(user.email_confirmed_at)) ||
      user.is_anonymous
    )
      return null;
    const active = await fetcher(
      `${PROJECT_URL}/rest/v1/rpc/session_is_active`,
      {
        method: "POST",
        headers: {
          apikey: config.key,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: "{}",
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!active.ok || (await active.json()) !== true) return null;
    const membership = await fetcher(
      `${PROJECT_URL}/rest/v1/rpc/waitlist_is_admin`,
      {
        method: "POST",
        headers: {
          apikey: config.key,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: "{}",
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!membership.ok || (await membership.json()) !== true) return null;
    return { id: user.id, email: user.email };
  } catch {
    return null;
  }
}
export async function boundedJson(request) {
  if (
    !/^application\/json(?:\s*;|$)/i.test(
      request.headers.get("content-type") || "",
    )
  )
    throw new Error();
  const reader = request.body?.getReader();
  if (!reader) throw new Error();
  let length = 0;
  const parts = [];
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 4096) {
        await reader.cancel();
        throw new Error();
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(Buffer.concat(parts).toString("utf8"));
}
function rpc(config, name, body, fetcher) {
  return fetcher(`${PROJECT_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: config.secret,
      Authorization: `Bearer ${config.secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
}
export async function handleAdminLogin(
  request,
  {
    env = process.env,
    fetcher = fetch,
    configuration = adminConfiguration,
    authorize = getAdminUser,
    cookieName = adminCookieName,
    scope = "waitlist",
  } = {},
) {
  const config = configuration(env);
  if (!config)
    return privateReply(503, {
      error: "Admin sign-in is not configured yet. Contact the site owner.",
    });
  if (request.headers.get("origin") !== config.origin)
    return privateReply(403, { error: "Please sign in from this website." });
  const ip = request.headers.get(config.ipHeader)?.trim();
  if (!ip || !isIP(ip))
    return privateReply(503, {
      error: "Secure sign-in is temporarily unavailable.",
    });
  let body;
  try {
    body = await boundedJson(request);
  } catch {
    return privateReply(400, { error: "Invalid sign-in request." });
  }
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    !normalizeEmail(body.email) ||
    typeof body.password !== "string" ||
    !body.password.length ||
    body.password.length > 1024
  )
    return privateReply(400, {
      error: "Enter a valid email address and password.",
    });
  const email = normalizeEmail(body.email);
  let temporaryToken = null,
    authenticated = false;
  const hash = (value) =>
    createHmac("sha256", config.salt).update(value).digest("hex");
  try {
    const limited = await rpc(
      config,
      "bible_diaries_admin_login_attempt",
      {
        p_ip_hash: hash(`${scope}:ip:${ip}`),
        p_email_hash: hash(`${scope}:email:${email}`),
      },
      fetcher,
    );
    if (!limited.ok)
      return privateReply(503, {
        error: "Secure sign-in is temporarily unavailable.",
      });
    const allowed = await limited.json();
    if (allowed === false) {
      const response = privateReply(429, {
        error: "Too many sign-in attempts. Please try again in 15 minutes.",
      });
      response.headers.set("Retry-After", "900");
      return response;
    }
    if (allowed !== true)
      return privateReply(503, {
        error: "Secure sign-in is temporarily unavailable.",
      });
    const response = await fetcher(
      `${PROJECT_URL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: { apikey: config.key, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: body.password }),
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!response.ok)
      return privateReply(401, {
        error: "Unable to sign in with an authorised administrator account.",
      });
    let session = await response.json();
    if (
      !Number.isFinite(session.expires_in) ||
      session.expires_in < 1 ||
      typeof session.access_token !== "string" ||
      !/^[A-Za-z0-9_.-]{20,8192}$/.test(session.access_token)
    )
      return privateReply(503, {
        error: "Secure sign-in is temporarily unavailable.",
      });
    temporaryToken = session.access_token;
    // A password-only session never receives an admin cookie. Challenge a
    // previously verified factor, then let live DB membership enforce aal2.
    if (typeof body.code !== "string" || !/^\d{6}$/.test(body.code))
      return privateReply(401, {
        error:
          "Enter your current six-digit authenticator code. Enrol it in app Settings → Security first.",
      });
    const factorUser = await fetcher(`${PROJECT_URL}/auth/v1/user`, {
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${session.access_token}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!factorUser.ok)
      return privateReply(401, { error: "Unable to verify administrator." });
    const verifiedUser = await factorUser.json();
    const factor = verifiedUser.factors?.find(
      (x) =>
        x.factor_type === "totp" &&
        x.status === "verified" &&
        /^[a-f0-9-]{36}$/i.test(x.id),
    );
    if (!factor)
      return privateReply(401, {
        error:
          "Set up a verified authenticator in app Settings → Security before using the admin dashboard.",
      });
    const mfa = async (path, data) =>
      fetcher(`${PROJECT_URL}/auth/v1/factors/${factor.id}/${path}`, {
        method: "POST",
        headers: {
          apikey: config.key,
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
    const challenge = await mfa("challenge", {});
    if (!challenge.ok)
      return privateReply(401, {
        error: "Authenticator challenge failed. Retry.",
      });
    const challengeData = await challenge.json();
    if (typeof challengeData.id !== "string")
      return privateReply(503, { error: "Authenticator unavailable." });
    const verification = await mfa("verify", {
      challenge_id: challengeData.id,
      code: body.code,
    });
    if (!verification.ok)
      return privateReply(401, {
        error: "Authenticator code was not accepted. Use a fresh code.",
      });
    session = await verification.json();
    if (
      typeof session.access_token !== "string" ||
      !/^[A-Za-z0-9_.-]{20,8192}$/.test(session.access_token) ||
      !Number.isFinite(session.expires_in) ||
      session.expires_in < 1
    )
      return privateReply(503, { error: "Secure sign-in unavailable." });
    temporaryToken = session.access_token;
    const user = await authorize(session.access_token, { env, fetcher });
    if (!user)
      return privateReply(401, {
        error: "Unable to sign in with an authorised administrator account.",
      });
    const result = privateReply(200, { success: true });
    // No refresh token is retained; sign in again after at most one hour.
    result.headers.set(
      "Set-Cookie",
      `${cookieName(env)}=${session.access_token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.min(Math.floor(session.expires_in), 3600)}${env.NODE_ENV === "production" ? "; Secure" : ""}`,
    );
    authenticated = true;
    return result;
  } catch {
    return privateReply(503, {
      error: "Secure sign-in is temporarily unavailable.",
    });
  } finally {
    if (temporaryToken && !authenticated) {
      try {
        await fetcher(`${PROJECT_URL}/auth/v1/logout?scope=local`, {
          method: "POST",
          headers: {
            apikey: config.key,
            Authorization: `Bearer ${temporaryToken}`,
          },
          signal: AbortSignal.timeout(8000),
        });
      } catch {
        /* Never retain a browser session on failed MFA. */
      }
    }
  }
}
export function validateStats(data) {
  const count = (value) => Number.isSafeInteger(value) && value >= 0;
  const date = (value) =>
    typeof value === "string" && Number.isFinite(Date.parse(value));
  if (
    !data ||
    ![data.total, data.today, data.last7Days, data.last30Days].every(count) ||
    data.timezone !== "Africa/Johannesburg" ||
    !date(data.updatedAt) ||
    (data.latestSignup !== null && !date(data.latestSignup)) ||
    !data.platforms ||
    !["android", "huawei", "ios", "any"].every((key) =>
      count(data.platforms[key]),
    ) ||
    !Array.isArray(data.daily) ||
    data.daily.length !== 30 ||
    data.daily.some(
      (row) =>
        !row || !/^\d{4}-\d{2}-\d{2}$/.test(row.date) || !count(row.count),
    )
  )
    return null;
  if (
    Object.values({
      android: data.platforms.android,
      huawei: data.platforms.huawei,
      ios: data.platforms.ios,
      any: data.platforms.any,
    }).reduce((a, b) => a + b, 0) !== data.total
  )
    return null;
  // Do not forward arbitrary database properties or subscriber records.
  return {
    total: data.total,
    today: data.today,
    last7Days: data.last7Days,
    last30Days: data.last30Days,
    latestSignup: data.latestSignup,
    updatedAt: data.updatedAt,
    timezone: data.timezone,
    platforms: {
      android: data.platforms.android,
      huawei: data.platforms.huawei,
      ios: data.platforms.ios,
      any: data.platforms.any,
    },
    daily: data.daily.map((row) => ({ date: row.date, count: row.count })),
  };
}
export async function handleAdminStats(
  token,
  { env = process.env, fetcher = fetch } = {},
) {
  const user = await getAdminUser(token, { env, fetcher });
  if (!user)
    return privateReply(401, {
      error: "Sign in with an authorised administrator account.",
    });
  const config = adminConfiguration(env);
  try {
    const response = await rpc(
      config,
      "bible_diaries_waitlist_stats",
      {},
      fetcher,
    );
    if (!response.ok)
      return privateReply(503, {
        error:
          "Waiting-list data is unavailable. Check the database and server configuration.",
      });
    const stats = validateStats(await response.json());
    return stats
      ? privateReply(200, stats)
      : privateReply(503, {
          error: "The waiting-list service returned an invalid response.",
        });
  } catch {
    return privateReply(503, {
      error: "Waiting-list data is temporarily unavailable.",
    });
  }
}
export async function handleAdminSubscribers(
  token,
  offset = 0,
  { env = process.env, fetcher = fetch } = {},
) {
  const user = await getAdminUser(token, { env, fetcher });
  if (!user)
    return privateReply(401, {
      error: "Sign in with an authorised waiting-list administrator account.",
    });
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1000000)
    return privateReply(400, { error: "Invalid page." });
  const config = adminConfiguration(env);
  try {
    const query = new URLSearchParams({
      select:
        "first_name,surname,email,phone_e164,phone_country,gender,platform,consented_at",
      order: "consented_at.desc,email.asc",
      limit: "51",
      offset: String(offset),
    });
    const r = await fetcher(
      `${PROJECT_URL}/rest/v1/bible_diaries_waitlist?${query}`,
      {
        headers: {
          apikey: config.secret,
          Authorization: `Bearer ${config.secret}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!r.ok) throw Error();
    const records = await r.json();
    if (
      !Array.isArray(records) ||
      records.length > 51 ||
      records.some(
        (x) =>
          !normalizeEmail(x.email) ||
          !["android", "huawei", "ios", "any"].includes(x.platform) ||
          !Number.isFinite(Date.parse(x.consented_at)),
      )
    )
      throw Error();
    return privateReply(200, {
      records: records
        .slice(0, 50)
        .map((x) => ({
          firstName: x.first_name || null,
          surname: x.surname || null,
          email: x.email,
          phone: x.phone_e164 || null,
          country: x.phone_country || null,
          gender: x.gender || null,
          platform: x.platform,
          joinedAt: x.consented_at,
        })),
      offset,
      hasMore: records.length > 50,
    });
  } catch {
    return privateReply(503, {
      error: "Waiting-list registrations are temporarily unavailable.",
    });
  }
}
export async function handleAdminLogout(
  request,
  token,
  {
    env = process.env,
    fetcher = fetch,
    configuration = adminConfiguration,
    cookieName = adminCookieName,
  } = {},
) {
  let origin;
  try {
    origin = siteOrigin(env);
  } catch {
    return privateReply(503, { error: "Sign-out is temporarily unavailable." });
  }
  if (!origin || request.headers.get("origin") !== origin)
    return privateReply(403, { error: "Please sign out from this website." });
  const config = configuration(env);
  if (config && token && /^[A-Za-z0-9_.-]{20,8192}$/.test(token)) {
    // Revoke the Auth session's refresh capability as well as clearing this browser cookie.
    try {
      await fetcher(`${PROJECT_URL}/auth/v1/logout?scope=local`, {
        method: "POST",
        headers: { apikey: config.key, Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      /* Clear the local session even if Auth is unavailable. */
    }
  }
  const response = privateReply(200, { success: true });
  response.headers.set(
    "Set-Cookie",
    `${cookieName(env)}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${env.NODE_ENV === "production" ? "; Secure" : ""}`,
  );
  return response;
}
