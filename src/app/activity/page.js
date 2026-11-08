"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { useApp } from "../AppWrapper";
import { ACTIVITY_LABELS } from "../../../shared/diary-settings.mjs";
export default function Activity() {
  const { user } = useApp();
  const [rows, setRows] = useState([]),
    [kind, setKind] = useState("all"),
    [error, setError] = useState(""),
    [more, setMore] = useState(true),
    [busy, setBusy] = useState(false);
  const load = useCallback(
    async (append = false) => {
      if (!user) return;
      setBusy(true);
      setError("");
      let q = supabase
        .from("diary_activity")
        .select("id,actor_id,post_id,kind,created_at,read_at")
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false });
      if (kind === "like") q = q.in("kind", ["like", "comment_like"]);
      else if (kind === "comment") q = q.in("kind", ["comment", "reply"]);
      else if (kind !== "all") q = q.eq("kind", kind);
      const offset = append ? rows.length : 0;
      const r = await q.range(offset, offset + 29);
      if (r.error) {
        setError("Activity could not load. Please retry.");
        setBusy(false);
        return;
      }
      const ids = [...new Set(r.data.map((x) => x.actor_id).filter(Boolean))];
      const p = ids.length
        ? await supabase.from("profiles").select("id,full_name").in("id", ids)
        : { data: [] };
      const names = Object.fromEntries(
        (p.data || []).map((x) => [x.id, x.full_name]),
      );
      const data = r.data.map((x) => ({
        ...x,
        name:
          x.kind === "bookmark"
            ? "Someone"
            : x.actor_id
              ? names[x.actor_id] || "A community member"
              : "An anonymous member",
      }));
      setRows((prev) => (append ? [...prev, ...data] : data));
      setMore(data.length === 30);
      setBusy(false);
    },
    [user, kind, rows.length],
  );
  useEffect(() => {
    void load(false);
    const timer=setInterval(()=>load(false),30000);
    return ()=>clearInterval(timer);
  }, [user, kind]);
  async function mark(id) {
    let q = supabase
      .from("diary_activity")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", user.id);
    q = id ? q.eq("id", id) : q.is("read_at", null);
    const r = await q;
    if (r.error) {
      setError("Could not mark activity as read.");
      return;
    }
    setRows((prev) =>
      prev.map((x) =>
        !id || x.id === id ? { ...x, read_at: new Date().toISOString() } : x,
      ),
    );
  }
  return (
    <main className="diary-settings">
      <h1>Activity & Notifications</h1>
      <p>
        Interactions with your reflections and new posts from authors you
        follow. Bookmark identities stay private.
      </p>
      <label>
        Show{" "}
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          {["all", "like", "comment", "bookmark", "share", "post"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
      <button disabled={busy} onClick={() => mark()}>
        Mark all as read
      </button>
      {error && (
        <p role="alert">
          {error} <button onClick={() => load(false)}>Retry</button>
        </p>
      )}
      {!busy && !rows.length && !error && <p>No activity yet.</p>}
      {rows.map((x) => (
        <Link
          key={x.id}
          className="diary-settings-row"
          href={`/post/${x.post_id}`}
          onClick={() => mark(x.id)}
        >
          <span style={{ fontWeight: x.read_at ? 400 : 700 }}>
            {x.name} {ACTIVITY_LABELS[x.kind]}.
          </span>
          <small>{new Date(x.created_at).toLocaleString()}</small>
        </Link>
      ))}
      {more && rows.length > 0 && (
        <button disabled={busy} onClick={() => load(true)}>
          Load more
        </button>
      )}
    </main>
  );
}
