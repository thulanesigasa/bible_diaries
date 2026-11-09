import {test} from 'node:test';
import assert from 'node:assert/strict';
import {activityDay,mergeActivity} from '../../shared/activity-presentation.mjs';
test('inbox day labels use calendar boundaries instead of elapsed 24-hour periods',()=>{
 const now=new Date(2026,10,9,0,10);
 assert.equal(activityDay(new Date(2026,10,9,0,1),now),'Today');
 assert.equal(activityDay(new Date(2026,10,8,23,59),now),'Yesterday');
 assert.equal(activityDay(new Date(2026,10,7,23,59),now),'Earlier');
});
test('community and review decisions share chronological ordering without colliding IDs',()=>{
 const rows=mergeActivity([{id:'same',created_at:'2026-11-09T09:00:00Z',kind:'bookmark',actor_id:null}],[{id:'same',created_at:'2026-11-09T10:00:00Z',outcome:'rejected',reason:'A review reason'}]);
 assert.deepEqual(rows.map(x=>x.source),['system','community']);assert.notEqual(rows[0].key,rows[1].key);
 assert.equal(rows[0].reason,'A review reason');assert.equal(rows[1].actor_id,null);
});
