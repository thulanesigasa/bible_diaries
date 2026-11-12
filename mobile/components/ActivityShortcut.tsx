import {useActivityNotifications} from './ActivityNotifications';
import React from "react";
import { TouchableOpacity, Text } from "react-native";
import { useRouter } from "expo-router";
import { useApp } from "../app/_layout";
export default function ActivityShortcut() {
  const { accent }=useApp(),router=useRouter();
  const {count,error}=useActivityNotifications();
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
        {count > 0 ? `(${count})` : " "} ›
      </Text>
      <Text>{error?"Activity is temporarily unavailable. Open to retry.":"Likes, comments, shares, saved reflections and new posts"}</Text>
    </TouchableOpacity>
  );
}
