// HTTP checks against a short-lived production process, not a browser preview.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import assert from 'node:assert/strict';
import { contentPaths } from '../src/content/pages.mjs';
const listener = createServer();
listener.listen(0, '127.0.0.1'); await once(listener, 'listening');
const port = listener.address().port;
await new Promise(resolve => listener.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const canonical = 'https://bible-diaries.example';
const processUnderTest = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], { env: { ...process.env, SITE_URL: canonical, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore','pipe','pipe'] });
let output = '';
processUnderTest.stdout.on('data', chunk => { output += chunk; });
processUnderTest.stderr.on('data', chunk => { output += chunk; });
try {
  let ready = false;
  for (let i = 0; i < 120; i++) {
    if (processUnderTest.exitCode !== null) throw new Error('Production server exited: ' + output);
    try { const response = await fetch(origin + '/robots.txt'); if (response.ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, 'Production process did not become ready.');
  const known = new Set(['/', ...contentPaths, '/waitlist-privacy', '/opengraph-image', '/logo.webp', '/logo.png']);
  const documents = new Map();
  for (const path of ['/', ...contentPaths, '/waitlist-privacy']) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, path);
    const html = await response.text(); documents.set(path, html);
    assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, `${path}: one H1`);
    const headings = [...html.matchAll(/<h([1-6])(?:\s|>)/g)].map(match => Number(match[1]));
    for (let i = 1; i < headings.length; i++) assert.ok(headings[i] <= headings[i-1] + 1, `${path}: heading level ${headings[i-1]} to ${headings[i]}`);
    assert.ok(!/<meta[^>]+(?:name="robots"[^>]+content="[^"]*noindex|content="[^"]*noindex[^>]+name="robots")/.test(html), `${path}: indexable`);
    assert.match(html, /<meta name="description" content="[^"]+"/);
    assert.ok(html.includes(`rel="canonical" href="${canonical}${path === '/' ? '/' : path}"`) || html.includes(`rel="canonical" href="${canonical}${path === '/' ? '' : path}"`), `${path}: canonical URL`);
    assert.ok(html.includes('property="og:image"'), `${path}: social image`);
    const csp = response.headers.get('content-security-policy');
    const nonce = csp?.match(/'nonce-([^']+)'/)?.[1];
    assert.ok(nonce && html.includes(`nonce="${nonce}"`), `${path}: nonce in policy and HTML`);
    assert.ok(response.headers.get('strict-transport-security')?.includes('max-age=31536000'));
    const schemaText = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>(.*?)<\/script>/s)?.[1];
    assert.ok(schemaText, `${path}: JSON-LD`);
    assert.ok(JSON.parse(schemaText)['@graph'].some(node => node['@type'] === 'WebSite'));
    for (const image of html.matchAll(/<img\s[^>]*>/g)) assert.ok(/\balt="[^"]*"/.test(image[0]), `${path}: image alt`);
  }
  for (const [path, html] of documents) {
    for (const anchor of html.matchAll(/<a\s[^>]*href="([^"]+)"/g)) {
      const href = anchor[1];
      if (!href.startsWith('/') && !href.startsWith('#')) continue;
      const [pathname, fragment] = href.split('#');
      const target = pathname || path;
      assert.ok(known.has(target), `${path}: broken internal route ${href}`);
      if (fragment) assert.ok(documents.get(target)?.includes(`id="${fragment}"`), `${path}: broken anchor ${href}`);
    }
  }
  const xml = await (await fetch(origin + '/sitemap.xml')).text();
  for (const path of contentPaths) assert.ok(xml.includes(canonical + path), `sitemap missing ${path}`);
  const robots = await (await fetch(origin + '/robots.txt')).text();
  assert.ok(robots.includes('Allow: /') && robots.includes('Disallow: /api/'));
  for (const path of ['/llm.txt','/llms.txt']) assert.equal((await fetch(origin + path)).status, 200);
  const adminRedirect = await fetch(origin + '/admin', { redirect:'manual' });
  assert.equal(adminRedirect.status, 307); assert.equal(adminRedirect.headers.get('location'), '/admin/login');
  assert.equal((await fetch(origin + '/api/admin/stats')).status, 401);
  const loginPage = await fetch(origin + '/admin/login');
  assert.equal(loginPage.status,200); assert.ok((await loginPage.text()).includes('noindex, nofollow'));
  const redirect = await fetch(origin + '/features', { headers: { 'x-forwarded-proto': 'http' }, redirect: 'manual' });
  assert.equal(redirect.status, 308); assert.equal(redirect.headers.get('location'), canonical + '/features');
  const first = (await fetch(origin)).headers.get('content-security-policy');
  const second = (await fetch(origin)).headers.get('content-security-policy');
  assert.notEqual(first, second, 'Nonce must change per response.');
  const unavailable = await fetch(origin + '/api/waitlist', { method:'POST', headers:{'content-type':'application/json',origin:canonical}, body:JSON.stringify({email:'test@example.com',platform:'android',consent:true}) });
  assert.equal(unavailable.status, 503, 'Unconfigured deployment must not pretend to accept submissions.');
  console.log(`PASS: ${documents.size} public pages; metadata, heading order, image alt, internal links/anchors, sitemap/robots/LLM files, nonce CSP, HSTS/HTTPS redirect, protected admin and fail-closed API.`);
} finally {
  processUnderTest.kill('SIGTERM');
  await Promise.race([once(processUnderTest, 'exit'), new Promise(resolve => setTimeout(resolve, 3000))]);
  if (processUnderTest.exitCode === null) processUnderTest.kill('SIGKILL');
}
