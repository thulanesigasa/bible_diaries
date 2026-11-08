import React, { useCallback, useState } from "react";
import { TouchableOpacity, Text } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useApp } from "../app/_layout";
import { useDiarySettings } from "../src/hooks/useDiarySettings";
import { isQuietTime } from "../../shared/diary-settings.mjs";
export default function ActivityShortcut() {
  const { user, supabase, accent } = useApp(),
    router = useRouter(),
    { settings } = useDiarySettings();
  const [count, setCount] = useState(0),
    [now, setNow] = useState(new Date());
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = () =>
        supabase
          .from("diary_activity")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", user?.id)
          .is("read_at", null)
          .then(({ count, error }: any) => {
            if (active && !error) {
              setCount(count || 0);
              setNow(new Date());
            }
          });
      void load();
      const timer = setInterval(load, 60000);
      return () => {
        active = false;
        clearInterval(timer);
      };
    }, [user?.id, supabase]),
  );
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={() => router.push("/activity")}
      style={{
        padding: 20,
        borderBottomWidth: 1,
        borderColor: "#e2e8f0",
        backgroundColor: "white",
        gap: 5,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: "700", color: accent }}>
        Activity & Notifications{" "}
        {!isQuietTime(settings, now) && count > 0 ? `(${count})` : " "} ›
      </Text>
      <Text>Likes, comments, shares, saved reflections and new posts</Text>
    </TouchableOpacity>
  );
}
