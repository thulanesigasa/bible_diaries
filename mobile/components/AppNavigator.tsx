import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { useMemberAccess } from "./EligibilityGate";

// The navigator stays mounted for public deep links and eligibility redirects,
// but member screens cannot mount (or query the database) before access is ready.
export default function AppNavigator({ accent }: { accent: string }) {
  const canAccess = useMemberAccess();
  const router = useRouter();
  const segments = useSegments();
  useEffect(() => {
    if (canAccess && segments[0] === "(auth)" &&
        !segments.join("/").endsWith("reset-password") &&
        !segments.join("/").endsWith("complete-registration")) {
      router.replace("/(tabs)");
    }
  }, [canAccess, segments, router]);
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="auth/confirm" />
      <Stack.Protected guard={canAccess}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
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
      <Stack.Protected guard={canAccess}>
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
      </Stack.Protected>
    </Stack>
  );
}

