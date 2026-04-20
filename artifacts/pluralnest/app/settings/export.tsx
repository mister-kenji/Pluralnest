import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useState } from "react";
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

import { ConfirmSheet } from "@/components/ConfirmSheet";
import { useStorage } from "@/context/StorageContext";
import { useColors } from "@/hooks/useColors";

type Status = { type: "success" | "error" | "info"; msg: string } | null;

export default function ExportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { exportData, importData } = useStorage();
  const [showImport, setShowImport] = useState(false);
  const [pasteJson, setPasteJson] = useState("");
  const [exportStatus, setExportStatus] = useState<Status>(null);
  const [importStatus, setImportStatus] = useState<Status>(null);
  const [confirmImport, setConfirmImport] = useState<{ json: string } | null>(null);
  const [copiedFallback, setCopiedFallback] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const flash = (setter: (s: Status) => void, status: Status, duration = 4000) => {
    setter(status);
    setTimeout(() => setter(null), duration);
  };

  const copyToClipboard = async (json: string) => {
    try {
      await Clipboard.setStringAsync(json);
      setCopiedFallback(true);
      setTimeout(() => setCopiedFallback(false), 3000);
      flash(setExportStatus, { type: "success", msg: "Backup JSON copied to clipboard — paste it somewhere safe!" });
    } catch {
      flash(setExportStatus, { type: "error", msg: "Could not copy to clipboard. Try the paste section below." });
    }
  };

  const doExport = async () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}

    let json = "";
    try {
      json = exportData();
    } catch {
      flash(setExportStatus, { type: "error", msg: "Could not read your data." });
      return;
    }

    const date = new Date().toISOString().slice(0, 10);
    const filename = `pluralnest_backup_${date}.json`;

    // ── Web ──────────────────────────────────────────────────────────────────
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

    // ── Mobile (iOS + Android) — write to cache then share ───────────────────
    // Step 1: Write file to cache directory
    const path = `${FileSystem.cacheDirectory}${filename}`;
    try {
      await FileSystem.writeAsStringAsync(path, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    } catch {
      // File write failed — go straight to clipboard
      await copyToClipboard(json);
      return;
    }

    // Step 2: Try sharing the file
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(path, {
          mimeType: "application/json",
          dialogTitle: "Save PluralNest Backup",
          UTI: "public.json",
        });
        // shareAsync resolves after the sheet is dismissed — treat as success
        flash(setExportStatus, { type: "success", msg: "Backup shared! Save the file somewhere safe." });
        return;
      }
    } catch {
      // Share sheet failed or was cancelled — fall through to clipboard
    }

    // Step 3: Clipboard fallback — always works
    await copyToClipboard(json);
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
      if (!asset?.uri) {
        flash(setImportStatus, { type: "error", msg: "Could not read file. Paste JSON below instead." });
        return;
      }
      let fileJson: string;
      try {
        fileJson = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      } catch {
        if (asset.file) {
          fileJson = await new Promise<string>((res, rej) => {
            const reader = new (globalThis as any).FileReader();
            reader.onload = () => res(reader.result as string);
            reader.onerror = rej;
            reader.readAsText(asset.file as Blob);
          });
        } else {
          throw new Error("unreadable");
        }
      }
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

  const statusColor = (type: "success" | "error" | "info") =>
    type === "success" ? "#22c55e" : type === "error" ? "#ef4444" : colors.primary;
  const statusIcon = (type: "success" | "error" | "info") =>
    type === "success" ? "check-circle" : type === "error" ? "alert-circle" : "info";

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

      {/* Clipboard fallback button — always visible on mobile */}
      {Platform.OS !== "web" && (
        <TouchableOpacity
          style={[styles.clipboardBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {
            let json = "";
            try { json = exportData(); } catch { return; }
            copyToClipboard(json);
          }}
        >
          <Feather
            name={copiedFallback ? "check" : "copy"}
            size={16}
            color={copiedFallback ? "#22c55e" : colors.mutedForeground}
          />
          <Text style={[styles.clipboardBtnText, { color: copiedFallback ? "#22c55e" : colors.mutedForeground }]}>
            {copiedFallback ? "Copied!" : "Copy JSON to Clipboard"}
          </Text>
        </TouchableOpacity>
      )}

      {exportStatus && (
        <View style={[styles.statusBar, {
          backgroundColor: `${statusColor(exportStatus.type)}22`,
          borderColor: `${statusColor(exportStatus.type)}55`,
        }]}>
          <Feather
            name={statusIcon(exportStatus.type) as any}
            size={14}
            color={statusColor(exportStatus.type)}
          />
          <Text style={[styles.statusText, { color: statusColor(exportStatus.type) }]}>
            {exportStatus.msg}
          </Text>
        </View>
      )}

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 8 }]}>Import</Text>

      {importStatus && (
        <View style={[styles.statusBar, {
          backgroundColor: `${statusColor(importStatus.type)}22`,
          borderColor: `${statusColor(importStatus.type)}55`,
        }]}>
          <Feather
            name={statusIcon(importStatus.type) as any}
            size={14}
            color={statusColor(importStatus.type)}
          />
          <Text style={[styles.statusText, { color: statusColor(importStatus.type) }]}>
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
    marginBottom: 10,
  },
  btnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  clipboardBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 11,
    marginBottom: 12,
  },
  clipboardBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
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
