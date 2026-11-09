import {test} from 'node:test';import assert from 'node:assert/strict';
import {userError} from '../../shared/user-error.mjs';
import {validUsername,signupPasswordChecks} from '../../shared/signup-fields.mjs';
import {createPasswordCapture} from '../../mobile/src/lib/password-capture.mjs';
test('permission errors hide table names even inside prefixed toasts',()=>{
 for(const e of [{code:'42501',message:'internal_name'},'Failed to save: permission denied for table account_eligibility','new row violates row-level security policy for table profiles'])assert.equal(userError(e),'Permission denied. Please try again.');
 assert.equal(userError({message:'duplicate key violates unique constraint profiles_username_unique'},'Try another username.'),'Try another username.');assert.equal(userError({message:'Invalid login credentials'}),'Invalid login credentials');
});
test('signup validates normalized usernames and each password requirement',()=>{
 assert.equal(validUsername(' Reader_20 '),true);for(const v of ['ab','name@example.com','name with spaces','a'.repeat(25)])assert.equal(validUsername(v),false);
 assert.ok(signupPasswordChecks('My long phrase 2!').every(c=>c.valid));assert.equal(signupPasswordChecks('short2!').every(c=>c.valid),false);assert.equal(signupPasswordChecks('My long phrase 2').every(c=>c.valid),false);
});
test('password field blur cannot release an active password or biometric screen',async()=>{
 const calls=[],guard=createPasswordCapture({preventScreenCaptureAsync:async()=>calls.push('on'),allowScreenCaptureAsync:async()=>calls.push('off')},'test');await guard.focus('screen');await guard.focus();guard.blur();await new Promise(r=>setTimeout(r,10));assert.deepEqual(calls,['on','on']);guard.blur('screen');await new Promise(r=>setTimeout(r,10));assert.equal(calls.at(-1),'off');await guard.dispose();
});
test('capture failure is observable so biometric verification can fail closed',async()=>{
 let errors=0;const guard=createPasswordCapture({preventScreenCaptureAsync:async()=>{throw Error('unavailable');},allowScreenCaptureAsync:async()=>{}},'test',()=>errors++);assert.equal(await guard.focus('screen'),false);assert.equal(errors,1);await guard.dispose();
});
