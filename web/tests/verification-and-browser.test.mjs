import {test} from 'node:test';import assert from 'node:assert/strict';
import {emailReturnUrl,readAuthReturn,confirmEmailReturn} from '../../shared/auth-return.mjs';
import {createBrowserSessionStorage} from '../../shared/browser-session.mjs';
import {storeRelease} from '../../shared/store-release.mjs';
import {shellTemplate,nonceHtml,appPolicy} from '../../src/lib/app-shell.mjs';
import {rootRole,siteDomains,mobilePath,isAppRoute} from '../../src/lib/site-domains.mjs';
const origin='https://app.biblediaries.co.za',fragment='#access_token=test-access&refresh_token=test-refresh&type=signup';
test('email callbacks accept only our app address and signup tokens',async()=>{
 assert.equal(emailReturnUrl({platform:'web',origin}),origin+'/auth/confirm');
 assert.equal(emailReturnUrl({platform:'android'}),'bible-diaries://auth/confirm');
 assert.equal(emailReturnUrl({platform:'android',configured:origin+'/auth/confirm'}),origin+'/auth/confirm?client=mobile');
 for(const raw of ['https://attacker.invalid/auth/confirm'+fragment,origin+'/auth/confirm?verified=true',origin+'/auth/confirm'+fragment.replace('signup','recovery'),'bible-diaries://evil/confirm'+fragment])assert.throws(()=>readAuthReturn(raw,{webOrigin:origin}));
 const raw=origin+'/auth/confirm'+fragment;
 const client={auth:{setSession:async()=>({}),getUser:async()=>({data:{user:{id:'test',email_confirmed_at:'2026-11-10T00:00:00Z'}}})}};
 assert.equal((await confirmEmailReturn(client,raw,{webOrigin:origin})).user.id,'test');
 client.auth.getUser=async()=>({data:{user:{id:'test'}}});await assert.rejects(confirmEmailReturn(client,raw,{webOrigin:origin}),/not been verified/);
 client.auth.setSession=async()=>({error:{message:'expired'}});await assert.rejects(confirmEmailReturn(client,raw,{webOrigin:origin}),/expired/);
});
test('browser storage uses same-origin session bridge and keeps PKCE separate',async()=>{
 const calls=[],request=async(path,options)=>{calls.push({path,...options});return new Response(JSON.stringify(options.method?{saved:true}:{access_token:'synthetic',refresh_token:'refresh'}));};
 const storage=createBrowserSessionStorage(request);
 await storage.setItem('sb-session-code-verifier','private-verifier');assert.equal(await storage.getItem('sb-session-code-verifier'),'private-verifier');assert.equal(calls.length,0);
 await storage.setItem('sb-session',JSON.stringify({access_token:'synthetic',refresh_token:'refresh',user:{sensitive:'not sent'}}));
 assert.deepEqual(JSON.parse(calls[0].body),{access_token:'synthetic',refresh_token:'refresh'});
 assert.equal(JSON.parse(await storage.getItem('sb-session')).access_token,'synthetic');await storage.removeItem('sb-session');
 assert.ok(calls.every(c=>c.path==='/api/session'&&c.credentials==='same-origin'));assert.equal(calls.at(-1).method,'DELETE');
 assert.equal(await createBrowserSessionStorage(async()=>new Response(null,{status:401})).getItem('session'),null);
 await assert.rejects(createBrowserSessionStorage(async()=>new Response(null,{status:503})).getItem('session'));
});
test('shared UI HTML is nonce protected and route templates cannot escape their directory',()=>{
 assert.equal(shellTemplate('/profile/test'),'profile/[id].html');assert.equal(shellTemplate('/settings/security'),'settings/[section].html');assert.equal(shellTemplate('/auth/confirm'),'auth/confirm.html');assert.equal(shellTemplate('/../../secret'),'+not-found.html');
 const html=nonceHtml('<html><head></head><body><script src="/app.js"></script><script>boot()</script></body></html>','abc123');assert.equal((html.match(/nonce="abc123"/g)||[]).length,2);assert.match(html,/noindex,nofollow/);assert.throws(()=>nonceHtml('', '\"bad'));
 assert.match(appPolicy('abc123','https://example.supabase.co'),/strict-dynamic/);
 assert.equal(rootRole({}),'main');assert.equal(isAppRoute('/settings/legal/privacy'),true);assert.equal(mobilePath('/settings/legal/privacy'),'/policies/privacy');assert.equal(siteDomains({}).app,origin);assert.throws(()=>siteDomains({APP_SITE_URL:'https://u:p@bad.invalid'}));
});
test('native store prompts require a newer build and an actual approved store URL',()=>{
 const manifest={android:{build:6,version:'1.0.6',stores:[{label:'Google Play',url:'https://play.google.com/store/apps/details?id=com.example'}]}};
 assert.equal(storeRelease(manifest,'android',5).version,'1.0.6');assert.equal(storeRelease(manifest,'android',6),null);assert.equal(storeRelease(manifest,'android',null),null);assert.equal(storeRelease({android:null},'android',5),null);
 for(const url of ['javascript:alert(1)','https://play.google.com.attacker.invalid/app','http://play.google.com/app','https://attacker.invalid/app'])assert.equal(storeRelease({android:{...manifest.android,stores:[{label:'Store',url}]}},'android',5),null);
});
