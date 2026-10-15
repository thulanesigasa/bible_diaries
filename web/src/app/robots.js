import { siteOrigin } from '../lib/seo.mjs';
export default function robots() {
  const origin = siteOrigin();
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/api/','/admin'] }], ...(origin ? { sitemap: `${origin}/sitemap.xml` } : {}) };
}
