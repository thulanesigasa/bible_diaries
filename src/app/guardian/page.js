import Link from "next/link";
import { MainHeader, MainFooter } from "../../components/MainSite";
export const metadata = {
  title: "Guardian permissions | Bible Diaries",
  description:
    "How a verified adult guardian can approve or withdraw participation for a Bible Diaries member aged 13–17.",
  alternates: { canonical: "/guardian" },
};
export default function Page() {
  return (
    <div className="main-site">
      <MainHeader />
      <main className="main-document">
        <h1>A guardian’s guide</h1>
        <p>
          Bible Diaries supports members from age 13. A member under 18 remains
          restricted until a separate verified adult guardian account approves
          participation.
        </p>
        <section>
          <h2>Review the experience first</h2>
          <p>
            Members can write private reflections, share with other members,
            comment and exchange messages. Public material may be copied.
            Submitted text, including private text, undergoes automated
            moderation. Participant reports can share a referenced private
            message with a designated safety reviewer. This is not an end-to-end
            encrypted or emergency service.
          </p>
          <p>
            <Link href="/privacy">Privacy</Link> ·{" "}
            <Link href="/terms">Terms</Link> ·{" "}
            <Link href="/community-guidelines">Community standards</Link> ·{" "}
            <Link href="/child-safety">Child safety</Link>
          </p>
        </section>
        <section>
          <h2>Approve using your own account</h2>
          <ol>
            <li>
              Create or sign into your own adult account using the email address
              the child supplied for their guardian.
            </li>
            <li>
              Confirm your email and complete the age and current-policy check
              honestly.
            </li>
            <li>
              Open Settings → Guardian permissions, read the declaration of
              authority and review the request.
            </li>
            <li>
              Explicitly approve, decline or withdraw permission. Never share
              your account or password with the child.
            </li>
          </ol>
          <Link className="main-button" href="/settings/guardian">
            Open guardian permissions
          </Link>
        </section>
        <section>
          <h2>What this verifies</h2>
          <p>
            Email confirmation verifies control of an address. The adult
            declares that they are authorised as a parent or legal guardian. The
            service does not prove legal guardianship. No guardian invitation
            email is sent by the account-access screen; the child can share this
            page with you.
          </p>
        </section>
        <section>
          <h2>Withdrawal and corrections</h2>
          <p>
            Withdraw permission from the same verified adult account to restrict
            further participation. This does not recall copies already shared or
            erase an account. For an incorrect guardian address, birth-date
            correction or deletion request, contact support@ts-industries.com.
            We may verify account control and authority before changing records.
          </p>
        </section>
      </main>
      <MainFooter />
    </div>
  );
}
