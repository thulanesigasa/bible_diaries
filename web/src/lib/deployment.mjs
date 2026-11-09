// Deployment role is server configuration, never inferred from a visitor's Host.
export function siteRole(env=process.env){
 const role=env.SITE_ROLE||'combined';
 if(!['main','waitlist','admin','combined'].includes(role))throw Error('Set SITE_ROLE to admin or waitlist.');
 return role;
}
function origin(value){const u=new URL(value);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw Error('Use a website origin without a path or credentials.');if(u.protocol!=='https:'&&!['localhost','127.0.0.1','[::1]'].includes(u.hostname))throw Error('Public website origins require HTTPS.');return u.origin;}
export function siteLinks(env=process.env){const role=siteRole(env);return {role,main:origin(env.MAIN_SITE_URL||'https://biblediaries.co.za'),waiting:origin(env.WAITLIST_URL||'https://waiting.biblediaries.co.za'),admin:origin(env.ADMIN_SITE_URL||'https://admin.biblediaries.co.za'),signup:role==='combined'?'/#waitlist':role==='waitlist'?'/#waitlist':origin(env.WAITLIST_URL||'https://waiting.biblediaries.co.za')};}
export const waitlistEnabled=(env=process.env)=>['waitlist','combined'].includes(siteRole(env));
export const moderationEnabled=(env=process.env)=>['admin','combined'].includes(siteRole(env));

export const adminEnabled=(env=process.env)=>['admin','combined'].includes(siteRole(env));
