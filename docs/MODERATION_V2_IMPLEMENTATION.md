> Current architecture update: see DOMAIN_STRUCTURE.md. Authorised public-content
> reviewers now receive the account name/surname/email, with audited access, as
> explicitly requested. Private content retains restricted consent and identity
> withholding. The new alignment migration adds separate waiting-list roles and
> atomic owner-only review notifications. These details supersede older statements
> below describing the initial review-only implementation.

# Contextual moderation V2

## Deployment state

The moderation foundation `20261108142855` is installed. The three-domain follow-up
migration `20261108191413` was applied successfully, and `secure-content` version 2
is ACTIVE with JWT verification enabled. Administrator accounts, custom-domain
hosting and a compatible native UI update still require operational activation.
See DOMAIN_STRUCTURE.md for the current roles, identity-access rules and rollout.

The target was verified as `bible_diaries`, project `fspfwidfdnqvpgmipate`, PostgreSQL
17.11. The pre-deployment audit found one account and zero diaries, comments or
chats. No moderator was provisioned or granted access. Select and verify the
intended account before granting a review role.

The separately published **v1.0.5 APK** was built from the release commit preceding
this moderation follow-up. It includes the settings/security/achievements/activity
work. It does not contain the new native My reviews screen. Ship that screen in a
subsequent native release, or a verified compatible OTA using the existing gate.

## Files and flow

- `supabase/functions/_shared/moderation-policy.mjs`: versioned independent
  decision function, complete response validation and child-safety intake.
- `supabase/functions/_shared/handler.mjs`: existing authentication, active-session
  checks, rate limits, timeouts and CORS preserved; calls the new trusted
  `moderated_submit` transaction instead of the old content-commit endpoint.
- `supabase/migrations/20261108142855_contextual_moderation.sql`: generated with
  the Supabase CLI, tested against the full schema locally. Adds private
  submissions, memberships and audit tables; owner/reviewer invoker RPCs;
  retention; atomic approval and stale-edit protection. Revokes the old unmoderated
  service RPC so it cannot be used as a content-publication shortcut.
- `src/lib/supabase.js`, `mobile/src/lib/supabase.js`: preserve review/rejection
  metadata and existing form error paths, which keep the unsent text.
- `/reviews` on browser and mobile: held drafts, withdrawal, editing, reasoned
  appeals and explicit private-review consent. Failed resubmission retains the
  local edited draft for retry.
- `/admin/moderation` on the browser: role-protected public review queue, restricted
  consented safety queue, approve/reject reasons and aggregate public statistics.
  It is separate from the marketing website's waiting-list administrator area.
- `moderation/examples.json`: the original 220 examples and unchanged labels.
- `moderation/evaluate.mjs`, `moderation/evaluation-report.json`: evaluator and
  reproducible synthetic report, confusion matrices, per-class metrics and every
  mismatch. `.github/workflows/moderation-evaluation.yml` supports an explicit
  live evaluation with a server-side GitHub `OPENAI_API_KEY` secret.
- `web/tests/moderation-v2.test.mjs`, `web/tests/content-service.test.mjs`: policy,
  integration, SQL permissions, privacy, appeals, stale updates and fail-closed
  tests. App CI now runs every web test, including this suite.

## Policy

Policy `bd-context-2.0.1` continues to use `omni-moderation-latest` exclusively.
No paid reasoning model was introduced. The implementation reads and validates
`flagged`, `categories`, `category_scores` and `category_applied_input_types`.
Missing or malformed responses prevent publication. Category scores never override
serious flags and are not treated as calibrated harm probabilities.

ALLOW publishes through the trusted transaction. Ordinary disagreement, biblical
correction and criticism are not independent reasons to reject. A narrowly bounded
first-person recovery testimony can quote ordinary harassment; this is not a
general quotation exception. Threat, exploitation and other severe signals retain
their protective controls even when a quotation/report is suspected.

REVIEW stores a held draft without inserting a post, comment or chat. Uncertain
harassment, possible coercion, sensitive disclosures and distress can receive this
outcome. Wellbeing disclosures receive supportive wording rather than being
presented as misconduct. REJECT explains the relevant rule, preserves the author's
editing path and allows one reasoned appeal. No raw scores are returned to users.

Explicit threats and targeted humiliation have additional text safeguards even
when a synthetic provider fixture does not flag them. Text rules are limited,
especially for sarcasm, quotations, obfuscation and multilingual context. They are
not a semantic reasoning engine. The policy cannot establish threat credibility
or theological truth. Unknown flagged categories are held rather than ignored.

Likely requests to exchange child-abuse imagery are stopped before the API call,
and the suspect text is not persisted in a review draft. No image upload or media
moderation intake was added. These cases cannot be approved by the ordinary review
queue; the operator must follow the provider's child-safety and applicable local
reporting process. This is a deliberately limited safeguard, not a claim of
comprehensive CSAM detection or a complete incident-response operation.

## Privacy, authorization and concurrency

All new tables are in `private`, have RLS enabled, and deny direct client and
service-role table access. Public RPCs are invokers; privileged implementations
are private, use fixed search paths and verify active sessions and ownership.
Memberships are server-managed, never read from user-editable metadata.

Ordinary moderators cannot read private diary entries or chats. A designated
`safety_reviewer` sees a held private text only after its owner explicitly consents.
Receiver IDs, parent/post IDs and anonymous owner IDs are removed from reviewer
records. The review UI itself may contain personal data the author wrote; it is
therefore still sensitive and should be used only by trusted trained reviewers.
No staff account may approve its own content.

Submissions are row-locked and version-checked. Approval, rejection, withdrawal
and consent increment a version; stale actions fail. Edited public content is
compared against the scanned base text before commit, preventing approval from
overwriting a later edit. Repeated held/rejected payloads reuse their submission;
recent published payloads are deduplicated for five minutes. Request limits also
apply to appeals and review actions. The audit records actor, action, reason and
time without private message bodies. Review notes must avoid unrelated identities.

Review records expire after 30 days. Expired records are excluded from RPCs;
bounded cleanup runs during submissions. If pg_cron is already installed, the
migration installs daily cleanup; otherwise the operator must schedule
`select private.cleanup_moderation()` using an authorised database job. Account
deletion cascades to submissions and their audit rows. No private content is
written to logs, analytics or the evaluation report.

## Executed validation

- **39/39 tests passed** with `node --test web/tests/*.test.mjs`.
- Native TypeScript and Android JavaScript export passed.
- Browser production build passed; My reviews and the moderator dashboard
  hydrated at a 390px viewport without horizontal overflow or browser errors.
- Local PostgreSQL-compatible tests applied all migrations and checked queue
  privacy, consent, appeals, rejected unauthorized actions, repeated decisions,
  revoked sessions, private chat delivery and approval of a stale edit.

The 220-example synthetic evaluation produced this matrix (rows = illustrative
expected class; columns = observed policy decision):

| Expected | ALLOW | REVIEW | REJECT |
| --- | ---: | ---: | ---: |
| ALLOW | 98 | 2 | 0 |
| REVIEW | 4 | 56 | 0 |
| REJECT | 14 | 8 | 38 |

There are **28 mismatches**. The synthetic false-positive rate is 2% (safe
illustrative examples held or rejected); the false-negative rate is 15% (expected
REVIEW/REJECT examples allowed). These are **not OpenAI model accuracy or production
accuracy figures**. The synthetic classifier is intentionally a simple test
fixture and fails to produce many signals an actual model might produce. No
numeric score thresholds were calibrated because actual model responses were not
available in this environment. No live API evaluation has been executed.

The report includes a stable 176/44 development/held-out split and per-class
precision, recall and F1. All supplied texts and labels were visible during
requirements review, and development exercised this dataset. Consequently, do not
treat its held-out figures as a final independent benchmark. Human label review,
actual API response collection and a fresh independently labelled holdout remain
release gates for an accuracy claim. The code does not silently alter labels to
make the report look successful.

## Deployment sequence

1. Reconfirm the target project, table counts and current migration history.
2. Obtain Supabase confirmation and apply the generated migration. Reconcile the
   local filename if the hosted tool assigns a different authoritative version.
3. Immediately deploy `secure-content/index.ts` together with `_shared/handler.mjs`
   and `_shared/moderation-policy.mjs`. Keep JWT verification enabled. Reuse the
   existing server-side secrets and origin configuration; never put a service key
   or OpenAI key in browser/mobile configuration.
4. Verify anonymous and unauthorized calls fail; verify the retired commit RPC is
   denied and invoker/private privileges are correct. Run database advisors.
5. Verify an intended existing account and explicitly provision its role, using
   an authorised database operation such as:

   ```sql
   -- Replace the parameter with a VERIFIED existing account UUID.
   insert into private.moderation_memberships(user_id, role)
   values (:verified_account_id, 'moderator');
   -- Grant safety_reviewer only for a designated private-safety responsibility.
   ```

6. Deploy the browser app and ship the mobile reviews UI. Review serious cases
   operationally; the inbox is not an emergency response service.
7. Human-review the illustrative labels. Run the opt-in live evaluation using
   `MODERATION_LIVE=1 OPENAI_API_KEY=... node moderation/evaluate.mjs` in a secure
   server environment (the command uses an existing secret, not a literal key in
   shell history). Evaluate a fresh independent holdout before making accuracy
   claims or introducing score thresholds.
8. Test two real accounts, ordinary/restricted moderator roles, appeals,
   withdrawal, private consent, recording and device behavior before broad launch.

## Rollback

Keep held drafts private. Roll the Edge handler back to the prior validated
commit and regrant only `public.commit_content(uuid,text,text,jsonb,uuid)` and its
private implementation to `service_role` using an authorised database migration.
Do not grant them to `anon` or `authenticated`. Restore the previous app UI or
temporarily disable review links. Leave the private queue and audit records for
their retention period; do not automatically publish or delete held submissions.
No rollback requires changing registration or weakening RLS/session validation.

## References

- https://developers.openai.com/api/docs/guides/moderation
- https://developers.openai.com/api/docs/guides/csam
- https://supabase.com/docs/guides/database/functions
- https://supabase.com/docs/guides/database/postgres/row-level-security
