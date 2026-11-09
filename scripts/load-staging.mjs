// Controlled smoke load against a separately deployed staging health endpoint.
// Never runs on CI pushes or against the production project/domains.
import { performance } from "node:perf_hooks";
const origin = new URL(process.env.STAGING_ORIGIN || "http://invalid.local");
if (
  process.env.CONFIRM_STAGING_LOAD !== "yes" ||
  origin.protocol !== "https:" ||
  !origin.hostname.includes("staging") ||
  origin.hostname === "fspfwidfdnqvpgmipate.supabase.co" ||
  /(^|\.)biblediaries\.co\.za$/.test(origin.hostname) ||
  origin.username ||
  origin.password ||
  origin.pathname !== "/"
)
  throw Error(
    "Provide a dedicated HTTPS staging origin with staging in its hostname and CONFIRM_STAGING_LOAD=yes.",
  );
const count = Number(process.env.LOAD_REQUESTS || 60),
  concurrency = Number(process.env.LOAD_CONCURRENCY || 3);
if (
  !Number.isInteger(count) ||
  count < 1 ||
  count > 300 ||
  !Number.isInteger(concurrency) ||
  concurrency < 1 ||
  concurrency > 10
)
  throw Error("Use 1–300 requests and concurrency 1–10.");
let next = 0,
  failures = 0;
const times = [];
await Promise.all(
  Array.from({ length: concurrency }, async () => {
    while (next++ < count) {
      const start = performance.now();
      try {
        const r = await fetch(new URL("/api/health", origin), {
          redirect: "error",
          signal: AbortSignal.timeout(10000),
          headers: { "user-agent": "BibleDiaries-Staging-Smoke/1.0" },
        });
        if (!r.ok) failures++;
        await r.arrayBuffer();
      } catch {
        failures++;
      }
      times.push(performance.now() - start);
      await new Promise((r) => setTimeout(r, 150));
    }
  }),
);
times.sort((a, b) => a - b);
const percentile = (p) =>
  Math.round(
    times[Math.min(times.length - 1, Math.ceil(times.length * p) - 1)],
  );
const report = {
  scope:
    "staging health endpoint only; does not certify database or authenticated write capacity",
  requests: times.length,
  concurrency,
  failures,
  p50_ms: percentile(0.5),
  p95_ms: percentile(0.95),
  p99_ms: percentile(0.99),
};
console.log(JSON.stringify(report, null, 2));
if (failures || report.p95_ms > 2000) process.exitCode = 1;
