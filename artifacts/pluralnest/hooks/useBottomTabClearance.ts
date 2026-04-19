import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isLiquidGlassAvailable } from "expo-glass-effect";

/**
 * Returns the paddingBottom a scroll view needs to clear the tab bar.
 * - Web: 84 (tab bar) + extra
 * - NativeTabs (iOS liquid glass): system manages its own safe area, just add a little buffer
 * - Classic tab bar (Android / iOS without liquid glass): 60 + insets.bottom + buffer
 */
export function useBottomTabClearance(extra = 16): number {
  const insets = useSafeAreaInsets();
  if (Platform.OS === "web") return 84 + extra;
  if (isLiquidGlassAvailable()) return insets.bottom + extra;
  return 60 + insets.bottom + extra;
}
