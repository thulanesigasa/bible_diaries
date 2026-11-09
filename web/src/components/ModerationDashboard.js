"use client";
import SafetyReports from "./SafetyReports";
import { useEffect, useRef, useState } from "react";
import { suggestedRejection } from "../lib/rejection-reasons.mjs";
export default function ModerationDashboard({ email }) {
  const [items, setItems] = useState([]),
    [notes, setNotes] = useState({}),
    [reasonFor, setReasonFor] = useState(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const pending = useRef(false);
  async function load() {
    setBusy(true);
    try {
      const r = await fetch("/api/moderation/queue", {
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      });
      if (r.status === 401) {
        window.location.replace("/admin/moderation/login");
        return;
      }
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setItems(d.items);
    } catch (e) {
      setMessage(e.message || "Could not load the queue.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (!pending.current) load();
    }, 30000);
    return () => clearInterval(timer);
  }, []);
  async function decide(item, action) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/moderation/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission: item.id,
          expected_version: item.version,
          action,
          note:
            action === "approve"
              ? "Approved after administrator review."
              : notes[item.id] || "",
        }),
        signal: AbortSignal.timeout(20000),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setMessage(
        action === "approve"
          ? "Approved. The author has a system notification."
          : "Rejected. The reason was sent to the author’s system notifications.",
      );
      setReasonFor(null);
      await load();
    } catch (e) {
      setMessage(
        e.message || "Could not confirm the decision. Refresh before retrying.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function logout() {
    if (pending.current) return;
    pending.current = true;
    try {
      const r = await fetch("/api/moderation/logout", { method: "POST" });
      if (!r.ok) throw Error();
      window.location.assign("/");
    } catch {
      setMessage("Could not sign out. Retry.");
    } finally {
      pending.current = false;
    }
  }
  return (
    <>
      <div className="admin-heading">
        <div>
          <p className="kicker">BIBLE DIARIES / MAIN ADMIN</p>
          <h1>Flagged submissions</h1>
        </div>
        <div>
          <span>{email}</span> · <a href="/">Choose workspace</a>{" "}
          <button className="button small" onClick={logout} disabled={busy}>
            Sign out
          </button>
        </div>
      </div>
      <button className="button small" onClick={load} disabled={busy}>
        {busy ? "Working…" : "Refresh"}
      </button>
      <p role="status">{message}</p>
      {!busy && !items.length && <p>No submissions await review.</p>}
      {items.map((item) => (
        <section className="moderation-card" key={item.id}>
          <dl className="moderation-person">
            <div>
              <dt>Name</dt>
              <dd>{item.author?.first_name || "Restricted / not provided"}</dd>
            </div>
            <div>
              <dt>Surname</dt>
              <dd>{item.author?.surname || "Not provided"}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{item.author?.email || "Restricted"}</dd>
            </div>
          </dl>
          {item.private_content && (
            <p>
              Private text shared for restricted safety review. Account identity
              is withheld.
            </p>
          )}
          <h2>Flagged message</h2>
          {item.record?.title && (
            <p>
              <strong>{item.record.title}</strong>
            </p>
          )}
          {item.record?.scripture && <p>{item.record.scripture}</p>}
          <pre>
            {item.record?.content ||
              item.record?.message ||
              "No reviewable text is available."}
          </pre>
          {item.appeal_note && <p>Appeal: {item.appeal_note}</p>}
          <div className="actions">
            <button
              className="button outline small"
              disabled={busy}
              onClick={() => {
                setReasonFor(item.id);
                setNotes({
                  ...notes,
                  [item.id]: notes[item.id] || suggestedRejection(item),
                });
              }}
            >
              Reject
            </button>
            <button
              className="button small"
              disabled={busy}
              onClick={() => decide(item, "approve")}
            >
              Approve
            </button>
          </div>
          {reasonFor === item.id && (
            <div className="rejection-panel">
              <label htmlFor={`reason-${item.id}`}>Reason</label>
              <p className="fineprint">
                Suggested from the automated moderation findings. Check and edit
                it before sending; the checks can be wrong.
              </p>
              <textarea
                id={`reason-${item.id}`}
                maxLength={500}
                value={notes[item.id] || ""}
                onChange={(e) =>
                  setNotes({ ...notes, [item.id]: e.target.value })
                }
              />
              <button
                className="button small"
                disabled={busy || (notes[item.id] || "").trim().length < 5}
                onClick={() => decide(item, "reject")}
              >
                Confirm rejection and notify
              </button>{" "}
              <button disabled={busy} onClick={() => setReasonFor(null)}>
                Cancel
              </button>
            </div>
          )}
        </section>
      ))}
      <SafetyReports />
    </>
  );
}
