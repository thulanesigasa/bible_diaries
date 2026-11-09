import {siteRole} from '../lib/deployment.mjs';
export const dynamic='force-dynamic';
import { siteOrigin } from '../lib/seo.mjs';
export default function robots() {
  const origin = siteOrigin();
  if(siteRole()==='admin')return {rules:[{userAgent:'*',disallow:'/'}]};
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/api/','/admin'] }], ...(origin ? { sitemap: `${origin}/sitemap.xml` } : {}) };
}
