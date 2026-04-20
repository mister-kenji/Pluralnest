import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useStorage } from "@/context/StorageContext";
import { useColors } from "@/hooks/useColors";

export default function SystemScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, updateSettings } = useStorage();
  const settings = data.settings;

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topInset + 8, paddingBottom: 60, paddingHorizontal: 16 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>System</Text>
        <View style={{ width: 22 }} />
      </View>

      <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>System Name</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          This name appears throughout the app and on your collective profile.
        </Text>
        <TextInput
          style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
          value={settings.systemName}
          onChangeText={(v) => {
            updateSettings({ ...settings, systemName: v });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          placeholder="My System"
          placeholderTextColor={colors.mutedForeground}
        />
      </View>

      <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>Quick Links</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 0 }]}>
        <TouchableOpacity
          style={[styles.linkRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
          onPress={() => router.push("/system/profile" as any)}
        >
          <Feather name="users" size={18} color={colors.primary} />
          <Text style={[styles.linkText, { color: colors.foreground }]}>Collective Profile</Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => router.push("/system/emergency" as any)}
        >
          <Feather name="alert-triangle" size={18} color={colors.primary} />
          <Text style={[styles.linkText, { color: colors.foreground }]}>Emergency Information</Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  groupLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
    marginTop: 4,
  },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12 },
  hint: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 10, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  linkText: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
});
