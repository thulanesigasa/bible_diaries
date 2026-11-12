import {DEFAULT_SETTINGS,isQuietTime,ACTIVITY_LABELS} from './diary-settings.mjs';
const preference={like:'notify_likes',comment_like:'notify_likes',comment:'notify_comments',reply:'notify_comments',bookmark:'notify_bookmarks',share:'notify_shares',post:'notify_posts'};
export function notificationText(row){
 if(row.source==='system')return row.outcome==='approved'?'Your submission was approved.':'A review decision is available.';
 return `Someone ${ACTIVITY_LABELS[row.kind]||'interacted with your reflection'}.`;
}
// Pure lifecycle controller: bounded work, no historical popup burst, no late account updates.
export function createActivityMonitor({read,onSnapshot,onNotice,onError=()=>{},now=()=>new Date()}){
 let stopped=false,pending=false,again=false,initial=true,watermark='',fingerprint='';
 const seen=new Set();
 async function refresh(){
  if(stopped)return;if(pending){again=true;return;}pending=true;
  try{
   const data=await read();if(stopped)return;
   const settings={...DEFAULT_SETTINGS,...data.settings};
   const rows=[...(data.community||[]).map(x=>({...x,source:'community'})),...(data.system||[]).map(x=>({...x,source:'system'}))];
   const notices=rows.filter(x=>!initial&&!seen.has(x.source+':'+x.id)&&!x.read_at&&x.created_at>=watermark&&(x.source==='system'||settings[preference[x.kind]]!==false));
   for(const row of rows){seen.add(row.source+':'+row.id);if(row.created_at>watermark)watermark=row.created_at;}
   // Keep the current snapshot's IDs even after a long open session.
   if(seen.size>2000){seen.clear();for(const row of rows)seen.add(row.source+':'+row.id);}
   initial=false;
   const next=JSON.stringify([data.unread,rows.map(x=>[x.source,x.id,x.read_at])]);
   const changed=fingerprint!==next;fingerprint=next;
   onSnapshot({...data,settings,changed});
   if(notices.length&&!isQuietTime(settings,now()))onNotice(notices);
  }catch{if(!stopped)onError();}
  finally{pending=false;if(again&&!stopped){again=false;void refresh();}}
 }
 return {refresh,stop(){stopped=true;again=false;}};
}
