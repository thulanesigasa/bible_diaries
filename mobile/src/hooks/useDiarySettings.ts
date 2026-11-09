import { useEffect, useState, useCallback, useRef } from "react";
import { DeviceEventEmitter } from "react-native";
import { useApp } from "../../app/_layout";
import { DEFAULT_SETTINGS } from "../../../shared/diary-settings.mjs";
export function useDiarySettings() {
  const { user, supabase } = useApp();
  const [settings, setSettings] = useState<any>({ ...DEFAULT_SETTINGS }),
    [error, setError] = useState(""),
    [readyFor, setReadyFor] = useState("");
  const owner = useRef(user?.id);
  owner.current = user?.id;
  const reload = useCallback(async () => {
    if (!user) return;
    const requested = user.id;
    const { data, error } = await supabase
      .from("diary_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (owner.current !== requested) return;
    if (error) {
      setError("Settings could not load. Please retry.");
      return;
    }
    setReadyFor(requested);
    setError("");
    setSettings({ ...DEFAULT_SETTINGS, ...data });
  }, [user?.id, supabase]);
  useEffect(() => {
    void reload();
  }, [reload]);
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener("diary-settings-changed", (event) => {
      if (event.userId === owner.current) setSettings((current: any) => ({ ...current, ...event.patch }));
    });
    return () => subscription.remove();
  }, []);
  const save = async (patch: any) => {
    if (!user?.id || readyFor !== user.id) throw new Error("Wait for your settings to load before making changes.");
    const requested = user.id;
    const next = { ...settings, ...patch };
    const { error } = await supabase
      .from("diary_settings")
      .upsert({ ...next, user_id: user.id });
    if (error) throw new Error("Could not save settings. Please retry.");
    if (owner.current !== requested) return;
    setSettings(next);
    DeviceEventEmitter.emit("diary-settings-changed", { userId: requested, patch });
  };
  return { settings, save, error, reload, ready: readyFor === user?.id };
}
