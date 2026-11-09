import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  StyleSheet,
} from "react-native";
import { supabase } from "../src/lib/supabase";
import { GUARDIAN_DECLARATION } from "../../shared/launch-safety.mjs";
export default function SafetyCenter({
  guardian = false,
}: {
  guardian?: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [declared, setDeclared] = useState(false);
  async function load() {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc(
        guardian ? "guardian_requests" : "safety_report_list",
        guardian ? {} : { queue: false },
      );
      if (error) throw error;
      setItems(data || []);
      setError("");
    } catch (e: any) {
      setError(e.message || "Could not load. Retry.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    load();
  }, [guardian]);
  async function decide(item: any, approve: boolean) {
    if (busy || !declared) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("guardian_decide", {
        child_id: item.child_id,
        expected_version: item.version,
        approve,
        declaration: declared,
      });
      if (error) throw error;
      await load();
    } catch (e: any) {
      setError(e.message || "Could not confirm decision. Refresh.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#fff" }}
      contentContainerStyle={s.page}
    >
      <Text style={s.title} accessibilityRole="header">
        {guardian ? "Guardian permissions" : "Safety & reports"}
      </Text>
      <Text style={s.text}>
        {guardian
          ? "Use your own adult account and the confirmed email supplied by the child. Approval permits community participation, including sharing reflections and messaging. Withdrawing permission restricts access; it cannot recall copies already shared. Email verification confirms control of an address, not legal guardianship."
          : "Use Report on a reflection, comment, message or member profile. Child exploitation, grooming, sexual content involving children, threats and scams are prohibited. Report outcomes appear below. We cannot guarantee a response time or continuous monitoring."}
      </Text>
      {[
        ["Safety guide", "/help/safety"],
        ["Reporting & blocking", "/help/reporting"],
        ["Children & guardians", "/help/guardians"],
        ["Privacy notice", "/policies/privacy"],
        ["Account deletion", "/help/privacy"],
      ].map(([label, path]) => (
        <TouchableOpacity
          key={path}
          accessibilityRole="button"
          style={s.link}
          onPress={() => router.push(path as any)}
        >
          <Text style={{ color: "#0369a1" }}>{label} →</Text>
        </TouchableOpacity>
      ))}
      {guardian && (
        <TouchableOpacity
          accessibilityRole="checkbox"
          accessibilityState={{ checked: declared }}
          style={s.card}
          onPress={() => setDeclared(!declared)}
        >
          <Text style={s.text}>
            {declared ? "☑" : "☐"} {GUARDIAN_DECLARATION}
          </Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        accessibilityRole="button"
        style={s.link}
        disabled={busy}
        onPress={load}
      >
        <Text style={{ color: "#0369a1" }}>
          {busy ? "Loading…" : "Refresh"}
        </Text>
      </TouchableOpacity>
      {!!error && (
        <Text accessibilityRole="alert" style={{ color: "#b91c1c" }}>
          {error}
        </Text>
      )}
      {!busy && !error && !items.length && (
        <Text style={s.text}>
          {guardian
            ? "No guardian requests are addressed to this verified email."
            : "You have not submitted any reports."}
        </Text>
      )}
      {items.map((item) => (
        <View key={item.id || item.child_id} style={s.card}>
          <Text style={s.heading}>
            {guardian
              ? [item.first_name, item.surname].filter(Boolean).join(" ")
              : `${item.target_kind} · ${item.reason.replaceAll("_", " ")}`}
          </Text>
          <Text style={s.text}>
            Status: {item.guardian_status || item.status}
          </Text>
          <Text style={s.text}>{item.resolution || ""}</Text>
          {guardian && (
            <View style={{ gap: 8 }}>
              <TouchableOpacity
                accessibilityRole="button"
                disabled={busy || !declared}
                style={s.link}
                onPress={() => decide(item, true)}
              >
                <Text style={{ color: "#0369a1" }}>Approve participation</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                disabled={busy || !declared}
                style={s.link}
                onPress={() => decide(item, false)}
              >
                <Text style={{ color: "#b91c1c" }}>
                  Withdraw or decline permission
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}
      <TouchableOpacity
        accessibilityRole="link"
        style={s.link}
        onPress={() =>
          Linking.openURL(
            "mailto:support@ts-industries.com?subject=Bible%20Diaries%20safety%20concern",
          )
        }
      >
        <Text style={{ color: "#0369a1" }}>Contact safety support</Text>
      </TouchableOpacity>
      <Text style={s.text}>
        For immediate danger, contact local emergency services or a trusted
        person who can help. Support is not an emergency service.
      </Text>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  page: { padding: 20, gap: 14, paddingBottom: 50 },
  title: { fontSize: 22, fontWeight: "700", color: "#172033" },
  heading: { fontSize: 15, fontWeight: "600", color: "#172033" },
  text: { fontSize: 14, lineHeight: 22, color: "#475569" },
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 0,
    gap: 10,
  },
  link: { minHeight: 44, justifyContent: "center" },
});
