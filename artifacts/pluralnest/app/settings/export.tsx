import { Feather } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConfirmSheet } from "@/components/ConfirmSheet";
import { useStorage } from "@/context/StorageContext";
import { useColors } from "@/hooks/useColors";

type Status = { type: "success" | "error"; msg: string } | null;

export default function ExportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { exportData, importData } = useStorage();
  const [showImport, setShowImport] = useState(false);
  const [pasteJson, setPasteJson] = useState("");
  const [exportStatus, setExportStatus] = useState<Status>(null);
  const [importStatus, setImportStatus] = useState<Status>(null);
  const [confirmImport, setConfirmImport] = useState<{ json: string } | null>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const flash = (setter: (s: Status) => void, status: Status) => {
    setter(status);
    setTimeout(() => setter(null), 3500);
  };

  const doExport = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    let json = "";
    try {
      json = exportData();
    } catch {
      flash(setExportStatus, { type: "error", msg: "Could not read your data." });
      return;
    }

    const date = new Date().toISOString().slice(0, 10);
    const filename = `pluralnest_backup_${date}.json`;

    if (Platform.OS === "web") {
      try {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        flash(setExportStatus, { type: "success", msg: "Download started!" });
      } catch {
        flash(setExportStatus, { type: "error", msg: "Download failed — copy the JSON below instead." });
      }
      return;
    }

    try {
      const path = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(path, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      await Share.share({ url: `file://${path}`, title: "PluralNest Backup" });
      flash(setExportStatus, { type: "success", msg: "Backup ready to share!" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("cancel") || msg.toLowerCase().includes("cancel")) {
        return;
      }
      flash(setExportStatus, { type: "error", msg: "Export failed. Try again." });
    }
  };

  const pickAndImport = async () => {
    if (Platform.OS === "web") {
      try {
        const el = document.createElement("input");
        el.type = "file";
        el.accept = ".json,application/json,text/plain";
        el.onchange = async () => {
          const file = el.files?.[0];
          if (!file) return;
          const text = await file.text();
          setConfirmImport({ json: text });
        };
        el.click();
      } catch {
        flash(setImportStatus, { type: "error", msg: "File picker unavailable on web. Paste JSON below." });
      }
      return;
    }

    try {
      const DocumentPicker = await import("expo-document-picker");
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "text/plain", "*/*"],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const fileJson = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      setConfirmImport({ json: fileJson });
    } catch {
      flash(setImportStatus, { type: "error", msg: "Could not read file. Paste JSON below instead." });
    }
  };

  const runImport = (json: string) => {
    const ok = importData(json);
    if (ok) {
      flash(setImportStatus, { type: "success", msg: "Data imported successfully!" });
      setPasteJson("");
      setShowImport(false);
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    } else {
      flash(setImportStatus, { type: "error", msg: "Invalid format. Check your file." });
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
    }
  };

  const doImportFromPaste = () => {
    if (!pasteJson.trim()) return;
    setConfirmImport({ json: pasteJson.trim() });
  };

  let previewJson = "";
  try {
    previewJson = exportData().slice(0, 300);
  } catch {
    previewJson = "(could not load preview)";
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topInset + 8, paddingBottom: 60, paddingHorizontal: 16 }}
      keyboardShouldPersistTaps="handled"
    >
      <ConfirmSheet
        visible={!!confirmImport}
        title="Import Data"
        message="This will replace all your current data with the backup. This cannot be undone."
        confirmLabel="Import"
        onConfirm={() => {
          const json = confirmImport!.json;
          setConfirmImport(null);
          runImport(json);
        }}
        onCancel={() => setConfirmImport(null)}
      />

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Export / Backup</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="shield" size={26} color={colors.primary} style={{ marginBottom: 8 }} />
        <Text style={[styles.infoTitle, { color: colors.foreground }]}>Privacy First</Text>
        <Text style={[styles.infoDesc, { color: colors.mutedForeground }]}>
          Everything lives locally on your device. Export saves a JSON backup you can restore from anytime.
        </Text>
      </View>

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Export</Text>
      <View style={[styles.previewBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        <Text style={[styles.previewText, { color: colors.mutedForeground }]} selectable>
          {previewJson}…
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: colors.primary }]}
        onPress={doExport}
      >
        <Feather name="download" size={18} color={colors.primaryForeground} />
        <Text style={[styles.btnText, { color: colors.primaryForeground }]}>
          {Platform.OS === "web" ? "Download Backup File" : "Share / Save Backup"}
        </Text>
      </TouchableOpacity>

      {exportStatus && (
        <View style={[styles.statusBar, {
          backgroundColor: exportStatus.type === "success" ? "#22c55e22" : "#ef444422",
          borderColor: exportStatus.type === "success" ? "#22c55e55" : "#ef444455",
        }]}>
          <Feather
            name={exportStatus.type === "success" ? "check-circle" : "alert-circle"}
            size={14}
            color={exportStatus.type === "success" ? "#22c55e" : "#ef4444"}
          />
          <Text style={[styles.statusText, { color: exportStatus.type === "success" ? "#22c55e" : "#ef4444" }]}>
            {exportStatus.msg}
          </Text>
        </View>
      )}

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 8 }]}>Import</Text>

      {importStatus && (
        <View style={[styles.statusBar, {
          backgroundColor: importStatus.type === "success" ? "#22c55e22" : "#ef444422",
          borderColor: importStatus.type === "success" ? "#22c55e55" : "#ef444455",
        }]}>
          <Feather
            name={importStatus.type === "success" ? "check-circle" : "alert-circle"}
            size={14}
            color={importStatus.type === "success" ? "#22c55e" : "#ef4444"}
          />
          <Text style={[styles.statusText, { color: importStatus.type === "success" ? "#22c55e" : "#ef4444" }]}>
            {importStatus.msg}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.importBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={pickAndImport}
      >
        <Feather name="folder" size={18} color={colors.foreground} />
        <Text style={[styles.importBtnText, { color: colors.foreground }]}>
          {Platform.OS === "web" ? "Choose Backup File" : "Pick Backup File"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.pasteToggle, { borderColor: colors.border }]}
        onPress={() => setShowImport((v) => !v)}
      >
        <Feather name={showImport ? "chevron-up" : "chevron-down"} size={15} color={colors.mutedForeground} />
        <Text style={[styles.pasteToggleText, { color: colors.mutedForeground }]}>
          Or paste JSON manually
        </Text>
      </TouchableOpacity>

      {showImport && (
        <View style={styles.pasteSection}>
          <TextInput
            style={[styles.pasteInput, {
              color: colors.foreground,
              borderColor: colors.border,
              backgroundColor: colors.secondary,
            }]}
            value={pasteJson}
            onChangeText={setPasteJson}
            placeholder="Paste exported JSON here..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={doImportFromPaste}
          >
            <Feather name="upload" size={18} color={colors.primaryForeground} />
            <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Import from Text</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
  },
  infoTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 6 },
  infoDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, textAlign: "center" },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 2,
  },
  previewBox: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 10 },
  previewText: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 12,
  },
  btnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
  },
  statusText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  importBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  importBtnText: { fontSize: 15, fontFamily: "Inter_500Medium", flex: 1 },
  pasteToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderStyle: "dashed",
  },
  pasteToggleText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  pasteSection: { gap: 10 },
  pasteInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    minHeight: 120,
  },
});
