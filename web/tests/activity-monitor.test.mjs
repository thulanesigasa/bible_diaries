import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createActivityMonitor,notificationText} from '../../shared/activity-monitor.mjs';
const row=(id,extra={})=>({id,kind:'like',created_at:`2026-11-12T10:${String(id).padStart(2,'0')}:00Z`,read_at:null,...extra});
test('live monitor baselines history, deduplicates read changes and respects preferences/quiet hours',async()=>{
 let data={community:[row(1)],unread:1},snapshots=[],notices=[];
 const monitor=createActivityMonitor({read:async()=>data,onSnapshot:x=>snapshots.push(x),onNotice:x=>notices.push(x),now:()=>new Date(2026,10,12,23)});
 await monitor.refresh();assert.equal(notices.length,0);
 data={community:[row(2),row(1)],unread:2};await monitor.refresh();await monitor.refresh();assert.equal(notices.length,1);assert.equal(notices[0][0].id,2);
 data={community:[row(2,{read_at:'now'}),row(1)],unread:1};await monitor.refresh();assert.equal(notices.length,1);assert.equal(snapshots.at(-1).unread,1);
 data={community:[row(3)],unread:2,settings:{notify_likes:false}};await monitor.refresh();assert.equal(notices.length,1);
 data={community:[row(4)],unread:3,settings:{quiet_enabled:true,quiet_start:'22:00',quiet_end:'07:00'}};await monitor.refresh();assert.equal(notices.length,1);assert.equal(snapshots.at(-1).unread,3);
 monitor.stop();await monitor.refresh();assert.equal(snapshots.length,6);
 assert.equal(notificationText({...row(4),source:'community',actor_id:'hidden'}),'Someone liked your reflection.');
});
test('stopped account cannot publish a late snapshot; concurrent refreshes coalesce',async()=>{
 let resolve,calls=0,snapshots=0;
 const monitor=createActivityMonitor({read:()=>{calls++;return new Promise(r=>{resolve=r;});},onSnapshot:()=>snapshots++,onNotice:()=>{}});
 const pending=monitor.refresh();await monitor.refresh();await monitor.refresh();resolve({community:[],unread:0});await pending;assert.equal(calls,2);
 monitor.stop();resolve({community:[],unread:0});await new Promise(r=>setImmediate(r));assert.equal(snapshots,1);
});
