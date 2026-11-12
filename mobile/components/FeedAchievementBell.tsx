import React, { useCallback, useState } from "react";
import { TouchableOpacity, View, Text } from "react-native";
import { Trophy } from "lucide-react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useApp } from "../app/_layout";
export default function FeedAchievementBell() {
  const { user, supabase, accent } = useApp(),
    router = useRouter();
  const [count, setCount] = useState(0);
  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      let active = true;
      supabase
        .from("diary_achievements")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user?.id)
        .is("seen_at", null)
        .then(({ count, error }: any) => {
          if (active && !error) setCount(count || 0);
        });
      return () => {
        active = false;
      };
    }, [user?.id, supabase]),
  );
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Achievements, ${count} new milestones`}
      onPress={() => router.push("/achievements")}
      style={{ padding: 12, marginRight: 8 }}
    >
      <Trophy color={accent} size={23} />
      {count > 0 && (
        <View
          style={{
            position: "absolute",
            right: 4,
            top: 3,
            backgroundColor: "#db2777",
            borderRadius: 12,
            paddingHorizontal: 4,
          }}
        >
          <Text style={{ fontSize: 10, color: "#fff" }}>
            {count > 9 ? "9+" : count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
