import {NextResponse} from 'next/server';
import {rootRole,siteDomains,isAppRoute,mobilePath} from './lib/site-domains.mjs';
import {randomBytes} from 'node:crypto';
export function proxy(request){
 const role=rootRole(),path=request.nextUrl.pathname,links=siteDomains();
 if(path==='/api/health')return NextResponse.next();
 if(path.startsWith('/api/')){
  if(role==='main')return new NextResponse('Not found',{status:404});
  return NextResponse.next();
 }
 if(role==='main'&&isAppRoute(path)){const target=new URL(links.app);target.pathname=mobilePath(path);target.search=request.nextUrl.search;return NextResponse.redirect(target,307);}
 if(role==='app'){
  if(path==='/robots.txt')return new NextResponse('User-agent: *\nDisallow: /\n',{headers:{'content-type':'text/plain'}});
  const normalized=mobilePath(path);
  if(normalized!==path){const target=request.nextUrl.clone();target.pathname=normalized;return NextResponse.redirect(target,307);}
  const target=request.nextUrl.clone();target.pathname='/api/app-shell';target.search='';target.searchParams.set('path',path);return NextResponse.rewrite(target);
 }
 const nonce=randomBytes(18).toString('base64');const production=process.env.NODE_ENV==='production';
 const backend=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL||'https://fspfwidfdnqvpgmipate.supabase.co');
 const policy=["default-src 'self'",`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${production?'':" 'unsafe-eval'"}`,"style-src 'self' 'unsafe-inline'",`connect-src 'self' ${backend.origin} wss://${backend.host} https://bible-api.com${production?'':' ws: wss:'}`,`img-src 'self' data: blob: ${backend.origin}`,"font-src 'self'","object-src 'none'","base-uri 'self'","form-action 'self'","frame-ancestors 'none'"].join('; ');
 const headers=new Headers(request.headers);headers.set('x-nonce',nonce);headers.set('Content-Security-Policy',policy);
 const response=NextResponse.next({request:{headers}});response.headers.set('Content-Security-Policy',policy);response.headers.set('Cache-Control','private, no-store');return response;
}
export const config={matcher:['/((?!_next/|_app/|_expo/|assets/|.*\\..*).*)','/robots.txt']};
