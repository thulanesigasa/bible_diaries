"use client";
import { userError } from '../../shared/user-error.mjs';

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { GUARDIAN_DECLARATION } from "../../shared/launch-safety.mjs";
export default function SafetyCenter({ guardian = false }) {
  const [items, setItems] = useState([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [declared, setDeclared] = useState(false);
  async function load() {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc(
        guardian ? "guardian_requests" : "safety_report_list",
        guardian ? {} : { queue: false },
      );
      if (error) throw error;
      setItems(data || []);
      setError("");
    } catch (e) {
      setError(userError(e, "Could not load. Retry."));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    load();
  }, [guardian]);
  async function decide(item, approve) {
    if (busy || !declared) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("guardian_decide", {
        child_id: item.child_id,
        expected_version: item.version,
        approve,
        declaration: declared,
      });
      if (error) throw error;
      await load();
    } catch (e) {
      setError(userError(e, "Could not confirm. Refresh."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="launch-panel">
      <h1>{guardian ? "Guardian permissions" : "Safety & reports"}</h1>
      <p>
        {guardian
          ? "Use your own verified adult account and the email supplied by the child. Approval permits community participation, including public sharing and messaging. Withdrawal restricts future access and cannot recall existing copies. Email verification does not prove legal guardianship."
          : "Report a reflection, comment, message or member from its Report button. Child exploitation, grooming, sexual content involving children, threats and scams are prohibited. Report outcomes appear below. Support is not continuously monitored as an emergency service."}
      </p>
      <p>
        <Link href="/child-safety">Child safety standards</Link> ·{" "}
        <Link href="/privacy">Privacy</Link> ·{" "}
        <Link href="/account-deletion">Deletion</Link>
      </p>
      {guardian && (
        <label className="launch-check">
          <input
            type="checkbox"
            checked={declared}
            onChange={(e) => setDeclared(e.target.checked)}
          />
          {GUARDIAN_DECLARATION}
        </label>
      )}
      <button onClick={load} disabled={busy}>
        {busy ? "Loading…" : "Refresh"}
      </button>
      {!!error && <p role="alert">{error}</p>}
      {!busy && !error && !items.length && (
        <p>
          {guardian
            ? "No requests are addressed to this verified email."
            : "You have not submitted reports."}
        </p>
      )}
      {items.map((item) => (
        <article key={item.id || item.child_id}>
          <h2>
            {guardian
              ? [item.first_name, item.surname].filter(Boolean).join(" ")
              : `${item.target_kind} · ${item.reason.replaceAll("_", " ")}`}
          </h2>
          <p>Status: {item.guardian_status || item.status}</p>
          <p>{item.resolution}</p>
          {guardian && (
            <>
              <button
                disabled={busy || !declared}
                onClick={() => decide(item, true)}
              >
                Approve participation
              </button>{" "}
              <button
                disabled={busy || !declared}
                onClick={() => decide(item, false)}
              >
                Withdraw or decline permission
              </button>
            </>
          )}
        </article>
      ))}
      <p>
        For immediate danger, contact local emergency services or a trusted
        person able to help.
      </p>
      <a href="mailto:support@ts-industries.com?subject=Bible%20Diaries%20safety%20concern">
        Contact safety support
      </a>
    </main>
  );
}
