import { userError } from '../../shared/user-error.mjs';
import { FormInput as TextInput } from './KeyboardForm';
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { supabase } from "../src/lib/supabase";
import { useSecurePasswordCapture } from "../src/hooks/useSecurePasswordCapture";
export default function MfaSettings({
  challengeOnly = false,
  onVerified,
}: {
  challengeOnly?: boolean;
  onVerified?: () => void;
}) {
  const [factor, setFactor] = useState<any>(null),
    [secret, setSecret] = useState(""),
    [code, setCode] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const pending = useRef(false),
    guard = useSecurePasswordCapture();
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (secret) void guard.enableProtection();
    else guard.disableProtection();
    return () => guard.disableProtection();
  }, [secret]);
  async function load() {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      setMessage(userError(error));
      return;
    }
    setFactor(data.totp?.find((x: any) => x.status === "verified") || null);
  }
  async function enroll() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      if ((await guard.enableProtection()) === false) throw Error("Could not protect this screen. Close the recorder and try again.");
      const { data: existing, error: listing } =
        await supabase.auth.mfa.listFactors();
      if (listing) throw listing;
      for (const f of existing.all || [])
        if (f.status === "unverified" && f.factor_type === "totp") {
          const { error } = await supabase.auth.mfa.unenroll({
            factorId: f.id,
          });
          if (error) throw error;
        }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Bible Diaries authenticator",
      });
      if (error) throw error;
      setFactor({ id: data.id, status: "unverified" });
      setSecret(data.totp.secret);
      setMessage(
        "Add this key manually to an authenticator app, then enter its current six-digit code. Keep the key private.",
      );
    } catch (e: any) {
      setMessage(userError(e, "Could not start setup."));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function verify() {
    if (pending.current || !factor || !/^\d{6}$/.test(code)) return;
    pending.current = true;
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: factor.id,
        code,
      });
      if (error) throw error;
      setSecret("");
      setCode("");
      setMessage(
        "Authenticator verified. Keep your recovery arrangements secure. Contact support if you lose access.",
      );
      await load();
      onVerified?.();
    } catch (e: any) {
      setCode("");
      setMessage(userError(e, "Verification failed. Use a fresh code."));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <View style={s.card}>
      <Text style={s.title}>Authenticator security</Text>
      <Text style={s.text}>
        Administrators must verify an enrolled authenticator before accessing
        either admin workspace. Never share codes.
      </Text>
      {!factor && !challengeOnly && (
        <TouchableOpacity
          accessibilityRole="button"
          style={s.button}
          disabled={busy}
          onPress={enroll}
        >
          <Text style={s.link}>Set up authenticator</Text>
        </TouchableOpacity>
      )}
      {!!secret && (
        <>
          <Text style={s.text}>Manual setup key · Bible Diaries</Text>
          <Text selectable style={s.secret}>
            {secret}
          </Text>
          <Text style={s.text}>
            Do not photograph or send this key to support.
          </Text>
        </>
      )}
      {!!factor && (
        <>
          <Text style={s.text}>Six-digit authenticator code</Text>
          <TextInput
            accessibilityLabel="Authenticator code"
            style={s.input}
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, ""))}
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="one-time-code"
          />
          <TouchableOpacity
            accessibilityRole="button"
            style={s.button}
            disabled={busy || code.length !== 6}
            onPress={verify}
          >
            <Text style={s.link}>
              {busy ? "Verifying…" : "Verify authenticator"}
            </Text>
          </TouchableOpacity>
        </>
      )}
      <Text accessibilityRole="alert" style={s.text}>
        {message}
      </Text>
    </View>
  );
}
const s = StyleSheet.create({
  card: {
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 0,
  },
  title: { fontSize: 15, fontWeight: "600", color: "#172033" },
  text: { fontSize: 13, lineHeight: 21, color: "#475569" },
  secret: { fontSize: 14, fontFamily: "monospace", color: "#172033" },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    minHeight: 48,
    padding: 12,
    borderRadius: 0,
    color: "#172033",
  },
  button: { minHeight: 44, justifyContent: "center" },
  link: { color: "#0369a1", fontSize: 14 },
});
