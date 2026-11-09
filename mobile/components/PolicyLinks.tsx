import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import {
  ShieldCheck,
  FileText,
  Users,
  ChevronRight,
  ShieldAlert,
} from "lucide-react-native";
const rows = [
  [
    "privacy",
    "Privacy Policy",
    "What is collected, how it is used and your choices",
    ShieldCheck,
  ],
  [
    "terms",
    "Terms of Use",
    "Eligibility, accounts, ownership and responsibilities",
    FileText,
  ],
  [
    "community",
    "Community Expectations",
    "Respectful participation and personal boundaries",
    Users,
  ],
  [
    "child-safety",
    "Child Safety Standards",
    "Protection, reporting and guardian permissions",
    ShieldAlert,
  ],
] as const;
export default function PolicyLinks() {
  const router = useRouter();
  return (
    <View>
      {rows.map(([id, title, hint, Icon]) => (
        <TouchableOpacity
          key={id}
          accessibilityRole="button"
          accessibilityLabel={`Read ${title}`}
          style={s.row}
          onPress={() => router.push(`/policies/${id}` as any)}
        >
          <Icon size={20} color="#0369a1" />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.title}>{title}</Text>
            <Text style={s.hint}>{hint}</Text>
          </View>
          <ChevronRight size={17} color="#94a3b8" />
        </TouchableOpacity>
      ))}
    </View>
  );
}
const s = StyleSheet.create({
  row: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#dbe4ed",
  },
  title: { fontSize: 14, fontWeight: "600", color: "#172033" },
  hint: { fontSize: 12, lineHeight: 18, color: "#64748b" },
});
