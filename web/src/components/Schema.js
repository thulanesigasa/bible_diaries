import { siteOrigin, serializeSchema } from '../lib/seo.mjs';
export default function Schema({ nonce, path = '/', title = 'Bible Diaries' }) {
  const origin = siteOrigin();
  const graph = [
    { '@type': 'Organization', name: 'T.S Industries', email: 'support@ts-industries.com', ...(origin ? { '@id': `${origin}/#organisation`, url: origin } : {}) },
    { '@type': 'WebSite', name: 'Bible Diaries', description: 'Bible Diaries coming soon website for spiritual reflection, fellowship and launch updates.', inLanguage: 'en', ...(origin ? { '@id': `${origin}/#website`, url: origin } : {}) },
    { '@type': 'WebPage', name: title, description: 'Information about Bible Diaries and its upcoming release.', inLanguage: 'en', ...(origin ? { url: `${origin}${path}`, isPartOf: { '@id': `${origin}/#website` } } : {}) }
  ];
  return <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeSchema({ '@context': 'https://schema.org', '@graph': graph }) }}/>;
}
