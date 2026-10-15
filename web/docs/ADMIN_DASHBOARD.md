# Bible Diaries admin dashboard

The protected dashboard at `/admin` monitors waiting-list interest. It shows unique signup totals, today’s registrations, the last seven and thirty days, a thirty-day chart and accessible daily table, platform preferences, latest signup time and the time figures were refreshed. Calendar boundaries use Africa/Johannesburg (SAST).

The dashboard returns **aggregate counts only**. Subscriber email addresses and signup IP hashes are not sent to the administrator’s browser. Counts describe waiting-list requests, not installed app users or verified waiting-list addresses. The administrator’s own email is displayed to identify the signed-in account.

## Configure before use

The Bible Diaries Supabase project (`fspfwidfdnqvpgmipate`) was still INACTIVE when checked during implementation. The dashboard code and SQL are tested locally; no live schema or account was changed. Merging source does not restore the project or configure a host.

1. Restore the **Bible Diaries** project.
2. Run `web/database/waitlist.sql` once if the launch-waitlist tables are not already installed.
3. Run `web/database/admin.sql` once. It adds the service-only aggregate RPC and login rate-limit table/function, with RLS enabled and public execution revoked. It does not modify application profiles, diaries or Auth accounts.
4. Use a Supabase Auth account that you control and whose email has been verified. Use the normal verification/invitation flow if needed. There is no public admin-registration endpoint.
5. Copy that account’s UUID from Supabase Auth into `ADMIN_USER_IDS`. An account with a matching email or a user-editable `admin` metadata field is not sufficient.
6. Configure these **server-only** host variables, in addition to the waiting-list settings:

| Variable | Meaning |
| --- | --- |
| `SITE_URL` | Exact HTTPS origin of this marketing website |
| `SUPABASE_URL` | `https://fspfwidfdnqvpgmipate.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable key for the same project; legacy `SUPABASE_ANON_KEY` is accepted as a fallback |
| `SUPABASE_SERVICE_ROLE_KEY` | Same-project server service key, kept secret |
| `ADMIN_USER_IDS` | Comma-separated verified administrator account UUIDs |
| `ADMIN_RATE_LIMIT_SALT` | Separate random secret of at least 32 characters; generate with `openssl rand -hex 32` |
| `WAITLIST_TRUSTED_IP_HEADER` | Single-IP header overwritten by the hosting ingress, as documented in the website README |

7. Build/deploy the `web/` project with HTTPS enabled, then open `/admin/login` and sign in with the approved account.

Keep keys, salts and local environment files out of Git. Do not add these variables with a `NEXT_PUBLIC_` prefix. Do not configure an arbitrary visitor-supplied header as a trusted IP source. Without the complete server configuration the sign-in form is disabled and the API fails closed.

## Access controls

- The protected page and each stats API request validate the access token using Supabase Auth’s user endpoint; a decoded JWT or user-editable metadata is never used as an authorization shortcut.
- The user must have a verified email, be a non-anonymous account and have a UUID in the server-managed allowlist. Removing the UUID blocks subsequent requests, including requests with an existing cookie.
- The server retains only the access token in an HttpOnly cookie. In production it uses the `__Host-` cookie prefix with Secure, Path=/ and SameSite=Strict. No domain override is set. No browser local/session storage auth token or refresh token is used.
- The cookie expires after the shorter of the supplied access-token lifetime and one hour. There is no background refresh; sign in again after expiry. The Auth provider also validates the token lifetime.
- Logout clears the browser cookie and asks Supabase to revoke the session’s refresh capability. Already issued access tokens can remain valid until their Auth expiry; do not treat logout as a guarantee that a stolen token is instantly invalidated. Remove an account from `ADMIN_USER_IDS` and rotate/revoke credentials when responding to compromise.
- Login requires exact Origin, a bounded JSON body and a trusted IP header. SQL rate limits allow five attempts per hashed email and twenty per hashed IP per fifteen minutes. These are durable across server instances. Neither the raw email nor IP is stored in the rate-limit table. Old records are removed on later sign-in attempts.
- Logout requires exact Origin. The stats route rejects foreign origins/cross-site requests and requires an authenticated approved user.
- Stats RPCs are executable only by the service role. The site does not expose service credentials or direct database access to app users. All database-backed stats requests occur after server authorization.
- Page/API responses are private/no-store. Admin routes are noindex, excluded from the public sitemap and disallowed in robots.txt. These crawler controls supplement authentication; they are not the access control itself.

## Verification

`npm test` exercises verified-user and allowlist checks, metadata spoofing, denied/expired-provider sessions, cookie flags, login origin/IP/input validation, rate-limit failures, filtered aggregate responses and logout. Real PGlite SQL tests cover grants/RLS, account/IP limits and SAST date boundaries.

After building with `SITE_URL=https://bible-diaries.example`, `npm run test:site` checks public pages and a complete protected-admin HTTP flow against a short-lived production process. Only that test process imports a fake Auth backend; there is no test bypass, alternate Auth URL or mock mode in application code. No real account or subscriber record is used.

Live Auth, database, ingress and browser visual checks still need deployment verification. Refresh failures show an error rather than fabricated zero counts; previously loaded figures keep their recorded update time. Access is read-only: account administration, exports, subscriber deletion and email campaigns are not part of this dashboard. Use authorised Supabase access for subscriber correction/removal requests.
