import React from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Linking,
  StyleSheet,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { HELP_PAGES } from "../../../shared/help-content.mjs";
export default function Help() {
  const { slug } = useLocalSearchParams<{ slug: string }>(),
    router = useRouter(),
    page = Object.prototype.hasOwnProperty.call(HELP_PAGES, slug)
      ? (HELP_PAGES as any)[slug]
      : null;
  if (!page) return <Text>Guide unavailable. Return to Support & safety.</Text>;
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.page}>
      <Stack.Screen
        options={{
          title: page.title,
          headerShown: true,
          headerTitleStyle: { fontSize: 17, fontWeight: "600" },
          headerTintColor: "#0369a1",
          headerLargeTitle: false,
          headerShadowVisible: false,
        }}
      />
      <Text style={s.intro}>{page.intro}</Text>
      {page.sections.map(([heading, body]: string[]) => (
        <View key={heading} style={s.section}>
          <Text accessibilityRole="header" style={s.heading}>
            {heading}
          </Text>
          <Text style={s.text}>{body}</Text>
        </View>
      ))}
      <TouchableOpacity
        accessibilityRole="link"
        style={s.link}
        onPress={() =>
          Linking.openURL(
            `mailto:support@ts-industries.com?subject=${encodeURIComponent("Bible Diaries — " + page.title)}`,
          )
        }
      >
        <Text style={s.blue}>Contact support@ts-industries.com</Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        style={s.link}
        onPress={() => router.push("/policies/privacy" as any)}
      >
        <Text style={s.blue}>Read the privacy policy</Text>
      </TouchableOpacity>
      <Text style={s.intro}>
        Support is not an emergency service. Never send passwords, PINs,
        authenticator setup keys or one-time codes.
      </Text>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  page: {
    padding: 22,
    paddingBottom: 50,
    gap: 24,
    maxWidth: 760,
    width: "100%",
    alignSelf: "center",
  },
  intro: { fontSize: 14, lineHeight: 23, color: "#475569" },
  section: { gap: 8 },
  heading: { fontSize: 15, fontWeight: "600", color: "#172033" },
  text: { fontSize: 14, lineHeight: 24, color: "#526175" },
  link: {
    minHeight: 48,
    justifyContent: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#dbe4ed",
  },
  blue: { fontSize: 14, color: "#0369a1" },
});
