import { fileURLToPath } from 'node:url';
/** @type {import('next').NextConfig} */
const config = {
  distDir: process.env.SITE_BUILD_DIR || '.next',
  outputFileTracingRoot: fileURLToPath(new URL('.', import.meta.url)),
  output:'standalone',
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  async headers() {
    return [{ source: '/(.*)', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
    ] }, { source:'/admin/:path*', headers:[{key:'X-Robots-Tag',value:'noindex, nofollow'},{key:'Cache-Control',value:'private, no-store'}] }];
  }
};
export default config;
