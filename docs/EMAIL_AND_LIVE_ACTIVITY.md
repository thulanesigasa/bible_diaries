# Waiting-list receipts and live activity

The browser app and native app share ActivityNotifications, ActivityBell and ActivityInbox. One owner-scoped RPC supplies unread counts and the latest activity/review decisions. Private Realtime broadcasts carry only a wake-up signal; clients fetch their own records under RLS. Authenticated clients cannot publish these signals. A two-minute poll provides fallback while the app is foregrounded. The first snapshot establishes a baseline without replaying historical alerts. Settings and quiet hours suppress banners/indicators. Bookmark notifications do not identify who bookmarked a reflection.

These are foreground in-app alerts, not operating-system push notifications when the app is closed. Background delivery needs a separate registered-device/push implementation, permissions, native build validation and platform credentials (including Huawei support). Test a real two-account interaction and reconnect on web and native before launch.

## Activate waiting-list email

1. Apply migrations `20261112003805_activity_live_notifications.sql` and `20261112003812_waitlist_confirmation_outbox.sql`. Only new waiting-list inserts queue a receipt; no existing member is automatically emailed.
2. Buy the domain, configure DNS, and verify `news.biblediaries.co.za` as a sending domain in Resend using its supplied DNS records. Configure SPF/DKIM and a DMARC policy appropriate to all legitimate senders. Verify DNS before sending.
3. Set the server-only environment variables in `web/.env.example`: `WAITLIST_CONFIRMATION_EMAILS=true`, `RESEND_API_KEY`, `WAITLIST_MAIL_FROM=updates@news.biblediaries.co.za`, `WAITLIST_MAIL_REPLY_TO=support@biblediaries.co.za`, and a random `WAITLIST_MAIL_CRON_SECRET` of at least 32 characters. Never use NEXT_PUBLIC/EXPO_PUBLIC prefixes for these values. Keep the service-role key on the server.
4. Configure support forwarding to a monitored existing inbox. Resend sending does not supply an ordinary IMAP/SMTP support mailbox. Cloudflare Email Routing can forward incoming support messages; sending branded replies needs an outbound provider or mailbox. The receipt uses Reply-To for the current manual unsubscribe/support workflow.
5. Set repository variable `WAITLIST_MAIL_CRON_URL=https://waiting.biblediaries.co.za/api/internal/waitlist-mail` and repository secret `WAITLIST_MAIL_CRON_SECRET` matching the server value. The retry workflow drains one due job about every 20 minutes; GitHub schedules may be delayed/disabled for inactive repositories. A Cloudflare scheduled Worker can call the same endpoint instead. Missing configuration is a safe no-op.
6. Run a consented new signup, check the saved request and private job, verify the provider accepted the email, and check receipt delivery in the intended inbox. Test a duplicate, provider failure/retry and a real reply/unsubscribe request. Confirm Auth email also works. Do not email all historical signups as a test.

A saved signup remains successful if email is unavailable. Provider acceptance is not proof of inbox delivery or ownership. Durable jobs use leases, bounded retries and a stable provider idempotency key. Retries stop within 23 hours of first attempt (inside the provider's 24-hour idempotency window), or after six attempts. Jobs awaiting their first attempt remain queued. Removing a waiting-list row cascades its receipt job. Monitor pending/failed counts server-side and investigate without logging recipients or credentials. Delivery/bounce webhook processing and automatic suppression are not implemented here; review provider delivery reports, remove invalid recipients and implement verified webhook handling before bulk announcements.

The daily attempt budget defaults to 40 for these receipts, bounded to 100; it is not a global Resend account budget. Authentication and other sends consume the same provider quota. Recheck current free-tier limits and leave headroom. The confirmation trigger queues one job per inserted email; duplicate submissions do not change an existing request or send another receipt.

## Hosting and domain plan

One registered domain can serve four separately deployed applications:

| Host | Service |
| --- | --- |
| biblediaries.co.za | Main marketing website |
| waiting.biblediaries.co.za | Waiting list and receipt endpoint |
| admin.biblediaries.co.za | Protected admin dashboard |
| app.biblediaries.co.za | Shared browser application |

The current deployment remains Next.js in Docker. Cloudflare DNS can point each hostname to a separate deployment. Cloudflare Workers does not run these Docker images; port the Next server to a supported Workers adapter, verify sessions, server-only secrets, after-response mail handling, dynamic routes and resource limits, then deploy. Do not assume this dynamic workload fits Workers Free. Static assets and marketing can be served cheaply, but server/API features still need execution. Keep Supabase as the shared backend. Do not migrate the domain's mail records without accounting for existing MX/SPF records.

Current email/notification changes do not themselves configure DNS, buy a domain, create mailboxes or enable production email credentials. Deploying to Cloudflare and background OS push remain separate launch tasks.
