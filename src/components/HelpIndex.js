import Link from "next/link";
import { HELP_GROUPS } from "../../shared/help-content.mjs";
export default function HelpIndex() {
  return (
    <div className="policy-menu">
      <p>
        Choose a guide for practical steps, privacy choices and safety
        information. Each guide opens on its own page.
      </p>
      {HELP_GROUPS.map(([title, rows]) => (
        <section key={title}>
          <h2>{title}</h2>
          {rows.map(([id, label, hint]) => (
            <Link className="policy-menu-row" key={id} href={`/help/${id}`}>
              <span>
                <strong>{label}</strong>
                <small>{hint}</small>
              </span>
              <span aria-hidden="true">→</span>
            </Link>
          ))}
        </section>
      ))}
    </div>
  );
}
