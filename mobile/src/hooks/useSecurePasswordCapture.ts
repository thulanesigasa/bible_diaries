import { useRef, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';

const TAG = 'bible_diaries_password_protection';

/**
 * Custom hook to dynamically protect the screen from screen recorders and screenshots
 * strictly while password input is active.
 *
 * - On Android: Activates WindowManager.LayoutParams.FLAG_SECURE. Any screen recorder
 *   (built-in, AZ Screen Recorder, XRecorder, Mobizen, ADB, screen-share) records a
 *   solid black/blank screen.
 * - User experience: The user holding the phone can see and type the password normally.
 * - Outside password entry: Screen recording captures normally.
 */
export function useSecurePasswordCapture() {
  const isProtectedRef = useRef<boolean>(false);

  const enableProtection = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      if (ScreenCapture && typeof ScreenCapture.preventScreenCaptureAsync === 'function') {
        await ScreenCapture.preventScreenCaptureAsync(TAG);
        isProtectedRef.current = true;
      }
    } catch (err) {
      // Safe fallback if module not linked in current binary (e.g., pre-rebuild client)
      console.warn('[Security] Failed to enable screen capture protection:', err);
    }
  }, []);

  const disableProtection = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      if (ScreenCapture && typeof ScreenCapture.allowScreenCaptureAsync === 'function') {
        await ScreenCapture.allowScreenCaptureAsync(TAG);
        isProtectedRef.current = false;
      }
    } catch (err) {
      console.warn('[Security] Failed to disable screen capture protection:', err);
    }
  }, []);

  // Cleanup on unmount to guarantee screen recording is restored if screen closes
  useEffect(() => {
    return () => {
      if (isProtectedRef.current) {
        disableProtection();
      }
    };
  }, [disableProtection]);

  return {
    enableProtection,
    disableProtection,
    onPasswordFocus: enableProtection,
    onPasswordBlur: disableProtection,
  };
}
