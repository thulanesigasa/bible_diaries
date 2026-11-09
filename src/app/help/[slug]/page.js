import { notFound } from "next/navigation";
import Link from "next/link";
import { MainHeader, MainFooter } from "../../../components/MainSite";
import { HELP_PAGES } from "../../../../shared/help-content.mjs";
export async function generateMetadata({ params }) {
  const { slug } = await params,
    p = Object.prototype.hasOwnProperty.call(HELP_PAGES, slug)
      ? HELP_PAGES[slug]
      : null;
  return p
    ? {
        title: `${p.title} | Bible Diaries`,
        description: p.intro,
        alternates: { canonical: `/help/${slug}` },
      }
    : {};
}
export default async function Page({ params }) {
  const { slug } = await params,
    p = Object.prototype.hasOwnProperty.call(HELP_PAGES, slug)
      ? HELP_PAGES[slug]
      : null;
  if (!p) notFound();
  return (
    <div className="main-site">
      <MainHeader />
      <main className="main-document">
        <Link href="/settings/support">← Support & safety</Link>
        <h1>{p.title}</h1>
        <p>{p.intro}</p>
        {p.sections.map(([title, body]) => (
          <section key={title}>
            <h2>{title}</h2>
            <p>{body}</p>
          </section>
        ))}
        <p>
          <a
            href={`mailto:support@ts-industries.com?subject=${encodeURIComponent("Bible Diaries — " + p.title)}`}
          >
            Contact support@ts-industries.com
          </a>
        </p>
        <Link href="/privacy">Read the privacy policy</Link>
        <p>
          Support is not an emergency service. Never send passwords, PINs,
          authenticator setup keys or one-time codes.
        </p>
      </main>
      <MainFooter />
    </div>
  );
}
