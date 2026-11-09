import { PROJECT_URL, normalizeEmail } from "./waitlist.mjs";
import { siteOrigin } from "./seo.mjs";
import { moderationEnabled } from "./deployment.mjs";
import {
  boundedJson,
  privateReply,
  handleAdminLogin,
  handleAdminLogout,
} from "./admin.mjs";
export const moderationCookieName = (env = process.env) =>
  env.NODE_ENV === "production"
    ? "__Host-bible-diaries-moderation"
    : "bible-diaries-moderation";
export function moderationConfiguration(env = process.env) {
  if (!moderationEnabled(env) || env.SUPABASE_URL !== PROJECT_URL) return null;
  const key = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY,
    secret = env.SUPABASE_SERVICE_ROLE_KEY,
    salt = env.MODERATION_RATE_LIMIT_SALT || env.ADMIN_RATE_LIMIT_SALT,
    ipHeader = env.WAITLIST_TRUSTED_IP_HEADER;
  try {
    const origin = siteOrigin(env);
    if (
      !origin ||
      !key ||
      !secret ||
      !salt ||
      salt.length < 32 ||
      !ipHeader ||
      !/^[a-z0-9-]+$/i.test(ipHeader) ||
      (env.NODE_ENV === "production" && !origin.startsWith("https:"))
    )
      return null;
    return { key, secret, salt, ipHeader, origin };
  } catch {
    return null;
  }
}
async function rpc(name, body, token, config, fetcher) {
  return fetcher(`${PROJECT_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
}
export async function getModeratorUser(
  token,
  { env = process.env, fetcher = fetch } = {},
) {
  const config = moderationConfiguration(env);
  if (
    !config ||
    typeof token !== "string" ||
    !/^[A-Za-z0-9_.-]{20,8192}$/.test(token)
  )
    return null;
  try {
    const r = await fetcher(`${PROJECT_URL}/auth/v1/user`, {
      headers: { apikey: config.key, Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const user = await r.json();
    if (
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
        user.id || "",
      ) ||
      !normalizeEmail(user.email) ||
      typeof user.email_confirmed_at !== "string" ||
      !Number.isFinite(Date.parse(user.email_confirmed_at)) ||
      user.is_anonymous
    )
      return null;
    if (
      (env.ADMIN_USER_IDS || "")
        .split(",")
        .map((x) => x.trim().toLowerCase())
        .includes(user.id.toLowerCase())
    )
      return null;
    // Waiting-list and main-admin credentials must belong to different accounts.
    // This RPC verifies live DB membership AND active Auth session on every request.
    const membership = await rpc(
      "moderation_stats",
      {},
      token,
      config,
      fetcher,
    );
    if (!membership.ok) return null;
    return { id: user.id, email: user.email };
  } catch {
    return null;
  }
}
export const handleModerationLogin = (request, options = {}) =>
  handleAdminLogin(request, {
    ...options,
    configuration: moderationConfiguration,
    authorize: getModeratorUser,
    cookieName: moderationCookieName,
    scope: "moderation",
  });
export const handleModerationLogout = (request, token, options = {}) =>
  handleAdminLogout(request, token, {
    ...options,
    configuration: moderationConfiguration,
    cookieName: moderationCookieName,
  });
function sameOrigin(request, env, mutating = false) {
  try {
    const o = request.headers.get("origin");
    return (
      request.headers.get("sec-fetch-site") !== "cross-site" &&
      (mutating ? o === siteOrigin(env) : !o || o === siteOrigin(env))
    );
  } catch {
    return false;
  }
}
export async function handleModerationQueue(
  request,
  token,
  { env = process.env, fetcher = fetch } = {},
) {
  if (!moderationEnabled(env))
    return privateReply(404, {
      error: "Moderation is available on the main website.",
    });
  if (!sameOrigin(request, env))
    return privateReply(403, { error: "Open moderation on the main website." });
  if (!(await getModeratorUser(token, { env, fetcher })))
    return privateReply(401, {
      error:
        "Sign in with an assigned moderation account. The moderation service must also be activated.",
    });
  try {
    const config = moderationConfiguration(env);
    const r = await rpc(
      "moderation_list",
      { queue: true },
      token,
      config,
      fetcher,
    );
    if (!r.ok) throw Error();
    const rows = await r.json();
    if (!Array.isArray(rows) || rows.length > 100) throw Error();
    // Explicit allow-list of fields: no anonymous owner IDs, recipients or scores.
    const items = rows.map((x) => ({
      id: x.id,
      target: x.target,
      status: x.status,
      version: x.version,
      reason: x.reason,
      policy_version: x.policy_version,
      categories: x.categories,
      created_at: x.created_at,
      expires_at: x.expires_at,
      private_content: x.private_content,
      consented: x.consented,
      author: x.author
        ? {
            first_name: x.author.first_name,
            surname: x.author.surname,
            email: x.author.email,
          }
        : null,
      appeal_note: x.appeal_note,
      record: x.record
        ? {
            title: x.record.title,
            scripture: x.record.scripture,
            content: x.record.content,
            message: x.record.message,
          }
        : null,
    }));
    const stats = await rpc("moderation_stats", {}, token, config, fetcher);
    return privateReply(200, {
      items,
      stats: stats.ok ? await stats.json() : {},
    });
  } catch {
    return privateReply(503, {
      error: "The moderation queue is unavailable. No decision has been made.",
    });
  }
}
export async function handleModerationDecision(
  request,
  token,
  { env = process.env, fetcher = fetch } = {},
) {
  if (!moderationEnabled(env))
    return privateReply(404, {
      error: "Moderation is available on the main website.",
    });
  if (!sameOrigin(request, env, true))
    return privateReply(403, {
      error: "Submit review decisions from the main website.",
    });
  if (!(await getModeratorUser(token, { env, fetcher })))
    return privateReply(401, {
      error: "Sign in with an assigned moderation account.",
    });
  try {
    const b = await boundedJson(request);
    if (
      !b ||
      !["approve", "reject"].includes(b.action) ||
      typeof b.submission !== "string" ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
        b.submission,
      ) ||
      !Number.isSafeInteger(b.expected_version) ||
      b.expected_version < 1 ||
      typeof b.note !== "string" ||
      b.note.trim().length < 5 ||
      b.note.length > 500
    )
      return privateReply(400, {
        error:
          "Choose a submission and provide a review reason of 5–500 characters.",
      });
    const r = await rpc(
      "moderation_action",
      {
        submission: b.submission,
        expected_version: b.expected_version,
        action: b.action,
        note: b.note.trim(),
      },
      token,
      moderationConfiguration(env),
      fetcher,
    );
    if (!r.ok)
      return privateReply(409, {
        error:
          "This submission changed or your permissions no longer allow this action. Refresh before retrying.",
      });
    const result = await r.json();
    if (result?.success !== true) throw Error();
    return privateReply(200, { success: true });
  } catch {
    return privateReply(400, {
      error:
        "Could not confirm the decision. Refresh the queue before retrying.",
    });
  }
}

export async function handleSafetyReports(
  request,
  token,
  { env = process.env, fetcher = fetch } = {},
) {
  if (!moderationEnabled(env))
    return privateReply(404, { error: "Unavailable." });
  const mutating = request.method === "POST";
  if (!sameOrigin(request, env, mutating))
    return privateReply(403, { error: "Open reports from the admin website." });
  if (!(await getModeratorUser(token, { env, fetcher })))
    return privateReply(401, {
      error: "Sign in with an assigned moderation account and authenticator.",
    });
  try {
    let body = { queue: true };
    if (mutating) {
      body = await boundedJson(request);
      if (
        !body ||
        !["dismissed", "removed", "escalated", "restricted"].includes(
          body.action,
        ) ||
        !/^[-a-f0-9]{36}$/i.test(body.report_id || "") ||
        !Number.isSafeInteger(body.expected_version) ||
        body.expected_version < 1 ||
        typeof body.note !== "string" ||
        body.note.trim().length < 5 ||
        body.note.length > 500
      )
        return privateReply(400, {
          error: "Choose a report, action and reason of 5–500 characters.",
        });
      body = {
        report_id: body.report_id,
        expected_version: body.expected_version,
        action: body.action,
        note: body.note.trim(),
      };
    }
    const r = await rpc(
      mutating ? "safety_report_action" : "safety_report_list",
      body,
      token,
      moderationConfiguration(env),
      fetcher,
    );
    if (!r.ok)
      return privateReply(409, {
        error: "Report access or version changed. Refresh before retrying.",
      });
    const data = await r.json();
    if (mutating)
      return data?.success === true
        ? privateReply(200, { success: true })
        : privateReply(503, { error: "Decision not confirmed." });
    if (!Array.isArray(data) || data.length > 100) throw Error();
    return privateReply(200, {
      items: data.map((x) => ({
        id: x.id,
        target_kind: x.target_kind,
        reason: x.reason,
        status: x.status,
        version: x.version,
        created_at: x.created_at,
        private_context: x.private_context,
        details: x.details,
        reported_text: x.reported_text,
      })),
    });
  } catch {
    return privateReply(503, {
      error: "Reports are unavailable. No action was confirmed.",
    });
  }
}
