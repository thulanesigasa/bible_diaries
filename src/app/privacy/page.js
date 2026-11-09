import { MainHeader, MainFooter } from "../../components/MainSite";
import { APP_POLICIES } from "../../../shared/app-policy-content.mjs";
export const metadata = {
  title: "Privacy policy | Bible Diaries",
  description:
    "Bible Diaries privacy, account choices, eligibility, moderation and support.",
  alternates: { canonical: "/privacy" },
};
export default function Page() {
  const p = APP_POLICIES.find((x) => x.id === "privacy");
  return (
    <div className="main-site">
      <MainHeader />
      <main className="main-document">
        <h1>{p.title}</h1>
        <p>Reviewed 9 November 2026.</p>
        <p>{p.intro}</p>
        {p.sections.map(([title, text]) => (
          <section key={title}>
            <h2>{title}</h2>
            <p>{text}</p>
          </section>
        ))}
      </main>
      <MainFooter />
    </div>
  );
}
