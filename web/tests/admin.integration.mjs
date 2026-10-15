import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:net';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const listener=createServer();listener.listen(0,'127.0.0.1');await once(listener,'listening');const port=listener.address().port;await new Promise(resolve=>listener.close(resolve));
const origin=`http://127.0.0.1:${port}`;const canonical='https://bible-diaries.example';
const child=spawn(process.execPath,['--import',fileURLToPath(new URL('./mock-admin-auth.mjs',import.meta.url)),'node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env:{...process.env,NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',SITE_URL:canonical,SUPABASE_URL:'https://fspfwidfdnqvpgmipate.supabase.co',SUPABASE_PUBLISHABLE_KEY:'test-public-key',SUPABASE_SERVICE_ROLE_KEY:'test-service-key',ADMIN_USER_IDS:'11111111-1111-4111-8111-111111111111',ADMIN_RATE_LIMIT_SALT:'a'.repeat(32),WAITLIST_TRUSTED_IP_HEADER:'x-test-ip'},stdio:['ignore','pipe','pipe']});
let output='';child.stdout.on('data',chunk=>{output+=chunk;});child.stderr.on('data',chunk=>{output+=chunk;});
try{
  let ready=false;for(let i=0;i<120;i++){if(child.exitCode!==null)throw Error(output);try{if((await fetch(origin+'/robots.txt')).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,100));}assert.ok(ready,'Admin test process failed to start');
  const anonymous=await fetch(origin+'/admin',{redirect:'manual'});assert.equal(anonymous.status,307);assert.equal(anonymous.headers.get('location'),'/admin/login');
  assert.equal((await fetch(origin+'/api/admin/stats')).status,401);
  const loginPage=await fetch(origin+'/admin/login');assert.equal(loginPage.status,200);const loginHtml=await loginPage.text();assert.match(loginHtml,/<meta name="robots" content="noindex, nofollow"/);assert.ok(loginPage.headers.get('x-robots-tag').includes('noindex'));
  const signIn=async(email,extra={})=>fetch(origin+'/api/admin/login',{method:'POST',headers:{origin:canonical,'content-type':'application/json','x-test-ip':'192.0.2.1',...extra},body:JSON.stringify({email,password:'test-password'})});
  assert.equal((await signIn('admin@example.com',{origin:'https://evil.example'})).status,403);
  const unapproved=await signIn('stranger@example.com');assert.equal(unapproved.status,401);assert.equal(unapproved.headers.get('set-cookie'),null);
  const signed=await signIn('admin@example.com');assert.equal(signed.status,200);assert.deepEqual(await signed.json(),{success:true});
  const setCookie=signed.headers.get('set-cookie');assert.ok(setCookie.includes('HttpOnly')&&setCookie.includes('SameSite=Strict')&&setCookie.includes('Secure'));const cookie=setCookie.split(';')[0];
  const authenticated=await fetch(origin+'/admin',{headers:{cookie}});assert.equal(authenticated.status,200);const html=await authenticated.text();assert.ok(html.includes('A growing beginning.'));assert.ok(html.includes('admin@example.com'));assert.ok(!html.includes('admin_access_token'));
  const data=await fetch(origin+'/api/admin/stats',{headers:{cookie}});assert.equal(data.status,200);assert.equal(data.headers.get('cache-control'),'private, no-store');const stats=await data.json();assert.equal(stats.total,4);assert.equal(stats.platforms.huawei,1);assert.ok(!JSON.stringify(stats).includes('@example.com'));
  assert.equal((await fetch(origin+'/api/admin/stats',{headers:{cookie:'__Host-bible-diaries-admin=invalid_token_with_enough_characters'}})).status,401);
  assert.equal((await fetch(origin+'/api/admin/stats',{headers:{cookie,origin:'https://evil.example'}})).status,403);
  const badLogout=await fetch(origin+'/api/admin/logout',{method:'POST',headers:{cookie,origin:'https://evil.example'}});assert.equal(badLogout.status,403);
  const logout=await fetch(origin+'/api/admin/logout',{method:'POST',headers:{cookie,origin:canonical}});assert.equal(logout.status,200);assert.ok(logout.headers.get('set-cookie').includes('Max-Age=0'));
  assert.equal((await fetch(origin+'/api/admin/stats')).status,401);
  console.log('PASS: admin production HTTP flow — protected page/API, noindex, approved verified account only, secure HttpOnly session, aggregate data, tampered-token/foreign-origin rejection and logout. Auth responses mocked in test process; no live accounts used.');
}finally{child.kill('SIGTERM');await Promise.race([once(child,'exit'),new Promise(resolve=>setTimeout(resolve,3000))]);if(child.exitCode===null)child.kill('SIGKILL');}
