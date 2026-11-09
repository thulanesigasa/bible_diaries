import Link from "next/link";
import { MainHeader, MainFooter } from "../../components/MainSite";
export const metadata = {
  title: "Delete your account and data | Bible Diaries",
  description:
    "Request deletion of a Bible Diaries account and associated data from the app or by email without reinstalling.",
  alternates: { canonical: "/account-deletion" },
};
export default function Page() {
  return (
    <div className="main-site">
      <MainHeader />
      <main className="main-document">
        <h1>Delete your Bible Diaries account</h1>
        <p>
          You can request deletion without installing or signing into the app.
          Account deletion and leaving the waiting list are separate actions.
        </p>
        <section>
          <h2>Request deletion by email</h2>
          <p>
            Email{" "}
            <a href="mailto:support@ts-industries.com?subject=Bible%20Diaries%20account%20deletion">
              support@ts-industries.com
            </a>{" "}
            with the subject “Bible Diaries account deletion”. Send it from the
            address associated with the account, state that you want the account
            and associated data deleted, and include your account display name
            if useful. Do not send passwords, verification codes or
            identification documents in the initial request.
          </p>
          <p>
            If you have lost access to that email, explain this and provide only
            enough information for support to identify the account. We may need
            proportionate ownership checks before deleting or disclosing
            information. We will explain any verification or lawful retention
            that applies. A request is not a confirmation that deletion has
            finished.
          </p>
        </section>
        <section>
          <h2>Delete while signed in</h2>
          <p>
            Open Settings → Personal details → Delete account. Confirm the
            action with your password and type DELETE. Sessions are revoked and
            the service removes the account, owned avatar files, reflections,
            comments, messages and associated account records. This is
            permanent. Export important content first.
          </p>
          <Link href="/settings/account">Open Personal details</Link>
        </section>
        <section>
          <h2>What deletion cannot recall</h2>
          <p>
            Copies made by other people, screenshots, exported files and content
            copied outside the service cannot be recalled. Operational backups
            may retain earlier records until they expire under the hosting
            provider’s backup configuration; they are not used to restore a
            deleted account to normal service. Legal preservation obligations
            may require limited retention of particular records. Support should
            explain an applicable exception and its basis.
          </p>
        </section>
        <section>
          <h2>Guardian and waiting-list requests</h2>
          <p>
            A guardian may request help with a child’s account or withdraw
            permission in Guardian permissions. Withdrawal alone restricts
            access; it does not automatically delete the account. To leave the
            separate waiting list, email support with the subject “Bible Diaries
            waitlist unsubscribe”. Specify whether you want one action or both.
          </p>
        </section>
        <p>
          <Link href="/privacy">Read the privacy policy</Link> ·{" "}
          <Link href="/support">Support options</Link>
        </p>
      </main>
      <MainFooter />
    </div>
  );
}
