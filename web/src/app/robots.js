export default function robots() {
  const site = process.env.SITE_URL;
  return { rules: [{ userAgent: '*', allow: '/', disallow: '/api/' }], ...(site ? { sitemap: `${new URL(site).origin}/sitemap.xml` } : {}) };
}
