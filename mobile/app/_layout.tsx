import React, { createContext, useContext, useState, useEffect } from 'react';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../src/lib/supabase';
import UpdateModal from '../components/UpdateModal';
import { useOTAUpdate } from '../src/hooks/useOTAUpdate';

// Prevent splash screen auto-hiding
SplashScreen.preventAutoHideAsync();

// Create Global App Context
const AppContext = createContext<{
  user: any;
  profile: any;
  setProfile: React.Dispatch<React.SetStateAction<any>>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  loading: boolean;
  hideTabBar: boolean;
  setHideTabBar: React.Dispatch<React.SetStateAction<boolean>>;
  accent: string;
  supabase: any;
} | null>(null);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hideTabBar, setHideTabBar] = useState(false);
  const [toasts, setToasts] = useState<{ id: string; message: string; type?: 'success' | 'error' }[]>([]);

  // OTA update state — drives the <UpdateModal> overlay
  const { isUpdateAvailable, isDownloading, applyUpdate, dismissUpdate } = useOTAUpdate();

  const router = useRouter();
  const segments = useSegments();

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId);

      if (error) {
        console.error('Fetch profile error:', error.message);
        setLoading(false);
      } else if (data && data.length > 0) {
        setProfile(data[0]);
        setLoading(false);
      } else {
        // Self-heal: profile row is missing in public.profiles table!
        // We will read user metadata and insert it into profiles dynamically
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const meta = authUser.user_metadata || {};
          const fName = meta.first_name || meta.full_name?.split(' ')[0] || 'Believer';
          const sName = meta.surname || meta.full_name?.split(' ').slice(1).join(' ') || '';
          
          const newProfile = {
            id: userId,
            first_name: fName,
            surname: sName,
            full_name: meta.full_name || `${fName} ${sName}`.trim(),
            address: meta.address || '',
            phone_number: meta.phone_number || '',
            avatar_url: meta.avatar_url || null,
            gender: meta.gender || 'Male',
            bio: 'Walking in faith.',
            favorite_verse: '',
            spiritual_journey: ''
          };

          const { error: insertError } = await supabase
            .from('profiles')
            .insert(newProfile);

          if (insertError) {
            console.error('Self-healing profile insert failed:', insertError.message);
          } else {
            setProfile(newProfile);
          }
        }
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  // Auth Listener
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        fetchProfile(user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Layout client ID:', (supabase as any).instanceId, 'Auth event:', event, 'Has session:', !!session, 'Session user:', session?.user?.email);
      const activeUser = session?.user ?? null;
      setUser(activeUser);
      if (activeUser) {
        fetchProfile(activeUser.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle splash screen hiding
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Auth Redirection Guard
  useEffect(() => {
    if (loading || !fontsLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect to login if user is not logged in and not in the auth directory
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Redirect to feed tab if logged in
      router.replace('/(tabs)');
    }
  }, [user, loading, segments, fontsLoaded]);

  // Derive accent from gender stored in profile
  const accent = profile?.gender === 'Female' ? '#EC4899' : '#0EA5E9';

  if (!fontsLoaded || (loading && !user)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={accent} />
        <Text style={styles.loadingText}>Aligning hearts...</Text>
      </View>
    );
  }

  return (
    <AppContext.Provider value={{ user, profile, setProfile, showToast, loading, hideTabBar, setHideTabBar, accent, supabase }}>
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="post/[id]" options={{ headerShown: true, title: 'Reflection', headerTintColor: accent }} />
          <Stack.Screen name="profile/[id]" options={{ headerShown: true, title: 'Member Profile', headerTintColor: accent }} />
          <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
        </Stack>

        {/* Floating Toast notification HUD overlay */}
        <View style={styles.toastContainer} pointerEvents="none">
          {toasts.map((toast) => (
            <View key={toast.id} style={[styles.toast, { borderLeftColor: accent }, toast.type === 'error' && styles.toastError]}>
              <Text style={styles.toastText}>{toast.message}</Text>
            </View>
          ))}
        </View>

        {/* OTA Update Modal — only visible in production when a new bundle is available */}
        <UpdateModal
          visible={isUpdateAvailable}
          isDownloading={isDownloading}
          onUpdate={applyUpdate}
          onDismiss={dismissUpdate}
          accent={accent}
        />
      </View>
    </AppContext.Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#475569',
    fontStyle: 'italic',
    fontSize: 15,
  },
  toastContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    width: '100%',
  },
  toastError: {
    borderLeftColor: '#EF4444',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});
