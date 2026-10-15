import { notFound } from 'next/navigation';
import { pages } from '../../content/pages.mjs';
import { pageMetadata } from '../../lib/seo.mjs';
import { CookiePreferencesButton } from '../../components/CookiePreferences';
import LaptopMockup from '../../components/LaptopMockup';
export const dynamicParams = false;
export function generateStaticParams() { return Object.keys(pages).map(slug => ({ slug })); }
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = pages[slug];
  return page ? pageMetadata(`/${slug}`, page.title, page.description) : {};
}
export default async function InformationPage({ params }) {
  const { slug } = await params;
  const page = pages[slug];
  if (!page) notFound();
  return <main id="main" className="wrap information-page">
    <nav className="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span aria-current="page">{page.title}</span></nav>
    <div className="information-heading"><p className="kicker">{page.eyebrow}</p><h1>{page.heading}</h1><p className="information-intro">{page.intro}</p>{slug === 'support' && <a className="button" href="mailto:support@ts-industries.com?subject=Bible%20Diaries%20support">Email support ↗</a>}</div>
    {slug === 'pc' && <LaptopMockup id="pc-page-preview-caption"/>}
    <div className="information-body"><aside className="contents"><p>ON THIS PAGE</p><nav aria-label="On this page">{page.sections.map(([title], index) => <a key={title} href={`#section-${index+1}`}>{title}</a>)}</nav>{slug === 'cookies' && <CookiePreferencesButton/>}</aside><div className="information-sections">{page.sections.map(([title, body], index) => <section id={`section-${index+1}`} key={title}><h2>{title}</h2><p>{body}</p></section>)}{slug === 'pc' && process.env.APP_WEB_URL && /^https:\/\//.test(process.env.APP_WEB_URL) && <a className="button" href={process.env.APP_WEB_URL} rel="noopener noreferrer">Open web app ↗</a>}{['privacy', 'terms', 'cookies', 'legal'].includes(slug) && <p className="fineprint">Last updated: 15 October 2026</p>}</div></div>
    <section className="related-pages" aria-labelledby="related-title"><p className="kicker">KEEP EXPLORING</p><h2 id="related-title">Useful next steps.</h2><div>{page.related.map(item => <a key={item} href={`/${item}`}>{pages[item]?.title || 'Waitlist Privacy Notice'} <span aria-hidden="true">↗</span></a>)}</div></section>
    <div className="information-cta"><div><h2>Be there at the beginning.</h2><p>Receive Bible Diaries launch updates.</p></div><a className="button" href="/#waitlist">Join the waiting list ↗</a></div>
  </main>;
}
