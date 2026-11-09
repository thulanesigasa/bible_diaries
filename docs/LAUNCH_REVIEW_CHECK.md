# Backend and review activation check — 9 November 2026

The source implements the moderation workflow; this is not a capacity or production-accuracy certification.

## Actual request path

1. Mobile content INSERT/UPDATE uses `mobile/src/lib/content-client.mjs` to invoke `secure-content`. Browser content writes use `shared/content-client.mjs` and `/api/content`.
2. Authenticated requests are validated and rate limited. The server calls `omni-moderation-latest` and applies policy `bd-context-2.0.1`. If moderation is unavailable or its response is invalid, publication fails instead of bypassing checks.
3. ALLOW publishes through `moderated_submit`; REVIEW holds the draft outside community tables. Eligible public held submissions appear in `moderation_list(queue boolean)` for authorised staff. Private content requires explicit consent and a designated safety reviewer.
4. The central admin displays findings and an editable, policy-derived rejection suggestion. It is not a second generative AI agent autonomously deciding held posts. Staff approve or reject; actions reject stale versions and staff cannot approve their own submissions.
5. The decision and author notification commit together. Approved content is published; rejected content stays unpublished with a reason. Authors read the result in Activity & Notifications and My reviews & appeals. This does not configure operating-system background push.

Live read-only checks confirmed `secure-content` version 2 ACTIVE with JWT verification, `moderated_submit`, `moderation_list` and `moderation_action` installed, notification RLS, and the decision trigger. Main-admin and waitlist-admin membership counts are both zero. No staff identities or private submission bodies were retrieved for this check.

## Meaning of the 220 examples

`moderation/examples.json` is a version-controlled regression/evaluation dataset, not training, fine-tuning, prompt injection, an exact-text production lookup, or a guarantee of how similar posts will be classified. It remains unchanged by the settings redesign.

- Dataset SHA-256: `e74d2ddecf2d918c8ccf510edacdd19682240c8ba0c66b61d3e831c7fd9aef40`.
- Policy version: `bd-context-2.0.1`.
- Existing report: synthetic mock signals, 220 cases, 28 decision mismatches. It is not an OpenAI accuracy score.
- `omni-moderation-latest` is a provider alias; the upstream model can change. Human-validated labels, live-model evaluation and an independent dataset are still required. The opt-in live evaluator records the model returned by the provider.

## Before public launch

- Deploy the three hosts, DNS, TLS, exact origins and trusted forwarding-header configuration.
- Provision the two intended verified Auth accounts with distinct role memberships and unique passwords; do not send passwords in chat.
- Test submission → held status → staff decision → publication/rejection → author notification and appeal using actual test accounts on a compatible installed app.
- Verify the moderation API configuration with a harmless authenticated test. ACTIVE deployment alone does not establish that the upstream API is reachable.
- Measure throughput, concurrent submissions, latency, timeouts, rate-limit behavior and database resource use in staging. CI tests and index existence do not establish a supported user count.
- Confirm monitoring, alerting, backup restoration and rollback. Address the live advisor's leaked-password-protection warning using the available Auth plan/settings. Server-only RLS tables intentionally deny direct client access.
- Ship the latest mobile code through a new release or a verified compatible OTA. The existing v1.0.5 binary is unchanged.

## Settings redesign validation

Compact icon-led settings on mobile and browser retain every existing category, achievements and reviews. Reading preferences have a saved preview, bounded text sizes, named fonts/spacing, and reset of reading fields only. Controls wait for settings to load. Native reading hooks receive account-scoped saved changes immediately.

Validation: 39 backend/shared tests passed; mobile TypeScript and Android export passed; browser production build passed; browser interaction checks at 390px and 1280px verified size/font/spacing saves, reload persistence, reset, failed-save handling and preservation of privacy preferences. These browser checks used synthetic account data.
