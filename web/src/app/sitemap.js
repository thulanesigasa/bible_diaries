import { contentPaths } from '../content/pages.mjs';
import { siteOrigin } from '../lib/seo.mjs';
export default function sitemap() {
  const origin = siteOrigin();
  if (!origin) return [];
  return ['/', ...contentPaths, '/waitlist-privacy'].map(path => ({ url: `${origin}${path === '/' ? '' : path}`, changeFrequency: 'monthly', priority: path === '/' ? 1 : ['/features','/pc','/about'].includes(path) ? 0.8 : 0.4 }));
}
