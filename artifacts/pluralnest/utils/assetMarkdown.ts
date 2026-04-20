import type { Asset } from "@/context/StorageContext";

/**
 * Parse a size string like "80", "80x80", "80x120", "80x120px" into {w, h}.
 * Returns null if the string is not a valid size.
 */
export function parseAssetSize(raw: string): { w: number; h: number } | null {
  const s = raw.trim().toLowerCase().replace(/px/g, "");
  const match = s.match(/^(\d+)(?:x(\d+))?$/);
  if (!match) return null;
  const w = parseInt(match[1], 10);
  const h = match[2] ? parseInt(match[2], 10) : w;
  if (!w || !h) return null;
  return { w, h };
}

/**
 * Replace (@asset_name) or (@asset_name:WxH) tokens in a markdown string with
 * inline image syntax pointing at the locally stored asset URI.
 *
 * Size is encoded in the optional markdown title slot so the URI stays clean:
 *   (@my_pic)          → ![my_pic](file:///...)
 *   (@my_pic:80)       → ![my_pic](file:///... "80x80")
 *   (@my_pic:200x120)  → ![my_pic](file:///... "200x120")
 *   (@my_pic:200x120px)→ ![my_pic](file:///... "200x120")
 */
export function expandAssetTokens(text: string, assets: Asset[]): string {
  if (!text || !assets || assets.length === 0) return text;

  return text.replace(/\(@([^):]+)(?::([^)]*))?\)/g, (match, rawName, rawSize) => {
    const name = rawName.trim().toLowerCase();
    const asset = assets.find((a) => a.name.trim().toLowerCase() === name);
    if (!asset) return match;

    if (rawSize) {
      const size = parseAssetSize(rawSize);
      if (size) {
        return `![${asset.name}](${asset.uri} "${size.w}x${size.h}")`;
      }
    }

    return `![${asset.name}](${asset.uri})`;
  });
}

/**
 * Convert `-> text <-` lines into a fenced code block with language "center"
 * so the markdown renderer can apply centered text styling.
 *
 * Example:  "|> Hello world <|"
 *  becomes: "```center\nHello world\n```"
 */
export function applyCenterSyntax(text: string): string {
  if (!text) return text;
  return text.replace(/^\|>\s*(.*?)\s*<\|$/gm, (_match, content) => {
    return "```center\n" + content + "\n```";
  });
}

/** Run all markdown preprocessors in order. */
export function preprocessMarkdown(text: string, assets: Asset[]): string {
  return applyCenterSyntax(expandAssetTokens(text, assets));
}
