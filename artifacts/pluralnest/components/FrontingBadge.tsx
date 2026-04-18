import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { FrontStatus } from "@/context/StorageContext";
import { useColors } from "@/hooks/useColors";

type Props = {
  status: FrontStatus;
  customStatus?: string;
};

const statusLabels: Record<FrontStatus, string> = {
  main: "Main Front",
  "co-front": "Co-Front",
  "co-conscious": "Co-Conscious",
};

const statusColors: Record<FrontStatus, string> = {
  main: "#a89de8",
  "co-front": "#a0d9e8",
  "co-conscious": "#e8d0a0",
};

export function FrontingBadge({ status, customStatus }: Props) {
  const colors = useColors();
  const label = customStatus || statusLabels[status];
  const color = statusColors[status] || colors.primary;

  return (
    <View style={[styles.badge, { backgroundColor: color + "22", borderColor: color + "55" }]}>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
});
