"use client";
import { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { REPORT_REASONS } from "../../shared/launch-safety.mjs";
export default function ReportButton({ kind, id, privateContext = false }) {
  const [open, setOpen] = useState(false),
    [reason, setReason] = useState(""),
    [details, setDetails] = useState(""),
    [share, setShare] = useState(false),
    [block, setBlock] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const pending = useRef(false),
    dialog = useRef(null),
    trigger = useRef(null);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else if (dialog.current?.open) {
      dialog.current.close();
      trigger.current?.focus();
    }
  }, [open]);
  async function submit(e) {
    e.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("submit_safety_report", {
        target_kind: kind,
        target_id: id,
        reason,
        details,
        share_private: share,
        also_block: block,
      });
      if (error) throw error;
      setMessage(
        data.duplicate
          ? "This item has already been reported. Check Safety & reports for updates."
          : "Report received. Check Safety & reports for updates. This is not an emergency service.",
      );
      setReason("");
      setDetails("");
      setShare(false);
      setBlock(false);
    } catch (e) {
      setMessage(e.message || "Report was not confirmed. Retry.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <button
        type="button"
        ref={trigger}
        className="launch-report-button"
        onClick={() => {
          setMessage("");
          setOpen(true);
        }}
      >
        Report{" "}
        {kind === "chats"
          ? "message"
          : kind === "profiles"
            ? "member"
            : kind === "comments"
              ? "comment"
              : "reflection"}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={`report-${kind}-${id}`}
        style={{
          maxWidth: 620,
          width: "calc(100% - 32px)",
          maxHeight: "90vh",
          padding: 0,
          border: 0,
          borderRadius: 16,
        }}
        onCancel={(e) => {
          if (busy) e.preventDefault();
          else setOpen(false);
        }}
      >
        <div className="launch-panel" style={{ margin: 0, border: 0 }}>
          <h2 id={`report-${kind}-${id}`}>Raise a concern</h2>
          <p>
            Choose the closest reason. Include only relevant details. Do not
            send passwords, identification documents or unrelated personal
            information. Seek local emergency help for immediate danger.
          </p>
          <form onSubmit={submit}>
            <label>
              Reason
              <select
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                <option value="">Choose a reason</option>
                {REPORT_REASONS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Additional context (optional, maximum 1,000 characters)
              <textarea
                maxLength={1000}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </label>
            {privateContext && (
              <label className="launch-check">
                <input
                  type="checkbox"
                  required
                  checked={share}
                  onChange={(e) => setShare(e.target.checked)}
                />
                Share this message with designated safety reviewers. Ordinary
                moderators cannot access it through this report.
              </label>
            )}
            <label className="launch-check">
              <input
                type="checkbox"
                checked={block}
                onChange={(e) => setBlock(e.target.checked)}
              />
              Also block this account. An anonymous author’s identity stays
              hidden.
            </label>
            <button disabled={busy || !reason || (privateContext && !share)}>
              {busy ? "Submitting…" : "Submit report"}
            </button>
          </form>
          {!!message && <p role="status">{message}</p>}
          <button disabled={busy} onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      </dialog>
    </>
  );
}
