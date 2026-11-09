"use client";
import MfaSettings from "./MfaSettings";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { POLICY_VERSION, ageAt } from "../../shared/launch-safety.mjs";
import DeleteAccount from "./DeleteAccount";
export default function EligibilityGate({
  user,
  children,
  bypass = false,
  onReady,
}) {
  const [status, setStatus] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [birth, setBirth] = useState(""),
    [guardian, setGuardian] = useState(""),
    [accepted, setAccepted] = useState(false);
  const generation = useRef(0),
    ready = useRef(false);
  async function load() {
    const g = ++generation.current;
    try {
      const { data, error } = await supabase.rpc("eligibility_status");
      if (error) throw error;
      if (g !== generation.current) return;
      setStatus({ ...data, account: user.id });
      setError("");
      if (data.ready && !ready.current) {
        ready.current = true;
        onReady?.();
      }
      ready.current = !!data.ready;
    } catch (e) {
      if (g === generation.current)
        setError(e.message || "Could not check account access. Retry.");
    }
  }
  useEffect(() => {
    ready.current = false;
    setStatus(null);
    setBirth("");
    setGuardian("");
    setAccepted(false);
    if (!user) return;
    load();
    const t = setInterval(load, 30000);
    return () => {
      generation.current++;
      clearInterval(t);
    };
  }, [user?.id]);
  async function submit(e) {
    e.preventDefault();
    const age = ageAt(birth);
    if (age === null || age < 13) {
      setError("Accounts are available from age 13. Enter a valid birth date.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.rpc("complete_account_setup", {
        birth_date: birth,
        guardian_email: guardian,
        accepted,
        policy_version: POLICY_VERSION,
      });
      if (error) throw error;
      await load();
    } catch (e) {
      setError(e.message || "Could not save. Retry.");
    } finally {
      setBusy(false);
    }
  }
  if (!user || bypass || (status?.account === user.id && status.ready))
    return children;
  return (
    <main className="launch-panel">
      <p>BIBLE DIARIES</p>
      <h1>
        {status?.setup_required
          ? "A safer place to begin"
          : "Your account access"}
      </h1>
      {!status ? (
        <p>Checking your account…</p>
      ) : status.mfa_required ? (
        <MfaSettings challengeOnly onVerified={load} />
      ) : status.setup_required ? (
        <form onSubmit={submit}>
          <p>
            Accounts are for ages 13 and above. Members under 18 need permission
            from a separate verified adult guardian account. Your birth date and
            guardian email are stored in a restricted account record.
          </p>
          <label>
            Birth date
            <input
              type="date"
              required
              value={birth}
              onChange={(e) => setBirth(e.target.value)}
            />
          </label>
          {ageAt(birth) !== null && ageAt(birth) < 18 && (
            <label>
              Parent or legal guardian email
              <input
                type="email"
                required
                maxLength={254}
                value={guardian}
                onChange={(e) => setGuardian(e.target.value)}
              />
            </label>
          )}
          <p>
            <Link href="/terms">Terms</Link> ·{" "}
            <Link href="/privacy">Privacy</Link> ·{" "}
            <Link href="/community-guidelines">Community standards</Link> ·{" "}
            <Link href="/child-safety">Child safety</Link>
          </p>
          <label className="launch-check">
            <input
              type="checkbox"
              required
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            I accept the terms and community standards and acknowledge the
            privacy notice, including automated checks on submitted text.
          </label>
          <button disabled={busy || !accepted}>
            {busy ? "Saving…" : "Continue"}
          </button>
        </form>
      ) : (
        <>
          <p>
            {status.guardian_status === "revoked"
              ? "Guardian permission has been withdrawn. Community access is restricted."
              : "Your account is restricted until your parent or legal guardian approves participation using their own verified adult account."}
          </p>
          <p>Guardian: {status.guardian_email}</p>
          <p>
            Share <a href="/guardian">these guardian instructions</a> with them.
            We do not send an invitation email from this screen. Email
            verification does not prove legal guardianship.
          </p>
        </>
      )}
      {!!error && <p role="alert">{error}</p>}
      <button onClick={load}>Check again</button>
      <p>
        <Link href="/account-deletion">Deletion or correction help</Link>
      </p>
      <DeleteAccount />
      <button onClick={() => supabase.auth.signOut({ scope: "local" })}>
        Sign out
      </button>
    </main>
  );
}
