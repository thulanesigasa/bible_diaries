import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ChevronRight, LifeBuoy, ShieldCheck } from "lucide-react-native";
import { HELP_GROUPS } from "../../shared/help-content.mjs";
export default function HelpIndex() {
  const router = useRouter();
  return (
    <View style={{ gap: 20 }}>
      <Text style={s.intro}>
        Choose a guide for practical steps, privacy choices and safety
        information. Each guide opens on a separate screen.
      </Text>
      {HELP_GROUPS.map(([title, rows]: any, index: number) => (
        <View key={title}>
          <Text style={s.group}>{title}</Text>
          {rows.map(([slug, label, hint]: string[]) => (
            <TouchableOpacity
              key={slug}
              accessibilityRole="button"
              style={s.row}
              onPress={() => router.push(`/help/${slug}` as any)}
            >
              {index === 0 ? (
                <LifeBuoy size={20} color="#0369a1" />
              ) : (
                <ShieldCheck size={20} color="#0369a1" />
              )}
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.title}>{label}</Text>
                <Text style={s.hint}>{hint}</Text>
              </View>
              <ChevronRight size={17} color="#94a3b8" />
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
}
const s = StyleSheet.create({
  intro: { fontSize: 13, lineHeight: 21, color: "#64748b" },
  group: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    paddingVertical: 8,
  },
  row: {
    minHeight: 72,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#dbe4ed",
  },
  title: { fontSize: 14, fontWeight: "600", color: "#172033" },
  hint: { fontSize: 12, lineHeight: 18, color: "#64748b" },
});
