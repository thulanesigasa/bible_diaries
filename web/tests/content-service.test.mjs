import {CATEGORIES} from '../../supabase/functions/_shared/moderation-policy.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHandler,normalizeContent} from '../../supabase/functions/_shared/handler.mjs';
import {withContentWrites} from '../../shared/content-client.mjs';
import {createSecureStorage} from '../../mobile/src/lib/secure-storage.mjs';
const uid='00000000-0000-4000-8000-000000000001';
const env={SUPABASE_URL:'https://project.supabase.co',SUPABASE_ANON_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:'server',OPENAI_API_KEY:'moderator'};
const request=(body,headers={})=>new Request('https://project.supabase.co/functions/v1/secure-content',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer session',...headers},body:JSON.stringify(body)});
const content={table:'diaries',operation:'insert',record:{content:'A reflection',category:'faith',author_id:'forged',is_anonymous:true}};
function backend({active=true,flagged=false,outage=false,limit=true}={}){const calls=[];return {calls,fetch:async(url,options)=>{calls.push({url,options});let status=200,body;
 if(url.endsWith('/auth/v1/user'))body={id:uid,email:'synthetic@example.invalid'};
 else if(url.endsWith('/rpc/session_is_active'))body=active;
 else if(url.endsWith('/rpc/consume_security_limit'))body=limit;
 else if(url.includes('api.openai.com')){body={results:[{flagged,categories:Object.fromEntries(CATEGORIES.map(k=>[k,flagged&&k==='harassment/threatening'])),category_scores:Object.fromEntries(CATEGORIES.map(k=>[k,0])),category_applied_input_types:Object.fromEntries(CATEGORIES.map(k=>[k,['text']]))}]};if(outage)status=503;}
 else if(url.endsWith('/rpc/moderated_submit'))body={id:uid,decision:flagged?'REJECT':'ALLOW',reason:flagged?'severe_safety':'allow',data:{id:uid,author_id:null}};
 else throw new Error('Unexpected outbound request');return Response.json(body,{status});}};}
test('trusted content service binds identity, denies revoked sessions and fails closed on moderation',async()=>{
 for(const settings of [{flagged:true},{outage:true},{active:false},{limit:false}]){const b=backend(settings);const r=await createHandler(env,b.fetch)(request(content));assert.ok(r.status>=400);assert.ok(!b.calls.some(c=>c.url.endsWith('/rpc/commit_content')));}
 const b=backend();const response=await createHandler(env,b.fetch)(request(content));assert.equal(response.status,200);
 const commit=JSON.parse(b.calls.find(c=>c.url.endsWith('/rpc/moderated_submit')).options.body);assert.equal(commit.actor,uid);assert.equal(commit.record.author_id,undefined);
 const none=backend();assert.equal((await createHandler({...env,OPENAI_API_KEY:''},none.fetch)(request(content))).status,503);assert.ok(!none.calls.some(c=>c.url.endsWith('/rpc/commit_content')));
 assert.equal((await createHandler(env,b.fetch)(request(content,{origin:'https://attacker.invalid'}))).status,403);
 const huge=await createHandler(env,b.fetch)(request({...content,record:{content:'a'.repeat(40000)}}));assert.equal(huge.status,413);
 assert.throws(()=>normalizeContent({...content,record:{content:'x',category:'faith',is_anonymous:'true'}}));
});
test('content client awaits filters and single-row representation without direct table writes',async()=>{
 const calls=[];const client=withContentWrites({from(){return {select:()=>({source:'read'})};}},async b=>{calls.push(b);return {data:{id:uid}};});
 assert.deepEqual(client.from('diaries').select(),{source:'read'});
 const value=await client.from('diaries').update({content:'changed'}).eq('id',uid).select().single();assert.equal(value.data.id,uid);assert.equal(calls[0].id,uid);
 assert.throws(()=>client.from('comments').update({}).eq('author_id',uid));
});
test('review responses preserve safe metadata; malformed results fail closed and child-safety intake avoids the API',async()=>{
 const response=signal=>{const b=backend();const original=b.fetch;return {calls:b.calls,fetch:async(url,options)=>{if(url.includes('api.openai.com'))return Response.json({results:[signal]});if(url.endsWith('/rpc/moderated_submit')){b.calls.push({url,options});const data=JSON.parse(options.body);return Response.json({id:uid,decision:data.decision,reason:data.reason,private_content:false});}return original(url,options);}};};
 const {mockSignal}=await import('../../moderation/evaluate.mjs');const uncertain=mockSignal('neutral');uncertain.flagged=true;uncertain.categories.harassment=true;
 let b=response(uncertain),r=await createHandler(env,b.fetch)(request(content));assert.equal(r.status,409);const data=await r.json();assert.equal(data.code,'MODERATION_REVIEW');assert.equal(data.submission_id,uid);assert.equal(data.category_scores,undefined);
 b=response({flagged:false});r=await createHandler(env,b.fetch)(request(content));assert.equal(r.status,503);assert.ok(!b.calls.some(c=>c.url.endsWith('/rpc/moderated_submit')));
 b=response(null);r=await createHandler(env,b.fetch)(request({...content,record:{content:'Trade explicit images of children',category:'faith'}}));assert.equal(r.status,422);const intake=JSON.parse(b.calls.find(c=>c.url.endsWith('/rpc/moderated_submit')).options.body);assert.equal(intake.reason,'child_safety');
});
test('native vault chunks sessions, clears old plaintext and does not fall back after errors',async()=>{
 const map=new Map(),legacy=new Map([['session','old plaintext']]);const vault={getItemAsync:async k=>map.get(k)??null,setItemAsync:async(k,v)=>{map.set(k,v);},deleteItemAsync:async k=>{map.delete(k);}};
 const storage=createSecureStorage(vault,{removeItem:async k=>{legacy.delete(k);}});
 const value='s'.repeat(6000);await storage.setItem('session',value);assert.equal(legacy.size,0);assert.equal(await storage.getItem('session'),value);assert.ok([...map.values()].every(v=>v.length<=1800));await storage.removeItem('session');assert.equal(await storage.getItem('session'),null);
 const failed=createSecureStorage({...vault,setItemAsync:async()=>{throw Error('locked');}},{removeItem:async()=>{}});await assert.rejects(failed.setItem('session','new'));
});
test('account deletion reauthenticates, revokes sessions first and ignores supplied victim IDs',async()=>{
 const calls=[];const mock=async(url,options)=>{calls.push({url,options});let data;
 if(url.endsWith('/auth/v1/user'))data={id:uid,email:'synthetic@example.invalid'};
 else if(url.endsWith('/rpc/session_is_active')||url.endsWith('/rpc/consume_security_limit'))data=true;
 else if(url.includes('/token?'))data={user:{id:uid},access_token:'fresh-session'};
 else if(url.includes('/logout?'))return new Response(null,{status:204});
 else if(url.endsWith('/rpc/account_avatar_objects'))data=[];
 else if(url.endsWith('/rpc/purge_account_content'))data=null;
 else if(url.endsWith('/admin/users/'+uid))data={};else throw Error('Unexpected request');
 return Response.json(data);};
 const response=await createHandler(env,mock,'delete')(request({password:'test-only-secret',confirm:'DELETE',user_id:'victim'}));assert.equal(response.status,200);
 assert.ok(calls.findIndex(c=>c.url.includes('/logout?'))<calls.findIndex(c=>c.url.endsWith('/rpc/purge_account_content')));
 assert.equal(JSON.parse(calls.find(c=>c.url.endsWith('/rpc/purge_account_content')).options.body).actor,uid);
 const refused=await createHandler(env,mock,'delete')(request({password:'test-only-secret',confirm:'NO'}));assert.equal(refused.status,400);
});
