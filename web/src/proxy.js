import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { contentSecurityPolicy } from './lib/security.mjs';
export function proxy(request) {
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
export const config = { matcher: ['/((?!api/|_next/|.*\\..*|opengraph-image).*)'] };
