import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useStorage } from "@/context/StorageContext";
import { useLock } from "@/context/LockContext";
import { useColors } from "@/hooks/useColors";

const ACCENT_COLORS = [
  "#ffffff",
  "#dddddd",
  "#cccccc",
  "#bbbbbb",
  "#aaaaaa",
  "#999999",
  "#888888",
  "#777777",
  "#666666",
  "#555555",
];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, updateSettings } = useStorage();
  const { lockApp } = useLock();
  const settings = data.settings;

  const [lockCodeInput, setLockCodeInput] = useState("");
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const toggleFeature = (key: keyof typeof settings.featuresEnabled) => {
    updateSettings({
      ...settings,
      featuresEnabled: { ...settings.featuresEnabled, [key]: !settings.featuresEnabled[key] },
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const featureList: { key: keyof typeof settings.featuresEnabled; label: string }[] = [
    { key: "chat", label: "Inner Chat" },
    { key: "journals", label: "Journals" },
    { key: "headspace", label: "Headspace" },
    { key: "forums", label: "Forums" },
    { key: "frontingLog", label: "Fronting Log" },
    { key: "groups", label: "Groups" },
    { key: "search", label: "Search" },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topInset + 8, paddingBottom: 60, paddingHorizontal: 16 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
        <View style={{ width: 22 }} />
      </View>

      <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>Accent Color</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.colorGrid}>
          {ACCENT_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.colorDot,
                { backgroundColor: c },
                settings.accentColor === c && styles.colorDotSelected,
              ]}
              onPress={() => updateSettings({ ...settings, accentColor: c })}
            >
              {settings.accentColor === c && <Feather name="check" size={14} color="#fff" />}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>Privacy & Security</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <Feather name="lock" size={16} color={colors.foreground} />
            <Text style={[styles.switchText, { color: colors.foreground }]}>Screen Lock</Text>
          </View>
          <Switch
            value={settings.screenLockEnabled}
            onValueChange={(v) => updateSettings({ ...settings, screenLockEnabled: v })}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        {settings.screenLockEnabled && (
          <View style={[styles.subSection, { borderTopColor: colors.border }]}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>PIN Code</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
              value={settings.screenLockCode}
              onChangeText={(v) => updateSettings({ ...settings, screenLockCode: v })}
              placeholder="4-digit PIN"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
            />
            <TouchableOpacity
              style={[styles.lockNowBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                lockApp();
                router.back();
              }}
            >
              <Text style={[styles.lockNowText, { color: colors.primaryForeground }]}>Lock Now</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={[styles.switchRow, { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 8 }]}>
          <View style={styles.switchLabel}>
            <Feather name="zap" size={16} color={colors.foreground} />
            <Text style={[styles.switchText, { color: colors.foreground }]}>Panic Close (hidden button in More)</Text>
          </View>
          <Switch
            value={settings.panicCloseEnabled}
            onValueChange={(v) => updateSettings({ ...settings, panicCloseEnabled: v })}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        <View style={[styles.switchRow, { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 8 }]}>
          <View style={styles.switchLabel}>
            <Feather name="shield" size={16} color={colors.foreground} />
            <Text style={[styles.switchText, { color: colors.foreground }]}>End-to-End Encryption</Text>
          </View>
          <Switch
            value={settings.encryptionEnabled}
            onValueChange={(v) => updateSettings({ ...settings, encryptionEnabled: v })}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
      </View>

      <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>Accessibility</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <Feather name="minimize" size={16} color={colors.foreground} />
            <View>
              <Text style={[styles.switchText, { color: colors.foreground }]}>Easy Mode</Text>
              <Text style={[styles.switchSublabel, { color: colors.mutedForeground }]}>
                Hides non-priority features
              </Text>
            </View>
          </View>
          <Switch
            value={settings.easyMode}
            onValueChange={(v) => updateSettings({ ...settings, easyMode: v })}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
      </View>

      <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>Feature Toggles</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {featureList.map((f, i) => (
          <View
            key={f.key}
            style={[
              styles.switchRow,
              i > 0 && { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 8 },
            ]}
          >
            <Text style={[styles.switchText, { color: colors.foreground }]}>{f.label}</Text>
            <Switch
              value={settings.featuresEnabled[f.key]}
              onValueChange={() => toggleFeature(f.key)}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.actionRow, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => router.push("/settings/custom-fields")}
      >
        <Feather name="sliders" size={18} color={colors.foreground} />
        <Text style={[styles.actionText, { color: colors.foreground }]}>Custom Fields</Text>
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionRow, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 8 }]}
        onPress={() => router.push("/settings/export")}
      >
        <Feather name="download" size={18} color={colors.foreground} />
        <Text style={[styles.actionText, { color: colors.foreground }]}>Export / Backup Data</Text>
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionRow, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 8 }]}
        onPress={() => router.push("/deleted")}
      >
        <Feather name="trash-2" size={18} color={colors.foreground} />
        <Text style={[styles.actionText, { color: colors.foreground }]}>Recently Deleted</Text>
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  groupLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, marginLeft: 4, marginTop: 4 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12 },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, fontFamily: "Inter_400Regular" },
  colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  colorDot: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  colorDotSelected: { borderWidth: 3, borderColor: "#fff" },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  switchLabel: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  switchText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  switchSublabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  subSection: { borderTopWidth: 1, marginTop: 12, paddingTop: 12, gap: 8 },
  lockNowBtn: { borderRadius: 10, paddingVertical: 10, alignItems: "center", marginTop: 8 },
  lockNowText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 16 },
  actionText: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
});
