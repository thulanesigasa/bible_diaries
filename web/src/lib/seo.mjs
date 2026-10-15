export function siteOrigin(env = process.env) {
  if (!env.SITE_URL) return null;
  const url = new URL(env.SITE_URL);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('SITE_URL must be an HTTP(S) origin without credentials, path, query or fragment.');
  if (env.NODE_ENV === 'production' && url.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Production SITE_URL must use HTTPS.');
  return url.origin;
}
export function pageMetadata(path, title, description) {
  const origin = siteOrigin();
  return {
    title, description,
    ...(origin ? { alternates: { canonical: path } } : {}),
    openGraph: { title: `${title} | Bible Diaries`, description, ...(origin ? { url: `${origin}${path}` } : {}), type: 'website', siteName: 'Bible Diaries', images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Bible Diaries — Every walk has a story.' }] },
    twitter: { card: 'summary_large_image', title: `${title} | Bible Diaries`, description, images: ['/opengraph-image'] }
  };
}
export function serializeSchema(value) { return JSON.stringify(value).replace(/</g, '\\u003c'); }
