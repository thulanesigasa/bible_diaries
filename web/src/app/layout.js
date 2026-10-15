import { headers } from 'next/headers';
import Header from '../components/Header';
import Logo from '../components/Logo';
import Schema from '../components/Schema';
import CookiePreferences, { CookiePreferencesButton } from '../components/CookiePreferences';
import { siteOrigin } from '../lib/seo.mjs';
import { pages } from '../content/pages.mjs';
import './globals.css';
const origin = siteOrigin();
export const metadata = {
  ...(origin ? { metadataBase: new URL(origin), alternates: { canonical: '/' } } : {}),
  title: { default: 'Bible Diaries — Your Faith. Your Story. Coming Soon.', template: '%s | Bible Diaries' },
  description: 'Reflect on Scripture, share your journey and grow in faith together on mobile and PC. Join the Bible Diaries waiting list. Google Play and Huawei AppGallery first; Apple App Store later.',
  robots: { index: true, follow: true },
  openGraph: { title: 'Bible Diaries — A new chapter is coming', description: 'Your faith. Your reflections. Our shared journey. Join the waiting list.', type: 'website', siteName: 'Bible Diaries', ...(origin ? { url: origin } : {}), images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Bible Diaries — Every walk has a story. Make room for yours.' }] },
  twitter: { card: 'summary_large_image', title: 'Bible Diaries — Coming Soon', images: ['/opengraph-image'] },
  icons: { icon: '/logo.webp', apple: '/logo.png' }
};
export default async function RootLayout({children}) {
  const requestHeaders = await headers();
  const path = requestHeaders.get('x-pathname') || '/';
  const title = pages[path.slice(1)]?.title || (path === '/waitlist-privacy' ? 'Waitlist Privacy Notice' : 'Bible Diaries');
  return <html lang="en"><body><Schema nonce={requestHeaders.get('x-nonce') || undefined} path={path} title={title}/><a className="skip-link" href="#main">Skip to content</a><Header/>{children}
    <footer className="site-footer"><div className="wrap footer-top"><div><a href="/" className="brand"><Logo/><span>Bible <b>Diaries</b></span></a><p>Your faith. Your reflections.<br/>Our shared journey.</p><CookiePreferencesButton/></div>
      <div><h2>Explore</h2><a href="/about">About Bible Diaries</a><a href="/features">Features</a><a href="/how-it-works">How it works</a><a href="/pc">Use it on PC</a><a href="/#platforms">App stores</a><a href="/#waitlist">Join the waiting list</a></div>
      <div><h2>Help &amp; trust</h2><a href="/support">Support</a><a href="/safety">Safety &amp; trust</a><a href="/community-guidelines">Community guidelines</a><a href="/security">Security</a><a href="/#faq">FAQs</a></div>
      <div><h2>Legal &amp; privacy</h2><a href="/legal">Legal centre</a><a href="/privacy">Privacy policy</a><a href="/terms">Terms of use</a><a href="/cookies">Cookies &amp; preferences</a><a href="/waitlist-privacy">Waitlist privacy</a><a href="mailto:support@ts-industries.com">Contact us</a></div>
    </div><div className="wrap footer-bottom"><span>© {new Date().getFullYear()} Bible Diaries</span><span>Reflect with purpose. Grow together.</span><a href="/#home">Back to top ↑</a></div></footer><CookiePreferences/>
  </body></html>;
}
