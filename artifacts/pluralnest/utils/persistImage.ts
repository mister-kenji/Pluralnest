import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";

const MIME_TO_EXT: Record<string, string> = {
  "image/png":  "png",
  "image/jpeg": "jpg",
  "image/jpg":  "jpg",
  "image/gif":  "gif",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

/**
 * Web: convert blob/object URL → base64 data URL so it survives page reloads.
 * Native: copy from temp cache → documentDirectory so it survives app restarts.
 *
 * Pass `mimeType` (from ImagePicker result) when available — on Android the
 * URI is a content:// path with no extension, so mimeType is the only reliable
 * way to know the format and preserve PNG transparency.
 *
 * Always returns a durable URI string safe to store in AsyncStorage.
 */
export async function persistImage(tempUri: string, mimeType?: string): Promise<string> {
  if (!tempUri) return tempUri;

  // ── Web ──────────────────────────────────────────────────────────────────
  if (Platform.OS === "web") {
    if (tempUri.startsWith("data:")) return tempUri;
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
      return tempUri;
    }
  }

  // ── Native ───────────────────────────────────────────────────────────────
  try {
    const dir = FileSystem.documentDirectory;
    if (!dir) return tempUri;

    // Prefer mimeType (reliable on Android content:// URIs)
    let safeExt: string;
    if (mimeType && MIME_TO_EXT[mimeType.toLowerCase()]) {
      safeExt = MIME_TO_EXT[mimeType.toLowerCase()];
    } else {
      const raw = tempUri.split("?")[0];
      const uriExt = raw.split(".").pop()?.toLowerCase() ?? "";
      safeExt = ["jpg", "jpeg", "png", "gif", "webp"].includes(uriExt) ? uriExt : "jpg";
    }

    const filename = `img_${Date.now()}_${Math.random().toString(36).slice(2)}.${safeExt}`;
    const dest = `${dir}${filename}`;

    await FileSystem.copyAsync({ from: tempUri, to: dest });

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
