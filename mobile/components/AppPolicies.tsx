import React from "react";
import { View, Text } from "react-native";
import PolicyLinks from "./PolicyLinks";
export default function AppPolicies({ accent }: { accent: string }) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 13, lineHeight: 21, color: "#64748b" }}>
        Understand your information, your responsibilities and the care we owe
        one another. Open a document to read it on its own screen.
      </Text>
      <PolicyLinks accent={accent} />
    </View>
  );
}
