"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import MfaSettings from "./MfaSettings";
import DeleteAccount from "./DeleteAccount";
export default function EligibilityGate({
  user,
  children,
  bypass = false,
  onReady,
}) {
  const router = useRouter(),
    [status, setStatus] = useState(null),
    [error, setError] = useState(""),
    generation = useRef(0),
    ready = useRef(false);
  function receive(data) {
    setStatus({ ...data, account: user.id });
    setError("");
    if (data.ready && !ready.current) onReady?.();
    ready.current = !!data.ready;
  }
  async function load() {
    const g = ++generation.current;
    try {
      const { data, error } = await supabase.rpc("eligibility_status");
      if (error) throw error;
      if (g === generation.current) receive(data);
    } catch (e) {
      if (g === generation.current)
        setError(e.message || "Could not check account access. Retry.");
    }
  }
  useEffect(() => {
    ready.current = false;
    setStatus(null);
    if (!user) return;
    load();
    const timer = setInterval(load, 30000),
      listener = (e) => {
        if (e.detail?.userId === user.id) receive(e.detail.status);
      };
    window.addEventListener("diary-eligibility-changed", listener);
    return () => {
      generation.current++;
      clearInterval(timer);
      window.removeEventListener("diary-eligibility-changed", listener);
    };
  }, [user?.id]);
  useEffect(() => {
    if (user && !bypass && status?.account === user.id && status.setup_required)
      router.replace("/complete-registration");
  }, [status, bypass, user?.id]);
  if (!user || bypass || (status?.account === user.id && status.ready))
    return children;
  return (
    <main className="launch-panel">
      <p>BIBLE DIARIES</p>
      <h1>
        {status?.mfa_required
          ? "Verify your authenticator"
          : status?.setup_required
            ? "Finishing registration"
            : "Your account access"}
      </h1>
      {!status || status.setup_required ? (
        <p>Opening your account details…</p>
      ) : status.mfa_required ? (
        <MfaSettings challengeOnly onVerified={load} />
      ) : (
        <>
          <p>
            {status.guardian_status === "revoked"
              ? "Guardian permission has been withdrawn. Contact your guardian or support."
              : "Your signup details are saved. Your parent or legal guardian must approve participation using their own verified adult account."}
          </p>
          <p>
            Guardian:{" "}
            {status.guardian_email ||
              "Contact support to correct this address."}
          </p>
          <p>
            Share <Link href="/guardian">these guardian instructions</Link> with
            them. This screen does not send an invitation email. Email
            verification does not prove legal guardianship.
          </p>
        </>
      )}
      {!!error && <p role="alert">{error}</p>}
      <button onClick={load}>Check again</button>
      <Link href="/account-deletion">Deletion or correction help</Link>
      <DeleteAccount />
      <button onClick={() => supabase.auth.signOut({ scope: "local" })}>
        Sign out
      </button>
    </main>
  );
}
