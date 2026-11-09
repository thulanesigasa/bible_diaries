import { notFound } from "next/navigation";
import Link from "next/link";
import { APP_POLICIES } from "../../../../../shared/app-policy-content.mjs";
export default async function Page({ params }) {
  const { policy: id } = await params,
    p = APP_POLICIES.find((x) => x.id === id);
  if (!p) notFound();
  return (
    <main className="diary-settings policy-document">
      <Link href="/settings/legal">← Legal & policies</Link>
      <h1>{p.title}</h1>
      <p>{p.intro}</p>
      <small>Reviewed 9 November 2026</small>
      {p.sections.map(([heading, text]) => (
        <section key={heading}>
          <h2>{heading}</h2>
          <p>{text}</p>
        </section>
      ))}
    </main>
  );
}
