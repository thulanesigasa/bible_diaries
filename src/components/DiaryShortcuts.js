"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useApp } from "../app/AppWrapper";
import { useDiarySettings } from "../lib/diary-settings";
import { isQuietTime } from "../../shared/diary-settings.mjs";
export function AchievementBell() {
  const { user } = useApp();
  const [count, setCount] = useState(0);
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user) return;
      const r = await supabase
        .from("diary_achievements")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("seen_at", null);
      if (active && !r.error) setCount(r.count || 0);
    };
    void load();
    window.addEventListener("focus", load);
    return () => {
      active = false;
      window.removeEventListener("focus", load);
    };
  }, [user]);
  return (
    <Link
      href="/settings/achievements"
      aria-label={`Achievements, ${count} new milestones`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: 10,
      }}
    >
      <Bell size={23} />
      {count > 0 && <span>{count}</span>}
    </Link>
  );
}
export function ActivityShortcut() {
  const { user } = useApp(),
    { settings } = useDiarySettings(user?.id);
  const [count, setCount] = useState(0),
    [now, setNow] = useState(new Date());
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user) return;
      const r = await supabase
        .from("diary_activity")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .is("read_at", null);
      if (active && !r.error) {
        setCount(r.count || 0);
        setNow(new Date());
      }
    };
    void load();
    const timer = setInterval(load, 60000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [user]);
  return (
    <Link
      href="/activity"
      style={{
        display: "block",
        padding: 16,
        color: "var(--gold-accent)",
        fontWeight: 600,
      }}
    >
      Activity & Notifications{" "}
      {!isQuietTime(settings, now) && count > 0 ? `(${count})` : ""} →
    </Link>
  );
}
