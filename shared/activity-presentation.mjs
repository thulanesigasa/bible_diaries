export function activityDay(value, now = new Date()) {
  const d=new Date(value),today=new Date(now.getFullYear(),now.getMonth(),now.getDate()),yesterday=new Date(today);yesterday.setDate(today.getDate()-1);
  const day=new Date(d.getFullYear(),d.getMonth(),d.getDate());
  return day.getTime()===today.getTime()?'Today':day.getTime()===yesterday.getTime()?'Yesterday':'Earlier';
}
export function mergeActivity(community, system) {
  return [...community.map(row=>({...row,source:'community',key:`community:${row.id}`})),...system.map(row=>({...row,source:'system',key:`system:${row.id}`}))].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)||a.key.localeCompare(b.key));
}
export const ACTIVITY_FILTERS=[['all','All'],['like','Likes'],['comment','Comments'],['bookmark','Bookmarks'],['share','Shares'],['post','Following'],['system','System']];
