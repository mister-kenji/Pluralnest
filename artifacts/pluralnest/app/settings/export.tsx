import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
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

export default function ExportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { exportData, importData } = useStorage();
  const [imported, setImported] = useState("");
  const [showImport, setShowImport] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const exportedJson = exportData();

  const doImport = () => {
    if (!imported.trim()) return;
    const ok = importData(imported.trim());
    if (ok) {
      Alert.alert("Import Successful", "Your data has been imported.");
      setImported("");
      setShowImport(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Alert.alert("Import Failed", "Invalid data format. Please check your export file.");
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topInset + 8, paddingBottom: 60, paddingHorizontal: 16 }}
    >
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Export / Backup</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="shield" size={28} color={colors.primary} style={styles.cardIcon} />
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>Privacy First</Text>
        <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>
          All your data is stored locally on your device. Export creates a JSON backup file that you can keep safe or import on another device.
        </Text>
      </View>

      <Text style={[styles.label, { color: colors.mutedForeground }]}>Export Data</Text>
      <View style={[styles.exportBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        <ScrollView style={{ maxHeight: 150 }}>
          <Text style={[styles.exportText, { color: colors.mutedForeground }]} selectable>
            {exportedJson.slice(0, 500)}...
          </Text>
        </ScrollView>
      </View>
      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        Select all text above to copy your data. On a real device, use the Share button below.
      </Text>

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: colors.primary }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          Alert.alert(
            "Export Ready",
            "On a real device, this would open the share sheet to save your backup file.",
          );
        }}
      >
        <Feather name="share" size={18} color={colors.primaryForeground} />
        <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Share / Export</Text>
      </TouchableOpacity>

      <Text style={[styles.label, { color: colors.mutedForeground }]}>Import Data</Text>
      <TouchableOpacity
        style={[styles.importToggle, { borderColor: colors.border }]}
        onPress={() => setShowImport((v) => !v)}
      >
        <Feather name={showImport ? "chevron-up" : "chevron-down"} size={16} color={colors.primary} />
        <Text style={[styles.importToggleText, { color: colors.primary }]}>
          {showImport ? "Hide Import" : "Import from backup"}
        </Text>
      </TouchableOpacity>
      {showImport && (
        <View style={styles.importSection}>
          <TextInput
            style={[styles.importInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
            value={imported}
            onChangeText={setImported}
            placeholder="Paste your exported JSON here..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={doImport}
          >
            <Feather name="upload" size={18} color={colors.primaryForeground} />
            <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Import Data</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  card: { borderRadius: 14, borderWidth: 1, padding: 20, marginBottom: 20, alignItems: "center" },
  cardIcon: { marginBottom: 10 },
  cardTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  cardDesc: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, textAlign: "center" },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  exportBox: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
  exportText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 12, lineHeight: 16 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 14, marginBottom: 20 },
  btnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  importToggle: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10, borderStyle: "dashed" },
  importToggleText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  importSection: { gap: 12 },
  importInput: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 13, fontFamily: "Inter_400Regular", minHeight: 120 },
});
