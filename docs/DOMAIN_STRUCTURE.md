# Bible Diaries: three domains, one aligned application

| Domain | Application | Purpose |
| --- | --- | --- |
| `biblediaries.co.za` | Repository root (`src/`) | New public main website, FAQ/support and the signed-in browser application |
| `waiting.biblediaries.co.za` | `web/`, `SITE_ROLE=waitlist` | Existing phone/laptop landing-page design and expanded waiting-list form |
| `admin.biblediaries.co.za` | `web/`, `SITE_ROLE=admin` | Choose Waiting list or Main admin, then sign in to that separate workspace |

The earlier two-domain proposal is superseded by this layout. The existing
waiting-list website design is retained. The main site has its own white, blue,
minimal pink and black design, an illustrative diary preview, feature overview,
FAQ, PC access and support/information pages. Public main-site pages are available
without an app account; feed, messages, settings and user records retain their
existing authentication and database protections.

## Administrator workspaces

The admin homepage presents two choices:

- Waiting list: `/admin/login` → `/admin/waitlist`.
- Main admin: `/admin/moderation/login` → `/admin/moderation`.

Use **two distinct Supabase Auth accounts with different passwords**. Passwords
are managed and hashed by Supabase Auth; no shared administrator password is
embedded in source, browser storage or environment variables. The database rejects
membership overlap between the waiting-list and main-admin roles. The main-admin
login also rejects waiting-list allowlisted account IDs. Creating two accounts
requires the operator to choose two email addresses and unique passwords through
Supabase's secure account/invitation flow; the code does not compare or retrieve
stored plaintext passwords.

Each workspace uses its own host-only, HttpOnly session cookie. Production cookies
use Secure, SameSite=Strict and the `__Host-` prefix. Cookies are not passed between
the three domains. Each protected page and API checks Auth and live database
membership/session status. Browser-supplied role metadata is never authorization.
The waiting-list and main public hosts cannot serve administrator data. The
waiting site's old `/admin` links redirect to the central admin portal.

## Waiting list

The form requests name, surname, email, cell number, phone country/region, gender
(male/female), the existing platform preference, and consent. Phone numbers use
`libphonenumber-js` pinned at 1.13.15. Local leading zeros are handled by the phone
metadata; valid cell numbers are normalised to E.164, for example
`082 123 4567` → `+27821234567`. Shared calling codes such as +1 are resolved using
the actual number region. The phone region is **not** proof of residence,
nationality or control of the number. No SMS or ownership verification is claimed.

The waiting-list dashboard is a simple paginated table: name, surname, email,
cell number, phone country/region and gender. Older records may show Not provided;
no names, genders or countries are fabricated for legacy rows. Duplicate emails do
not overwrite an existing request. Subscriber data is unavailable to ordinary
visitors and moderation-only accounts. Consent/privacy content reflects the new
fields. Existing public statistics RPCs are retained for compatibility, but the
simple administrator view does not display charts.

## Main admin and author notifications

Main admin shows the account name, surname, email and flagged public message,
with Approve and Reject buttons. This is restricted administrative access, not a
public identity display. Views of the review queue are recorded in
`private.moderation_access_log`. Anonymous community posts still hide identity
from other members; authorised administrators can see account details when
reviewing flagged public submissions. This limitation is stated in the app and
privacy information. Private diary/chat content still requires explicit restricted
review consent and a designated safety-reviewer role; its account identity is
withheld from this queue.

Reject opens a Reason field prefilled with an editable suggestion derived from
the free Moderation API's findings and the policy reason. The administrator must
check it and confirm rejection. This does not call a paid generative model or
pretend the Moderation API itself writes free-form explanations. Approve records
an administrator review and publishes/delivers the stored submission.

The publication/rejection and the corresponding system notification are in one
PostgreSQL transaction. If publication or the notification fails, the decision
rolls back. Notifications are owner-only and persist for the author to read in
Activity & Notifications. They say Approved and posted (or sent for a chat), or
Rejected with the administrator's reason, and link to the content or My reviews &
appeals. Unread counts include system notices. This is **in-app notification
persistence and polling**, not a claim of configured background OS push delivery.
Version/row locks prevent duplicate or stale review decisions and edits.

## Database changes

Apply in order, after the previously applied security/settings migrations:

1. `20261108142855_contextual_moderation.sql`: the installed moderation foundation, preserved unchanged.
2. `20261108191413_unified_admin_waitlist_and_notifications.sql`: generated with
   the Supabase CLI. Bootstraps the isolated waiting-list tables if missing,
   preserves legacy data, upgrades the existing queue with audited public-review identity, adds the new contact fields and v2 signup RPC, installs
   owner-only system notifications and atomic decision triggers, and adds disjoint
   waiting-list administrator membership.

The old service-only email/platform signup RPC is retired in favour of the v2 RPC.
New schema deployment and the new website backend must therefore be coordinated.
Deploy the updated `secure-content` Edge Function with its shared handler/policy
only after the contextual migration is installed. Keep JWT verification enabled
and retain server-side keys and the configured origin allowlist.

Provision **verified existing Auth account UUIDs** separately through authorised
operator access; no account IDs were guessed or granted by this source change:

```sql
insert into private.waitlist_admins(user_id) values (:waiting_account_uuid);
insert into private.moderation_memberships(user_id,role)
values (:different_main_account_uuid,'moderator');
```

Set `ADMIN_USER_IDS` on the admin host to the waiting-list account UUID(s) as an
additional allowlist. Use the existing secure Supabase account flow to set unique
passwords. Do not send passwords through chat or commit them to Git.

## Docker and hosting

`compose.yaml` runs three services:

| Service | Local address | Production origin |
| --- | --- | --- |
| `app` | `http://localhost:3000` | `https://biblediaries.co.za` |
| `website` | `http://localhost:3001` | `https://waiting.biblediaries.co.za` |
| `admin` | `http://localhost:3002` | `https://admin.biblediaries.co.za` |

Use `.env.docker.example` for public addresses and keys, and `web/.env.example`
for server-only secrets. Configure `APP_ORIGIN`, `WAITLIST_URL`, `ADMIN_SITE_URL`
and the exact `SITE_URL` for each deployment. The public app origin and both
website origins must use HTTPS in production. A trusted ingress must overwrite
the configured client-IP header; never trust a raw visitor-supplied forwarding
header. The admin and waiting instances share code, but roles are server
configuration and never inferred from a request Host header.

```sh
docker compose --env-file .env.docker up --build app website admin
```

The `biblediaries.co.za` zone was not found in the connected Cloudflare account.
That does not establish whether the domain is registered elsewhere. No DNS record,
registration, certificate or production hosting endpoint was invented or changed.
Domain activation needs the actual DNS/hosting connection. The public website
builds and database tests are independent of DNS availability.

The existing v1.0.5 release is not rewritten. Shipping the new native notification
and review screens requires a subsequent release or a verified fingerprint-matched
OTA through the existing gate. This task does not silently publish an unverified
OTA or change the app's native runtime policy.

## Verification and remaining operational checks

Automated checks cover role separation, verified/active accounts, cookie isolation,
contact validation, shared country codes, parameterised signup, legacy preservation,
queue identity restrictions, owner-only notifications, disjoint roles, stale review
prevention and the approval/notification transaction. Browser/HTTP validation uses
synthetic accounts and text only. No real subscriber or private message is used.

Before public activation: verify live migrations and database advisors, deploy the
Edge Function and hosts, provision the two intended accounts, test actual sign-in
and two-account review/notification flows, and verify mobile behavior. Model
accuracy still requires human-reviewed labels and actual-API/independent evaluation;
the 220-case synthetic report is not a production accuracy claim.

## Confirmed rollout state

The alignment migration was applied successfully to Bible Diaries using hosted
version `20261108191413`. Live checks confirmed contact fields, notification RLS,
no client notification INSERT privilege, no client signup-RPC execution privilege,
and installed identity-access auditing. `secure-content` version 2 is ACTIVE with
JWT verification enabled. Both administrator membership tables remain empty; the
operator still needs to select and provision the two intended Auth accounts.
The custom domains/hosting and native app update remain deployment steps.

The security advisor reports the existing leaked-password-protection setting as
disabled. RLS-without-policy INFO notices are intentional on server-only tables
that deny client privileges. The code and database checks are not a blanket
production-security certification.
