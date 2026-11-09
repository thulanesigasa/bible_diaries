"use client";
import { userError } from '../../shared/user-error.mjs';

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
export default function MfaSettings({ challengeOnly = false, onVerified }) {
  const [factor, setFactor] = useState(null),
    [secret, setSecret] = useState(""),
    [code, setCode] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const pending = useRef(false);
  async function load() {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      setMessage(userError(error));
      return;
    }
    setFactor(data.totp?.find((x) => x.status === "verified") || null);
  }
  useEffect(() => {
    load();
    return () => {
      setSecret("");
    };
  }, []);
  async function enroll() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      const { data: existing, error: listing } =
        await supabase.auth.mfa.listFactors();
      if (listing) throw listing;
      for (const f of existing.all || [])
        if (f.status === "unverified" && f.factor_type === "totp") {
          const { error } = await supabase.auth.mfa.unenroll({
            factorId: f.id,
          });
          if (error) throw error;
        }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Bible Diaries authenticator",
      });
      if (error) throw error;
      setFactor({ id: data.id, status: "unverified" });
      setSecret(data.totp.secret);
      setMessage(
        "Add this key manually to an authenticator app, then enter its current six-digit code. Keep the key private.",
      );
    } catch (e) {
      setMessage(userError(e, "Could not start setup."));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function verify(e) {
    e.preventDefault();
    if (pending.current || !factor || !/^\d{6}$/.test(code)) return;
    pending.current = true;
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: factor.id,
        code,
      });
      if (error) throw error;
      setSecret("");
      setCode("");
      setMessage(
        "Authenticator verified. Store your recovery arrangements securely; contact support if you lose access.",
      );
      await load();
      onVerified?.();
    } catch (e) {
      setCode("");
      setMessage(userError(e, "Verification failed. Use a fresh code."));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="launch-panel">
      <h2>
        {challengeOnly ? "Verify your authenticator" : "Authenticator security"}
      </h2>
      <p>
        Administrators must verify an enrolled authenticator before entering
        either admin workspace. Use your own account and never share codes.
      </p>
      {!factor && !challengeOnly && (
        <button disabled={busy} onClick={enroll}>
          Set up authenticator
        </button>
      )}
      {secret && (
        <>
          <p>Authenticator account: Bible Diaries</p>
          <label>
            Manual setup key
            <input readOnly value={secret} autoComplete="off" />
          </label>
          <p>Do not photograph or send this key to support.</p>
        </>
      )}
      {factor && (
        <form onSubmit={verify}>
          <label>
            Six-digit authenticator code
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              pattern="[0-9]{6}"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          </label>
          <button disabled={busy || code.length !== 6}>
            {busy ? "Verifying…" : "Verify authenticator"}
          </button>
        </form>
      )}
      <p role="status">{message}</p>
      {challengeOnly && (
        <button onClick={() => supabase.auth.signOut({ scope: "local" })}>
          Sign out
        </button>
      )}
    </section>
  );
}
