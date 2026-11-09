"use client";
import { useState, useEffect, useRef } from "react";
export default function SafetyReports() {
  const [items, setItems] = useState([]),
    [notes, setNotes] = useState({}),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const pending = useRef(false);
  async function load() {
    setBusy(true);
    try {
      const r = await fetch("/api/moderation/reports", {
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setItems(d.items);
      setMessage("");
    } catch (e) {
      setMessage(e.message || "Could not load reports.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function act(item, action) {
    if (pending.current) return;
    if ((notes[item.id] || "").trim().length < 5) {
      setMessage("Write a clear reason before taking action.");
      return;
    }
    if (
      action === "restricted" &&
      !window.confirm(
        "Restrict this account and revoke its sessions? The decision is audited.",
      )
    )
      return;
    pending.current = true;
    setBusy(true);
    try {
      const r = await fetch("/api/moderation/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          report_id: item.id,
          expected_version: item.version,
          action,
          note: notes[item.id],
        }),
        signal: AbortSignal.timeout(20000),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      await load();
      setMessage("Report action recorded.");
    } catch (e) {
      setMessage(e.message || "Action not confirmed. Refresh.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <section>
      <h2>Member safety reports</h2>
      <p>
        Child-safety reports are prioritised. Private messages are visible only
        to safety reviewers, with the reporting participant’s explicit consent.
        Queue access and decisions are audited. Escalated reports stay open
        until a final decision.
      </p>
      <p>
        Suspected child exploitation: minimise access, do not download or
        forward illegal material, record factual references and follow the
        child-safety escalation procedure. Escalating here does not
        automatically contact authorities.
      </p>
      <button className="button small" disabled={busy} onClick={load}>
        Refresh reports
      </button>
      <p role="status">{message}</p>
      {!busy && !items.length && <p>No reports await your review.</p>}
      {items.map((item) => (
        <article className="moderation-card" key={item.id}>
          <h3>
            {item.reason.replaceAll("_", " ")} · {item.target_kind}
          </h3>
          <p>
            {item.status} · {new Date(item.created_at).toLocaleString()}{" "}
            {item.private_context ? "· Restricted private context" : ""}
          </p>
          <h4>Reported text</h4>
          <pre>{item.reported_text || "Content is no longer available."}</pre>
          <h4>Reporter’s context</h4>
          <p>{item.details || "No additional context."}</p>
          <label htmlFor={`report-note-${item.id}`}>
            Decision reason (visible to reporter)
          </label>
          <textarea
            id={`report-note-${item.id}`}
            maxLength={500}
            value={notes[item.id] || ""}
            onChange={(e) => setNotes({ ...notes, [item.id]: e.target.value })}
          />
          <div className="actions">
            {[
              ["dismissed", "Dismiss"],
              ["removed", "Remove content"],
              ["escalated", "Escalate"],
              ["restricted", "Restrict account"],
            ].map(([value, label]) => (
              <button
                className="button outline small"
                key={value}
                disabled={busy || (notes[item.id] || "").trim().length < 5}
                onClick={() => act(item, value)}
              >
                {label}
              </button>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}
