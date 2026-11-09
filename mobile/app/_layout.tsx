import EligibilityGate from "../components/EligibilityGate";
import AppLockGate from "../components/AppLockGate";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../src/lib/supabase";
import UpdateModal from "../components/UpdateModal";
import { useOTAUpdate } from "../src/hooks/useOTAUpdate";

// Prevent splash screen auto-hiding
SplashScreen.preventAutoHideAsync();

// Create Global App Context
const AppContext = createContext<{
  user: any;
  profile: any;
  setProfile: React.Dispatch<React.SetStateAction<any>>;
  showToast: (msg: string, type?: "success" | "error") => void;
  loading: boolean;
  hideTabBar: boolean;
  setHideTabBar: React.Dispatch<React.SetStateAction<boolean>>;
  accent: string;
  supabase: any;
} | null>(null);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  const [user, setUser] = useState<any>(null);
  const userIdRef = useRef<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hideTabBar, setHideTabBar] = useState(false);
  const [toasts, setToasts] = useState<
    { id: string; message: string; type?: "success" | "error" }[]
  >([]);

  // OTA update state — drives the <UpdateModal> overlay
  const { isUpdateAvailable, isDownloading, applyUpdate, dismissUpdate } =
    useOTAUpdate();

  const router = useRouter();
  const segments = useSegments();

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    const id = Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId);

      if (userIdRef.current !== userId) return;
      if (error) {
        console.error("Operation failed.");
        setLoading(false);
      } else if (data && data.length > 0) {
        const { data: contacts } = await supabase
          .from("profile_contacts")
          .select("address,phone_number")
          .eq("user_id", userId)
          .maybeSingle();
        if (userIdRef.current !== userId) return;
        setProfile({ ...data[0], ...contacts });
        setLoading(false);
      } else {
        setProfile(null);
        setLoading(false);
      }
    } catch (e) {
      console.error("Operation failed.");
      setLoading(false);
    }
  };

  // Auth Listener
  useEffect(() => {
    let authChanged = false,
      active = true;
    supabase.auth.getUser().then(({ data: { user } }: any) => {
      if (!active || authChanged) return;
      userIdRef.current = user?.id || null;
      setUser(user);
      if (user) {
        fetchProfile(user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: string, session: any) => {
      if (!active) return;
      authChanged = true;
      const activeUser = session?.user ?? null;
      userIdRef.current = activeUser?.id || null;
      setProfile(null);
      setUser(activeUser);
      if (activeUser) {
        setTimeout(() => fetchProfile(activeUser.id), 0);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      userIdRef.current = null;
      subscription.unsubscribe();
    };
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

    const inAuthGroup = segments[0] === "(auth)";

    if (
      !user &&
      !inAuthGroup &&
      segments[0] !== "policies" &&
      segments[0] !== "help"
    ) {
      // Redirect to login if user is not logged in and not in the auth directory
      router.replace("/(auth)/login");
    } else if (
      user &&
      inAuthGroup &&
      !segments.join("/").endsWith("reset-password") &&
      !segments.join("/").endsWith("complete-registration")
    ) {
      // Redirect to feed tab if logged in
      router.replace("/(tabs)");
    }
  }, [user, loading, segments, fontsLoaded]);

  // Derive accent from gender stored in profile
  const accent = profile?.gender === "Female" ? "#EC4899" : "#0EA5E9";

  if (!fontsLoaded || (loading && !user)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={accent} />
        <Text style={styles.loadingText}>Aligning hearts...</Text>
      </View>
    );
  }

  return (
    <AppContext.Provider
      value={{
        user,
        profile,
        setProfile,
        showToast,
        loading,
        hideTabBar,
        setHideTabBar,
        accent,
        supabase,
      }}
    >
      <AppLockGate userId={user?.id}>
        <EligibilityGate
          user={user}
          bypass={
            segments.join("/").endsWith("reset-password") ||
            segments.join("/").endsWith("complete-registration") ||
            segments[0] === "policies" ||
            segments[0] === "help"
          }
          onReady={() => user && fetchProfile(user.id)}
        >
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="policies/[slug]"
              options={{
                headerShown: true,
                title: "Policies",
                headerTitleStyle: { fontSize: 17, fontWeight: "600" },
                headerLargeTitle: false,
              }}
            />
            <Stack.Screen
              name="help/[slug]"
              options={{
                headerShown: true,
                title: "Support & safety",
                headerTitleStyle: { fontSize: 17, fontWeight: "600" },
                headerLargeTitle: false,
              }}
            />
            <Stack.Screen name="(auth)" />
            <Stack.Screen
              name="post/[id]"
              options={{
                headerShown: true,
                title: "Reflection",
                headerTintColor: accent,
              }}
            />
            <Stack.Screen
              name="profile/[id]"
              options={{
                headerShown: true,
                title: "Member Profile",
                headerTintColor: accent,
              }}
            />
            <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
            <Stack.Screen
              name="safety"
              options={{
                headerShown: true,
                title: "Safety & reports",
                headerTintColor: accent,
              }}
            />
            <Stack.Screen
              name="guardian"
              options={{
                headerShown: true,
                title: "Guardian permissions",
                headerTintColor: accent,
              }}
            />
            <Stack.Screen
              name="achievements"
              options={{
                headerShown: true,
                title: "Achievements",
                headerTintColor: accent,
              }}
            />
            <Stack.Screen
              name="activity"
              options={{
                headerShown: true,
                title: "Activity",
                headerTintColor: accent,
                headerTitleStyle: { fontSize: 17, fontWeight: "600" },
                headerLargeTitle: false,
              }}
            />
            <Stack.Screen
              name="reviews"
              options={{
                headerShown: true,
                title: "My reviews & appeals",
                headerTintColor: accent,
                headerTitleStyle: { fontSize: 17, fontWeight: "600" },
                headerLargeTitle: false,
                headerShadowVisible: false,
              }}
            />
            <Stack.Screen
              name="settings/[section]"
              options={{
                headerShown: true,
                title: "Settings",
                headerTintColor: accent,
              }}
            />
            <Stack.Screen
              name="settings/account"
              options={{
                headerShown: true,
                title: "Personal details",
                headerTintColor: accent,
              }}
            />
          </Stack>
        </EligibilityGate>

        {/* Floating Toast notification HUD overlay */}
        <View style={styles.toastContainer} pointerEvents="none">
          {toasts.map((toast) => (
            <View
              key={toast.id}
              style={[
                styles.toast,
                { borderLeftColor: accent },
                toast.type === "error" && styles.toastError,
              ]}
            >
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
      </AppLockGate>
    </AppContext.Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#475569",
    fontStyle: "italic",
    fontSize: 15,
  },
  toastContainer: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: "center",
    zIndex: 9999,
  },
  toast: {
    backgroundColor: "#0F172A",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    width: "100%",
  },
  toastError: {
    borderLeftColor: "#EF4444",
  },
  toastText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
});
