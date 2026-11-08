import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as ScreenCapture from "expo-screen-capture";
import { createPasswordCapture } from "../lib/password-capture.mjs";
let nextKey = 0;
// Protect focused sensitive fields, including revealed passwords. Browsers cannot
// reliably prevent OS recording. Native protection is released on blur/unmount.
export function useSecurePasswordCapture() {
  const [protectionError, setProtectionError] = useState(false);
  const controller = useRef<ReturnType<typeof createPasswordCapture> | null>(
    null,
  );
  useEffect(() => {
    if (Platform.OS === "web") return;
    let active = true;
    const guard = createPasswordCapture(
      ScreenCapture,
      `diary-password-${++nextKey}`,
      () => {
        if (active) setProtectionError(true);
      },
    );
    controller.current = guard;
    return () => {
      active = false;
      controller.current = null;
      void guard.dispose();
    };
  }, []);
  return {
    onPasswordFocus: () => controller.current?.focus(),
    onPasswordBlur: () => controller.current?.blur(),
    enableProtection: () => controller.current?.focus(),
    disableProtection: () => controller.current?.blur(),
    protectionError,
  };
}
