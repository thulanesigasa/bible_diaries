import PolicyLinks from "../../components/PolicyLinks";
import React, { useState } from "react";
import {
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import { useSecurePasswordCapture } from "../../src/hooks/useSecurePasswordCapture";
import { ageAt } from "../../../shared/launch-safety.mjs";
export default function Register() {
  const router = useRouter(),
    guard = useSecurePasswordCapture();
  const [first, setFirst] = useState(""),
    [surname, setSurname] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [birth, setBirth] = useState(""),
    [accepted, setAccepted] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function submit() {
    if (busy) return;
    const age = ageAt(birth);
    if (age === null || age < 13) {
      setMessage(
        "Enter a valid birth date. Accounts are available from age 13.",
      );
      return;
    }
    if (
      !accepted ||
      !first.trim() ||
      !surname.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      password.length < 12 ||
      password !== confirm
    ) {
      setMessage(
        "Complete your name and email, use a password of at least 12 characters, match both passwords and accept the terms.",
      );
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            first_name: first.trim(),
            surname: surname.trim(),
            full_name: `${first.trim()} ${surname.trim()}`,
          },
        },
      });
      if (error) throw error;
      setPassword("");
      setConfirm("");
      setMessage(
        "Check your email to confirm your address, then sign in and complete the secure age and consent check. If you already have an account, sign in or use password recovery.",
      );
    } catch (e: any) {
      setMessage(
        e.message || "Registration could not be confirmed. Retry later.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.page}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={s.brand}>BIBLE DIARIES</Text>
      <Text style={s.title} accessibilityRole="header">
        Begin your journey
      </Text>
      <Text style={s.text}>
        A place for your reflections and thoughtful fellowship. Accounts are for
        ages 13+. Under 18? A separate verified adult guardian must approve
        access before you can participate.
      </Text>
      {[
        ["First name", first, setFirst],
        ["Surname", surname, setSurname],
        ["Email", email, setEmail],
        ["Birth date (YYYY-MM-DD)", birth, setBirth],
      ].map(([label, value, setter]: any) => (
        <React.Fragment key={label}>
          <Text style={s.label}>{label}</Text>
          <TextInput
            accessibilityLabel={label}
            style={s.input}
            value={value}
            onChangeText={setter}
            maxLength={
              label.startsWith("Birth") ? 10 : label === "Email" ? 254 : 80
            }
            keyboardType={label === "Email" ? "email-address" : "default"}
            autoCapitalize={label === "Email" ? "none" : "words"}
          />
        </React.Fragment>
      ))}
      <Text style={s.text}>
        The birth date above is only an on-device eligibility check. After email
        confirmation you will record it securely; it is not included in signup
        metadata.
      </Text>
      {[
        ["Password", password, setPassword],
        ["Confirm password", confirm, setConfirm],
      ].map(([label, value, setter]: any) => (
        <React.Fragment key={label}>
          <Text style={s.label}>{label}</Text>
          <TextInput
            accessibilityLabel={label}
            secureTextEntry
            style={s.input}
            value={value}
            onChangeText={setter}
            maxLength={128}
            autoCapitalize="none"
            onFocus={guard.onPasswordFocus}
            onBlur={guard.onPasswordBlur}
            textContentType="newPassword"
          />
        </React.Fragment>
      ))}
      <PolicyLinks />
      <TouchableOpacity
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
        style={s.link}
        onPress={() => setAccepted(!accepted)}
      >
        <Text style={s.text}>
          {accepted ? "☑" : "☐"} I accept the terms and community standards and
          acknowledge the privacy notice.
        </Text>
      </TouchableOpacity>
      {!!message && (
        <Text accessibilityRole="alert" style={s.message}>
          {message}
        </Text>
      )}
      <TouchableOpacity
        accessibilityRole="button"
        disabled={busy || !accepted}
        style={[s.button, (!accepted || busy) && { opacity: 0.5 }]}
        onPress={submit}
      >
        <Text style={s.buttonText}>
          {busy ? "Creating…" : "Create account"}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        style={s.link}
        onPress={() => router.replace("/(auth)/login")}
      >
        <Text style={s.linkText}>Already registered? Sign in</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  page: {
    padding: 24,
    paddingTop: 64,
    paddingBottom: 48,
    maxWidth: 560,
    width: "100%",
    alignSelf: "center",
    gap: 12,
  },
  brand: { fontSize: 11, letterSpacing: 2, color: "#0369a1" },
  title: { fontSize: 28, fontWeight: "700", color: "#172033" },
  text: { fontSize: 14, lineHeight: 22, color: "#475569" },
  label: { fontSize: 13, fontWeight: "600", color: "#334155" },
  input: {
    minHeight: 48,
    padding: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    color: "#172033",
  },
  link: { minHeight: 44, justifyContent: "center" },
  linkText: { fontSize: 14, color: "#0369a1" },
  button: {
    minHeight: 48,
    padding: 14,
    backgroundColor: "#0369a1",
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  message: { fontSize: 14, color: "#0369a1", lineHeight: 22 },
});
