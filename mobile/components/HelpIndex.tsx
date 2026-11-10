import React from "react";
import { useApp } from "../app/_layout";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ChevronRight, LifeBuoy, ShieldCheck, BookOpen } from "lucide-react-native";
import { HELP_GROUPS } from "../../shared/help-content.mjs";
export default function HelpIndex() {
  const router = useRouter();
  const { accent } = useApp();
  return (
    <View style={{ gap: 20 }}>
      <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/help/discover' as any)} style={{padding:22,backgroundColor:`${accent}09`,borderLeftWidth:2,borderLeftColor:accent,gap:12}}>
        <BookOpen size={26} color={accent}/><Text style={{fontSize:21,fontWeight:'700',color:'#172033'}}>Discover Bible Diaries</Text><Text style={s.hint}>Your words, your choices and your everyday journey. Explore the feature tour, privacy choices and practical guides.</Text><Text style={{fontSize:13,fontWeight:'600',color:accent}}>Take a look inside →</Text>
      </TouchableOpacity>
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
                <LifeBuoy size={20} color={accent} />
              ) : (
                <ShieldCheck size={20} color={accent} />
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
