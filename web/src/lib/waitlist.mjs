import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
export const PROJECT_URL = 'https://fspfwidfdnqvpgmipate.supabase.co';
const accepted = 'Your launch-notification request is recorded. If you already joined, your existing entry is unchanged.';
function reply(status, body) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...(status === 429 ? { 'Retry-After': '900' } : {}) } });
}
export function normalizeEmail(value) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+@[a-z0-9.-]+\.[a-z]{2,63}$/.test(email)) return null;
  const [local, domain] = email.split('@');
  if (local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..')) return null;
  if (domain.split('.').some(label => !label || label.length > 63 || label.startsWith('-') || label.endsWith('-'))) return null;
  return email;
}
async function readBody(request) {
  if (Number(request.headers.get('content-length') || 0) > 4096) throw new RangeError();
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError();
  let length = 0; const chunks = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 4096) { await reader.cancel(); throw new RangeError(); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export async function handleWaitlist(request, { env = process.env, fetcher = fetch } = {}) {
  if (request.method !== 'POST') return reply(405, { error: 'Method not allowed.' });
  const { SUPABASE_URL: project, SUPABASE_SERVICE_ROLE_KEY: secret, WAITLIST_RATE_LIMIT_SALT: salt, SITE_URL: site, WAITLIST_TRUSTED_IP_HEADER: header } = env;
  if (project !== PROJECT_URL || !secret || !salt || salt.length < 32 || !site || !header || !/^[a-z0-9-]+$/i.test(header)) return reply(503, { error: 'The waiting list is not ready yet. Please try again later.' });
  let origin;
  try { const parsed = new URL(site); if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(); origin = parsed.origin; } catch { return reply(503, { error: 'The waiting list is temporarily unavailable.' }); }
  if (request.headers.get('origin') !== origin) return reply(403, { error: 'Please submit the form from the Bible Diaries website.' });
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) return reply(415, { error: 'A JSON request is required.' });
  const ip = request.headers.get(header)?.trim();
  if (!ip || !isIP(ip)) return reply(503, { error: 'We could not securely process your request. Please try again later.' });
  let body;
  try { body = await readBody(request); } catch (error) { return reply(error instanceof RangeError ? 413 : 400, { error: error instanceof RangeError ? 'The request is too large.' : 'Invalid request. Please check the form.' }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return reply(400, { error: 'Invalid request. Please check the form.' });
  const email = normalizeEmail(body.email);
  if (!email) return reply(400, { error: 'Please enter a valid email address.' });
  if (body.consent !== true) return reply(400, { error: 'Please agree to receive launch notifications.' });
  if (!['android', 'huawei', 'ios', 'any'].includes(body.platform)) return reply(400, { error: 'Please select a valid platform.' });
  if (body.website !== undefined && body.website !== '') return reply(400, { error: 'We could not accept this request.' });
  const hash = createHmac('sha256', salt).update(ip).digest('hex');
  try {
    const result = await fetcher(`${PROJECT_URL}/rest/v1/rpc/bible_diaries_join_waitlist`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', apikey: secret, Authorization: `Bearer ${secret}` },
      body: JSON.stringify({ p_email: email, p_platform: body.platform, p_consent: true, p_ip_hash: hash }),
      cache: 'no-store', signal: AbortSignal.timeout(8000)
    });
    if (!result.ok) return reply(503, { error: 'We could not confirm your request. Please try again later.' });
    const outcome = await result.json();
    if (outcome === 'rate_limited') return reply(429, { error: 'Too many requests. Please wait 15 minutes and try again.' });
    if (outcome !== 'accepted') return reply(503, { error: 'We could not confirm your request. Please try again later.' });
    return reply(200, { success: true, message: accepted });
  } catch { return reply(503, { error: 'We could not confirm your request. Please try again later.' }); }
}
