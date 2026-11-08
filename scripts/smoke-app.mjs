import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:net';
import assert from 'node:assert/strict';
const socket=createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=socket.address().port;await new Promise(r=>socket.close(r));const origin=`http://127.0.0.1:${port}`;
const app=spawn(process.execPath,['.next/standalone/server.js'],{env:{...process.env,NODE_ENV:'production',PORT:String(port),HOSTNAME:'127.0.0.1',APP_ORIGIN:origin},stdio:['ignore','pipe','pipe']});let log='';app.stdout.on('data',v=>log+=v);app.stderr.on('data',v=>log+=v);
try{
 let ready=false;for(let n=0;n<120;n++){try{if((await fetch(origin+'/api/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready,log);
 const login=await fetch(origin+'/login');assert.equal(login.status,200);assert.ok(login.headers.get('content-security-policy')?.includes('nonce-'));
 const nonce=login.headers.get('content-security-policy').match(/'nonce-([^']+)'/)[1];
 const html=await login.text();const scripts=[...html.matchAll(/<script\b([^>]*)>/g)].map(m=>m[1]);
 assert.ok(scripts.length>0,'Expected Next.js scripts');
 assert.ok(scripts.every(tag=>tag.includes(`nonce="${nonce}"`)),'CSP nonce must be applied to every executable script; static rendering breaks hydration');
 assert.equal((await fetch(origin+'/api/session')).status,401);
 const bad=await fetch(origin+'/api/session',{method:'POST',headers:{origin:'https://attacker.invalid','content-type':'application/json'},body:'{}'});assert.equal(bad.status,403);
 const content=await fetch(origin+'/api/content',{method:'POST',headers:{origin,'content-type':'application/json'},body:'{}'});assert.equal(content.status,401);
 assert.equal((await fetch(origin+'/api/moderate',{method:'POST'})).status,410);
 assert.equal((await fetch(origin+'/reset-password')).status,200);
 const logout=await fetch(origin+'/api/session',{method:'DELETE',headers:{origin}});assert.equal(logout.status,200);assert.ok(logout.headers.getSetCookie().every(c=>c.includes('HttpOnly')&&c.includes('Secure')&&c.includes('SameSite=strict')));
 console.log('PASS: standalone app liveness, recovery route, nonce CSP, session origin checks, HttpOnly cookies and protected writes.');
}finally{app.kill('SIGTERM');await Promise.race([once(app,'exit'),new Promise(r=>setTimeout(r,2000))]);if(app.exitCode===null)app.kill('SIGKILL');}
