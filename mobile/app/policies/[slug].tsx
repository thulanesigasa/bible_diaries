import React from "react";
import { useApp } from "../_layout";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { APP_POLICIES } from "../../../shared/app-policy-content.mjs";
import { CHILD_SAFETY_SECTIONS } from "../../../shared/child-safety.mjs";
export default function Policy() {
  const { accent: appAccent } = useApp();
  const { slug, theme } = useLocalSearchParams<{ slug: string; theme?: string }>(),
    accent = theme === "pink" ? "#EC4899" : theme === "blue" ? "#0EA5E9" : appAccent,
    policy = APP_POLICIES.find((p: any) => p.id === slug),
    child = slug === "child-safety",
    title = child
      ? "Child Safety Standards"
      : policy?.title || "Policy unavailable",
    sections = child ? CHILD_SAFETY_SECTIONS : policy?.sections || [];
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.page}>
      <Stack.Screen
        options={{
          title,
          headerShown: true,
          headerTitleStyle: { fontSize: 17, fontWeight: "600" },
          headerTintColor: accent,
          headerLargeTitle: false,
          headerShadowVisible: false,
        }}
      />
      <Text style={s.intro}>
        {policy?.intro ||
          "Protection, practical boundaries and reporting options for younger members."}
      </Text>
      <Text style={s.date}>Reviewed 9 November 2026</Text>
      {sections.map(([heading, body]: string[]) => (
        <View key={heading} style={s.section}>
          <Text accessibilityRole="header" style={s.heading}>
            {heading}
          </Text>
          <Text style={s.text}>{body}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  page: {
    padding: 22,
    paddingBottom: 50,
    gap: 22,
    maxWidth: 760,
    width: "100%",
    alignSelf: "center",
  },
  intro: { fontSize: 14, lineHeight: 23, color: "#475569" },
  date: { fontSize: 12, color: "#94a3b8" },
  section: { gap: 8 },
  heading: { fontSize: 15, fontWeight: "600", color: "#172033" },
  text: { fontSize: 14, lineHeight: 24, color: "#526175" },
});
