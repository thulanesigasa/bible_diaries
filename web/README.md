# Bible Diaries

A coming soon website for Bible Diaries: a spiritual journaling and community reflection app for believers who want to reflect on Scripture, share their journey and grow together. The website introduces the app and collects consented launch-notification requests.

The layout follows the exégeomai coming soon website, adapted to Bible Diaries’ white, blue and pink branding. Initial releases are planned for Google Play and Huawei AppGallery; Apple App Store is planned for later. Dedicated information pages explain PC/browser access, features, safety, support, community guidelines, privacy, cookies, security and terms. No release date or download link is fabricated. See the [complete readiness checklist](./docs/READINESS.md) for all SEO and security checks and their limits.

## Architecture

This is a standalone Next.js marketing website in `web/`. The existing root web application and `mobile/` app continue to have independent dependencies and deployment settings.

| Path | Purpose |
| --- | --- |
| `src/app/page.js` | Landing page, features, store plans, waiting list and FAQ |
| `src/app/layout.js` | Shared navigation, footer and metadata |
| `src/app/[slug]/page.js`, `src/content/pages.mjs` | Detailed app, PC, support, safety and policy pages |
| `src/components/CookiePreferences.js` | Persistent essential-only privacy choices and accessible native dialog |
| `src/components/Schema.js`, `src/lib/seo.mjs` | Escaped JSON-LD, per-page metadata and validated canonical origins |
| `src/proxy.js`, `src/lib/security.mjs` | Per-response nonce CSP and request isolation |
| `src/app/globals.css` | Responsive layout, phone previews and accessibility styles |
| `src/components/` | Mobile navigation, interactive previews and signup form |
| `src/components/LaptopMockup.js` | Responsive illustrative desktop app inside a laptop frame, shown on the homepage and PC guide |
| `src/components/Decorations.js` | Non-interactive crosses, rings, diamonds, dot patterns, guide lines and brand watermarks |
| `src/app/api/waitlist/route.js` | Server-side POST handler |
| `src/lib/waitlist.mjs` | Validation, trusted-origin checks, IP hashing and database RPC |
| `src/app/waitlist-privacy/` | Dedicated waitlist notice and removal instructions |
| `src/app/robots.js`, `sitemap.js`, `opengraph-image.js` | Search and social metadata |
| `public/logo.png` | Existing Bible Diaries logo |
| `public/logo.webp` | Compressed website logo (about 81% smaller) |
| `public/llm.txt`, `public/llms.txt` | Public app summary and information-page index |
| `database/waitlist.sql` | Isolated subscriber and abuse-prevention schema |
| `tests/` | API and real Postgres-compatible database tests |

## Run locally

1. Install Node.js 22.13 or newer.
2. From the repository root, run `cd web` and `npm ci`.
3. Copy `.env.example` to `.env.local`.
4. Set `SITE_URL` to your exact origin (`http://localhost:3000` for local use).
5. Run `npm run dev` and open `http://localhost:3000`.

The landing page and previews work without database credentials. The form deliberately returns an unavailable message until all server settings and the database schema are configured; it never pretends to save a signup.

## Activate real waiting-list signups

The connected Bible Diaries Supabase project (`fspfwidfdnqvpgmipate`) was reported **INACTIVE** during implementation. Its live schema has not been modified or verified. Restore it before activating signups.

1. Restore the **Bible Diaries** Supabase project. Do not use the exégeomai database.
2. Run `database/waitlist.sql` once in that project's SQL Editor, or incorporate the script into your normal migration process. The script creates only new, Bible Diaries-prefixed tables and one function. It does not change accounts, diaries, profiles or other app tables.
3. Configure these server-only deployment settings:

| Variable | Value |
| --- | --- |
| `SITE_URL` | Exact HTTPS origin of the marketing website |
| `SUPABASE_URL` | `https://fspfwidfdnqvpgmipate.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Bible Diaries service-role key, stored as a hosting secret |
| `WAITLIST_RATE_LIMIT_SALT` | At least 32 random characters; generate with `openssl rand -hex 32` |
| `WAITLIST_TRUSTED_IP_HEADER` | A single-IP header overwritten by the trusted host ingress |

Never prefix server secrets with `NEXT_PUBLIC_`. Never commit `.env.local`. The project URL is checked server-side to prevent accidentally writing Bible Diaries signups into another app's database.

On Vercel use `x-vercel-forwarded-for`; on Cloudflare use `cf-connecting-ip`. Confirm your host replaces the selected header instead of forwarding untrusted client input. The handler rejects missing or multi-value IP headers. When testing locally, send a single valid IP in your configured header using a local request client; do not configure a public production host to trust an arbitrary visitor header.

Rate limits allow five validated submissions per hashed IP per 15-minute window, shared across server instances. Repeat email submissions return the same success response and leave the initial consent/platform unchanged. There are no public read/write policies or RPC permissions for anonymous or signed-in visitors. The server alone calls the RPC with its secret. Raw IPs are not stored by the waitlist schema. A successful response means the database committed the request; it does not send an email.

## Subscriber management

Use the Supabase dashboard with authorised access to view `public.bible_diaries_waitlist`. No subscriber list or service-role key is exposed to the website. Platform values are `android`, `huawei`, `ios` and `any`.

Removal and correction requests go to the support address already used in the app: `support@ts-industries.com`. Process requests from the registered address, remove the record in the dashboard and exclude it from future launch mailings. Review and remove unneeded records after launch communications. An email delivery provider and automated mailing campaign are not included; configure them separately before sending launch emails.

## Verify

```bash
npm test
npm run build
npm run test:site
npm start
```

Tests cover malformed emails/bodies, explicit consent, origin checks, ingress validation, project isolation, platform validation, hidden-field spam, real SQL duplicate handling, RLS/table/RPC permissions, durable rate limits and error responses. Security tests check script policy, canonical configuration and JSON-LD escaping. The integration command starts a short-lived production process and checks all 14 information pages and security headers through HTTP. Build with `SITE_URL=https://bible-diaries.example` when running this integration suite; the example is a test origin, not a live site. Database tests use local PGlite, not real subscriber records. Live registration still needs a deployment smoke test after restoring Supabase and setting credentials. Email ownership verification is not implemented.

## Deploy manually

Configure your Node-capable host with project root **`web`**, install command `npm ci`, build command `npm run build`, and start command `npm start`. Set `SITE_URL` before building so canonical, sitemap and social URLs use the real domain. Enable HTTPS at the host. This is a server-rendered Next.js application, not a static export: a static-only host cannot run `/api/waitlist`.

Production pages use per-response CSP nonces and server rendering, with private/no-store HTML responses so a shared cache cannot reuse a nonce. Production browser source maps are disabled. A canonical HTTPS redirect handles ingress requests marked `x-forwarded-proto: http`; the host must overwrite that header and provide valid TLS. HSTS is configured without applying it to unrelated subdomains. Set `APP_WEB_URL` only to the official HTTPS browser companion after it is deployed; the marketing site does not invent a live PC app address.

No analytics or advertising tools are installed. The privacy-preferences panel stores only the local preference version and time, not an auth token. It has no effect on the separate app’s authentication storage or the visitor’s launch-email consent.

The website source is submitted through GitHub. No Sites hosting project is created. Keep any existing root-app deployment pointed at its original root unless you intentionally want to replace it with this marketing website.
