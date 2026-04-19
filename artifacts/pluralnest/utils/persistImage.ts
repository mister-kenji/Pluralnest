import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";

/**
 * Copy a temporary image URI (from expo-image-picker cache) into the app's
 * permanent document directory so it survives app restarts and Metro reloads.
 *
 * Returns the permanent URI on success, or the original URI as a fallback.
 * On web, blob/data URIs are returned as-is because FileSystem is not available.
 */
export async function persistImage(tempUri: string): Promise<string> {
  if (Platform.OS === "web") return tempUri;
  if (!tempUri) return tempUri;

  try {
    const dir = FileSystem.documentDirectory;
    if (!dir) return tempUri;

    const ext = tempUri.split(".").pop()?.split("?")[0]?.toLowerCase() ?? "jpg";
    const safeExt = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext) ? ext : "jpg";
    const filename = `img_${Date.now()}_${Math.random().toString(36).slice(2)}.${safeExt}`;
    const dest = `${dir}${filename}`;

    await FileSystem.copyAsync({ from: tempUri, to: dest });

    // Verify the file actually exists at the destination
    const info = await FileSystem.getInfoAsync(dest);
    if (!info.exists) return tempUri;

    return dest;
  } catch {
    return tempUri;
  }
}

/**
 * Check whether a persisted image URI still exists on disk.
 * Returns true for web or non-file URIs (we can't verify those).
 */
export async function imageExists(uri: string): Promise<boolean> {
  if (Platform.OS === "web") return true;
  if (!uri || !uri.startsWith("file://")) return true;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists;
  } catch {
    return false;
  }
}
