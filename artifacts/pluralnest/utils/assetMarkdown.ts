import type { Asset } from "@/context/StorageContext";

/**
 * Replace (@asset_name) tokens in a markdown string with inline image syntax
 * pointing at the locally stored asset URI.
 *
 * Example:  "Look at (@my_pic) above"
 *  becomes: "Look at ![my_pic](file:///...) above"
 */
export function expandAssetTokens(text: string, assets: Asset[]): string {
  if (!text || assets.length === 0) return text;

  return text.replace(/\(@([^)]+)\)/g, (match, rawName) => {
    const name = rawName.trim().toLowerCase();
    const asset = assets.find((a) => a.name.trim().toLowerCase() === name);
    if (!asset) return match;
    return `![${asset.name}](${asset.uri})`;
  });
}
