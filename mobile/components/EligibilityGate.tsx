import { KeyboardForm } from "./KeyboardForm";
import { userError } from '../../shared/user-error.mjs';
import React, { useState, useEffect, useRef, createContext, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
  Share,
  StyleSheet,
  AppState,
  DeviceEventEmitter,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../src/lib/supabase";
import MfaSettings from "./MfaSettings";
const MemberAccessContext = createContext(false);
export const useMemberAccess = () => useContext(MemberAccessContext);

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
  const router = useRouter(),
    [status, setStatus] = useState<any>(null),
    [error, setError] = useState("");
  const generation = useRef(0),
    ready = useRef(false);
  function receive(data: any) {
    setStatus({ ...data, account: user.id });
    setError("");
    if (data.ready && !ready.current) onReady?.();
    ready.current = !!data.ready;
  }
  async function load() {
    const g = ++generation.current;
    try {
      const { data, error } = await supabase.rpc("eligibility_status");
      if (error) throw error;
      if (g === generation.current) receive(data);
    } catch (e: any) {
      if (g === generation.current)
        setError(userError(e, "Could not check access. Retry."));
    }
  }
  useEffect(() => {
    ready.current = false;
    setStatus(null);
    if (!user) return;
    load();
    const timer = setInterval(load, 30000),
      listener = AppState.addEventListener("change", (s) => {
        if (s === "active") load();
      }),
      completed = DeviceEventEmitter.addListener(
        "diary-eligibility-changed",
        (e) => {
          if (e.userId === user.id) receive(e.status);
        },
      );
    return () => {
      generation.current++;
      clearInterval(timer);
      listener.remove();
      completed.remove();
    };
  }, [user?.id]);
  useEffect(() => {
    if (user && !bypass && status?.account === user.id && status.setup_required)
      router.replace("/(auth)/complete-registration");
  }, [status, bypass, user?.id]);
  // A public-route bypass affects the panel only; it never grants member access.
  const canAccess = !!(user && status?.account === user.id && status.ready);
  const content = !user || bypass || canAccess ? children : (
    <>
      <View style={{ flex: 1, display: "none" }} pointerEvents="none">
        {children}
      </View>
      <KeyboardForm style={s.screen} contentContainerStyle={s.page}>
        <Text style={s.brand}>BIBLE DIARIES</Text>
        <Text accessibilityRole="header" style={s.title}>
          {status?.mfa_required
            ? "Verify your authenticator"
            : status?.setup_required
              ? "Finishing registration"
              : "Your account access"}
        </Text>
        {!status || status.setup_required ? (
          <Text style={s.text}>Opening your account details…</Text>
        ) : status.mfa_required ? (
          <MfaSettings challengeOnly onVerified={load} />
        ) : (
          <>
            <Text style={s.text}>
              {status.guardian_status === "revoked"
                ? "Guardian permission has been withdrawn. Contact your guardian or support."
                : "Your signup details are saved. Your parent or legal guardian must approve participation using their own verified adult account."}
            </Text>
            <Text style={s.text}>
              Guardian:{" "}
              {status.guardian_email ||
                "Contact support to correct the guardian address."}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              style={s.button}
              onPress={() =>
                Share.share({
                  message:
                    "Please read Bible Diaries privacy and safety notices in the app or at https://biblediaries.co.za/guardian, then sign into your own adult account using the guardian email I supplied and open Settings → Guardian permissions.",
                })
              }
            >
              <Text style={s.buttonText}>Share guardian instructions</Text>
            </TouchableOpacity>
            <Text style={s.text}>
              No guardian invitation email is sent from this screen. Email
              verification confirms control of an address, not legal
              guardianship.
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
          style={s.touch}
          onPress={load}
        >
          <Text style={s.link}>Check again</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="link"
          style={s.touch}
          onPress={() =>
            Linking.openURL(
              "mailto:support@ts-industries.com?subject=Bible%20Diaries%20account%20help",
            )
          }
        >
          <Text style={s.link}>Account, deletion or correction help</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          style={s.touch}
          onPress={() => supabase.auth.signOut({ scope: "local" })}
        >
          <Text style={s.link}>Sign out</Text>
        </TouchableOpacity>
      </KeyboardForm>
    </>
  );
  return <MemberAccessContext.Provider value={canAccess}>{content}</MemberAccessContext.Provider>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  page: {
    padding: 24,
    paddingTop: 64,
    paddingBottom: 60,
    gap: 18,
    maxWidth: 620,
    width: "100%",
    alignSelf: "center",
  },
  brand: { fontSize: 11, color: "#0284c7", letterSpacing: 2 },
  title: { fontSize: 25, fontWeight: "700", color: "#172033" },
  text: { fontSize: 14, lineHeight: 23, color: "#475569" },
  link: { color: "#0369a1", fontSize: 14 },
  touch: { minHeight: 44, justifyContent: "center" },
  button: {
    minHeight: 50,
    backgroundColor: "#0369a1",
    padding: 14,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  error: { fontSize: 14, color: "#b91c1c", lineHeight: 21 },
});
