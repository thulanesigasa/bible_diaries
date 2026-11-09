import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

// The socket is local HTTP; simulate an HTTPS-terminating ingress. Explicit HTTP
// tests override this header to exercise the production redirect.
const fetch = (input, init = {}) => {
  const headers = new Headers(init.headers);
  if (!headers.has("x-forwarded-proto"))
    headers.set("x-forwarded-proto", "https");
  return globalThis.fetch(input, { ...init, headers });
};
for (const role of ["admin", "waitlist"]) {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = server.address().port;
  await new Promise((r) => server.close(r));
  const origin = `http://127.0.0.1:${port}`,
    canonical =
      role === "admin"
        ? "https://admin.biblediaries.co.za"
        : "https://waiting.biblediaries.co.za";
  const child = spawn(
    process.execPath,
    [
      "--import",
      fileURLToPath(new URL("./mock-admin-auth.mjs", import.meta.url)),
      "node_modules/next/dist/bin/next",
      "start",
      "-H",
      "127.0.0.1",
      "-p",
      String(port),
    ],
    {
      env: {
        ...process.env,
        NODE_ENV: "production",
        SITE_ROLE: role,
        SITE_URL: canonical,
        MAIN_SITE_URL: "https://biblediaries.co.za",
        WAITLIST_URL: "https://waiting.biblediaries.co.za",
        ADMIN_SITE_URL: "https://admin.biblediaries.co.za",
        SUPABASE_URL: "https://fspfwidfdnqvpgmipate.supabase.co",
        SUPABASE_PUBLISHABLE_KEY: "test-public",
        SUPABASE_SERVICE_ROLE_KEY: "test-server",
        ADMIN_USER_IDS: "11111111-1111-4111-8111-111111111111",
        ADMIN_RATE_LIMIT_SALT: "a".repeat(32),
        WAITLIST_TRUSTED_IP_HEADER: "x-test-ip",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";
  child.stdout.on("data", (x) => (output += x));
  child.stderr.on("data", (x) => (output += x));
  try {
    let ready = false;
    for (let n = 0; n < 100; n++) {
      if (child.exitCode !== null) throw Error(output);
      try {
        if ((await fetch(origin + "/robots.txt")).ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.ok(ready, "Website did not start");
    const upgrade = await fetch(origin + "/support", {
      headers: { "x-forwarded-proto": "http" },
      redirect: "manual",
    });
    assert.equal(upgrade.status, 308);
    assert.equal(upgrade.headers.get("location"), canonical + "/support");
    const html = await (await fetch(origin)).text();
    assert.ok(
      html.includes(`rel="canonical" href="${canonical}/"`) ||
        html.includes(`rel="canonical" href="${canonical}"`),
      role +
        ": " +
        (html.match(/rel="canonical"[^>]+/)?.[0] || html.slice(0, 180)),
    );
    const signup = /type="email"/.test(html);
    assert.equal(signup, role === "waitlist");
    const sitemap = await (await fetch(origin + "/sitemap.xml")).text();
    if (role === "waitlist") assert.ok(sitemap.includes(canonical));
    const signIn = async (path, email = "admin@example.com") =>
      fetch(origin + path, {
        method: "POST",
        headers: {
          origin: canonical,
          "content-type": "application/json",
          "x-test-ip": "192.0.2.1",
        },
        body: JSON.stringify({
          email,
          password: "test-password",
          code: "123456",
        }),
      });
    if (role === "admin") {
      assert.ok(html.includes("Choose your workspace."));
      assert.ok(html.includes("/admin/login"));
      assert.ok(html.includes("/admin/moderation/login"));
      assert.ok(html.includes("noindex"));
      assert.equal(
        (await fetch(origin + "/api/waitlist", { method: "POST" })).status,
        404,
      );
      const denied = await signIn("/api/moderation/login");
      assert.equal(denied.status, 401);
      const login = await signIn(
        "/api/moderation/login",
        "mainadmin@example.invalid",
      );
      assert.equal(login.status, 200);
      const cookie = login.headers.get("set-cookie").split(";")[0];
      const queue = await fetch(origin + "/api/moderation/queue", {
        headers: { cookie },
      });
      assert.equal(queue.status, 200);
      const data = await queue.json();
      assert.equal(data.items[0].author.email, "author@example.invalid");
      assert.ok(!JSON.stringify(data).includes("hidden-owner"));
      const decision = {
        submission: data.items[0].id,
        expected_version: 1,
        action: "reject",
        note: "Please remove the personal insult.",
      };
      const sent = await fetch(origin + "/api/moderation/decision", {
        method: "POST",
        headers: {
          cookie,
          origin: canonical,
          "content-type": "application/json",
        },
        body: JSON.stringify(decision),
      });
      assert.equal(sent.status, 200);
      assert.equal(
        (
          await fetch(origin + "/api/admin/subscribers", {
            headers: { cookie },
          })
        ).status,
        401,
      );
      const waitingLogin = await signIn("/api/admin/login");
      assert.equal(waitingLogin.status, 200);
      const waitingCookie = waitingLogin.headers
        .get("set-cookie")
        .split(";")[0];
      const records = await fetch(origin + "/api/admin/subscribers", {
        headers: { cookie: waitingCookie },
      });
      assert.equal(records.status, 200);
      assert.equal((await records.json()).records[0].phone, "+27821234567");
      assert.equal(
        (
          await fetch(origin + "/api/moderation/queue", {
            headers: { cookie: waitingCookie },
          })
        ).status,
        401,
      );
    } else {
      assert.ok(html.includes("Every walk has a story."));
      assert.ok(html.includes("first_name"));
      assert.ok(html.includes("phone_country"));
      assert.ok(html.includes('name="gender"'));
      const r = await fetch(origin + "/admin", { redirect: "manual" });
      assert.equal(r.status, 307);
      assert.equal(
        r.headers.get("location"),
        "https://admin.biblediaries.co.za/",
      );
      assert.equal((await fetch(origin + "/api/moderation/queue")).status, 404);
      assert.equal(
        (await fetch(origin + "/api/admin/subscribers")).status,
        401,
      );
    }
    console.log(
      `PASS: ${role} domain content, canonical URLs, API boundaries and authenticated dashboard.`,
    );
  } finally {
    child.kill("SIGTERM");
    await Promise.race([
      once(child, "exit"),
      new Promise((r) => setTimeout(r, 3000)),
    ]);
    if (child.exitCode === null) child.kill("SIGKILL");
  }
}
