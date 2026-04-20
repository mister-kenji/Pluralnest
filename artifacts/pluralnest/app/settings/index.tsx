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

import { PinModal } from "@/components/PinModal";
import { useStorage } from "@/context/StorageContext";
import { useLock } from "@/context/LockContext";
import { useColors } from "@/hooks/useColors";
import type { SectionKey } from "@/context/StorageContext";

const ACCENT_COLORS = [
  "#ffffff", "#dddddd", "#cccccc", "#bbbbbb", "#aaaaaa",
  "#999999", "#888888", "#777777", "#666666", "#555555",
];

const SECTION_LOCK_LIST: { key: SectionKey; label: string; icon: string }[] = [
  { key: "emergency", label: "Emergency Information", icon: "alert-triangle" },
  { key: "forums",    label: "Forums",                icon: "message-circle" },
  { key: "chat",      label: "Inner Chat",            icon: "message-square" },
  { key: "frontingLog", label: "Fronting Log",        icon: "clock" },
  { key: "headspace", label: "Headspace",             icon: "map" },
];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, updateSettings } = useStorage();
  const { lockApp } = useLock();
  const settings = data.settings;

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  // Whether the user has verified their current PIN this session
  const [securityUnlocked, setSecurityUnlocked] = useState(false);
  const [showVerifyPin, setShowVerifyPin] = useState(false);
  // Queued action after PIN verification
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  // Local PIN input — never written to settings until the user confirms
  const [newPinInput, setNewPinInput] = useState("");

  // A PIN is "configured" only when there is a saved complete code
  const hasPinConfigured = settings.screenLockEnabled && settings.screenLockCode.length >= 4;

  /** Gate any sensitive security change behind the current PIN. */
  function requireSecurityPin(action: () => void) {
    if (!hasPinConfigured || securityUnlocked) {
      action();
      return;
    }
    setPendingAction(() => action);
    setShowVerifyPin(true);
  }

  const toggleFeature = (key: keyof typeof settings.featuresEnabled) => {
    updateSettings({
      ...settings,
      featuresEnabled: { ...settings.featuresEnabled, [key]: !settings.featuresEnabled[key] },
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleSectionLock = (key: SectionKey) => {
    requireSecurityPin(() => {
      updateSettings({
        ...settings,
        lockedSections: { ...settings.lockedSections, [key]: !settings.lockedSections[key] },
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    });
  };

  const featureList: { key: keyof typeof settings.featuresEnabled; label: string }[] = [
    { key: "chat",        label: "Inner Chat" },
    { key: "journals",    label: "Journals" },
    { key: "headspace",   label: "Headspace" },
    { key: "forums",      label: "Forums" },
    { key: "frontingLog", label: "Fronting Log" },
    { key: "groups",      label: "Groups" },
    { key: "search",      label: "Search" },
  ];

  return (
    <>
      {/* PIN verification modal for security settings */}
      <PinModal
        visible={showVerifyPin}
        code={settings.screenLockCode}
        title="Verify PIN to Continue"
        onSuccess={() => {
          setShowVerifyPin(false);
          setSecurityUnlocked(true);
          pendingAction?.();
          setPendingAction(null);
        }}
        onCancel={() => {
          setShowVerifyPin(false);
          setPendingAction(null);
        }}
      />

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

        {/* ── Accent Color ───────────────────────────────────────── */}
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

        {/* ── Privacy & Security ────────────────────────────────── */}
        <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>Privacy & Security</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>

          {/* Screen Lock toggle */}
          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Feather name="lock" size={16} color={colors.foreground} />
              <Text style={[styles.switchText, { color: colors.foreground }]}>Screen Lock</Text>
            </View>
            <Switch
              value={settings.screenLockEnabled}
              onValueChange={(v) => {
                if (!v && hasPinConfigured) {
                  requireSecurityPin(() =>
                    updateSettings({ ...settings, screenLockEnabled: false }),
                  );
                } else {
                  updateSettings({ ...settings, screenLockEnabled: v });
                }
              }}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          {settings.screenLockEnabled && (
            <View style={[styles.subSection, { borderTopColor: colors.border }]}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                {hasPinConfigured ? "Change PIN" : "Set PIN"}
              </Text>
              {hasPinConfigured && (
                <Text style={[styles.pinHint, { color: colors.mutedForeground }]}>
                  Current PIN: {"●".repeat(settings.screenLockCode.length)} — enter new PIN below to change
                </Text>
              )}
              <View style={styles.pinRow}>
                <TextInput
                  style={[styles.input, styles.pinInput, { color: colors.foreground, borderColor: newPinInput.length === 4 ? colors.primary : colors.border, backgroundColor: colors.secondary }]}
                  value={newPinInput}
                  onChangeText={setNewPinInput}
                  placeholder="4 digits"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                />
                <TouchableOpacity
                  style={[
                    styles.setPinBtn,
                    { backgroundColor: newPinInput.length === 4 ? colors.primary : colors.secondary, borderColor: colors.border },
                  ]}
                  disabled={newPinInput.length !== 4}
                  onPress={() => {
                    const code = newPinInput;
                    requireSecurityPin(() => {
                      updateSettings({ ...settings, screenLockCode: code });
                      setNewPinInput("");
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    });
                  }}
                >
                  <Text style={[styles.setPinBtnText, { color: newPinInput.length === 4 ? colors.primaryForeground : colors.mutedForeground }]}>
                    Set
                  </Text>
                </TouchableOpacity>
              </View>
              {hasPinConfigured && (
                <TouchableOpacity
                  style={[styles.lockNowBtn, { backgroundColor: colors.primary }]}
                  onPress={() => { lockApp(); router.back(); }}
                >
                  <Text style={[styles.lockNowText, { color: colors.primaryForeground }]}>Lock Now</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Lock on Startup — only when screen lock is on */}
          {settings.screenLockEnabled && (
            <View style={[styles.switchRow, { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 8 }]}>
              <View style={styles.switchLabel}>
                <Feather name="sunrise" size={16} color={colors.foreground} />
                <View>
                  <Text style={[styles.switchText, { color: colors.foreground }]}>Lock on Startup</Text>
                  <Text style={[styles.switchSublabel, { color: colors.mutedForeground }]}>
                    Lock when app is first opened
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.lockOnStartup !== false}
                onValueChange={(v) =>
                  requireSecurityPin(() =>
                    updateSettings({ ...settings, lockOnStartup: v }),
                  )
                }
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
          )}

          {/* Section Locks — only when screen lock is on and a code is set */}
          {settings.screenLockEnabled && settings.screenLockCode.length > 0 && (
            <View style={[styles.subSection, { borderTopColor: colors.border }]}>
              <View style={styles.sectionLockHeader}>
                <Feather name="shield" size={14} color={colors.mutedForeground} />
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginBottom: 0 }]}>
                  Section Locks
                </Text>
                {hasPinConfigured && !securityUnlocked && (
                  <TouchableOpacity
                    style={[styles.unlockBadge, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "40" }]}
                    onPress={() => requireSecurityPin(() => {})}
                  >
                    <Feather name="unlock" size={11} color={colors.primary} />
                    <Text style={[styles.unlockBadgeText, { color: colors.primary }]}>Verify PIN to edit</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={[styles.sectionLockHint, { color: colors.mutedForeground }]}>
                Lock individual sections with your screen lock PIN
              </Text>
              {SECTION_LOCK_LIST.map((s, i) => (
                <View
                  key={s.key}
                  style={[
                    styles.switchRow,
                    i > 0 && { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 8 },
                  ]}
                >
                  <View style={styles.switchLabel}>
                    <Feather name={s.icon as any} size={14} color={colors.foreground} />
                    <Text style={[styles.switchText, { color: colors.foreground }]}>{s.label}</Text>
                  </View>
                  <Switch
                    value={!!settings.lockedSections[s.key]}
                    onValueChange={() => toggleSectionLock(s.key)}
                    trackColor={{ false: colors.border, true: colors.primary }}
                  />
                </View>
              ))}
            </View>
          )}

          {/* Panic Close */}
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

          {/* Encryption */}
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

        {/* ── Accessibility ─────────────────────────────────────── */}
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

        {/* ── Feature Toggles ───────────────────────────────────── */}
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
    </>
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
  sectionLockHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  sectionLockHint: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 4 },
  unlockBadge: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginLeft: "auto" },
  unlockBadgeText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  pinHint: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 4 },
  pinRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  pinInput: { flex: 1 },
  setPinBtn: { borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  setPinBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  lockNowBtn: { borderRadius: 10, paddingVertical: 10, alignItems: "center", marginTop: 8 },
  lockNowText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 16 },
  actionText: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
});
