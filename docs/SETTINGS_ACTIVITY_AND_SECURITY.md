# Bible Diaries settings and activity

The settings structure follows exégeomai, with Bible Diaries terminology and
features. Strong’s dictionaries and downloaded Bible translations are not copied:
Bible Diaries manages reflections, private entries, bookmarks and fellowship.

## Navigation

- Settings opens dedicated pages for profile details, achievements, reading and
  typography, privacy and sharing, security, activity preferences, quiet hours,
  saved reflections, blocked accounts, exports, sessions, support and policies.
- The feed’s top-right bell opens achievements, with a badge for unseen milestones.
- Chat opens Activity & Notifications: likes, comments, replies, comment likes,
  anonymous bookmark notices, shares and new posts from followed authors.
- Follow or block a member from their profile. Unblock in Settings.

## Privacy and persistence

Preferences, subscriptions, milestones and activity are stored server-side with
owner-scoped RLS. Notifications are generated only by trusted database triggers.
Clients can mark their own notifications read and achievements seen; they cannot
forge recipients, actors or awards. Duplicate interactions do not create repeated
notifications. Bookmarker identities and anonymous commenter identities are not
exposed, including in internal deduplication keys. Blocking applies to database
reads and trusted writes, including previously generated anonymous activity.

Achievement milestones use persisted reflections, bookmarks, comments and shares.
Unlocked milestones survive deletion of a triggering reflection or bookmark.
They are personal progress indicators, not a measure of faith. New-post alerts
require an explicit subscription, a public profile and a non-anonymous public
post. Sharing records an OS/browser-reported share action, not recipient delivery.

Quiet hours suppress in-app unread activity indicators using device-local time.
They do not delete inbox records. The activity preferences do not claim to enable
email or OS push delivery. Saved-content pages currently show the latest 100
bookmarks; exports paginate all own reflections and bookmark references.

## Native security

Password capture protection covers sign-in, registration, confirmation, recovery,
account deletion, PIN entry and biometric verification. Native operations are
serialized so navigation or rapid focus changes cannot leave capture protection
stuck or re-enable it after leaving the sensitive section. Password reveal is
reset when the field loses focus. Ordinary app use remains recordable.

The device PIN is six digits, salted and derived using PBKDF2-SHA256 (210,000
iterations). Its verifier, attempt count and cooldown stay in SecureStore.
Incorrect attempts introduce an escalating cooldown after five failures.
Biometrics use the device’s enrolled authentication with a strong-biometric
requirement. Inactivity locking and a background privacy cover are separate
settings. iOS also uses the native app-switcher privacy API. Fresh account-password
sign-in recovers a forgotten local PIN. This is a local app lock, not server MFA.

Both readable JSON and encrypted exports are offered explicitly. Encrypted export
uses AES-256-GCM with a random 16-byte salt, a random 12-byte nonce and
PBKDF2-SHA256 (210,000 iterations). Support cannot recover export passwords. Import
is not offered. Native temporary export files are deleted after sharing returns.

Browsers cannot reliably block OS or third-party screen recorders. Browser settings
state that limitation and do not present native app-lock options as web controls.

## Deployment and validation

Database migration `20261108135008_diary_settings_activity.sql` was applied to the
Bible Diaries Supabase project. The filename uses the actual hosted migration
version. Supabase CLI bootstrap was unavailable in this environment; the connected
migration API generated the authoritative version.

New native modules and Face ID configuration require a NEW native build. Do not
send this bundle to older native binaries as an unverified OTA. The existing
fingerprint runtime policy and OTA verification gate are preserved.

Before release, test on physical Android and iOS devices:

1. Start built-in and third-party recording; focus, reveal, blur and navigate away
   from every password/PIN field. The recording should blank only while protected.
2. Cancel and complete biometric prompts, then confirm normal recording resumes.
3. Lock after inactivity, background, reopen, fail PIN verification five times,
   restart during cooldown and recover using account-password sign-in.
4. With two test accounts, like, comment, reply, bookmark, share and follow; verify
   notifications, read state, subscription preferences, blocks and anonymous actors.
5. Export JSON and encrypted backups; verify that wrong passwords/tampering fail.

Automated checks cover native TypeScript, Android bundling, browser production
build, focus-race cleanup, quiet-hour boundaries, PIN hashing/cooldown, backup
interoperability/tamper rejection, RLS, forgery prevention, block enforcement and
revoked sessions. Physical-device capture tests cannot be replaced by these checks.

The Supabase security advisor still reports compromised-password protection as
disabled. Enable it in Auth password security before treating authentication as
fully launch-reviewed. Private server-only tables intentionally have RLS without
client policies; clients have no table privileges there.

The browser app now opts into request-time rendering so its per-request CSP nonce
is attached to Next.js scripts. Static HTML previously prevented hydration under
the strict CSP. Standalone smoke tests verify nonce/script agreement.
