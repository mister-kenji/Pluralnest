import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

type Props = {
  content: string;
  style?: object;
};

function parseMarkdown(text: string) {
  const lines = text.split("\n");
  return lines;
}

export function MarkdownText({ content, style }: Props) {
  const colors = useColors();

  const renderLine = (line: string, index: number) => {
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
    if (line.startsWith("- ") || line.startsWith("* ")) {
      return (
        <View key={index} style={styles.bulletRow}>
          <Text style={[styles.bullet, { color: colors.mutedForeground }]}>•</Text>
          <Text style={[styles.body, { color: colors.foreground }]}>{line.slice(2)}</Text>
        </View>
      );
    }
    if (line === "") {
      return <View key={index} style={styles.spacer} />;
    }
    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/);
    return (
      <Text key={index} style={[styles.body, { color: colors.foreground }, style]}>
        {parts.map((part, i) => {
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
          return part;
        })}
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
