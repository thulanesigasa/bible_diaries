import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizePhone,countryName} from '../src/lib/phone.mjs';
import {suggestedRejection} from '../src/lib/rejection-reasons.mjs';
import {moderationTitle} from '../../shared/moderation-notifications.mjs';
test('cell numbers become E.164 and identify the number region including shared calling codes',()=>{
 assert.deepEqual(normalizePhone('082 123 4567','ZA'),{number:'+27821234567',country:'ZA',callingCode:'+27'});
 assert.equal(normalizePhone('+1 416 555 0123','US').country,'CA');
 assert.equal(normalizePhone('+1 202 555 0123','CA').country,'US');
 assert.equal(normalizePhone('abc','ZA'),null);assert.equal(normalizePhone('+27821234567 ext 2','ZA'),null);assert.equal(normalizePhone('0821234567','ZZ'),null);
 assert.equal(countryName('ZA'),'South Africa');
});
test('rejection suggestions are explainable, editable text derived from findings and notification titles reflect delivery',()=>{
 const reason=suggestedRejection({categories:['harassment']});assert.match(reason,/personal insults/);assert.ok(reason.length<=500);
 assert.match(suggestedRejection({reason:'severe_safety'}),/harm/);
 assert.equal(moderationTitle({outcome:'approved',target:'diaries'}),'Approved and posted');assert.equal(moderationTitle({outcome:'approved',target:'chats'}),'Approved and sent');assert.equal(moderationTitle({outcome:'rejected'}),'Rejected');
});
