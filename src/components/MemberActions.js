"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../app/AppWrapper";
import { supabase } from "../lib/supabase";
export default function MemberActions({ targetId }) {
  const { user, showToast } = useApp(),
    router = useRouter();
  const [following, setFollowing] = useState(false),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!user || !targetId) return;
    let active = true;
    supabase
      .from("reflection_subscriptions")
      .select("author_id")
      .eq("user_id", user.id)
      .eq("author_id", targetId)
      .maybeSingle()
      .then((r) => {
        if (active && !r.error) setFollowing(!!r.data);
      });
    return () => {
      active = false;
    };
  }, [user, targetId]);
  if (!user || !targetId || user.id === targetId) return null;
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", padding: 16 }}>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const r = following
            ? await supabase
                .from("reflection_subscriptions")
                .delete()
                .eq("user_id", user.id)
                .eq("author_id", targetId)
            : await supabase
                .from("reflection_subscriptions")
                .insert({ user_id: user.id, author_id: targetId });
          setBusy(false);
          if (r.error)
            showToast("Could not update post notifications.", "error");
          else setFollowing(!following);
        }}
      >
        {following
          ? "Stop new-post notifications"
          : "Notify me about new posts"}
      </button>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const r = await supabase
            .from("blocked_accounts")
            .insert({ user_id: user.id, blocked_user_id: targetId });
          setBusy(false);
          if (r.error) showToast("Could not block account.", "error");
          else {
            showToast("Account blocked.");
            router.push("/connect");
          }
        }}
      >
        Block account
      </button>
    </div>
  );
}
