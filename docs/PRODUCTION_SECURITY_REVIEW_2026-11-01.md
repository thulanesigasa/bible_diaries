# Bible Diaries production security review — 1 November 2026

**Follow-up implementation:** see [Security changes and Docker](SECURITY_AND_DOCKER.md). This audit records the original findings; the follow-up documents fixes, the registration exclusion and remaining activation/device checks.

**Decision: HOLD public app release.** Huawei developer-account approval does not establish that this app is ready to publish. This review found concrete authentication, privacy and enforcement gaps. Passing marketing-site tests or receiving zero database advisor warnings must not be presented as certification of the mobile app.

## Scope and evidence

Reviewed GitHub `main` at `eef36140e87ff9b8f6221961a855e65eb2355091`, including the root Next.js companion, `mobile/` Expo app, `web/` marketing site, SQL bootstrap and workflows. Inspected the active Supabase project `fspfwidfdnqvpgmipate`: table/column metadata, grants, policies, function definitions, Storage configuration, public Auth settings and advisors. No management credentials or private user data were collected.

The Auth database contained zero users at inspection. Security behaviour was tested using synthetic records inside explicit transactions that were rolled back. This does not prove that an existing APK points to this project or that another branch/release contains the same code. No real signup email was sent, no real account was created and no device login/recovery or Huawei release binary was tested.

## Open release blockers

| ID | Priority | Verified finding | Required outcome before release |
| --- | --- | --- | --- |
| AUTH-01 | High | Public Auth settings return `mailer_autoconfirm: true`. Email signup is enabled and anonymous sign-in is disabled. Mailbox ownership is therefore not required by the current email/password signup configuration. | Enable email confirmation, configure legitimate delivery and exact callback/deep-link allowlists, and test pending, verified, expired and reused confirmation flows. Confirm the actual backend password settings rather than relying on a form. |
| PRIV-01 | Critical | `public.profiles` has a public SELECT policy with `USING (true)` and contact columns in the same table. An anonymous role could read synthetic `address` and `phone_number` values even after the fixture profile was marked private. | Separate private contact/account fields from community data, enforce owner access in the database, and provide safe community projections. Replace `select('*')`/nested `profiles(*)` callers together with the schema change. Verify unauthenticated and second-user denial through the Data API. |
| PRIV-02 | High | `privacy_mode` is saved by settings, but the profile read policy ignores it. Diaries also have unconditional public reads and no per-entry visibility column in the live schema. | Define and enforce profile/diary visibility on the server. A private-diary promise needs a distinct tested data model and access policy; a profile setting is not proof of per-entry confidentiality. |
| ANON-01 | High | Mobile screens hide author names conditionally using `is_anonymous`, but the live diaries table has no such column and the create-post payload does not persist the switch. Raw author identifiers and profile joins remain available. Anonymous comments also retain their author identifiers in directly readable rows. | Implement protected authorship storage and safe public projections, including comments and replies; ensure anonymity survives direct API reads, joins and realtime payloads. Do not describe a hidden display name as anonymity. |
| DM-01 | High | Chat INSERT only verifies `auth.uid() = sender_id`. A synthetic authenticated user successfully inserted a message to a recipient whose `allow_dms` was false. | Enforce the recipient preference in the database or a trusted write service and regression-test direct API bypasses. |
| MOD-01 | High | Browser moderation is a client-orchestrated check before a separate direct table INSERT. Mobile uses a short placeholder keyword list and then writes directly. The `/api/moderate` route has no authentication, request-size limit or durable request limiter. | Make moderation and publishing a trusted, enforced pipeline for posts/comments/messages as required. Deny client bypass of that pipeline; protect the moderation endpoint from anonymous/cost abuse, validate bounded input and specify safe outage behaviour. |
| AUTH-02 | High | No `resetPasswordForEmail` / `updateUser` password-recovery flow or corresponding recovery callback exists in the reviewed app. Registration success text does not explain a pending confirmation state. Both clients accept a six-character password locally. | Build and test recovery, confirmation/resend and expiry handling on web and mobile. Use a suitable backend-enforced password policy and validate confirmation behaviour after enabling it. Client checks can be bypassed. |
| SESSION-01 | High | Native session persistence uses AsyncStorage; web clients use localStorage. Native failure falls back to an in-memory map that can leave a stale persistent credential when removal fails. Auth events log email addresses; browser chat debugging logs realtime payloads. | Store native credentials using platform-backed secure storage, handle refresh/background/logout failures, and remove sensitive diagnostic logs. Review web session/XSS design and apply browser security controls. Native dependency changes require a rebuilt binary, not an OTA-only release. |
| DEP-01 | High | Dependency audits found root-app and mobile advisories. Next.js critical advisories have been patched in this change, but additional root and mobile findings remain (see counts below). Some mobile findings concern build tooling rather than code executing on a handset. | Resolve or document each advisory with its dependency path, runtime reachability, mitigation and retest. Follow Expo's versioned compatibility guidance; do not use `npm audit fix --force` or downgrade the SDK. |
| ACCOUNT-01 | Release blocker | The reviewed clients have sign-out and post deletion, but no complete in-app account-deletion flow, verified deletion endpoint or account-deletion session tests. The privacy page instead refers to a termination request. | Provide the intended deletion route, reauthentication/ownership checks, session revocation and an explained retention/cascade policy. Test with disposable accounts and assess current store submission requirements. |

The privacy findings describe permitted access, not evidence that real personal information has been leaked. There were no Auth users in this inspected project. The synthetic test establishes that the policy would expose the fields when real registrations arrive.

## Protections that passed inspection or testing

- All seven application tables have RLS enabled. Ownership predicates exist for profile/diary/comment writes. This is a foundation, not sufficient proof of confidentiality.
- A second-user synthetic test changed zero rows in another user's diary, saw zero of their bookmarks and saw zero nonparticipant chats.
- Authentication is delegated to Supabase Auth rather than a handwritten plaintext-password database. No existing password hashes could be assessed because there were zero users. No passwords were retrieved.
- A tracked-source pattern scan found no obvious service-role JWT, Supabase secret key, OpenAI secret key or private-key material. This was not a complete historical secret scan or a scan of CI secret configuration. The committed legacy anon key is a public client key and relies on correct RLS; it is not a service-role credential.
- Marketing administration has a separate verified-account/UUID allowlist and server-validated HttpOnly session design. Its mocked HTTP tests do not certify the root/mobile authentication flows.

## Hardening completed during this review

Migration `20261101115300_security_audit_baseline.sql` was created with the Supabase CLI, locally tested and applied to the live project as `security_audit_baseline`. Its filename was aligned with the version recorded by the live migration history:

1. Set a fixed `pg_catalog` search path on `public.handle_new_user()`; its table references are already qualified.
2. Removed public, anonymous and authenticated EXECUTE grants from the two internal trigger functions. The signup trigger still successfully creates a profile in a rolled-back synthetic test.
3. Removed TRUNCATE, REFERENCES and TRIGGER table grants from app client roles. Normal row-operation grants and the existing policies are preserved.
4. Set the `avatars` Storage bucket to a 10 MiB limit and JPEG/PNG/WebP content types. This does **not** validate the inline base64 avatar strings currently written into profiles/user metadata, nor does it replace file signature checking or safe image processing.

Supabase Security Advisor changed from three warning categories/five function findings to an empty lint list. Subsequent synthetic tests still reproduced the private-profile contact exposure and DM opt-out bypass. The advisor cannot determine all business privacy requirements.

Both Next.js applications were updated to exact version **16.4.3**, with lockfiles. Their production builds passed. This patch does not establish whether a particular vulnerability was exploitable in the deployed environment and does not update a running host automatically unless that host deploys this commit.

## Dependency evidence

Full `npm audit --json` results from the locked dependency trees (the root also received compatible, non-forced dependency fixes):

| Package tree | Initial critical / high / moderate / low | After fixes in this review |
| --- | --- | --- |
| Root companion | 1 / 8 / 16 / 0 | 0 / 0 / 15 / 0 after compatible dependency fixes |
| Marketing `web/` | 1 / 0 / 0 / 0 | 0 / 0 / 0 / 0 |
| Mobile | 1 / 11 / 14 / 2 | Unchanged; no native dependencies changed |

These are npm package/advisory findings, not counts of independent exploitable paths. The mobile critical finding is in `shell-quote`; dependency-chain and build-environment impact must be assessed. Root remaining advisories include development tooling as well as transitive packages. After the Next.js-only patch the root production audit still found three high and one moderate issue. Compatible `npm audit fix --ignore-scripts` updates resolved those; the final production-only audit reports **zero known findings**. The remaining fifteen moderate full-tree findings are in development tooling and still need review; the command suggesting a forceful major downgrade was not followed. Full-tree counts should not be described as handset vulnerability counts.

Official Next.js security guidance: https://nextjs.org/blog/nextjs-security-update-october-14-2026 and https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr . The published guidance recommends upgrading even where the specific vulnerable cache pattern is absent.

## Verification completed

- Root companion production build using a nonsecret placeholder public key; compilation/static generation only, not a connected user session.
- Marketing production build and checks over 14 public routes, including metadata, links, headers and protected administrator HTTP flows with mocked Auth.
- Twenty automated tests, including a new Postgres-compatible hardening test that checks trigger continuity, revoked privileges and Storage limits.
- Content checks over the existing nine-document collection.
- Live metadata/privilege queries, advisors, anonymous contact-read reproduction and three-user authorization/DM preference tests, all synthetic data rolled back.
- Dependency scans before/after the targeted patch and compatible dependency fixes, plus a limited tracked-source secret-pattern scan.

## Checks still required on the release candidate

1. Verify the exact release commit, Expo runtime/channel and Supabase target in the signed APK/AAB intended for Huawei. Test on a Huawei device without Google Mobile Services and on the oldest supported Android version. No release artifact, signing setup or Huawei review outcome was inspected here.
2. Complete AUTH-01/AUTH-02 first: delivery to controlled test inboxes, confirmation callbacks/deep links, password reset, expiry/reuse, error messages and duplicate-account behaviour. No inbox credentials should be shared. Enable breached-password protection where available and verify backend rate limits/CAPTCHA rather than assuming form-level delays protect Auth.
3. Complete privacy/anonymity/DM/moderation enforcement and run adversarial tests through the real Data API as anonymous, user A, user B and an unverified session. Include update/reassignment, realtime, joins, comments and media URLs.
4. Test native refresh after expiry, background/resume, offline-to-online recovery, app restart, logout, revoked accounts and account deletion. Check that one user's cached content is not shown to the next user on a shared device.
5. Validate server-side input length/content, inline image limits, accepted file types, abuse controls and moderation outage behaviour. Client-side image compression is not a server-side security control.
6. Verify the production hostname, HTTPS and headers of the companion app. Its `next.config.mjs` is currently empty; the marketing site's headers must not be assumed to cover it. Assess browser credential storage and XSS/CSRF risks in the chosen session architecture.
7. Confirm SMTP ownership/delivery, exact redirect allowlists, backend password settings, Auth rate limits, administrator MFA, database/network restrictions, backups and a tested restore, monitoring, incident handling and support escalation. These management settings were not accessible through the current connector. Do not paste service keys into chat or public environment variables.
8. Recheck security/performance advisors after the actual feature migrations. The current performance advisor reports nine missing foreign-key indexes and seventeen per-row Auth policy evaluations; perform bounded staging load tests and pagination review before launch.
9. Reconcile the advertised privacy/safety features with the released build and applicable legal/store requirements. Lengthy policy pages do not implement privacy controls or certify compliance.

The original `schema.sql` is a legacy bootstrap, not a safe incremental production migration plan. Feature/privacy migrations need coordinated client changes, review and tests. This audit deliberately does not silently replace the public profile API, change all existing audience rules or claim these open findings are fixed by the narrow baseline migration.

Supabase background guidance: https://supabase.com/docs/guides/deployment/going-into-prod . Advisor remediation references: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable , https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable , and https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable .
