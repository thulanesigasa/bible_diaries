import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useApp } from "../app/_layout";
import { ACHIEVEMENTS } from "../../shared/diary-settings.mjs";
export default function Achievements() {
  const { user, supabase, accent } = useApp();
  const [earned, setEarned] = useState<any[]>([]),
    [progress, setProgress] = useState<any>({}),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    setError("");
    const [a, p] = await Promise.all([
      supabase.from("diary_achievements").select("*").eq("user_id", user?.id),
      supabase.rpc("my_diary_progress"),
    ]);
    if (a.error || p.error) {
      setError("Achievements could not load. Retry when connected.");
      return;
    }
    setEarned(a.data || []);
    setProgress(p.data || {});
    const ids = (a.data || [])
      .filter((x: any) => !x.seen_at)
      .map((x: any) => x.achievement_id);
    if (ids.length)
      await supabase
        .from("diary_achievements")
        .update({ seen_at: new Date().toISOString() })
        .eq("user_id", user?.id)
        .in("achievement_id", ids);
  }, [user?.id, supabase]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  return (
    <ScrollView contentContainerStyle={s.page}>
      <Text style={s.title}>Your achievements</Text>
      <Text>
        Personal milestones in reflection and encouragement. These are not a
        measure of anyone’s faith.
      </Text>
      {error ? (
        <>
          <Text accessibilityLiveRegion="polite">{error}</Text>
          <TouchableOpacity onPress={load}>
            <Text style={{ color: accent }}>Retry</Text>
          </TouchableOpacity>
        </>
      ) : null}
      {ACHIEVEMENTS.map((a: any) => {
        const entry = earned.find((e) => e.achievement_id === a.id),
          count = Math.min(progress[a.category] || 0, a.target);
        return (
          <View key={a.id} style={s.item}>
            <Text style={[s.name, { color: entry ? accent : "#0f172a" }]}>
              {entry ? "✓ " : ""}
              {a.title}
            </Text>
            <Text>
              {entry
                ? `Earned ${new Date(entry.earned_at).toLocaleDateString()}`
                : `${count} / ${a.target} ${a.category}`}
            </Text>
            <View
              accessibilityLabel={`${count} of ${a.target}`}
              style={s.track}
            >
              <View
                style={{
                  height: 4,
                  width: `${entry ? 100 : (count / a.target) * 100}%`,
                  backgroundColor: accent,
                }}
              />
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  page: { padding: 24, gap: 16, paddingBottom: 100 },
  title: { fontSize: 28, fontWeight: "700", color: "#0f172a" },
  item: {
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
    gap: 8,
  },
  name: { fontSize: 18, fontWeight: "600" },
  track: { height: 4, backgroundColor: "#e2e8f0", marginTop: 5 },
});
