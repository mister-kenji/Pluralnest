import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";

/**
 * Copy a temporary image URI (from expo-image-picker cache) into the app's
 * permanent document directory so it survives app restarts and Metro reloads.
 *
 * On web, blob/data URIs are returned as-is because FileSystem is not available.
 */
export async function persistImage(tempUri: string): Promise<string> {
  if (Platform.OS === "web") return tempUri;
  if (!tempUri) return tempUri;

  try {
    const dir = FileSystem.documentDirectory;
    if (!dir) return tempUri;

    const ext = tempUri.split(".").pop()?.split("?")[0] ?? "jpg";
    const filename = `img_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const dest = `${dir}${filename}`;

    await FileSystem.copyAsync({ from: tempUri, to: dest });
    return dest;
  } catch {
    return tempUri;
  }
}
