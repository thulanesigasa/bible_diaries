import MfaSettings from "./MfaSettings";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Linking,
  Share,
  StyleSheet,
  AppState,
} from "react-native";
import { supabase } from "../src/lib/supabase";
import { POLICY_VERSION, ageAt } from "../../shared/launch-safety.mjs";
export default function EligibilityGate({
  user,
  children,
  bypass = false,
  onReady,
}: {
  user: any;
  children: React.ReactNode;
  bypass?: boolean;
  onReady?: () => void;
}) {
  const [status, setStatus] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [birth, setBirth] = useState(""),
    [guardian, setGuardian] = useState(""),
    [accepted, setAccepted] = useState(false);
  const generation = useRef(0),
    ready = useRef(false);
  async function load() {
    const g = ++generation.current;
    try {
      const { data, error } = await supabase.rpc("eligibility_status");
      if (error) throw error;
      if (g !== generation.current) return;
      setStatus({ ...data, account: user.id });
      setError("");
      if (data.ready && !ready.current) {
        ready.current = true;
        onReady?.();
      }
      ready.current = !!data.ready;
    } catch (e: any) {
      if (g === generation.current)
        setError(e.message || "Could not check account access. Retry.");
    }
  }
  useEffect(() => {
    ready.current = false;
    setStatus(null);
    setBirth("");
    setGuardian("");
    setAccepted(false);
    if (!user) return;
    load();
    const timer = setInterval(load, 30000),
      listener = AppState.addEventListener("change", (s) => {
        if (s === "active") load();
      });
    return () => {
      generation.current++;
      clearInterval(timer);
      listener.remove();
    };
  }, [user?.id]);
  async function submit() {
    const age = ageAt(birth);
    if (age === null || age < 13) {
      setError("Enter a valid birth date. Accounts are available from age 13.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.rpc("complete_account_setup", {
        birth_date: birth,
        guardian_email: guardian,
        accepted,
        policy_version: POLICY_VERSION,
      });
      if (error) throw error;
      await load();
    } catch (e: any) {
      setError(e.message || "Could not save. Retry.");
    } finally {
      setBusy(false);
    }
  }
  if (!user || bypass) return <>{children}</>;
  if (status?.account === user.id && status.ready) return <>{children}</>;
  return (
    <>
      <View style={{ flex: 1, display: "none" }} pointerEvents="none">
        {children}
      </View>
      <ScrollView
        style={s.screen}
        contentContainerStyle={s.page}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.brand}>BIBLE DIARIES</Text>
        <Text accessibilityRole="header" style={s.title}>
          {status?.setup_required
            ? "A safer place to begin"
            : "Your account access"}
        </Text>
        {!status ? (
          <Text style={s.text}>Checking your account…</Text>
        ) : status.mfa_required ? (
          <MfaSettings challengeOnly onVerified={load} />
        ) : status.setup_required ? (
          <>
            <Text style={s.text}>
              Accounts are for ages 13 and above. Members under 18 need a
              separate verified adult guardian account to approve participation.
              Your birth date and guardian email stay in a restricted account
              record.
            </Text>
            <Text style={s.label}>Birth date (YYYY-MM-DD)</Text>
            <TextInput
              accessibilityLabel="Birth date"
              style={s.input}
              placeholder="YYYY-MM-DD"
              value={birth}
              onChangeText={setBirth}
              maxLength={10}
              autoCapitalize="none"
            />
            {ageAt(birth) !== null && ageAt(birth)! < 18 && (
              <>
                <Text style={s.label}>Parent or legal guardian email</Text>
                <TextInput
                  accessibilityLabel="Guardian email"
                  style={s.input}
                  value={guardian}
                  onChangeText={setGuardian}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  maxLength={254}
                />
              </>
            )}
            <View style={s.links}>
              {[
                ["Terms", "terms"],
                ["Privacy", "privacy"],
                ["Community standards", "community-guidelines"],
                ["Child safety", "child-safety"],
              ].map(([label, path]) => (
                <TouchableOpacity
                  key={path}
                  accessibilityRole="link"
                  onPress={() =>
                    Linking.openURL("https://biblediaries.co.za/" + path)
                  }
                >
                  <Text style={s.link}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              accessibilityRole="checkbox"
              accessibilityState={{ checked: accepted }}
              onPress={() => setAccepted(!accepted)}
              style={s.check}
            >
              <Text style={s.text}>
                {accepted ? "☑" : "☐"} I accept the terms and community
                standards and acknowledge the privacy notice, including
                automated checks on submitted text.
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              disabled={busy || !accepted}
              style={[s.button, (!accepted || busy) && { opacity: 0.5 }]}
              onPress={submit}
            >
              <Text style={s.buttonText}>{busy ? "Saving…" : "Continue"}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={s.text}>
              {status.guardian_status === "revoked"
                ? "Guardian permission has been withdrawn. Community access is restricted. Contact your guardian or support."
                : "Your account is restricted until your parent or legal guardian approves participation using their own verified adult account."}
            </Text>
            <Text style={s.text}>
              Guardian:{" "}
              {status.guardian_email || "Contact support for account help."}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              style={s.button}
              onPress={() =>
                Share.share({
                  message:
                    "Please read the Bible Diaries safety and privacy notices, create or sign in to your own adult account using the guardian email I supplied, then review Guardian permissions: https://biblediaries.co.za/guardian",
                })
              }
            >
              <Text style={s.buttonText}>Share guardian instructions</Text>
            </TouchableOpacity>
            <Text style={s.text}>
              We do not send a guardian invitation email from this screen. Email
              verification confirms control of an address; it does not prove
              legal guardianship.
            </Text>
          </>
        )}
        {!!error && (
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        )}
        <TouchableOpacity
          accessibilityRole="button"
          onPress={load}
          style={s.check}
        >
          <Text style={s.link}>Check again</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="link"
          style={s.check}
          onPress={() =>
            Linking.openURL("https://biblediaries.co.za/account-deletion")
          }
        >
          <Text style={s.link}>Request account deletion or a correction</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          style={s.check}
          onPress={() => supabase.auth.signOut({ scope: "local" })}
        >
          <Text style={s.link}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  page: {
    padding: 24,
    paddingTop: 64,
    paddingBottom: 60,
    gap: 14,
    maxWidth: 620,
    width: "100%",
    alignSelf: "center",
  },
  brand: { fontSize: 11, color: "#0284c7", letterSpacing: 2 },
  title: { fontSize: 25, fontWeight: "700", color: "#172033" },
  text: { fontSize: 14, lineHeight: 22, color: "#475569" },
  label: { fontSize: 13, fontWeight: "600", color: "#172033" },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    padding: 12,
    color: "#172033",
  },
  links: { gap: 6 },
  link: { color: "#0369a1", fontSize: 14, paddingVertical: 10 },
  check: { minHeight: 44, justifyContent: "center" },
  button: {
    minHeight: 48,
    backgroundColor: "#0369a1",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  error: { fontSize: 14, color: "#b91c1c", lineHeight: 21 },
});
