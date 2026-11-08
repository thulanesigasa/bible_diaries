import { Platform } from "react-native";
import { useDiarySettings } from "./useDiarySettings";
export function useReadingStyle() {
  const { settings } = useDiarySettings();
  return {
    fontSize: settings.font_size,
    lineHeight: settings.font_size * settings.line_spacing,
    fontFamily:
      settings.font_family === "mono"
        ? "SpaceMono"
        : settings.font_family === "serif"
          ? Platform.OS === "ios"
            ? "Georgia"
            : "serif"
          : undefined,
  };
}
