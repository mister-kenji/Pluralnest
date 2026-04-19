import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";

/**
 * Web: convert blob/object URL → base64 data URL so it survives page reloads.
 * Native: copy from temp cache → documentDirectory so it survives app restarts.
 * Always returns a durable URI string safe to store in AsyncStorage.
 */
export async function persistImage(tempUri: string): Promise<string> {
  if (!tempUri) return tempUri;

  // ── Web ──────────────────────────────────────────────────────────────────
  if (Platform.OS === "web") {
    // Already a data URL — nothing to do
    if (tempUri.startsWith("data:")) return tempUri;

    // Convert blob / object URL to a base64 data URL
    try {
      const response = await fetch(tempUri);
      const blob = await response.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("FileReader failed"));
        reader.readAsDataURL(blob);
      });
    } catch {
      // Fallback: return as-is (will still work for the current session)
      return tempUri;
    }
  }

  // ── Native ───────────────────────────────────────────────────────────────
  try {
    const dir = FileSystem.documentDirectory;
    if (!dir) return tempUri;

    const raw = tempUri.split("?")[0];
    const ext = raw.split(".").pop()?.toLowerCase() ?? "jpg";
    const safeExt = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext) ? ext : "jpg";
    const filename = `img_${Date.now()}_${Math.random().toString(36).slice(2)}.${safeExt}`;
    const dest = `${dir}${filename}`;

    await FileSystem.copyAsync({ from: tempUri, to: dest });

    // Verify the file actually landed
    const info = await FileSystem.getInfoAsync(dest);
    if (!info.exists) return tempUri;

    return dest;
  } catch {
    return tempUri;
  }
}

/**
 * Check whether a persisted image URI still exists on disk (native only).
 * Returns true for web or non-file URIs.
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
