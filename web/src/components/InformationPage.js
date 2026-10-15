import { notFound } from 'next/navigation';
import { pages } from '../content/pages.mjs';
import { CookiePreferencesButton } from './CookiePreferences';
import LaptopMockup from './LaptopMockup';
export default function InformationPage({ slug }) {
  const page = pages[slug];
  if (!page) notFound();
  return <main id="main" className="wrap information-page">
    <nav className="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span aria-current="page">{page.title}</span></nav>
    <div className="information-heading"><p className="kicker">{page.eyebrow}</p><h1>{page.heading}</h1><p className="information-intro">{page.intro}</p>{slug === 'support' && <a className="button" href="mailto:support@ts-industries.com?subject=Bible%20Diaries%20support">Email support ↗</a>}</div>
    {slug === 'pc' && <LaptopMockup id="pc-page-preview-caption"/>}
    {slug === 'legal' && <nav className="policy-directory" aria-label="Full legal and guidance documents">{page.related.map(item => <a href={`/${item}`} key={item}>{pages[item]?.title || 'Waitlist Privacy Notice'} <span aria-hidden="true">↗</span></a>)}</nav>}
    <div className="information-body"><aside className="contents"><p>ON THIS PAGE</p><nav aria-label="On this page">{page.sections.map(([title], index) => <a key={title} href={`#section-${index+1}`}>{title}</a>)}</nav>{slug === 'cookies' && <CookiePreferencesButton/>}</aside><div className="information-sections">{page.sections.map(([title, body], index) => <section id={`section-${index+1}`} key={title}><h2>{title}</h2>{body.split(/\n\s*\n/).map((paragraph, number) => <p key={number}>{paragraph}</p>)}</section>)}{slug === 'pc' && process.env.APP_WEB_URL && /^https:\/\//.test(process.env.APP_WEB_URL) && <a className="button" href={process.env.APP_WEB_URL} rel="noopener noreferrer">Open web app ↗</a>}{page.references && <section className="policy-references" aria-labelledby="policy-references-title"><h2 id="policy-references-title">Official background reading</h2><p>These official resources explain the legal framework and available guidance. They are background information, not a certification of this service or a determination of an individual request.</p><ul>{page.references.map(([label,url]) => <li key={url}><a href={url}>{label} ↗</a></li>)}</ul></section>}{['privacy', 'terms', 'cookies', 'legal', 'waitlist-privacy'].includes(slug) && <p className="fineprint">Last updated: 15 October 2026</p>}</div></div>
    <section className="related-pages" aria-labelledby="related-title"><p className="kicker">KEEP EXPLORING</p><h2 id="related-title">Useful next steps.</h2><div>{page.related.map(item => <a key={item} href={`/${item}`}>{pages[item]?.title || 'Waitlist Privacy Notice'} <span aria-hidden="true">↗</span></a>)}</div></section>
    <div className="information-cta"><div><h2>Be there at the beginning.</h2><p>Receive Bible Diaries launch updates.</p></div><a className="button" href="/#waitlist">Join the waiting list ↗</a></div>
  </main>;
}
