import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";

type Props = {
  label: string;
  color?: string;
  onRemove?: () => void;
  small?: boolean;
};

export function TagChip({ label, color, onRemove, small = false }: Props) {
  const colors = useColors();
  const bg = color ?? colors.primary;

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: bg + "22",
          borderColor: bg + "55",
          paddingHorizontal: small ? 6 : 10,
          paddingVertical: small ? 2 : 4,
        },
      ]}
    >
      <Text style={[styles.label, { color: bg, fontSize: small ? 11 : 12 }]}>{label}</Text>
      {onRemove && (
        <TouchableOpacity onPress={onRemove} style={styles.remove} hitSlop={8}>
          <Text style={[styles.removeText, { color: bg }]}>×</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 6,
    marginBottom: 4,
  },
  label: {
    fontFamily: "Inter_500Medium",
  },
  remove: {
    marginLeft: 4,
  },
  removeText: {
    fontSize: 14,
    lineHeight: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
