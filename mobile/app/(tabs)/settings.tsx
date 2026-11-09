import React from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import {
  UserRound,
  Trophy,
  Type,
  LockKeyhole,
  ShieldCheck,
  Bell,
  Moon,
  Bookmark,
  UserRoundX,
  Download,
  MonitorSmartphone,
  CircleHelp,
  FileText,
  ClipboardCheck,
  ChevronRight,
  LogOut,
  Users,
} from "lucide-react-native";
import { useApp } from "../_layout";
import Avatar from "../../components/Avatar";
import { SETTINGS_GROUPS } from "../../../shared/diary-settings.mjs";
import { SETTINGS_SECTIONS } from "../../../shared/settings-presentation.mjs";
const icons: Record<string, any> = {
  account: UserRound,
  achievements: Trophy,
  reading: Type,
  privacy: LockKeyhole,
  security: ShieldCheck,
  notifications: Bell,
  quiet: Moon,
  saved: Bookmark,
  blocked: UserRoundX,
  data: Download,
  sessions: MonitorSmartphone,
  support: CircleHelp,
  legal: FileText,
};
export default function Settings() {
  const { user, profile, accent, supabase, showToast } = useApp(),
    router = useRouter();
  const row = (
    key: string,
    title: string,
    description: string,
    Icon: any,
    href: string,
  ) => (
    <TouchableOpacity
      key={key}
      accessibilityRole="button"
      onPress={() => router.push(href as any)}
      style={s.row}
    >
      <Icon size={21} strokeWidth={1.7} color={accent} />
      <View style={s.copy}>
        <Text style={s.label}>{title}</Text>
        <Text style={s.hint}>{description}</Text>
      </View>
      <ChevronRight size={17} color="#94a3b8" />
    </TouchableOpacity>
  );
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.page}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Edit personal details"
        style={s.profile}
        onPress={() => router.push("/settings/account")}
      >
        <Avatar
          size={52}
          src={profile?.avatar_url}
          fullName={profile?.full_name}
          email={user?.email}
        />
        <View style={s.copy}>
          <Text style={s.name}>
            {profile?.full_name || "Your Bible Diaries"}
          </Text>
          <Text style={s.hint}>{user?.email}</Text>
          <Text style={[s.edit, { color: accent }]}>Edit your profile</Text>
        </View>
        <ChevronRight size={18} color="#94a3b8" />
      </TouchableOpacity>
      {row(
        "safety",
        "Safety & reports",
        "Raise concerns and track outcomes",
        ShieldCheck,
        "/safety",
      )}
      {row(
        "guardian",
        "Guardian permissions",
        "Approve or withdraw a child’s participation",
        Users,
        "/guardian",
      )}
      {row(
        "reviews",
        "My reviews & appeals",
        "Held posts, decisions and appeals",
        ClipboardCheck,
        "/reviews",
      )}
      {SETTINGS_SECTIONS.map(([heading, keys]: any) => (
        <View key={heading} style={s.group}>
          <Text style={s.groupTitle}>{heading}</Text>
          {keys.map((key: string) => {
            const item = SETTINGS_GROUPS.find((x: string[]) => x[0] === key);
            return item
              ? row(
                  key,
                  item[1],
                  item[2],
                  icons[key],
                  key === "achievements" ? "/achievements" : `/settings/${key}`,
                )
              : null;
          })}
        </View>
      ))}
      <TouchableOpacity
        accessibilityRole="button"
        style={s.row}
        onPress={async () => {
          const { error } = await supabase.auth.signOut({ scope: "local" });
          if (error) showToast("Could not sign out. Please retry.", "error");
        }}
      >
        <LogOut size={21} color="#64748b" />
        <Text style={s.label}>Sign out</Text>
      </TouchableOpacity>
      <Text style={s.footer}>Bible Diaries · Your walk. Your words.</Text>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  screen: { backgroundColor: "#fff" },
  page: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 110 },
  profile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 18,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderColor: "#edf1f5",
  },
  name: { fontSize: 17, fontWeight: "600", color: "#172033" },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  edit: { fontSize: 12, marginTop: 2 },
  group: { marginTop: 14 },
  groupTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    paddingTop: 8,
    paddingBottom: 5,
    paddingLeft: 35,
  },
  row: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#edf1f5",
  },
  label: { fontSize: 15, fontWeight: "500", color: "#172033" },
  hint: { fontSize: 12, lineHeight: 17, color: "#64748b" },
  footer: {
    fontSize: 11,
    textAlign: "center",
    color: "#94a3b8",
    paddingTop: 25,
  },
});
