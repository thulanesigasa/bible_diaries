import React, { useState, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../src/lib/supabase";
import { REPORT_REASONS } from "../../shared/launch-safety.mjs";
export default function ReportButton({
  kind,
  id,
  privateContext = false,
}: {
  kind: string;
  id: string;
  privateContext?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [reason, setReason] = useState(""),
    [details, setDetails] = useState(""),
    [share, setShare] = useState(false),
    [block, setBlock] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const pending = useRef(false);
  async function submit() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("submit_safety_report", {
        target_kind: kind,
        target_id: id,
        reason,
        details,
        share_private: share,
        also_block: block,
      });
      if (error) throw error;
      setMessage(
        data.duplicate
          ? "You have already reported this item. Check Safety & reports for updates."
          : "Report received. Check Safety & reports for updates. This is not an emergency service.",
      );
      setReason("");
      setDetails("");
      setShare(false);
      setBlock(false);
    } catch (e: any) {
      setMessage(e.message || "Report was not confirmed. Retry.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Report ${kind === "chats" ? "message" : kind === "profiles" ? "member" : kind === "comments" ? "comment" : "reflection"}`}
        style={s.trigger}
        onPress={() => {
          setMessage("");
          setOpen(true);
        }}
      >
        <Text style={s.link}>Report</Text>
      </TouchableOpacity>
      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() => {
          if (!busy) setOpen(false);
        }}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
          <ScrollView
            contentContainerStyle={s.page}
            keyboardShouldPersistTaps="handled"
          >
            <View style={s.row}>
              <Text style={s.title} accessibilityRole="header">
                Raise a concern
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                disabled={busy}
                style={s.trigger}
                onPress={() => setOpen(false)}
              >
                <Text style={s.link}>Close</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.text}>
              Choose the closest reason. Our team will review the item and
              relevant details. Do not include passwords, identity documents or
              unrelated personal information. For immediate danger, seek local
              emergency assistance.
            </Text>
            {REPORT_REASONS.map(([value, label]: string[]) => (
              <TouchableOpacity
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ checked: reason === value }}
                style={[
                  s.option,
                  reason === value && {
                    borderColor: "#0369a1",
                    backgroundColor: "#eff8ff",
                  },
                ]}
                onPress={() => setReason(value)}
              >
                <Text style={s.text}>
                  {reason === value ? "●" : "○"} {label}
                </Text>
              </TouchableOpacity>
            ))}
            <Text style={s.label}>
              Additional context (optional, 1,000 characters maximum)
            </Text>
            <TextInput
              accessibilityLabel="Report details"
              multiline
              maxLength={1000}
              style={s.input}
              value={details}
              onChangeText={setDetails}
            />
            {privateContext && (
              <TouchableOpacity
                accessibilityRole="checkbox"
                accessibilityState={{ checked: share }}
                style={s.option}
                onPress={() => setShare(!share)}
              >
                <Text style={s.text}>
                  {share ? "☑" : "☐"} Share this private message with designated
                  safety reviewers so they can investigate. Ordinary moderators
                  cannot access it through this report.
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              accessibilityRole="checkbox"
              accessibilityState={{ checked: block }}
              style={s.option}
              onPress={() => setBlock(!block)}
            >
              <Text style={s.text}>
                {block ? "☑" : "☐"} Also block this account. An anonymous
                author’s identity stays hidden.
              </Text>
            </TouchableOpacity>
            {!!message && (
              <Text accessibilityRole="alert" style={s.text}>
                {message}
              </Text>
            )}
            <TouchableOpacity
              accessibilityRole="button"
              style={[
                s.button,
                (!reason || busy || (privateContext && !share)) && {
                  opacity: 0.5,
                },
              ]}
              disabled={!reason || busy || (privateContext && !share)}
              onPress={submit}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>
                {busy ? "Submitting…" : "Submit report"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}
const s = StyleSheet.create({
  page: { padding: 20, gap: 12, paddingBottom: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 22, fontWeight: "700", color: "#172033" },
  text: { fontSize: 14, lineHeight: 22, color: "#475569" },
  label: { fontSize: 13, fontWeight: "600", color: "#334155" },
  trigger: {
    minHeight: 44,
    minWidth: 44,
    padding: 10,
    justifyContent: "center",
  },
  link: { fontSize: 12, color: "#0369a1" },
  option: {
    minHeight: 48,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
  },
  input: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    padding: 12,
    borderRadius: 10,
    color: "#172033",
    textAlignVertical: "top",
  },
  button: {
    minHeight: 48,
    backgroundColor: "#0369a1",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
});
