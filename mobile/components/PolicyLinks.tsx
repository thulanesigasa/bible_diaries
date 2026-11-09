import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { APP_POLICIES } from "../../shared/app-policy-content.mjs";
import { CHILD_SAFETY_SECTIONS } from "../../shared/child-safety.mjs";
const links = [
  ["Terms", "terms"],
  ["Privacy notice", "privacy"],
  ["Community standards", "community"],
  ["Child safety", "child-safety"],
];
export default function PolicyLinks() {
  const [selected, setSelected] = useState("");
  const policy = APP_POLICIES.find((p: any) => p.id === selected);
  const title = policy?.title || "Child safety standards";
  const sections =
    selected === "child-safety"
      ? CHILD_SAFETY_SECTIONS
      : policy?.sections || [];
  return (
    <View style={{ gap: 4 }}>
      {links.map(([label, id]) => (
        <TouchableOpacity
          key={id}
          accessibilityRole="button"
          accessibilityLabel={`Read ${label}`}
          style={s.link}
          onPress={() => setSelected(id)}
        >
          <Text style={s.linkText}>{label}</Text>
        </TouchableOpacity>
      ))}
      <Modal
        visible={!!selected}
        animationType="slide"
        onRequestClose={() => setSelected("")}
      >
        <SafeAreaView style={s.screen}>
          <View style={s.header}>
            <Text accessibilityRole="header" style={s.title}>
              {title}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close policy"
              style={s.link}
              onPress={() => setSelected("")}
            >
              <Text style={s.linkText}>Done</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.page}>
            <Text style={s.text}>
              Reviewed 9 November 2026. Available here without opening a
              website.
            </Text>
            {sections.map(([heading, body]: string[]) => (
              <View key={heading} style={{ gap: 8 }}>
                <Text accessibilityRole="header" style={s.heading}>
                  {heading}
                </Text>
                <Text style={s.text}>{body}</Text>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
  },
  page: { padding: 20, paddingBottom: 48, gap: 24 },
  title: { fontSize: 18, fontWeight: "600", color: "#172033", flex: 1 },
  heading: { fontSize: 15, fontWeight: "600", color: "#172033" },
  text: { fontSize: 14, lineHeight: 23, color: "#475569" },
  link: { minWidth: 44, minHeight: 44, justifyContent: "center" },
  linkText: { fontSize: 14, color: "#0369a1" },
});
