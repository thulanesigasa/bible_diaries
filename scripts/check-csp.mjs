import assert from 'node:assert/strict';
const origin=process.argv[2]||'http://localhost:3000';
const seen=new Set();
for(const route of ['/login','/settings','/activity']){
 const r=await fetch(origin+route);assert.equal(r.status,200);
 const nonce=r.headers.get('content-security-policy')?.match(/'nonce-([^']+)'/)?.[1];assert.ok(nonce,'Missing CSP nonce');assert.ok(!seen.has(nonce),'Nonces must be unique per request');seen.add(nonce);
 const html=await r.text();const scripts=[...html.matchAll(/<script\b([^>]*)>/g)].map(m=>m[1]);assert.ok(scripts.length>0);assert.ok(scripts.every(tag=>tag.includes(`nonce="${nonce}"`)),`Scripts on ${route} must carry the request nonce`);
}
console.log('PASS: per-request CSP nonces protect all executable scripts.');
