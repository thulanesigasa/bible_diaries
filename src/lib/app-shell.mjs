// Fixed route templates only: a visitor path can never become a filesystem path.
const staticPages=new Set(['','login','register','complete-registration','reset-password','auth/confirm','settings','settings/account','chat','connect','filters','activity','achievements','reviews','safety','guardian','modal']);
export function shellTemplate(path){
 const clean=path.replace(/^\//,'').replace(/\/$/,'');
 if(staticPages.has(clean))return (clean||'index')+'.html';
 for(const key of ['post','profile','chat','help','policies','settings'])if(new RegExp('^'+key+'/[^/]+$').test(clean))return key+'/['+(key==='help'||key==='policies'?'slug':key==='settings'?'section':'id')+'].html';
 return '+not-found.html';
}
export function nonceHtml(html,nonce){
 if(!/^[A-Za-z0-9+/=]+$/.test(nonce))throw Error('Invalid nonce.');
 return html.replace(/<script\b/g,`<script nonce="${nonce}"`).replace(/<head([^>]*)>/,'<head$1><title>Bible Diaries</title><meta name="robots" content="noindex,nofollow">');
}
export function appPolicy(nonce,backend){const u=new URL(backend);return ["default-src 'self'",`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,"style-src 'self' 'unsafe-inline'",`connect-src 'self' ${u.origin} wss://${u.host} https://bible-api.com`, `img-src 'self' data: blob: ${u.origin}`,"font-src 'self' data:","object-src 'none'","base-uri 'self'","form-action 'self'","frame-ancestors 'none'"].join('; ');}
