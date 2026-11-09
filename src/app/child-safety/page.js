import { MainHeader, MainFooter } from "../../components/MainSite";
import { CHILD_SAFETY_SECTIONS } from "../../../shared/child-safety.mjs";
export const metadata = {
  title: "Child safety standards | Bible Diaries",
  description:
    "Bible Diaries standards against child exploitation, reporting options, guardian permissions and safety contact.",
  alternates: { canonical: "/child-safety" },
};
export default function Page() {
  return (
    <div className="main-site">
      <MainHeader />
      <main className="main-document">
        <h1>Child safety standards</h1>
        <p>
          Reviewed 9 November 2026. These standards cover the Bible Diaries
          application and browser companion.
        </p>
        {CHILD_SAFETY_SECTIONS.map(([title, text]) => (
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
