import { useStorage } from "@/context/StorageContext";
import colors from "@/constants/colors";

export function useColors() {
  const { data } = useStorage();
  const accent = data?.settings?.accentColor ?? colors.dark.primary;
  return { ...colors.dark, primary: accent, accent, tint: accent, radius: colors.radius };
}
