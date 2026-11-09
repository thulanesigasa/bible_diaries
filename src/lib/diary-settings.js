"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "./supabase";
import { DEFAULT_SETTINGS } from "../../shared/diary-settings.mjs";
export function useDiarySettings(userId) {
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS }),
    [error, setError] = useState(""),
    [readyFor, setReadyFor] = useState("");
  const owner = useRef(userId);
  owner.current = userId;
  const reload = useCallback(async () => {
    if (!userId) return;
    const requested = userId;
    const r = await supabase
      .from("diary_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (owner.current !== requested) return;
    if (r.error) {
      setError("Settings could not load. Please retry.");
      return;
    }
    setReadyFor(requested);
    setError("");
    setSettings({ ...DEFAULT_SETTINGS, ...r.data });
  }, [userId]);
  useEffect(() => {
    void reload();
  }, [reload]);
  const save = async (patch) => {
    if (!userId || readyFor !== userId) throw Error("Wait for your settings to load before making changes.");
    const requested = userId;
    const next = { ...settings, ...patch };
    const r = await supabase
      .from("diary_settings")
      .upsert({ ...next, user_id: userId });
    if (r.error) throw Error("Could not save preferences.");
    if (owner.current !== requested) return;
    setSettings(next);
    window.dispatchEvent(new Event("diary-settings-changed"));
  };
  return { settings, error, save, reload, ready: readyFor === userId };
}
