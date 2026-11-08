import { DeviceEventEmitter } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import * as LocalAuthentication from "expo-local-authentication";
import { bytesToHex } from "@noble/hashes/utils.js";
import {
  derivePinHash,
  constantTimeEqual,
  failedPinAttempt,
  encryptBackup,
} from "./security-crypto.mjs";
export type LockPolicy = {
  enabled: boolean;
  biometric: boolean;
  privacyShield: boolean;
  timeout: number;
  pin?: { salt: string; hash: string };
  attempts: number;
  retryAt: number;
};
export const DEFAULT_LOCK: LockPolicy = {
  enabled: false,
  biometric: false,
  privacyShield: true,
  timeout: 60,
  attempts: 0,
  retryAt: 0,
};
const key = (id: string) => `diary-lock-${id}`;
export async function readLock(id: string): Promise<LockPolicy> {
  const raw = await SecureStore.getItemAsync(key(id));
  if (!raw) return { ...DEFAULT_LOCK };
  try {
    return { ...DEFAULT_LOCK, ...JSON.parse(raw) };
  } catch {
    throw new Error(
      "Unlock settings could not be read. Sign out and sign in again.",
    );
  }
}
export async function saveLock(id: string, value: LockPolicy) {
  await SecureStore.setItemAsync(key(id), JSON.stringify(value), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}
export async function setPin(id: string, pin: string) {
  if (!/^\d{6}$/.test(pin)) throw new Error("Use a six-digit PIN.");
  const state = await readLock(id),
    salt = bytesToHex(await Crypto.getRandomBytesAsync(16));
  const hash = await derivePinHash(pin, salt);
  await saveLock(id, {
    ...state,
    enabled: true,
    pin: { salt, hash },
    attempts: 0,
    retryAt: 0,
  });
}
export async function verifyPin(id: string, pin: string) {
  const state = await readLock(id);
  if (state.retryAt > Date.now())
    throw new Error("Too many attempts. Wait before trying again.");
  if (!state.pin) return false;
  const actual = await derivePinHash(pin, state.pin.salt);
  if (constantTimeEqual(actual, state.pin.hash)) {
    await saveLock(id, { ...state, attempts: 0, retryAt: 0 });
    return true;
  }
  await saveLock(id, { ...state, ...failedPinAttempt(state.attempts) });
  return false;
}
export async function verifyDevice() {
  if (
    !(await LocalAuthentication.hasHardwareAsync()) ||
    !(await LocalAuthentication.isEnrolledAsync())
  )
    throw new Error("Set up biometrics in your device settings first.");
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Unlock Bible Diaries",
    disableDeviceFallback: true,
    cancelLabel: "Cancel",
    biometricsSecurityLevel: "strong",
  });
  return result.success;
}
export async function encryptExport(text: string, password: string) {
  return encryptBackup(
    text,
    password,
    await Crypto.getRandomBytesAsync(16),
    await Crypto.getRandomBytesAsync(12),
  );
}

export async function clearLock(id: string) {
  await SecureStore.deleteItemAsync(key(id));
  await SecureStore.deleteItemAsync(`diary-audit-${id}`);
  DeviceEventEmitter.emit("diary-lock-policy");
}
export async function readSecurityAudit(id: string) {
  const raw = await SecureStore.getItemAsync(`diary-audit-${id}`);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
export async function recordSecurityEvent(id: string, event: string) {
  const items = await readSecurityAudit(id);
  items.unshift({ event, at: new Date().toISOString() });
  await SecureStore.setItemAsync(
    `diary-audit-${id}`,
    JSON.stringify(items.slice(0, 30)),
    { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY },
  );
}
