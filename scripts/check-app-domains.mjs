import {spawn} from 'node:child_process';import {once} from 'node:events';import {createServer} from 'node:net';import assert from 'node:assert/strict';
const socket=createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=socket.address().port;await new Promise(r=>socket.close(r));
for(const role of ['main','app']){
 const origin=`http://127.0.0.1:${port}`;
 const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p',String(port)],{env:{...process.env,NODE_ENV:'production',APP_SITE_ROLE:role,APP_ORIGIN:origin,MAIN_SITE_URL:origin,APP_SITE_URL:'http://localhost:3003'},stdio:['ignore','pipe','pipe']});let log='';child.stdout.on('data',v=>log+=v);child.stderr.on('data',v=>log+=v);
 try{
  let ready=false;for(let n=0;n<100;n++){if(child.exitCode!==null)throw Error(log);try{if((await fetch(origin+'/api/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready,log);
  if(role==='main'){
   const html=await(await fetch(origin)).text();assert.match(html,/Make space for/);assert.match(html,/http:\/\/localhost:3003\/login/);const redirect=await fetch(origin+'/login',{redirect:'manual'});assert.equal(redirect.status,307);assert.equal(redirect.headers.get('location'),'http://localhost:3003/login');assert.equal((await fetch(origin+'/api/session')).status,404);
  }else{
   for(const path of ['/','/login','/settings/reading','/auth/confirm','/post/11111111-1111-4111-8111-111111111111','/profile/11111111-1111-4111-8111-111111111111']){
    const r=await fetch(origin+path);assert.equal(r.status,200,path);const html=await r.text(),nonce=r.headers.get('content-security-policy')?.match(/'nonce-([^']+)'/)[1];assert.ok(nonce);assert.match(html,/_expo\/static\/js\/web\/entry/);assert.ok([...html.matchAll(/<script\b([^>]*)>/g)].every(m=>m[1].includes(`nonce="${nonce}"`)));assert.equal(r.headers.get('x-robots-tag'),'noindex, nofollow');
    if(path==='/login'){const src=html.match(/src="([^\"]*entry[^\"]+)"/)[1];assert.equal((await fetch(origin+src)).status,200,'Shared JS assets must load');}
   }
   assert.match(await(await fetch(origin+'/robots.txt')).text(),/Disallow: \//);assert.equal((await fetch(origin+'/_app/login.html')).status,404);assert.equal((await fetch(origin+'/api/session')).status,401);assert.equal((await fetch(origin+'/api/session',{method:'POST',headers:{origin:'https://attacker.invalid','content-type':'application/json'},body:'{}'})).status,403);
  }
  console.log('PASS: '+role+' service role, routes, session boundary and shared UI shell');
 }finally{child.kill('SIGTERM');await Promise.race([once(child,'exit'),new Promise(r=>setTimeout(r,2000))]);if(child.exitCode===null)child.kill('SIGKILL');}
}
