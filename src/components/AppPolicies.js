import Link from "next/link";
import { APP_POLICIES } from "../../shared/app-policy-content.mjs";
export default function AppPolicies() {
  return (
    <div className="policy-menu">
      <p>Open a document to read it on its own page.</p>
      {APP_POLICIES.map((p) => (
        <Link
          className="policy-menu-row"
          key={p.id}
          href={`/settings/legal/${p.id}`}
        >
          <span>
            <strong>{p.title}</strong>
            <small>{p.intro}</small>
          </span>
          <span aria-hidden="true">→</span>
        </Link>
      ))}
      <Link className="policy-menu-row" href="/child-safety">
        Child Safety Standards →
      </Link>
    </div>
  );
}
