import {NextResponse} from 'next/server';
import {randomBytes} from 'node:crypto';
export function proxy(request){
 const nonce=randomBytes(18).toString('base64');const production=process.env.NODE_ENV==='production';
 const backend=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL||'https://fspfwidfdnqvpgmipate.supabase.co');
 const policy=["default-src 'self'",`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${production?'':" 'unsafe-eval'"}`,"style-src 'self' 'unsafe-inline'",`connect-src 'self' ${backend.origin} wss://${backend.host} https://bible-api.com${production?'':' ws: wss:'}`,`img-src 'self' data: blob: ${backend.origin}`,"font-src 'self'","object-src 'none'","base-uri 'self'","form-action 'self'","frame-ancestors 'none'"].join('; ');
 const headers=new Headers(request.headers);headers.set('x-nonce',nonce);headers.set('Content-Security-Policy',policy);
 const response=NextResponse.next({request:{headers}});response.headers.set('Content-Security-Policy',policy);response.headers.set('Cache-Control','private, no-store');return response;
}
export const config={matcher:['/((?!api/|_next/|.*\\..*).*)']};
