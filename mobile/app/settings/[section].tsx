import HelpIndex from "../../components/HelpIndex";
import MfaSettings from "../../components/MfaSettings";
import AppPolicies from "../../components/AppPolicies";
import ReadingPreferences from "../../components/ReadingPreferences";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Platform,
  DeviceEventEmitter,
  StyleSheet,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useApp } from "../_layout";
import { useDiarySettings } from "../../src/hooks/useDiarySettings";
import { useSecurePasswordCapture } from "../../src/hooks/useSecurePasswordCapture";
import {
  DEFAULT_LOCK,
  LockPolicy,
  readLock,
  saveLock,
  setPin,
  verifyPin,
  verifyDevice,
  encryptExport,
  readSecurityAudit,
  recordSecurityEvent,
} from "../../src/lib/app-lock";
import { exportDiaryData } from "../../src/lib/export-data";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { SETTINGS_GROUPS } from "../../../shared/diary-settings.mjs";
export default function SettingsSection() {
  const { section } = useLocalSearchParams<{ section: string }>(),
    { user, profile, setProfile, supabase, accent, showToast } = useApp(),
    router = useRouter();
  const { settings, save, error, reload, ready } = useDiarySettings(),
    guard = useSecurePasswordCapture();
  const [busy, setBusy] = useState(false),
    [items, setItems] = useState<any[]>([]),
    [loadError, setLoadError] = useState(""),
    [audit, setAudit] = useState<any[]>([]),
    [lock, setLock] = useState<LockPolicy>(DEFAULT_LOCK);
  const [currentPin, setCurrentPin] = useState(""),
    [newPin, setNewPin] = useState(""),
    [confirmPin, setConfirmPin] = useState(""),
    [password, setPassword] = useState(""),
    [confirmPassword, setConfirmPassword] = useState(""),
    [exportPassword, setExportPassword] = useState("");
  const [start, setStart] = useState(settings.quiet_start),
    [end, setEnd] = useState(settings.quiet_end);
  const title =
    SETTINGS_GROUPS.find((x: string[]) => x[0] === section)?.[1] || "Settings";
  useEffect(() => {
    setStart(settings.quiet_start);
    setEnd(settings.quiet_end);
  }, [settings.quiet_start, settings.quiet_end]);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoadError("");
        let result: any;
        if (section === "security" && Platform.OS !== "web") {
          const p = await readLock(user?.id);
          if (active) setLock(p);
        }
        if (section === "blocked")
          result = await supabase
            .from("blocked_accounts")
            .select("blocked_user_id,created_at")
            .eq("user_id", user?.id);
        if (section === "saved")
          result = await supabase
            .from("favorites")
            .select("post_id,diaries(id,title,content)")
            .eq("user_id", user?.id)
            .limit(100);
        if (section === "sessions" && Platform.OS !== "web") {
          const events = await readSecurityAudit(user?.id);
          if (active) setAudit(events);
        }
        if (section === "sessions")
          result = await supabase.rpc("my_diary_sessions");
        if (result?.error) throw result.error;
        if (active && result) setItems(result.data || []);
      } catch {
        if (active)
          setLoadError(
            "This section could not load. Check your connection and reopen it.",
          );
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [section, user?.id]);
  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } catch (e: any) {
      showToast(e.message || "Could not complete this request.", "error");
    } finally {
      setBusy(false);
    }
  };
  const persist = (patch: any) =>
    run(async () => {
      await save(patch);
      showToast("Preference saved.");
    });
  const control = (
    label: string,
    description: string,
    value: boolean,
    onChange: (v: boolean) => void,
  ) => (
    <View style={s.row}>
      <View style={{ flex: 1, paddingRight: 15 }}>
        <Text style={s.label}>{label}</Text>
        <Text style={s.hint}>{description}</Text>
      </View>
      <Switch
        accessibilityLabel={label}
        disabled={busy}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#e2e8f0", true: "#bae6fd" }}
        thumbColor={value ? accent : "#fff"}
      />
    </View>
  );
  const action = (label: string, fn: () => void) => (
    <TouchableOpacity
      disabled={busy}
      accessibilityRole="button"
      onPress={fn}
      style={s.action}
    >
      <Text style={{ color: accent, fontWeight: "600", fontSize: 14 }}>
        {busy ? "Please wait…" : label}
      </Text>
    </TouchableOpacity>
  );
  const secret = (
    label: string,
    value: string,
    set: (v: string) => void,
    numeric = false,
  ) => (
    <View style={{ gap: 8 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={s.input}
        secureTextEntry
        value={value}
        onChangeText={set}
        onFocus={guard.onPasswordFocus}
        onBlur={guard.onPasswordBlur}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={numeric ? "number-pad" : "default"}
        maxLength={numeric ? 6 : 1024}
      />
    </View>
  );
  const authorizeLock = async () => {
    if (lock.pin) {
      if (!(await verifyPin(user?.id, currentPin)))
        throw new Error("Enter your current PIN to change app lock settings.");
    } else if (lock.biometric) {
      await guard.enableProtection();
      try {
        if (!(await verifyDevice()))
          throw new Error("Verification was cancelled.");
      } finally {
        guard.disableProtection();
      }
    }
  };
  const policyChange = (patch: Partial<LockPolicy>) =>
    run(async () => {
      await authorizeLock();
      if (patch.enabled && !lock.pin && !lock.biometric)
        throw new Error("Set a PIN or enable biometrics first.");
      if (patch.biometric) {
        await guard.enableProtection();
        try {
          if (!(await verifyDevice()))
            throw new Error("Verification was cancelled.");
        } finally {
          guard.disableProtection();
        }
      }
      const next = { ...lock, ...patch };
      if (!next.pin && !next.biometric) next.enabled = false;
      await saveLock(user?.id, next);
      setLock(next);
      setCurrentPin("");
      DeviceEventEmitter.emit("diary-lock-policy");
      await recordSecurityEvent(user?.id, "App lock preference changed");
      showToast("Security preference saved.");
    });
  const profileChange = (patch: any) =>
    run(async () => {
      const r = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", user?.id);
      if (r.error) throw new Error("Could not save privacy settings.");
      setProfile({ ...profile, ...patch });
    });
  const doExport = (encrypted: boolean) =>
    run(async () => {
      if (Platform.OS === "web")
        throw new Error("Use the browser app to export on PC.");
      if (!(await Sharing.isAvailableAsync()))
        throw new Error("File sharing is unavailable on this device.");
      const json = await exportDiaryData(supabase, user?.id);
      const data = encrypted ? await encryptExport(json, exportPassword) : json;
      const file = new File(
        Paths.cache,
        `bible-diaries-${Date.now()}.${encrypted ? "encrypted.json" : "json"}`,
      );
      try {
        file.create();
        file.write(data);
        await Sharing.shareAsync(file.uri, {
          mimeType: "application/json",
          dialogTitle: "Export Bible Diaries",
        });
      } finally {
        if (file.exists) file.delete();
        setExportPassword("");
      }
    });
  return (
    <ScrollView
      contentContainerStyle={s.page}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={s.title}>{title}</Text>
      {error &&
      ["reading", "privacy", "notifications", "quiet"].includes(section)
        ? action(error + " Retry", () => reload())
        : null}
      {!!loadError && <Text accessibilityLiveRegion="polite">{loadError}</Text>}
      {section === "reading" && (
        <ReadingPreferences
          settings={settings}
          disabled={busy || !ready}
          accent={accent}
          onChange={persist}
        />
      )}
      {section === "privacy" && (
        <>
          {control(
            "Private profile",
            "Hide your profile from community browsing. This does not change existing posts.",
            profile?.privacy_mode === "private",
            (v) => profileChange({ privacy_mode: v ? "private" : "public" }),
          )}
          {control(
            "Allow direct messages",
            "Accept messages from other members.",
            profile?.allow_dms !== false,
            (v) => profileChange({ allow_dms: v }),
          )}
          {control(
            "New reflections are private",
            "Your next new reflection starts as a private diary entry.",
            settings.default_private,
            (v) => persist({ default_private: v }),
          )}
          {control(
            "Post anonymously by default",
            "Hide your identity on new public reflections.",
            settings.default_anonymous,
            (v) => persist({ default_anonymous: v }),
          )}
          {control(
            "Allow comments by default",
            "Applies to new reflections; you can change before publishing.",
            settings.default_comments,
            (v) => persist({ default_comments: v }),
          )}
          {control(
            "Allow likes by default",
            "Applies to new reflections.",
            settings.default_likes,
            (v) => persist({ default_likes: v }),
          )}
          <Text>
            Bookmarks stay private. Public posts can be copied by people who see
            them.
          </Text>
        </>
      )}
      {section === "privacy" &&
        action("Read the privacy policy", () =>
          router.push("/settings/legal" as any),
        )}
      {section === "notifications" && (
        <>
          {(["likes", "comments", "bookmarks", "shares", "posts"] as const).map(
            (type) => (
              <View key={type}>
                {control(
                  type[0].toUpperCase() + type.slice(1),
                  "Record new interactions in Activity & Notifications.",
                  settings[`notify_${type}`],
                  (v) => persist({ [`notify_${type}`]: v }),
                )}
              </View>
            ),
          )}
          {action("Open Activity & Notifications", () =>
            router.push("/activity"),
          )}
          <Text>
            These preferences control the in-app inbox. They do not enable email
            or push delivery.
          </Text>
        </>
      )}
      {section === "quiet" && (
        <>
          {control(
            "Quiet hours",
            "Hide unread activity badges during this window. Activity remains available in your inbox.",
            settings.quiet_enabled,
            (v) => persist({ quiet_enabled: v }),
          )}
          <Text>Use 24-hour time in your device’s local timezone.</Text>
          <TextInput
            accessibilityLabel="Quiet hours start"
            style={s.input}
            value={start}
            onChangeText={setStart}
            placeholder="22:00"
            maxLength={5}
          />
          <TextInput
            accessibilityLabel="Quiet hours end"
            style={s.input}
            value={end}
            onChangeText={setEnd}
            placeholder="07:00"
            maxLength={5}
          />
          {action("Save quiet hours", () => {
            if (
              !/^([01]\d|2[0-3]):[0-5]\d$/.test(start) ||
              !/^([01]\d|2[0-3]):[0-5]\d$/.test(end)
            ) {
              showToast("Enter valid times such as 22:00 and 07:00.", "error");
              return;
            }
            persist({ quiet_start: start, quiet_end: end });
          })}
        </>
      )}
      {section === "security" && <MfaSettings />}
      {section === "security" && (
        <>
          <Text style={s.label}>Account password</Text>
          <Text>
            Use the recovery email to set a new password. Recovery links expire
            and can be requested again.
          </Text>
          {action("Change password", () =>
            router.push("/(auth)/reset-password"),
          )}
          <Text style={s.label}>Password recording protection</Text>
          <Text>
            Native password, confirmation, PIN and biometric entry use capture
            protection. Browsers cannot reliably block OS or third-party screen
            recorders.
          </Text>
          {Platform.OS === "web" ? (
            <Text>
              Native device locking is available in the Android/iOS app.
            </Text>
          ) : (
            <>
              {secret(
                "Current PIN (required to change an existing lock)",
                currentPin,
                setCurrentPin,
                true,
              )}
              {secret("New six-digit PIN", newPin, setNewPin, true)}
              {secret("Confirm new PIN", confirmPin, setConfirmPin, true)}
              {action("Save app PIN", () =>
                run(async () => {
                  await authorizeLock();
                  if (newPin !== confirmPin)
                    throw new Error("PINs must match.");
                  await setPin(user?.id, newPin);
                  setLock(await readLock(user?.id));
                  setNewPin("");
                  setConfirmPin("");
                  setCurrentPin("");
                  DeviceEventEmitter.emit("diary-lock-policy");
                  await recordSecurityEvent(user?.id, "App PIN set or changed");
                  showToast("PIN saved.");
                }),
              )}
              {control(
                "App lock",
                "Protect Bible Diaries after inactivity and on reopening.",
                lock.enabled,
                (v) => policyChange({ enabled: v }),
              )}
              {control(
                "Biometric unlock",
                "Verify with your device’s enrolled biometrics.",
                lock.biometric,
                (v) => policyChange({ biometric: v }),
              )}
              {control(
                "App switcher shield",
                "Cover reflections when the app is inactive.",
                lock.privacyShield,
                (v) => policyChange({ privacyShield: v }),
              )}
              <Text style={s.label}>Inactivity timeout</Text>
              <View style={s.options}>
                {[30, 60, 300, 900].map((n) =>
                  action(`${n / 60} min${lock.timeout === n ? " ✓" : ""}`, () =>
                    policyChange({ timeout: n }),
                  ),
                )}
              </View>
              <Text>
                PIN verification is rate limited on this device. Your app PIN
                does not replace your account password.
              </Text>
            </>
          )}
        </>
      )}
      {section === "blocked" && (
        <>
          {!items.length && !loadError && (
            <Text>
              No blocked accounts. You can block a member from their profile.
            </Text>
          )}
          {items.map((x) => (
            <View key={x.blocked_user_id} style={s.row}>
              <Text style={{ flex: 1 }}>
                Account {x.blocked_user_id.slice(0, 8)}
              </Text>
              {action("Unblock", () =>
                run(async () => {
                  const r = await supabase
                    .from("blocked_accounts")
                    .delete()
                    .eq("user_id", user?.id)
                    .eq("blocked_user_id", x.blocked_user_id);
                  if (r.error) throw r.error;
                  setItems(
                    items.filter(
                      (y) => y.blocked_user_id !== x.blocked_user_id,
                    ),
                  );
                }),
              )}
            </View>
          ))}
        </>
      )}
      {section === "saved" && (
        <>
          <Text>
            Your latest 100 bookmarks. Only you can view this collection.
          </Text>
          {items
            .filter((x) => x.diaries)
            .map((x) =>
              action(
                x.diaries.title ||
                  x.diaries.content?.slice(0, 70) ||
                  "Reflection",
                () => router.push(`/post/${x.post_id}` as any),
              ),
            )}
          {!items.length && !loadError && (
            <Text>No saved reflections yet.</Text>
          )}
        </>
      )}
      {section === "data" && (
        <>
          <Text>
            Export includes your own reflections and bookmark references. Keep
            exported files safe; plain JSON is readable by anyone with the file.
          </Text>
          {secret(
            "Encrypted export password (at least 12 characters)",
            exportPassword,
            setExportPassword,
          )}
          {action("Export encrypted backup", () => doExport(true))}
          {action("Export readable JSON", () => doExport(false))}
          <Text>
            Encrypted backups use AES-256-GCM and PBKDF2-SHA256. Keep the
            password: support cannot recover it. Import is not currently
            offered.
          </Text>
        </>
      )}
      {section === "sessions" && (
        <>
          <Text>
            Sessions returned by the authentication service. Revoking others may
            not remove already downloaded copies.
          </Text>
          {items.map((x) => (
            <View key={x.id} style={s.row}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={s.label}>
                  {x.current ? "This session" : "Other session"}
                </Text>
                <Text>{x.user_agent || "Device details unavailable"}</Text>
                <Text>
                  {x.updated_at ? new Date(x.updated_at).toLocaleString() : ""}
                </Text>
              </View>
            </View>
          ))}
          <Text style={s.label}>This device’s security events</Text>
          <Text>Local event history; not a server audit log.</Text>
          {audit.map((x, i) => (
            <Text key={i}>
              {new Date(x.at).toLocaleString()} · {x.event}
            </Text>
          ))}
          {action("Sign out other devices", () =>
            run(async () => {
              const { error } = await supabase.auth.signOut({
                scope: "others",
              });
              if (error) throw error;
              const r = await supabase.rpc("my_diary_sessions");
              if (r.error) throw r.error;
              setItems(r.data || []);
              showToast("Other sessions signed out.");
            }),
          )}
          {action("Sign out all devices", () =>
            run(async () => {
              const { error } = await supabase.auth.signOut({
                scope: "global",
              });
              if (error) throw error;
            }),
          )}
        </>
      )}
      {section === "support" && <HelpIndex />}
      {section === "legal" && <AppPolicies accent={accent} />}
      {guard.protectionError && (
        <Text accessibilityLiveRegion="polite" style={{ color: "#b91c1c" }}>
          Screen capture protection could not start. Avoid entering secrets
          while recording and restart the app.
        </Text>
      )}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  page: {
    padding: 20,
    gap: 16,
    paddingBottom: 100,
    backgroundColor: "#fff",
    flexGrow: 1,
  },
  title: { fontSize: 21, fontWeight: "700", color: "#0f172a" },
  label: { fontSize: 15, fontWeight: "600", color: "#0f172a" },
  hint: { fontSize: 13, color: "#64748b", lineHeight: 19, marginTop: 5 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
  },
  input: {
    borderWidth: 1,
    borderColor: "#94a3b8",
    borderRadius: 0,
    padding: 14,
    fontSize: 16,
  },
  action: { paddingVertical: 14 },
  options: { flexDirection: "row", gap: 18, flexWrap: "wrap" },
});
