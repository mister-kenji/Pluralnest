import React from "react";
import { Linking, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

type Props = {
  content: string;
  style?: object;
};

function parseMarkdown(text: string) {
  return text.split("\n");
}

// Inline token regex: bold, italic, inline-code, link
const INLINE_RE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/;

function parseLink(token: string): { label: string; url: string } | null {
  const m = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  if (!m) return null;
  return { label: m[1], url: m[2] };
}

function openUrl(url: string) {
  // Prepend https:// if no scheme so bare domains still work
  const target = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  Linking.openURL(target).catch(() => {});
}

export function MarkdownText({ content, style }: Props) {
  const colors = useColors();

  const renderInline = (line: string, lineIndex: number) => {
    const parts = line.split(INLINE_RE);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <Text key={i} style={{ fontFamily: "Inter_700Bold" }}>
            {part.slice(2, -2)}
          </Text>
        );
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return (
          <Text key={i} style={{ fontStyle: "italic" }}>
            {part.slice(1, -1)}
          </Text>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <Text
            key={i}
            style={{
              fontFamily: "Inter_400Regular",
              backgroundColor: colors.muted,
              color: colors.primary,
            }}
          >
            {part.slice(1, -1)}
          </Text>
        );
      }
      const link = parseLink(part);
      if (link) {
        return (
          <Text
            key={i}
            style={{ color: colors.primary, textDecorationLine: "underline" }}
            onPress={() => openUrl(link.url)}
            accessibilityRole="link"
            accessibilityLabel={link.label}
          >
            {link.label}
          </Text>
        );
      }
      return part;
    });
  };

  const renderLine = (line: string, index: number) => {
    // Headings
    if (line.startsWith("# ")) {
      return (
        <Text key={index} style={[styles.h1, { color: colors.foreground }]}>
          {line.slice(2)}
        </Text>
      );
    }
    if (line.startsWith("## ")) {
      return (
        <Text key={index} style={[styles.h2, { color: colors.foreground }]}>
          {line.slice(3)}
        </Text>
      );
    }
    if (line.startsWith("### ")) {
      return (
        <Text key={index} style={[styles.h3, { color: colors.foreground }]}>
          {line.slice(4)}
        </Text>
      );
    }

    // Horizontal rule: --- or *** or ___ (optionally with spaces)
    if (/^(\s*[-*_]){3,}\s*$/.test(line)) {
      return (
        <View
          key={index}
          style={[styles.hr, { backgroundColor: colors.border }]}
        />
      );
    }

    // Blockquote
    if (line.startsWith("> ") || line === ">") {
      const inner = line.startsWith("> ") ? line.slice(2) : "";
      return (
        <View
          key={index}
          style={[styles.blockquote, { borderLeftColor: colors.primary }]}
        >
          <Text
            style={[styles.blockquoteText, { color: colors.mutedForeground }]}
          >
            {renderInline(inner, index)}
          </Text>
        </View>
      );
    }

    // Bullet list
    if (line.startsWith("- ") || line.startsWith("* ")) {
      return (
        <View key={index} style={styles.bulletRow}>
          <Text style={[styles.bullet, { color: colors.mutedForeground }]}>
            •
          </Text>
          <Text style={[styles.body, { color: colors.foreground }, style]}>
            {renderInline(line.slice(2), index)}
          </Text>
        </View>
      );
    }

    // Blank line spacer
    if (line === "") {
      return <View key={index} style={styles.spacer} />;
    }

    // Regular body paragraph (with inline formatting)
    return (
      <Text key={index} style={[styles.body, { color: colors.foreground }, style]}>
        {renderInline(line, index)}
      </Text>
    );
  };

  return <View>{parseMarkdown(content).map(renderLine)}</View>;
}

const styles = StyleSheet.create({
  h1: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
    marginTop: 4,
  },
  h2: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 6,
    marginTop: 4,
  },
  h3: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
    marginTop: 4,
  },
  hr: {
    height: 1,
    marginVertical: 12,
    borderRadius: 1,
  },
  blockquote: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    marginVertical: 4,
    marginLeft: 2,
  },
  blockquoteText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
    fontStyle: "italic",
  },
  body: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    marginBottom: 2,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 2,
    paddingLeft: 4,
  },
  bullet: {
    marginRight: 8,
    fontSize: 15,
  },
  spacer: {
    height: 8,
  },
});
