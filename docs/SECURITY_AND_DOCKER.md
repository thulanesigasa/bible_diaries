# Security changes and Docker operation

Updated 1 November 2026. Registration screens and the backend email-confirmation setting were deliberately left unchanged at the user's request. The previously identified registration risk is not signed off by this work.

## Implemented protections

- Phone/address data is in `profile_contacts` with owner-only RLS. Legacy public profile columns are cleared and constrained to NULL. Private profiles are visible only to their owner. Auth metadata no longer carries newly registered users' bulky avatars/contact data: a transactional internal trigger preserves it in the appropriate profile/contact records without changing the signup form.
- Entries have explicit public/private visibility and independent like/comment permissions. Both composers expose these choices. Database policies enforce them on direct API access. Private profile mode and a private entry are different choices.
- Anonymous entries/comments store their real author in ownership tables protected by RLS. Public rows contain a NULL author ID. `owned_by_me` exposes a reader-specific boolean for edit/delete controls. This protects direct database/API identifiers; it does not promise protection against writing style, screenshots, timing or other inference.
- Content INSERT/UPDATE grants are removed from clients. Both apps route writes through `secure-content`; its verified session, server identity binding, durable limits, input bounds, AI moderation and transaction checks precede publication. Comments, replies and messages use the same service. Provider failures/missing credentials return an error without publishing. Moderation does not guarantee that every harmful statement is recognised.
- DM opt-outs and private-recipient restrictions are checked at commit time. Disabled comments/likes and inaccessible parents cannot be bypassed with a handcrafted client request. Revoked/deleted sessions fail database access checks.
- Native credentials use chunked OS SecureStore with no plaintext fallback. Old AsyncStorage credentials are removed, requiring existing users to sign in again. Browser persistence uses Secure/HttpOnly/SameSite cookies; active SDK tokens exist in memory, not localStorage. Legacy browser session storage is removed. Cookie endpoints check origin and never log tokens/passwords. This is not a claim that an XSS can never act as the current user.
- Password recovery screens exist on both platforms. Recovery links, expiry/error states, password replacement and global sign-out are handled. The existing signup password policy remains unchanged under the registration exclusion.
- Account deletion asks for the current password and explicit DELETE confirmation, reauthenticates on the server, revokes sessions, removes owned Storage objects/anonymous content and deletes the Auth user. Cascade deletes remove related profiles, contact records, chats, bookmarks, likes and comments. The flow is irreversible; another person's exported copies cannot be removed. Failure after session revocation requires signing in again to retry.
- Inline profile images have byte-size, MIME/signature and dimension limits; SVG/untrusted external URLs are rejected. Storage avatar files are private and owner-protected. Existing invalid legacy rows were not silently deleted; NOT VALID constraints enforce new writes and require a separate legacy-data review if importing old users.
- The companion now has nonce CSP, framing/content-type/permission protections, private-page noindex and standalone output. Sensitive diagnostic logging is removed. Marketing SEO remains separate.

## Live backend changes

Applied migration `20261101122925_enforce_app_security.sql` and deployed JWT-protected `secure-content` / `delete-account` Edge Functions. The earlier baseline migration remains in history. Live synthetic records were created only inside a rolled-back transaction. Anonymous-author nulling, owner-only contacts, private-profile denial and blocked direct writes/service RPCs were verified against the live schema. Local Postgres-compatible tests also cover private entries, interaction opt-outs, DM opt-out enforcement, ownership and revoked sessions.

Security Advisor has no warning/error findings. It reports informational notices for two private internal tables with RLS and intentionally no client policies; their client privileges are revoked. They are accessible only through internal privileged functions/service paths. Do not add permissive policies simply to clear these notices.

## Required activation configuration

1. Set **OPENAI_API_KEY** in Supabase Dashboard → Edge Functions → Secrets. It must remain server-only. Until a working key is configured, publishing fails closed. No key was requested, created, printed or committed during this change. A simulated provider test passes; a live provider request using your credential has not been performed.
2. Confirm the existing Auth SMTP delivery and allow **exact** recovery redirects for your deployed companion `/reset-password` and `bible-diaries://reset-password`. Do not use a wildcard redirect allowlist. Test delivery, expiry, reuse and recovery on real devices. No registration/email-confirmation setting was changed.
3. Deploy the root companion from the new source and install a new signed native build. Old clients still attempting direct writes are intentionally denied. The database currently had zero Auth users when this migration was activated.
4. SecureStore is a new native module. Runtime compatibility now uses Expo fingerprints; EAS project ID/owner/app version remain intact. Automatic push-to-main OTA publication is disabled. Manual OTA requires acknowledgement of a verified native build and matching fingerprint. Do not send this bundle to the old binary.
5. Complete operational checks: exact release artifact/backend matching, Huawei device tests, recovery email delivery, current account MFA and backend settings, backup/restore drill and monitoring. These external checks are not accomplished by Docker or a successful build.

## Dependencies

Both Next.js apps use 16.4.3. Expo remains on SDK 57 with compatible patch updates. Targeted overrides patch `decode-uri-component` (0.5.1), `image-size` (2.0.4) and the Expo CLI's `zod` (4.6.6). Type checks and Android export passed after these overrides. The Zod override is limited to the CLI; its consumed schema APIs were reviewed.

The latest mobile audit has **zero high/critical** findings, with 12 moderate and 2 low findings remaining, primarily Expo build/configuration tooling (`glob`, `minimatch`, `deepmerge` dependency chains). Root development-tool advisories also remain. They have not been hidden with an audit filter or treated as proof of a handset exploit. Do not force a major SDK downgrade/upgrade to change an audit counter. Build tools process trusted repository/configuration inputs, are not deployed as public development servers, and should run in isolated CI. Reassess when upstream compatible fixes become available. These findings mean this is not a claim of zero known advisories across the entire repository.

## Run the web services consistently

Install Docker Desktop with Compose v2 (Windows/macOS) or Docker Engine with Compose v2 (Linux). Use Linux containers. From the repository root:

```sh
cp .env.docker.example .env.docker
# Edit .env.docker: provide the real PUBLIC Supabase URL/key.
docker compose --env-file .env.docker up --build -d app website
```

PowerShell can use `Copy-Item .env.docker.example .env.docker`. The companion is at `http://localhost:3000`; the marketing website is at `http://localhost:3001`. A Supabase public client key is intentionally bundled in the app; never put a service-role/secret key in the public-key variable.

Marketing's optional server configuration goes in `web/.env.local`, following `web/.env.example`. No marketing service key is required merely to start the containers; missing live waitlist configuration fails closed. Runtime secrets are excluded from image build contexts. `.env.docker` and `.env.local` must stay out of Git.

```sh
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs --tail=50 app website
docker compose --env-file .env.docker down
```

Images use multi-stage Next standalone builds, locked dependencies, nonroot runtime users, health checks, dropped Linux capabilities and no-new-privileges. Health checks are process liveness checks, not a certification of backend/email availability. Use the same built image digest when promoting a release between hosts; rebuilding against a moving base-image tag can incorporate newer Node security patches.

The host loopback bindings are deliberate. For access from phones or the internet, put an HTTPS reverse proxy in front of these containers, set **APP_ORIGIN** to the exact companion HTTPS origin and **SITE_URL** to the exact marketing origin, and rebuild when public build arguments change. Preserve the original host and forwarded HTTPS scheme. Secure cookies require a secure deployment; do not weaken them to support public plain HTTP. Do not expose the database or development servers.

Docker normalises server/build environments across supported hosts. It does not turn an Android/iOS app into a container running on a phone, provide identical screen sizes, or replace device/browser testing. The images can be built for Linux amd64/arm64 using an appropriate builder; CI smoke-tests amd64. An arm64 runtime has not been device-tested here.

## Optional containerised mobile bundle check

```sh
docker compose --env-file .env.docker --profile tools build mobile-check
docker compose --env-file .env.docker --profile tools run --rm mobile-check
```

This checks Expo's Android JavaScript/assets in a clean Node environment. A signed APK/AAB still requires the configured EAS/native build process and credentials. No signing keys belong in these images. Build APK using the existing workflow after the new source is merged, then install and test it on a Huawei device before store submission.

## Validation and limits

Automated checks cover database authorization, trusted content failure modes, identity binding, deletion reauthentication/order, native secure storage, app HTTP/session headers, production builds, mobile TypeScript and Android bundling. GitHub's App security and Docker workflow builds/runs the two nonroot web containers and checks health endpoints. A Docker engine is unavailable in the editing environment, so its image tests must finish successfully in CI before claiming container verification.

Actual email delivery, a live AI-provider credential, real hardware/keychain behaviour, signed native binary tests, backups and independent penetration testing remain release checks. Registration was explicitly excluded. Keep the original audit as historical evidence; use this document to understand implementation status and remaining activation requirements.
