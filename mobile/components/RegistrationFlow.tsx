import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  DeviceEventEmitter,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../src/lib/supabase";
import { useSecurePasswordCapture } from "../src/hooks/useSecurePasswordCapture";
import { ageAt, POLICY_VERSION } from "../../shared/launch-safety.mjs";
import DateOfBirthPicker from "./DateOfBirthPicker";
import PolicyLinks from "./PolicyLinks";
const STEPS = [
  "Personal details",
  "Birth date",
  "Terms & privacy",
  "Create password",
];
export default function RegistrationFlow({
  existing = false,
}: {
  existing?: boolean;
}) {
  const router = useRouter(),
    guard = useSecurePasswordCapture();
  const [step, setStep] = useState(existing ? 1 : 0),
    [first, setFirst] = useState(""),
    [surname, setSurname] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [birth, setBirth] = useState(""),
    [guardian, setGuardian] = useState(""),
    [accepted, setAccepted] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [done, setDone] = useState(false),
    [account, setAccount] = useState<any>(null);
  useEffect(() => {
    if (!existing) return;
    let active = true;
    supabase.auth.getUser().then(({ data: { user } }: any) => {
      if (!active) return;
      setAccount(user);
      setEmail(user?.email || "");
      setFirst(user?.user_metadata?.first_name || "");
      setSurname(user?.user_metadata?.surname || "");
    });
    return () => {
      active = false;
    };
  }, [existing]);
  const age = ageAt(birth);
  function next() {
    setMessage("");
    if (
      step === 0 &&
      (!first.trim() ||
        !surname.trim() ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    ) {
      setMessage("Enter your name, surname and a valid email address.");
      return;
    }
    if (step === 1 && (age === null || age < 13)) {
      setMessage("Select your birth date. Accounts are available from age 13.");
      return;
    }
    if (
      step === 1 &&
      age !== null &&
      age < 18 &&
      (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardian.trim()) ||
        guardian.trim().toLowerCase() === email.trim().toLowerCase())
    ) {
      setMessage("Enter a separate parent or legal guardian email address.");
      return;
    }
    if (step === 2 && !accepted) {
      setMessage(
        "Read and accept the terms and community standards, and acknowledge the privacy notice.",
      );
      return;
    }
    if (existing && step === 2) {
      submit();
      return;
    }
    setStep(step + 1);
  }
  async function submit() {
    if (busy) return;
    setMessage("");
    if (!accepted || age === null || age < 13) {
      setMessage("Complete the birth date and terms steps first.");
      return;
    }
    if (!existing && (password.length < 12 || password !== confirm)) {
      setMessage("Use at least 12 characters and match both passwords.");
      return;
    }
    setBusy(true);
    try {
      const eligibility = {
        birth_date: birth,
        guardian_email: age < 18 ? guardian.trim().toLowerCase() : null,
        accepted: true,
        policy_version: POLICY_VERSION,
      };
      if (existing) {
        if (!account)
          throw Error("Sign in again to complete this registration.");
        const { data, error } = await supabase.rpc(
          "complete_account_setup",
          eligibility,
        );
        if (error) throw error;
        DeviceEventEmitter.emit("diary-eligibility-changed", {
          userId: account.id,
          status: data,
        });
        router.replace("/(tabs)");
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              first_name: first.trim(),
              surname: surname.trim(),
              full_name: `${first.trim()} ${surname.trim()}`,
              signup_eligibility: eligibility,
            },
          },
        });
        if (error) throw error;
        setPassword("");
        setConfirm("");
        setDone(true);
        setMessage(
          "Check your email to confirm your address, then sign in. Your birth date and consent were included in signup; you will not be asked to enter them again. Members under 18 still need guardian approval. If you already have an account, sign in or use password recovery.",
        );
      }
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
      <Text accessibilityRole="header" style={s.title}>
        {done
          ? "Check your email"
          : existing
            ? "Complete your registration"
            : "Begin your journey"}
      </Text>
      {!done && (
        <>
          <Text style={s.hint}>
            {existing
              ? "Your account is already created. Finish these missing signup details once; your existing password stays in place."
              : `Step ${step + 1} of 4 · ${STEPS[step]}`}
          </Text>
          <View style={s.progress}>
            {STEPS.slice(0, existing ? 3 : 4).map((_, i) => (
              <View
                key={i}
                style={[
                  s.progressLine,
                  i <= step && { backgroundColor: "#0369a1" },
                ]}
              />
            ))}
          </View>
          {step === 0 && (
            <>
              <Text style={s.description}>
                Start with the details we use to recognise your account.
                Optional profile details can be added later in Settings.
              </Text>
              {[
                ["First name", first, setFirst],
                ["Surname", surname, setSurname],
                ["Email address", email, setEmail],
              ].map(([label, value, setter]: any) => (
                <View key={label} style={s.field}>
                  <Text style={s.label}>{label}</Text>
                  <TextInput
                    accessibilityLabel={label}
                    style={s.input}
                    value={value}
                    onChangeText={setter}
                    maxLength={label === "Email address" ? 254 : 80}
                    autoCapitalize={
                      label === "Email address" ? "none" : "words"
                    }
                    keyboardType={
                      label === "Email address" ? "email-address" : "default"
                    }
                    autoComplete={
                      label === "Email address"
                        ? "email"
                        : label === "First name"
                          ? "given-name"
                          : "family-name"
                    }
                    returnKeyType="next"
                  />
                </View>
              ))}
            </>
          )}
          {step === 1 && (
            <>
              <Text style={s.sectionTitle}>When were you born?</Text>
              <Text style={s.description}>
                Select your date using the picker. Your birth date is kept in a
                restricted account record, not on your public profile. Accounts
                are for ages 13 and above.
              </Text>
              <DateOfBirthPicker
                value={birth}
                onChange={(v) => {
                  setBirth(v);
                  setAccepted(false);
                  setMessage("");
                }}
              />
              {age !== null && age < 18 && (
                <View style={s.field}>
                  <Text style={s.label}>Parent or legal guardian email</Text>
                  <TextInput
                    accessibilityLabel="Guardian email"
                    style={s.input}
                    value={guardian}
                    onChangeText={(v) => {
                      setGuardian(v);
                      setAccepted(false);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    maxLength={254}
                  />
                  <Text style={s.hint}>
                    A separate verified adult account using this address must
                    approve participation. Email verification does not prove
                    legal guardianship.
                  </Text>
                </View>
              )}
            </>
          )}
          {step === 2 && (
            <>
              <Text style={s.sectionTitle}>Before you join</Text>
              <Text style={s.description}>
                Read each notice on its own screen. Submitted text, including
                private entries and messages, is checked through OpenAI
                moderation. Public reflections can be copied by others.
              </Text>
              <PolicyLinks />
              <TouchableOpacity
                accessibilityRole="checkbox"
                accessibilityState={{ checked: accepted }}
                style={s.check}
                onPress={() => setAccepted(!accepted)}
              >
                <Text style={s.description}>
                  {accepted ? "☑" : "☐"} I accept the terms and community
                  standards and acknowledge the privacy notice.
                </Text>
              </TouchableOpacity>
            </>
          )}
          {step === 3 && (
            <>
              <Text style={s.sectionTitle}>Create your password</Text>
              <Text style={s.description}>
                Use at least 12 characters. A unique passphrase is easier to
                remember and harder to guess. Supabase securely manages password
                storage and authentication.
              </Text>
              {[
                ["Password", password, setPassword],
                ["Confirm password", confirm, setConfirm],
              ].map(([label, value, setter]: any) => (
                <View key={label} style={s.field}>
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
                    returnKeyType="done"
                  />
                </View>
              ))}
            </>
          )}
          {!!message && (
            <Text accessibilityRole="alert" style={s.message}>
              {message}
            </Text>
          )}
          <TouchableOpacity
            accessibilityRole="button"
            disabled={busy || (step === 2 && !accepted)}
            style={[
              s.button,
              (busy || (step === 2 && !accepted)) && { opacity: 0.5 },
            ]}
            onPress={step === 3 ? submit : next}
          >
            <Text style={s.buttonText}>
              {busy
                ? "Saving…"
                : step === 3
                  ? "Create account"
                  : step === 2
                    ? existing
                      ? "Finish registration"
                      : "Create password"
                    : "Continue"}
            </Text>
          </TouchableOpacity>
          {step > (existing ? 1 : 0) && (
            <TouchableOpacity
              accessibilityRole="button"
              disabled={busy}
              style={s.touch}
              onPress={() => {
                guard.onPasswordBlur();
                setStep(step - 1);
                setMessage("");
              }}
            >
              <Text style={s.link}>Back</Text>
            </TouchableOpacity>
          )}
        </>
      )}
      {done && (
        <Text accessibilityRole="alert" style={s.description}>
          {message}
        </Text>
      )}
      <TouchableOpacity
        accessibilityRole="button"
        style={s.touch}
        disabled={busy}
        onPress={() =>
          existing
            ? supabase.auth.signOut({ scope: "local" })
            : router.replace("/(auth)/login")
        }
      >
        <Text style={s.link}>
          {existing ? "Sign out" : "Already registered? Sign in"}
        </Text>
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
    gap: 18,
  },
  brand: { fontSize: 11, letterSpacing: 2, color: "#0369a1" },
  title: { fontSize: 27, fontWeight: "700", color: "#172033" },
  sectionTitle: { fontSize: 20, fontWeight: "600", color: "#172033" },
  description: { fontSize: 14, lineHeight: 23, color: "#475569" },
  hint: { fontSize: 12, lineHeight: 19, color: "#64748b" },
  progress: { flexDirection: "row", gap: 6, paddingVertical: 6 },
  progressLine: { height: 3, backgroundColor: "#e2e8f0", flex: 1 },
  field: { gap: 8 },
  label: { fontSize: 13, fontWeight: "600", color: "#334155" },
  input: {
    minHeight: 50,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#94a3b8",
    color: "#172033",
    fontSize: 15,
  },
  touch: { minHeight: 44, justifyContent: "center" },
  link: { fontSize: 14, color: "#0369a1" },
  check: { minHeight: 48, paddingVertical: 10 },
  button: {
    minHeight: 50,
    padding: 14,
    backgroundColor: "#0369a1",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  message: { fontSize: 14, color: "#b91c1c", lineHeight: 22 },
});
