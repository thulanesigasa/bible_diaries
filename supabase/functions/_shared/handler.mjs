import {
  decideModeration,
  childSafetyIntake,
  POLICY_VERSION,
  decisionMessage,
} from "./moderation-policy.mjs";
// Shared, testable handler. No credentials or message content are logged.
export async function boundedJson(request, maximum = 32000) {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    throw Object.assign(new Error("Use JSON."), { status: 415 });
  if (Number(request.headers.get("content-length") || 0) > maximum)
    throw Object.assign(new Error("Request too large."), { status: 413 });
  const reader = request.body?.getReader();
  let bytes = 0;
  const chunks = [];
  if (!reader)
    throw Object.assign(new Error("Missing request."), { status: 400 });
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maximum) {
        await reader.cancel();
        throw Object.assign(new Error("Request too large."), { status: 413 });
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const joined = new Uint8Array(bytes);
  let offset = 0;
  for (const c of chunks) {
    joined.set(c, offset);
    offset += c.length;
  }
  try {
    const v = JSON.parse(new TextDecoder().decode(joined));
    if (!v || Array.isArray(v) || typeof v !== "object") throw 0;
    return v;
  } catch {
    throw Object.assign(new Error("Invalid JSON."), { status: 400 });
  }
}
const fail = (status, message) => {
  throw Object.assign(new Error(message), { status });
};
const uuid = (v) =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
export function normalizeContent(body) {
  if (
    !["diaries", "comments", "chats"].includes(body.table) ||
    !["insert", "update"].includes(body.operation)
  )
    fail(400, "Invalid operation.");
  if (body.operation === "update" && (!uuid(body.id) || body.table === "chats"))
    fail(400, "Invalid edit.");
  const input = body.record;
  if (!input || Array.isArray(input) || typeof input !== "object")
    fail(400, "Invalid content.");
  const allowed =
    body.table === "diaries"
      ? [
          "title",
          "scripture",
          "content",
          "category",
          "visibility",
          "is_anonymous",
          "allow_comments",
          "allow_likes",
        ]
      : body.table === "comments"
        ? ["content", "post_id", "parent_id", "is_anonymous"]
        : ["message", "receiver_id"];
  const record = {};
  for (const key of allowed)
    if (Object.hasOwn(input, key)) record[key] = input[key];
  for (const key of ["content", "message", "title", "scripture"])
    if (record[key] != null) {
      if (typeof record[key] !== "string") fail(400, "Invalid text.");
      record[key] = record[key].trim();
      const max =
        key === "title"
          ? 200
          : key === "scripture"
            ? 4000
            : body.table === "diaries"
              ? 20000
              : 4000;
      if (record[key].length > max) fail(400, "Text is too long.");
    }
  const text = record[body.table === "chats" ? "message" : "content"];
  if (typeof text !== "string" || !text) fail(400, "Enter your message.");
  for (const key of ["is_anonymous", "allow_comments", "allow_likes"])
    if (Object.hasOwn(record, key) && typeof record[key] !== "boolean")
      fail(400, "Invalid preference.");
  for (const key of ["post_id", "parent_id", "receiver_id"])
    if (record[key] != null && !uuid(record[key]))
      fail(400, "Invalid reference.");
  if (
    body.operation === "insert" &&
    body.table === "diaries" &&
    !["hope", "faith", "love", "strength", "gratitude", "wisdom"].includes(
      record.category?.toLowerCase(),
    )
  )
    fail(400, "Choose a category.");
  if (record.category) record.category = record.category.toLowerCase();
  if (record.visibility && !["public", "private"].includes(record.visibility))
    fail(400, "Invalid visibility.");
  return {
    table: body.table,
    operation: body.operation,
    id: body.id || null,
    record,
  };
}
export function createHandler(env, fetcher = fetch, kind = "content") {
  return async (request) => {
    const origin = request.headers.get("origin");
    const allowed = (env.ALLOWED_ORIGINS || "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    const cors = {
      vary: "Origin",
      "cache-control": "no-store",
      "content-type": "application/json",
    };
    if (origin && allowed.includes(origin)) {
      cors["access-control-allow-origin"] = origin;
      cors["access-control-allow-headers"] =
        "authorization,apikey,content-type,x-client-info";
      cors["access-control-allow-methods"] = "POST, OPTIONS";
    }
    const reply = (status, body) =>
      new Response(JSON.stringify(body), { status, headers: cors });
    try {
      if (origin && !allowed.includes(origin))
        return reply(403, { error: "Origin not permitted." });
      if (request.method === "OPTIONS")
        return new Response(null, { status: 204, headers: cors });
      if (request.method !== "POST") return reply(405, { error: "Use POST." });
      const authorization = request.headers.get("authorization");
      if (!/^Bearer [^\s]+$/.test(authorization || ""))
        return reply(401, { error: "Sign in again." });
      if (
        !env.SUPABASE_URL ||
        !env.SUPABASE_ANON_KEY ||
        !env.SUPABASE_SERVICE_ROLE_KEY
      )
        return reply(503, { error: "Service unavailable." });
      const base = env.SUPABASE_URL;
      async function api(
        path,
        { method = "GET", body, service = false, auth = authorization } = {},
      ) {
        const response = await fetcher(base + path, {
          method,
          headers: {
            apikey: service
              ? env.SUPABASE_SERVICE_ROLE_KEY
              : env.SUPABASE_ANON_KEY,
            authorization: service
              ? `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
              : auth,
            "content-type": "application/json",
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: AbortSignal.timeout(10000),
        });
        let data = null;
        try {
          data = await response.json();
        } catch {}
        return { ok: response.ok, status: response.status, data };
      }
      const userResult = await api("/auth/v1/user");
      const user = userResult.data;
      if (!userResult.ok || !uuid(user?.id))
        return reply(401, { error: "Sign in again." });
      const active = await api("/rest/v1/rpc/session_is_active", {
        method: "POST",
        body: {},
      });
      if (!active.ok || active.data !== true)
        return reply(401, { error: "Session expired. Sign in again." });
      if (kind !== "delete") {
        const eligibility = await api("/rest/v1/rpc/account_access", {
          method: "POST",
          body: {},
        });
        if (!eligibility.ok || eligibility.data !== true)
          return reply(403, {
            error:
              "Complete account eligibility and guardian permission before posting.",
          });
      }
      const body = await boundedJson(request, kind === "delete" ? 2048 : 32000);
      const limit = await api("/rest/v1/rpc/consume_security_limit", {
        method: "POST",
        service: true,
        body: {
          actor: user.id,
          action: kind === "delete" ? "delete" : "content",
        },
      });
      if (!limit.ok) return reply(503, { error: "Service unavailable." });
      if (limit.data !== true)
        return reply(429, { error: "Too many attempts. Try again later." });
      if (kind === "delete") {
        if (
          body.confirm !== "DELETE" ||
          typeof body.password !== "string" ||
          !body.password ||
          body.password.length > 1024
        )
          return reply(400, {
            error: "Confirm deletion and enter your password.",
          });
        const verified = await api("/auth/v1/token?grant_type=password", {
          method: "POST",
          body: { email: user.email, password: body.password },
        });
        if (!verified.ok || verified.data?.user?.id !== user.id)
          return reply(401, { error: "Could not verify your password." });
        const signedOut = await api("/auth/v1/logout?scope=global", {
          method: "POST",
          auth: `Bearer ${verified.data.access_token}`,
        });
        if (!signedOut.ok)
          return reply(503, { error: "Could not revoke sessions. Try again." });
        let cleaned = false;
        for (let batch = 0; batch < 20; batch++) {
          const files = await api("/rest/v1/rpc/account_avatar_objects", {
            method: "POST",
            service: true,
            body: { actor: user.id },
          });
          if (!files.ok)
            return reply(503, {
              error: "Could not complete deletion. Sign in and retry.",
            });
          if (!files.data?.length) {
            cleaned = true;
            break;
          }
          const removed = await api("/storage/v1/object/avatars", {
            method: "DELETE",
            service: true,
            body: { prefixes: files.data },
          });
          if (!removed.ok)
            return reply(503, {
              error: "Could not remove files. Sign in and retry.",
            });
        }
        if (!cleaned)
          return reply(503, {
            error: "Deletion needs another attempt. Sign in and retry.",
          });
        const purged = await api("/rest/v1/rpc/purge_account_content", {
          method: "POST",
          service: true,
          body: { actor: user.id },
        });
        if (!purged.ok)
          return reply(503, {
            error: "Could not complete deletion. Sign in and retry.",
          });
        const deleted = await api(`/auth/v1/admin/users/${user.id}`, {
          method: "DELETE",
          service: true,
        });
        return deleted.ok
          ? reply(200, { deleted: true })
          : reply(503, {
              error: "Could not complete deletion. Sign in and retry.",
            });
      }
      const operation = normalizeContent(body);
      let baseRecord = null;
      let text = Object.values(operation.record)
        .filter((v) => typeof v === "string")
        .join("\n");
      if (operation.operation === "update") {
        const ownership = await api(
          `/rest/v1/${operation.table === "diaries" ? "diary_owners" : "comment_owners"}?${operation.table === "diaries" ? "post_id" : "comment_id"}=eq.${operation.id}&select=user_id`,
        );
        if (!ownership.ok || ownership.data?.[0]?.user_id !== user.id)
          return reply(403, { error: "Edit not permitted." });
        const existing = await api(
          `/rest/v1/${operation.table}?id=eq.${operation.id}&select=*`,
        );
        if (!existing.ok || !existing.data?.[0])
          return reply(404, { error: "Content unavailable." });
        baseRecord =
          operation.table === "diaries"
            ? {
                content: existing.data[0].content,
                title: existing.data[0].title ?? null,
                scripture: existing.data[0].scripture ?? null,
              }
            : { content: existing.data[0].content };
        const merged = { ...baseRecord, ...operation.record };
        text = [merged.title, merged.scripture, merged.content]
          .filter(Boolean)
          .join("\n");
      }
      let decision;
      if (childSafetyIntake(text)) {
        // No suspect abusive material is forwarded to the model or persisted in drafts.
        decision = {
          outcome: "REJECT",
          reason: "child_safety",
          policy_version: POLICY_VERSION,
          flagged_categories: [],
        };
      } else {
        if (!env.OPENAI_API_KEY)
          return reply(503, {
            error:
              "Publishing is temporarily unavailable. Keep your draft and retry later.",
          });
        const moderation = await fetcher(
          "https://api.openai.com/v1/moderations",
          {
            method: "POST",
            headers: {
              authorization: `Bearer ${env.OPENAI_API_KEY}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              model: "omni-moderation-latest",
              input: text,
            }),
            signal: AbortSignal.timeout(10000),
          },
        );
        if (!moderation.ok)
          return reply(503, {
            error: "Moderation unavailable. Keep your draft and retry later.",
          });
        decision = decideModeration(
          text,
          (await moderation.json())?.results?.[0],
        );
      }
      const written = await api("/rest/v1/rpc/moderated_submit", {
        method: "POST",
        service: true,
        body: {
          actor: user.id,
          target: operation.table,
          operation: operation.operation,
          record: operation.record,
          row_id: operation.id,
          decision: decision.outcome,
          reason: decision.reason,
          policy_version: decision.policy_version,
          categories: decision.flagged_categories,
          base_record: baseRecord,
        },
      });
      if (!written.ok)
        return reply(409, {
          error:
            "Content could not be saved. Check sharing settings, reload edited content, and retry. Your draft is unchanged.",
        });
      const stored = written.data;
      if (!stored || !["ALLOW", "REVIEW", "REJECT"].includes(stored.decision))
        return reply(503, {
          error:
            "Could not confirm submission. Keep your draft and check My reviews before retrying.",
        });
      if (stored.decision === "ALLOW")
        return reply(200, {
          data: stored.data,
          moderation: { decision: "ALLOW" },
        });
      return reply(stored.decision === "REVIEW" ? 409 : 422, {
        error: decisionMessage(stored.reason, stored.private_content),
        code:
          stored.decision === "REVIEW"
            ? "MODERATION_REVIEW"
            : "MODERATION_REJECT",
        submission_id: stored.id,
        moderation: {
          decision: stored.decision,
          reason: stored.reason,
          policy_version: POLICY_VERSION,
        },
      });
    } catch (error) {
      return reply(error.status || 503, {
        error: error.status
          ? error.message
          : "Service unavailable. Please try again later.",
      });
    }
  };
}
