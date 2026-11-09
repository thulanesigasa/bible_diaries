import { notFound } from "next/navigation";
import { MainHeader, MainFooter } from "../../../components/MainSite";
import { APP_POLICIES } from "../../../../shared/app-policy-content.mjs";
import { CHILD_SAFETY_SECTIONS } from "../../../../shared/child-safety.mjs";
function document(slug) {
  return slug === "child-safety"
    ? {
        title: "Child Safety Standards",
        intro: "Protection, practical boundaries and reporting options.",
        sections: CHILD_SAFETY_SECTIONS,
      }
    : APP_POLICIES.find((p) => p.id === slug);
}
export async function generateMetadata({ params }) {
  const { slug } = await params,
    p = document(slug);
  return p
    ? {
        title: `${p.title} | Bible Diaries`,
        description: p.intro,
        alternates: {
          canonical:
            slug === "privacy"
              ? "/privacy"
              : slug === "terms"
                ? "/terms"
                : slug === "child-safety"
                  ? "/child-safety"
                  : `/policies/${slug}`,
        },
      }
    : {};
}
export default async function Page({ params }) {
  const { slug } = await params,
    p = document(slug);
  if (!p) notFound();
  return (
    <div className="main-site">
      <MainHeader />
      <main className="main-document">
        <h1>{p.title}</h1>
        <p>{p.intro}</p>
        <p>Reviewed 9 November 2026</p>
        {p.sections.map(([title, body]) => (
          <section key={title}>
            <h2>{title}</h2>
            <p>{body}</p>
          </section>
        ))}
      </main>
      <MainFooter />
    </div>
  );
}
