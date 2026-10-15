export default function sitemap() {
  if (!process.env.SITE_URL) return [];
  const origin = new URL(process.env.SITE_URL).origin;
  return [{ url: origin, changeFrequency: 'monthly', priority: 1 }, { url: `${origin}/waitlist-privacy`, changeFrequency: 'monthly', priority: 0.3 }];
}
