import { pbkdf2Async } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import { gcm } from "@noble/ciphers/aes.js";
export async function derivePinHash(pin, salt) {
  return bytesToHex(
    await pbkdf2Async(sha256, pin, hexToBytes(salt), { c: 210000, dkLen: 32 }),
  );
}
export function constantTimeEqual(actual, expected) {
  let diff = actual.length ^ expected.length;
  for (let i = 0; i < actual.length; i++)
    diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
export function failedPinAttempt(attempts, now = Date.now()) {
  const count = attempts + 1;
  return {
    attempts: count,
    retryAt:
      count >= 5
        ? now + Math.min(900000, 30000 * 2 ** Math.min(count - 5, 5))
        : 0,
  };
}
export async function encryptBackup(text, password, salt, iv) {
  if (password.length < 12)
    throw Error("Use an export password of at least 12 characters.");
  const secret = await pbkdf2Async(sha256, password, salt, {
    c: 210000,
    dkLen: 32,
  });
  const ciphertext = gcm(secret, iv).encrypt(new TextEncoder().encode(text));
  return JSON.stringify({
    format: "bible-diaries-encrypted-v1",
    kdf: "PBKDF2-SHA256",
    iterations: 210000,
    cipher: "AES-256-GCM",
    salt: bytesToHex(salt),
    iv: bytesToHex(iv),
    ciphertext: bytesToHex(ciphertext),
  });
}
