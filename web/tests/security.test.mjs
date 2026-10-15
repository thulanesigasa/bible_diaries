import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contentSecurityPolicy } from '../src/lib/security.mjs';
import { siteOrigin, serializeSchema } from '../src/lib/seo.mjs';
test('production policy restricts scripts, framing and outbound browser connections', () => {
  const policy = contentSecurityPolicy('example-nonce', true);
  const script = policy.split(';').find(part => part.trim().startsWith('script-src'));
  assert.ok(script.includes("'nonce-example-nonce'"));
  assert.ok(script.includes("'strict-dynamic'"));
  assert.ok(!script.includes('unsafe-inline') && !script.includes('unsafe-eval'));
  assert.ok(policy.includes("connect-src 'self'"));
  assert.ok(policy.includes("frame-ancestors 'none'"));
  assert.ok(policy.includes('upgrade-insecure-requests'));
});
test('canonical configuration rejects credential-bearing URLs and insecure production hosts', () => {
  assert.equal(siteOrigin({ SITE_URL: 'https://example.com/', NODE_ENV: 'production' }), 'https://example.com');
  assert.equal(siteOrigin({}), null);
  for (const value of ['https://user:pass@example.com', 'https://example.com/subpath', 'https://example.com/?x=y', 'javascript:alert(1)', 'http://example.com']) assert.throws(() => siteOrigin({ SITE_URL: value, NODE_ENV: 'production' }));
});
test('schema cannot break out of its script element', () => {
  const text = serializeSchema({ name: '</script><script>alert(1)</script>' });
  assert.ok(!text.includes('<'));
  assert.equal(JSON.parse(text).name, '</script><script>alert(1)</script>');
});
