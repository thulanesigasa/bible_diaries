import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleWaitlist, normalizeEmail, PROJECT_URL } from '../src/lib/waitlist.mjs';
const env = { SUPABASE_URL: PROJECT_URL, SUPABASE_SERVICE_ROLE_KEY: 'test-secret', WAITLIST_RATE_LIMIT_SALT: 'x'.repeat(32), SITE_URL: 'https://bible-diaries.example', WAITLIST_TRUSTED_IP_HEADER: 'x-test-ip' };
const payload = { email: '  Hello@Example.com ', platform: 'huawei', consent: true, website: '' };
const request = (data = payload, headers = {}) => new Request(env.SITE_URL + '/api/waitlist', { method: 'POST', headers: { origin: env.SITE_URL, 'content-type': 'application/json', 'x-test-ip': '192.0.2.10', ...headers }, body: typeof data === 'string' ? data : JSON.stringify(data) });
const noFetch = async () => { throw new Error('Database must not be called'); };
test('normalizes valid email and rejects malformed addresses', () => {
  assert.equal(normalizeEmail(payload.email), 'hello@example.com');
  for (const email of ['.a@example.com', 'a..b@example.com', 'a@-example.com', 'a@exa..com', 'a@b', 'a b@example.com', 'x'.repeat(65) + '@example.com', null]) assert.equal(normalizeEmail(email), null);
});
test('fails closed without complete configuration and prevents project mixups', async () => {
  for (const [key, value] of Object.entries({ SUPABASE_SERVICE_ROLE_KEY: '', SUPABASE_URL: 'https://other.supabase.co', WAITLIST_RATE_LIMIT_SALT: 'short', SITE_URL: 'bad', WAITLIST_TRUSTED_IP_HEADER: '' })) {
    assert.equal((await handleWaitlist(request(), { env: { ...env, [key]: value }, fetcher: noFetch })).status, 503);
  }
});
test('rejects foreign origins, invalid IP ingress and non-JSON', async () => {
  for (const [headers, status] of [[{ origin: 'https://foreign.example' }, 403], [{ 'x-test-ip': '' }, 503], [{ 'x-test-ip': '192.0.2.10, 192.0.2.11' }, 503], [{ 'content-type': 'text/plain' }, 415]]) assert.equal((await handleWaitlist(request(payload, headers), { env, fetcher: noFetch })).status, status);
});
test('rejects invalid consent, platform, honeypot, malformed and oversized bodies', async () => {
  for (const data of [{ ...payload, consent: 'true' }, { ...payload, platform: 'other' }, { ...payload, website: 'spam' }, { ...payload, email: 'bad' }, [], null, '{']) assert.equal((await handleWaitlist(request(data), { env, fetcher: noFetch })).status, 400);
  assert.equal((await handleWaitlist(request('x'.repeat(4097)), { env, fetcher: noFetch })).status, 413);
});
test('sends normalized consent and platform server-side, hashes IP, confirms only committed success', async () => {
  let saved;
  const fetcher = async (url, options) => { assert.equal(url, `${PROJECT_URL}/rest/v1/rpc/bible_diaries_join_waitlist`); saved = JSON.parse(options.body); assert.equal(options.headers.Authorization, 'Bearer test-secret'); return Response.json('accepted'); };
  const response = await handleWaitlist(request(), { env, fetcher });
  assert.equal(response.status, 200); assert.equal((await response.json()).success, true);
  assert.equal(saved.p_email, 'hello@example.com'); assert.equal(saved.p_platform, 'huawei'); assert.equal(saved.p_consent, true); assert.match(saved.p_ip_hash, /^[a-f0-9]{64}$/); assert.ok(!JSON.stringify(saved).includes('192.0.2.10'));
});
test('maps rate limits and database failures without reporting false success', async () => {
  const limited = await handleWaitlist(request(), { env, fetcher: async () => Response.json('rate_limited') });
  assert.equal(limited.status, 429); assert.equal(limited.headers.get('Retry-After'), '900');
  for (const fetcher of [async () => new Response('private error', { status: 500 }), async () => Response.json('unexpected'), async () => { throw new Error('secret'); }]) {
    const response = await handleWaitlist(request(), { env, fetcher });
    assert.equal(response.status, 503); assert.ok(!JSON.stringify(await response.json()).includes('secret'));
  }
});
