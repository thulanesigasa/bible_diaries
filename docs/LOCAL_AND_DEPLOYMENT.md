# Run the four Bible Diaries websites

The browser app now uses the same `mobile/app` screens and `mobile/components` as the native app. The Next.js service in `src` supplies the main marketing website, the browser HTML shell and secure browser API/session routes. `web` supplies the waiting list and admin dashboard. The older Next.js app screens remain for compatibility but are not served by the production `app` role.

| Purpose | Production address | Local address | Configuration |
| --- | --- | --- | --- |
| Main website | https://biblediaries.co.za | http://localhost:3000 | `APP_SITE_ROLE=main` |
| Waiting list | https://waiting.biblediaries.co.za | http://localhost:3001 | `SITE_ROLE=waitlist` |
| Administration | https://admin.biblediaries.co.za | http://localhost:3002 | `SITE_ROLE=admin` |
| Browser application | https://app.biblediaries.co.za | http://localhost:3003 | `APP_SITE_ROLE=app` |

Domain names are planned deployment destinations, not a claim that DNS or hosting is already configured. No domain purchase or DNS change is performed by these code changes.

## Local setup (Node 22+, including Windows PowerShell)

Open the repository root in a terminal:

```sh
git pull origin main
npm ci
npm --prefix mobile ci
npm --prefix web ci
```

Copy `.env.local.example` to `.env.local` and `web/.env.example` to `web/.env.local`. In PowerShell:

```powershell
Copy-Item .env.local.example .env.local
Copy-Item web/.env.example web/.env.local
```

On macOS/Linux, use `cp` instead of `Copy-Item`. Enter your Supabase project URL and **public/anon client key** in the root file. Keep the example's four localhost addresses. Server-only waiting-list/admin configuration belongs in `web/.env.local`; AI/provider keys belong in Supabase Edge Function secrets. Never put a service-role key in a `NEXT_PUBLIC_` or `EXPO_PUBLIC_` variable. Missing admin/waitlist secrets should leave those operations unavailable, rather than making them public.

Build the shared browser UI, then start all four services:

```sh
npm run build:browser
npm run dev:all
```

Open the four local addresses in the table. Use Ctrl+C in the terminal to stop them. Individual launchers are `npm run dev:main`, `npm run dev:waiting`, `npm run dev:admin` and `npm run dev:app`. Outputs are isolated so concurrent Next.js dev processes do not overwrite one another's caches. Ports must be free.

Changes to marketing pages reload through Next.js. After changing shared mobile/app screens, rerun `npm run build:browser` in another terminal and refresh the browser app. This browser build is an Expo web export behind the Next server, not a second handwritten implementation. To develop the native app separately, use `npm --prefix mobile start`.

`npm ci` installs exactly the dependency versions in the lockfile. It does not start the website or configure Supabase.

## Email verification and recovery

In Supabase → Authentication → URL Configuration, keep email confirmation enabled and add these exact local redirect addresses for development:

- `http://localhost:3003/auth/confirm`
- `http://localhost:3003/reset-password`
- `bible-diaries://auth/confirm`
- `bible-diaries://reset-password`

Use `localhost` consistently: `127.0.0.1` is a different origin and needs its own exact entries if you use it. Do not add broad public wildcard redirects. A development app/custom scheme must be installed to open a native return link; Expo Go does not behave like the signed installed app.

Signup collects details and policy consent, then creates a password. It does not bypass email verification. The post-signup screen simply asks the user to check their email and provides a rate-limited resend action. Confirmation checks the returned session with Supabase and requires `email_confirmed_at`; an untrusted `?verified=true` flag cannot produce a verified account screen. Expired/invalid links lead to a clear sign-in/retry message. Browser tokens are removed from the address bar and persisted through HttpOnly cookies, not localStorage.

Once the app domain has DNS and valid HTTPS, configure the exact production addresses:

- `https://app.biblediaries.co.za/auth/confirm`
- `https://app.biblediaries.co.za/reset-password`

Set the Supabase Site URL to the chosen app origin, and confirm that the email template respects `RedirectTo`. For a native signup that can fall back to a browser confirmation page, set this public build/OTA configuration:

```text
EXPO_PUBLIC_AUTH_REDIRECT_URL=https://app.biblediaries.co.za/auth/confirm
```

Set it as a GitHub Actions repository **variable** with that name (Settings → Secrets and variables → Actions → Variables), or in the native EAS build environment. The OTA and candidate-build workflows forward it. Then rebuild the browser UI and publish the native JS update with that configuration. Native signup otherwise uses the already-supported `bible-diaries://auth/confirm` return link. The HTTPS fallback validates the link, displays “Account verified”, and offers “Open Bible Diaries app” or “Continue in browser”. The app handoff uses a fixed scheme and a URL fragment, never a caller-selected destination or a token in the query string. Browser restrictions may require the user to tap the Open button. Verified users may still need guardian permission or an enrolled authenticator; email verification does not bypass these controls.

Configure and test a production SMTP sender, domain authentication and email delivery before release. This repository change does not configure your hosted Supabase redirect allowlist, SMTP provider or DNS, and automated mocks do not prove real inbox delivery.

## Production containers

Copy `.env.docker.example` to `.env.docker`, enter the same public key, and provide the server-only `web/.env.local` settings. With Docker Engine/Desktop and Docker Compose installed:

```sh
docker compose --env-file .env.docker up --build -d
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs -f
```

The four local addresses still apply. Stop with:

```sh
docker compose --env-file .env.docker down
```

For hosting, set `MAIN_SITE_URL=https://biblediaries.co.za`, `APP_ORIGIN=https://app.biblediaries.co.za`, `WAITLIST_URL=https://waiting.biblediaries.co.za` and `ADMIN_SITE_URL=https://admin.biblediaries.co.za`. Terminate HTTPS at your ingress and route each hostname to the corresponding loopback service. Preserve the intended Origin and trusted forwarding headers. Do not expose internal container ports publicly without that ingress. Native, main, waiting-list and admin sessions must not be shared by setting a parent-domain cookie.

The Docker build installs mobile dependencies, exports the shared browser UI, and builds the Next.js server. The same image runs the main and app roles, with separate environment settings. The waiting-list and admin image runs in its own role. These are server applications; uploading folders as a static-only website is insufficient for protected sessions, admin actions and waitlist writes.

## Updates after launch

A fresh browser load receives the deployed HTML and hashed shared UI assets; browser users do not install Expo OTA bundles. Deploy the web image when changing web UI.

Compatible native JavaScript/assets are published through EAS Update after main CI passes. The in-app popup checks on startup/foreground. A failed download has a retry message; dismissing it keeps the current app usable. Native changes require a rebuilt APK/AAB/iOS binary with a new compatible runtime and store release. The native fingerprint gate stops an incompatible OTA publish. An OTA is not a way to bypass store review.

For store-update prompts, `public/app-release.json` is deliberately inactive until real listings are approved. After a store release, put the **published** build number, version and approved store URLs in the appropriate platform record. For example, after an actual Android build 6 / version 1.0.6 has been approved:

```json
{"android":{"build":6,"version":"1.0.6","stores":[{"label":"Google Play","url":"https://play.google.com/store/apps/details?id=com.thulanesigasa.biblediaries"}]},"ios":null}
```

The example is a configuration shape, not evidence of a live listing. Add Huawei's actual approved URL only when it exists. Allowed links use HTTPS on Google Play, Huawei AppGallery or Apple App Store. The app compares the installed native build, offers store buttons only for a newer published build, and does not interrupt users when the manifest is unavailable. After hosting your owned HTTPS main domain, set the GitHub Actions repository variable `EXPO_PUBLIC_RELEASE_MANIFEST_URL=https://biblediaries.co.za/app-release.json` (or the native EAS environment value) and publish the compatible JS update. No store-manifest network request is made while this variable is unset. Universal/app links with verified domain association require further native/platform configuration and a new binary; the existing custom scheme works independently.
