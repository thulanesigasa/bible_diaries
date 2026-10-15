import Header from '../components/Header';
import Logo from '../components/Logo';
import './globals.css';
const siteUrl = process.env.SITE_URL;
export const metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl), alternates: { canonical: '/' } } : {}),
  title: { default: 'Bible Diaries — Your Faith. Your Story. Coming Soon.', template: '%s | Bible Diaries' },
  description: 'Reflect on Scripture, share your journey and grow in faith together. Join the Bible Diaries waiting list. Coming to Google Play and Huawei AppGallery, with Apple App Store planned for later.',
  openGraph: { title: 'Bible Diaries — A new chapter is coming', description: 'Your faith. Your reflections. Our shared journey. Join the waiting list.', type: 'website', siteName: 'Bible Diaries', images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Bible Diaries — Every walk has a story. Make room for yours.' }] },
  twitter: { card: 'summary_large_image', title: 'Bible Diaries — Coming Soon', images: ['/opengraph-image'] },
  icons: { icon: '/logo.png', apple: '/logo.png' }
};
export default function RootLayout({children}) {
  return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a><Header/>{children}<footer className="site-footer"><div className="wrap footer-top"><div><a href="/" className="brand"><Logo/><span>Bible <b>Diaries</b></span></a><p>Your faith. Your reflections.<br/>Our shared journey.</p></div><div><h2>Explore</h2><a href="/#about">Our story</a><a href="/#features">The experience</a><a href="/#platforms">App stores</a><a href="/#waitlist">Join the waiting list</a></div><div><h2>Stay connected</h2><a href="/waitlist-privacy">Waitlist privacy</a><a href="mailto:support@ts-industries.com">Contact support</a><a href="/#faq">FAQs</a></div></div><div className="wrap footer-bottom"><span>© {new Date().getFullYear()} Bible Diaries</span><span>Reflect with purpose. Grow together.</span><a href="/#home">Back to top ↑</a></div></footer></body></html>;
}
