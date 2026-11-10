import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as Updates from 'expo-updates';

export interface OTAUpdateState {
  isUpdateAvailable: boolean;
  isCheckingForUpdate: boolean;
  isDownloading: boolean;
  error: string;
  applyUpdate: () => Promise<void>;
  dismissUpdate: () => void;
}

/**
 * useOTAUpdate
 *
 * Checks for available OTA (Over-The-Air) updates on mount and whenever
 * the application returns to the foreground. Exposes state that drives
 * <UpdateModal> so the user can apply the update without reinstalling.
 */
export function useOTAUpdate(): OTAUpdateState {
  const checking=useRef(false),lastCheck=useRef(0);
  const [error,setError]=useState('');
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isCheckingForUpdate, setIsCheckingForUpdate] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const checkForUpdate = useCallback(async () => {
    // expo-updates is a no-op in Expo Go / dev client — guard accordingly
    if (Platform.OS==='web' || !Updates.isEnabled || __DEV__) return;

    if(checking.current||Date.now()-lastCheck.current<60000)return;
    checking.current=true;lastCheck.current=Date.now();
    try {
      setIsCheckingForUpdate(true);
      console.log('[OTA] Checking for available bundle updates on runtime:', Updates.runtimeVersion);
      const result = await Updates.checkForUpdateAsync();
      console.log('[OTA] Update check result: isAvailable =', result.isAvailable);
      if (result.isAvailable) {
        setIsUpdateAvailable(true);
      }
    } catch (e) {
      console.warn('[OTA] Update check unavailable.');
    } finally {
      checking.current=false;setIsCheckingForUpdate(false);
    }
  }, []);

  // Check on mount and whenever app transitions to foreground
  useEffect(() => {
    checkForUpdate();

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkForUpdate();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkForUpdate]);

  const applyUpdate = useCallback(async () => {
    if (Platform.OS==='web' || !Updates.isEnabled || __DEV__) return;
    try {
      setError('');setIsDownloading(true);
      await Updates.fetchUpdateAsync();
      // Reload the app with the freshly downloaded bundle
      await Updates.reloadAsync();
    } catch (e) {
      setError('The update could not download. Check your connection and try again.');
      setIsDownloading(false);
    }
  }, []);

  const dismissUpdate = useCallback(() => {
    setIsUpdateAvailable(false);
  }, []);

  return {
    error,
    isUpdateAvailable,
    isCheckingForUpdate,
    isDownloading,
    applyUpdate,
    dismissUpdate,
  };
}
