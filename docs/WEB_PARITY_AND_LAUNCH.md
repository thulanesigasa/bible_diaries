# Web parity and launch assessment — 10 November 2026

## What changed

The previous `src/app` browser screens were separately implemented and had drifted from mobile. The old browser activity page split moderation notifications from community events; the mobile inbox combined them chronologically with filters. The composer, achievements navigation and several settings layouts also differed.

The production `APP_SITE_ROLE=app` now serves the Expo web build of **the same mobile screen components**. Feed/composer, five-tab navigation, activity/notifications, achievements, settings, reading preview, reports, guardian permissions, reviews/appeals, policies, support, signup and login therefore come from one implementation. The Next server retains nonce CSP, same-origin protected writes and an HttpOnly cookie session bridge. Main-site pages and app pages have distinct service roles and origins. Do not confuse the remaining legacy Next app screens with the shared browser app served by the app role.

Browser recovery links, JSON/encrypted export downloads and clipboard sharing fallback are supported. Native PIN/biometric unlocking, app-switcher protection, secure native credential storage and native capture prevention remain OS-specific. The browser shows the corresponding limitation honestly; it cannot provide identical OS-level recording prevention. Exact shared UI does not mean a browser gains unavailable device APIs.

## Remaining release work

The application is not declared production-ready solely because it compiles or a developer account has been approved. Complete and record these checks:

| Area | Current code | Evidence still needed |
| --- | --- | --- |
| Four sites | Main, waiting list, admin and shared browser-app roles with local launchers/containers | Owned domains, DNS, valid HTTPS, correct host-to-service routing and correct origins |
| Auth | Email confirmation return screen, trusted token/session validation, recovery, resend, age/consent and guardian gates | Real confirmation/recovery emails on phone and PC; expired links, another device, existing users, adult/teen cases; production SMTP and exact redirect allowlist |
| Moderation | Held-content queue, review decisions/reasons, appeals, safety reports and blocking | Two-account end-to-end test: submit → hold → admin approve/reject → author notification; designated reviewers and operational response process |
| Privacy/deletion | Owner-only contacts, restricted eligibility, consent records and deletion flow | Real test account deletion/session revocation, export/correction requests, accurate retention/provider declarations and public deletion URL |
| Admin | Separate roles, server access checks and MFA controls | Configure real allowlists/secrets; verify the two intended admin identities cannot cross workspaces |
| Reliability | CI/tests, health endpoints, rate-limit and database tests | Staging tests of authenticated reads/writes at expected concurrency, realistic moderation latency, resource limits, alerting and backup restore. Health-only latency does not establish write capacity |
| Mobile | Shared JS UI and native runtime compatibility gate | Physical Android/Huawei checks for keyboard, camera/photo selection, capture protection before/during password and biometric entry, offline/reconnection and interrupted updates |
| Notifications | In-app activity, achievements and moderation decisions | Verify read/unread behavior across devices. Background OS push delivery is not established by this implementation; add/register/test push tokens and delivery before advertising closed-app push notifications |
| Stores | Existing candidate APK/AAB workflows, OTA path and store-update manifest hook | Signed candidate on each target store's device/test track, current target API/package requirements, store assets, age/content rating, reviewer test access, Data safety/privacy declarations and approved listing URLs |

Review the current official store requirements when submitting:

- Google Play UGC: https://support.google.com/googleplay/android-developer/answer/9876937
- Google Play account deletion: https://support.google.com/googleplay/android-developer/answer/13327111
- Apple App Review Guidelines, especially 1.2 and 5.1.1: https://developer.apple.com/app-store/review/guidelines/
- Huawei AppGallery Review Guidelines/privacy: https://developer.huawei.com/consumer/en/doc/app/50104-07/
- Expo runtime compatibility: https://docs.expo.dev/eas-update/runtime-versions/

Reporting, blocking, policy acceptance and deletion are implemented paths to verify, not guarantees that a store will approve a submission or that every harmful contribution will be detected. Keep private messaging claims accurate: service access controls and transport security do not establish end-to-end encryption. Phone country-code collection is not phone ownership verification. Guardian email ownership alone does not prove legal guardianship.

## Recommended release sequence

1. Host the four sites and configure Auth/SMTP with the exact addresses.
2. Run the real-account/device/moderation/deletion checks and restore a backup in staging.
3. Complete store declarations, reviewer access and signed beta candidates.
4. Release a small monitored cohort, then increase availability based on evidence.
5. Use OTA for compatible fixes; publish a new store binary for native/runtime changes, then activate its approved store-update entry.
