import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { contentSecurityPolicy } from './lib/security.mjs';
import {siteLinks} from './lib/deployment.mjs';
import {siteOrigin} from './lib/seo.mjs';
export function proxy(request) {
  const links=siteLinks(),path=request.nextUrl.pathname,canonical=siteOrigin();
  // Loopback health probes contain no private data and must not follow public DNS.
  if(path==='/api/health')return NextResponse.next();
  if(canonical?.startsWith('https://')&&request.headers.get('x-forwarded-proto')==='http'){const target=new URL(canonical);target.pathname=path;target.search=request.nextUrl.search;return NextResponse.redirect(target,308);}
  if(path.startsWith('/api/'))return NextResponse.next();
  if(links.role==='waitlist'&&path.startsWith('/admin')){const target=new URL(links.admin);target.pathname=path==='/admin'?'/':path;return NextResponse.redirect(target,307);}
  const nonce = randomBytes(18).toString('base64');
  const policy = contentSecurityPolicy(nonce, process.env.NODE_ENV === 'production');
  const headers = new Headers(request.headers);
  // Replace rather than trust a caller-provided nonce or policy.
  headers.set('x-nonce', nonce);
  headers.set('x-pathname', request.nextUrl.pathname);
  headers.set('Content-Security-Policy', policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', policy);
  // A nonce is unique to this response; shared caching must not reuse the HTML.
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export const config = { matcher: ['/((?!_next/|.*\\..*|opengraph-image).*)'] };
