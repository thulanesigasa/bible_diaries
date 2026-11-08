import React, { useEffect, useRef, useState } from "react";
import {
  AppState,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  DeviceEventEmitter,
  Platform,
  ActivityIndicator,
  Modal,
} from "react-native";
import * as ScreenCapture from "expo-screen-capture";
import {
  readLock,
  verifyPin,
  verifyDevice,
  LockPolicy,
  DEFAULT_LOCK,
} from "../src/lib/app-lock";
import { useSecurePasswordCapture } from "../src/hooks/useSecurePasswordCapture";
import { supabase } from "../src/lib/supabase";
export default function AppLockGate({
  userId,
  children,
}: {
  userId?: string;
  children: React.ReactNode;
}) {
  const [policy, setPolicy] = useState<LockPolicy>(DEFAULT_LOCK),
    [loadedFor, setLoadedFor] = useState(""),
    [locked, setLocked] = useState(false),
    [background, setBackground] = useState(false),
    [pin, setPin] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const lastActive = useRef(Date.now()),
    currentPolicy = useRef(policy);
  currentPolicy.current = policy;
  const lockedRef=useRef(locked);lockedRef.current=locked;
  const guard = useSecurePasswordCapture();
  useEffect(() => {
    if (!userId || Platform.OS === "web") {
      setLoadedFor(userId || "");
      return;
    }
    let alive = true;
    const lockNow=async()=>{await guard.enableProtection();if(alive)setLocked(true);};
    const reload = async (initial = false) => {
      try {
        const p = await readLock(userId);
        if (!alive) return;
        setPolicy(p);
        if(initial&&p.enabled)await lockNow();else if(!p.enabled){setLocked(false);guard.disableProtection();}
        setLoadedFor(userId);
        if (Platform.OS === "ios") {
          if (p.privacyShield)
            await ScreenCapture.enableAppSwitcherProtectionAsync(1);
          else await ScreenCapture.disableAppSwitcherProtectionAsync();
        }
      } catch {
        if (alive) {
          setLoadedFor(userId);
          void lockNow();
          setMessage(
            "Unlock settings are unavailable. Sign out and sign in again.",
          );
        }
      }
    };
    void reload(true);
    const update = DeviceEventEmitter.addListener("diary-lock-policy", () =>
      reload(),
    );
    const sub = AppState.addEventListener("change", (state) => {
      setBackground(state !== "active");
      if (state === "active") {
        if (
          !lockedRef.current && currentPolicy.current.enabled &&
          Date.now() - lastActive.current >=
            currentPolicy.current.timeout * 1000
        )
          void lockNow();
      } else {
        setPin("");
      }
    });
    const timer = setInterval(() => {
      if (
        !lockedRef.current && AppState.currentState === "active" &&
        currentPolicy.current.enabled &&
        Date.now() - lastActive.current >= currentPolicy.current.timeout * 1000
      ) {
        void lockNow();
        setPin("");
      }
    }, 5000);
    return () => {
      alive = false;
      sub.remove();
      update.remove();
      clearInterval(timer);
      guard.disableProtection();
      if (Platform.OS === "ios")
        void ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => {});
    };
  }, [userId]);
  const unlock = async (biometric = false) => {
    if (!userId || busy) return;
    setBusy(true);
    setMessage("");
    try {
      await guard.enableProtection();
      const ok = biometric
        ? await verifyDevice()
        : await verifyPin(userId, pin);
      if (!ok) throw new Error("Verification was not successful.");
      lastActive.current = Date.now();
      setLocked(false);
      setPin("");
    } catch (e: any) {
      setMessage(e.message);
      setPin("");
    } finally {
      guard.disableProtection();
      setBusy(false);
    }
  };
  if (userId && loadedFor !== userId && Platform.OS !== "web")
    return (
      <View style={s.center}>
        <ActivityIndicator />
      </View>
    );
  return (
    <View
      style={{ flex: 1 }}
      onTouchStart={() => {
        if (!locked) lastActive.current = Date.now();
      }}
    >
      <View style={{flex:1}} accessibilityElementsHidden={locked||background} importantForAccessibility={locked||background?"no-hide-descendants":"auto"}>{children}</View>
      {((locked && !!userId) || (background && policy.privacyShield)) && (
        <Modal visible animationType="none" onRequestClose={()=>{}}><View style={s.cover} accessibilityViewIsModal>
          {background ? (
            <View />
          ) : (
            <>
              <Text style={s.title}>Bible Diaries is locked</Text>
              <Text>Your reflections remain covered until you unlock.</Text>
              {policy.pin && (
                <>
                  <TextInput
                    accessibilityLabel="App unlock PIN"
                    secureTextEntry
                    keyboardType="number-pad"
                    maxLength={6}
                    value={pin}
                    onChangeText={setPin}
                    onFocus={guard.onPasswordFocus}
                    onBlur={guard.onPasswordBlur}
                    style={s.input}
                  />
                  <TouchableOpacity disabled={busy} onPress={() => unlock()}>
                    <Text style={s.link}>Unlock with PIN</Text>
                  </TouchableOpacity>
                </>
              )}
              {policy.biometric && (
                <TouchableOpacity disabled={busy} onPress={() => unlock(true)}>
                  <Text style={s.link}>Unlock with biometrics</Text>
                </TouchableOpacity>
              )}
              <Text accessibilityLiveRegion="polite">{message}</Text>
              <TouchableOpacity
                disabled={busy}
                onPress={() => supabase.auth.signOut({ scope: "local" })}
              >
                <Text style={s.link}>Sign out instead</Text>
              </TouchableOpacity>
            </>
          )}
        </View></Modal>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  cover: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    zIndex: 10000,
    elevation: 100,
    justifyContent: "center",
    padding: 28,
    gap: 22,
  },
  title: { fontSize: 25, fontWeight: "700", color: "#0f172a" },
  input: {
    borderWidth: 1,
    borderColor: "#94a3b8",
    padding: 16,
    borderRadius: 10,
  },
  link: { fontSize: 17, color: "#0369a1", fontWeight: "600" },
});
