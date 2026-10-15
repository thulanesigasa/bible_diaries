# Bible Diaries website checklist

Checked on 15 October 2026. Scope: the independent marketing website in `web/`, not a certification of the root web application, mobile application or live infrastructure. The PR is not a public deployment. The linked Supabase project was inactive when inspected; the prepared SQL has only been tested locally.

## Information and design

There are 14 public information pages: the landing page, about, features, how it works, PC access, safety, community guidelines, support, privacy, terms, cookies, security, legal centre and waitlist privacy. Navigation and footer links expose these pages. PC guidance explains browser access, launch availability and shared-computer precautions without claiming a Windows installer or feature parity.

White is the main background, blue is the primary accent and pink appears in the brand, previews, details and privacy controls. The privacy panel saves only an essential-only preference. Analytics and advertising are absent and their controls are disabled rather than pretending to activate a service. App authentication and email consent are separate from this preference.

## Search, performance and presentation

| # | Requirement | Status and evidence |
| --- | --- | --- |
| 1 | sitemap.xml | Implemented at `/sitemap.xml`; all 14 public pages included when `SITE_URL` is set. Verified by production HTTP checks. |
| 2 | robots.txt | Implemented. Public pages allowed; `/api/` disallowed. A robots file is not access control. |
| 3 | Remove noindex tags | Public information pages explicitly allow indexing. Tested for no unexpected noindex. Unknown/404 routes may intentionally have noindex. |
| 4 | Canonical tags | Unique canonical per page. Requires the real `SITE_URL` before production build. Tested with an example HTTPS origin, not a fabricated public domain. |
| 5 | Meta titles | Unique page titles, with Bible Diaries branding. |
| 6 | Meta descriptions | Individual descriptions for every public information page. |
| 7 | Heading order | One H1 per page and no skipped heading levels in server HTML, tested across 14 pages. Preview text is not misrepresented as page headings. |
| 8 | Alt text | All images have alt attributes. Repeated decorative marks have empty alt with a labelled brand link or text equivalent. |
| 9 | Schema markup | Nonce-bearing, escaped JSON-LD for Organization, WebSite and WebPage. No invented reviews, ratings, release dates or prices. |
| 10 | Internal links | Header, footer, content navigation, related pages and waitlist links implemented. |
| 11 | Broken links | Internal routes and fragments verified across all 14 pages. External service availability is not guaranteed. |
| 12 | Compress images | Display logo converted from 25,757-byte PNG to 4,792-byte WebP (about 81% smaller). The original remains available for the Apple icon. No external photos, fonts or video embeds. |
| 13 | Core Web Vitals | Performance-conscious implementation: compressed fixed-size images, local system fonts, no third-party tracking and limited client components. **Not measured or certified.** Browser/lab measurement and real-user data are still required. Nonce CSP deliberately uses server rendering, so hosting latency matters. |
| 14 | Mobile layout | Responsive layout, collapsible navigation, responsive information pages and a native modal preference dialog implemented. **Browser visual/interaction QA remains unperformed** because supported browser tooling was unavailable. |
| 15 | Enforce HTTPS | HSTS and canonical-HTTPS redirect for ingress requests marked `x-forwarded-proto: http` are configured and tested. Production `SITE_URL` rejects insecure non-localhost origins. Real TLS and ingress header handling must be configured and verified on the deployment host. |
| 16 | Clean URL slugs | Lower-case, readable paths such as `/how-it-works`, `/community-guidelines` and `/waitlist-privacy`; unknown content slugs return 404. |
| 17 | og:image | Generated 1200×630 social image plus Open Graph and Twitter metadata. |
| 18 | llm.txt | Both `/llm.txt` and `/llms.txt` included. Describes the app and links to actual content; does not claim guaranteed indexing or crawler enforcement. |

## Security checklist

| # | Requirement | Status and evidence |
| --- | --- | --- |
| 1 | Protect admin routes | Protected `/admin` dashboard and `/api/admin/stats` API. Both revalidate the Supabase Auth user on the server and require a verified email plus a server-configured account UUID. Unauthenticated page requests redirect to sign-in; unauthorized API requests return 401. Access controls are tested with mocked Auth; live configuration is still required. |
| 2 | Server-side access | Privileged waitlist writes run only through the server route and a service-only database RPC. No client database key or subscriber-list endpoint. Aggregate stats are fetched only after admin authorization. |
| 3 | Row-level security | Enabled in the prepared SQL; anonymous and authenticated table/RPC access is revoked. Local database tests verify this. **Not applied or verified on the inactive live project.** |
| 4 | Verify email | **Not implemented for waiting-list submissions.** Input format and explicit consent are checked, but ownership is not verified. No double-opt-in email or account-verification claim is made. Administrator access requires a verified email reported by Supabase Auth; this is separate from waiting-list ownership verification. Other app Auth settings remain unverified. |
| 5 | Hash passwords | Administrator credentials are submitted only to the server and forwarded to Supabase Auth for password verification; the website does not store or hash passwords itself. Provider-side password storage is managed by Supabase Auth. Live Auth settings and the separate app still need review. |
| 6 | No local auth tokens | Admin login uses a Secure, HttpOnly, SameSite=Strict cookie in production; no admin auth token or refresh token is written to local storage. The saved local-storage record is only a privacy preference. **The existing root/browser app does maintain local authentication sessions; it does not pass a blanket no-local-auth-token requirement.** |
| 7 | Server-side secrets | Service-role key and rate-limit salt are read only in server-side signup code and are not `NEXT_PUBLIC_` values. |
| 8 | Keep .env off GitHub | Local env files are ignored. The committed `.env.example` contains empty secret fields and a public project URL. No real credentials added. |
| 9 | No secrets in logs | Marketing handlers do not log submission payloads, provider credentials, IPs or tokens. Hosting access logs, error integrations and the separate app need their own review. |
| 10 | Parameterized SQL | JSON RPC arguments feed PL/pgSQL parameters; no dynamic SQL or string-interpolated user input. Database tests use bound parameters. |
| 11 | Validate form inputs | Server checks email syntax/length, platform enum, explicit consent, honeypot, JSON content type, bounded request body and trusted ingress IP. Invalid requests are rejected. |
| 12 | Block XSS | React text escaping plus escaped controlled JSON-LD; per-response nonce CSP, no production unsafe-eval/unsafe-inline scripts, self-only browser network access and framing restrictions. This is defence in depth, not a guarantee against all XSS. Style attributes are allowed for controlled preview sizes. |
| 13 | Validate uploads | No upload endpoint or file form exists in this website. Separate app uploads are outside this review. |
| 14 | Verify webhooks | No webhook receiver exists in this website. Add signature validation if a future integration introduces one. |
| 15 | Rate-limit requests | Signup RPC allows five validated submissions per hashed IP per 15 minutes, shared across server instances. Local SQL tests verify limiting and window reset. Requires live schema activation. Admin sign-in allows five attempts per account hash and twenty per IP hash in fifteen minutes, enforced in SQL. Additional host/WAF limits for other traffic remain a deployment concern. |
| 16 | Tighten CORS | Signup requires the exact configured Origin; no wildcard cross-origin access headers. The form is same-origin. Ingress must overwrite the trusted IP header; CORS alone is not bot protection. |
| 17 | Production debug off | Production build/start scripts; browser source maps disabled; generic API errors and no debug response payloads. Live host mode still needs verification. |
| 18 | Patch dependencies | Direct versions pinned and lockfile committed. `npm audit` reports **0 known vulnerabilities** for `web/` at review time. CI repeats audit at high severity threshold; this is not a permanent guarantee or a root/mobile dependency review. |
| 19 | Claude security scan | **Not run.** No Claude plugin was found in the available plugin directory searches. Source review, dependency audit and automated tests were performed; they are not labelled as a Claude or independent penetration test. |

## Verification performed

- Production Next.js build.
- Nineteen automated API, admin authorization, security and local Postgres-compatible database tests.
- Production HTTP checks over all 14 public pages: metadata, canonical tags, indexability, JSON-LD, heading order, image alt attributes, internal routes and fragments, sitemap, robots and LLM files.
- HTTP checks for fresh CSP nonces, matching script nonces, HSTS, HTTPS redirect, protected admin redirect/API rejection and fail-closed unconfigured signup. Separate production HTTP checks cover approved-account login, secure cookie flags, stats access, invalid tokens, origin rejection and logout using a mocked Auth backend.
- `npm audit`: zero known vulnerabilities in marketing dependencies.

Browser screenshots, Lighthouse/field Core Web Vitals, live database tests, actual email delivery/verification, independent penetration testing and legal review are not represented as completed. The public legal pages describe product boundaries and existing operator/contact details; they do not establish legal compliance by themselves.

## Activation before real signups

Restore the Bible Diaries Supabase project, apply `database/waitlist.sql` and `database/admin.sql`, configure the server-only credentials and trusted ingress header, build with the real HTTPS `SITE_URL`, and verify on the production host. Configure the actual browser app address only when deployed. The full account/authentication, upload and messaging checklist requires a separate review of the root and mobile apps before release.

Admin setup and account approval instructions are in [ADMIN_DASHBOARD.md](./ADMIN_DASHBOARD.md). Admin pages intentionally use noindex and are excluded from the public sitemap.
