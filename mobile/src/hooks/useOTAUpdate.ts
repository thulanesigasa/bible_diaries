import { useState, useEffect, useCallback } from 'react';
import * as Updates from 'expo-updates';

export interface OTAUpdateState {
  isUpdateAvailable: boolean;
  isCheckingForUpdate: boolean;
  isDownloading: boolean;
  applyUpdate: () => Promise<void>;
  dismissUpdate: () => void;
}

/**
 * useOTAUpdate
 *
 * Checks for available OTA (Over-The-Air) updates on mount.
 * Exposes state that drives <UpdateModal> so the user can apply
 * the update without reinstalling the application.
 *
 * OTA updates deliver only JS / asset changes. A native rebuild is
 * only required when native modules change (rare).
 */
export function useOTAUpdate(): OTAUpdateState {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isCheckingForUpdate, setIsCheckingForUpdate] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const checkForUpdate = useCallback(async () => {
    // expo-updates is a no-op in Expo Go / dev client — guard accordingly
    if (!Updates.isEnabled || __DEV__) return;

    try {
      setIsCheckingForUpdate(true);
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) {
        setIsUpdateAvailable(true);
      }
    } catch (e) {
      // Silently ignore network / server errors — update check is best-effort
      console.warn('[OTA] Update check failed:', e);
    } finally {
      setIsCheckingForUpdate(false);
    }
  }, []);

  // Run a single update check on mount
  useEffect(() => {
    checkForUpdate();
  }, [checkForUpdate]);

  const applyUpdate = useCallback(async () => {
    if (!Updates.isEnabled || __DEV__) return;
    try {
      setIsDownloading(true);
      await Updates.fetchUpdateAsync();
      // Reload the app with the freshly downloaded bundle
      await Updates.reloadAsync();
    } catch (e) {
      console.warn('[OTA] Failed to apply update:', e);
      setIsDownloading(false);
    }
  }, []);

  const dismissUpdate = useCallback(() => {
    setIsUpdateAvailable(false);
  }, []);

  return {
    isUpdateAvailable,
    isCheckingForUpdate,
    isDownloading,
    applyUpdate,
    dismissUpdate,
  };
}
