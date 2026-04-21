import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import JSZip from "jszip";
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

type Status = { type: "success" | "error"; msg: string } | null;

export default function ExportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { exportData, importData, data } = useStorage();
  const [showImport, setShowImport] = useState(false);
  const [pasteJson, setPasteJson] = useState("");
  const [exportStatus, setExportStatus] = useState<Status>(null);
  const [copiedFallback, setCopiedFallback] = useState(false);
  const [photoStatus, setPhotoStatus] = useState<Status>(null);
  const [exportingPhotos, setExportingPhotos] = useState(false);
  const [showSpImport, setShowSpImport] = useState(false);
  const [spPasteJson, setSpPasteJson] = useState("");

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const flash = (setter: (s: Status) => void, status: Status, duration = 4000) => {
    setter(status);
    setTimeout(() => setter(null), duration);
  };

  // ── Confirm import via native Alert (guaranteed on Android) ─────────────
  const confirmAndImport = (json: string) => {
    if (Platform.OS === "web") {
      // Web: use browser confirm
      const ok = window.confirm(
        "This will replace ALL your current data with the backup. Continue?"
      );
      if (!ok) return;
      runImport(json);
      return;
    }
    Alert.alert(
      "Import Backup",
      "This will replace all your current data with the backup. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Import",
          style: "destructive",
          onPress: () => runImport(json),
        },
      ]
    );
  };

  const runImport = (rawJson: string) => {
    // Strip UTF-8 BOM (U+FEFF) and any leading/trailing whitespace
    const json = rawJson.replace(/^\uFEFF/, "").trim();

    // Pre-validate JSON so we can surface the real error message
    let parsed: any;
    try {
      parsed = JSON.parse(json);
    } catch (e: any) {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
      Alert.alert(
        "Invalid JSON",
        `The text isn't valid JSON and can't be imported.\n\nParser said: ${e?.message ?? "unknown error"}\n\nMake sure you copied the full backup without any extra characters.`
      );
      return;
    }

    // Must be a plain object (backups are always {…})
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      Alert.alert("Wrong Format", "This doesn't look like a PluralNest backup. The backup should be a JSON object starting with {.");
      return;
    }

    const err = importData(json);
    if (err === null) {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      Alert.alert("Imported!", "Your data has been restored successfully.");
      setPasteJson("");
      setShowImport(false);
    } else {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
      Alert.alert(
        "Import Failed",
        `The JSON was valid but something went wrong applying it.\n\nError: ${err}\n\nTry re-exporting from the original device.`
      );
    }
  };

  // ── Copy to clipboard (export fallback) ─────────────────────────────────
  const copyToClipboard = async (json: string) => {
    try {
      await Clipboard.setStringAsync(json);
      setCopiedFallback(true);
      setTimeout(() => setCopiedFallback(false), 3000);
      flash(setExportStatus, { type: "success", msg: "Backup JSON copied to clipboard — paste it somewhere safe!" });
    } catch {
      flash(setExportStatus, { type: "error", msg: "Could not copy to clipboard." });
    }
  };

  // ── Export ───────────────────────────────────────────────────────────────
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
        flash(setExportStatus, { type: "error", msg: "Download failed." });
      }
      return;
    }

    const path = `${FileSystem.cacheDirectory}${filename}`;
    try {
      await FileSystem.writeAsStringAsync(path, json, {
        encoding: "utf8" as any,
      });
    } catch {
      await copyToClipboard(json);
      return;
    }

    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(path, {
          mimeType: "application/json",
          dialogTitle: "Save PluralNest Backup",
          UTI: "public.json",
        });
        flash(setExportStatus, { type: "success", msg: "Backup shared! Save the file somewhere safe." });
        return;
      }
    } catch {}

    await copyToClipboard(json);
  };

  // ── Import: read a URI (file:// or content://) ──────────────────────────
  const readUriAsText = async (uri: string): Promise<string> => {
    try {
      return await FileSystem.readAsStringAsync(uri, {
        encoding: "utf8" as any,
      });
    } catch {}
    const resp = await fetch(uri);
    if (!resp.ok) throw new Error(`fetch failed: ${resp.status}`);
    return resp.text();
  };

  // ── Import: file picker ──────────────────────────────────────────────────
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
          confirmAndImport(text);
        };
        el.click();
      } catch {
        Alert.alert("Error", "File picker unavailable on web. Paste JSON below.");
      }
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "text/plain", "*/*"],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) {
        Alert.alert("Error", "No file was selected.");
        return;
      }
      const fileJson = await readUriAsText(asset.uri);
      confirmAndImport(fileJson);
    } catch (err: any) {
      Alert.alert(
        "Could Not Read File",
        "Try using 'Paste from Clipboard' instead: first export your backup and tap 'Copy JSON to Clipboard', then come back here and tap 'Paste from Clipboard'."
      );
    }
  };

  // ── Import: clipboard ────────────────────────────────────────────────────
  const pasteFromClipboard = async () => {
    let text = "";
    try {
      text = (await Clipboard.getStringAsync()) ?? "";
    } catch {
      Alert.alert("Error", "Could not read clipboard.");
      return;
    }

    const trimmed = text.trim();
    if (!trimmed) {
      Alert.alert(
        "Clipboard Empty",
        "No text found on the clipboard. First export your backup and tap 'Copy JSON to Clipboard', then come back here."
      );
      return;
    }
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
      Alert.alert(
        "Not JSON",
        "The clipboard doesn't contain a PluralNest backup. It should start with { or [."
      );
      return;
    }
    confirmAndImport(trimmed);
  };

  // ── Import: manual paste text box ────────────────────────────────────────
  const doImportFromPaste = () => {
    const trimmed = pasteJson.trim();
    if (!trimmed) return;
    confirmAndImport(trimmed);
  };

  // ── Photo ZIP export ─────────────────────────────────────────────────────
  const doExportPhotos = async () => {
    if (exportingPhotos) return;
    setExportingPhotos(true);
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}

    const safeName = (s: string) =>
      (s ?? "unnamed").replace(/[^a-z0-9_\-. ]/gi, "_").slice(0, 40).trim() || "unnamed";

    const extFromUri = (uri: string) => {
      const m = uri.split("?")[0].match(/\.([a-z0-9]+)$/i);
      return m ? m[1].toLowerCase() : "jpg";
    };

    // Gather { folder, filename, uri }
    type PhotoEntry = { folder: string; filename: string; uri: string };
    const entries: PhotoEntry[] = [];

    const seen = new Set<string>();
    const add = (folder: string, name: string, uri: string) => {
      if (!uri || seen.has(uri)) return;
      // Skip non-local (web base64 is fine; skip blank/placeholder)
      if (Platform.OS !== "web" && !uri.startsWith("file://")) return;
      if (Platform.OS === "web" && !uri.startsWith("data:")) return;
      seen.add(uri);
      entries.push({ folder, filename: name, uri });
    };

    for (const m of data.members ?? []) {
      const n = safeName(m.name);
      if (m.profileImage) add("profile-pictures", `${n}_${m.id.slice(0,6)}.${extFromUri(m.profileImage)}`, m.profileImage);
      if (m.bannerImage)  add("banners",           `${n}_${m.id.slice(0,6)}.${extFromUri(m.bannerImage)}`,  m.bannerImage);
    }
    for (const node of data.headspaceNodes ?? []) {
      if (node.imageUri) {
        const n = safeName(node.title ?? "node");
        add("headspace", `${n}_${node.id.slice(0,6)}.${extFromUri(node.imageUri)}`, node.imageUri);
      }
    }

    if (entries.length === 0) {
      flash(setPhotoStatus, { type: "error", msg: "No locally stored photos found to export." });
      setExportingPhotos(false);
      return;
    }

    // Helper: read any URI as raw bytes.
    // On native: try fetch() first (binary, no base64 round-trip), then fall
    // back to FileSystem base64 read + manual decode so atob is never needed.
    const readAsBytes = async (uri: string): Promise<Uint8Array> => {
      if (Platform.OS === "web") {
        // Data URL: data:<mime>;base64,<payload>
        const b64 = uri.split(",")[1] ?? "";
        const bin = atob(b64);
        const out = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return out;
      }
      // Native path 1: fetch the file:// URI directly as ArrayBuffer
      try {
        const res = await fetch(uri);
        const ab = await res.arrayBuffer();
        if (ab.byteLength > 0) return new Uint8Array(ab);
      } catch {}
      // Native path 2: expo-file-system base64 + pure-JS decode (no atob)
      const b64str = await FileSystem.readAsStringAsync(uri, {
        encoding: "base64" as any,
      });
      const TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
      const lookup = new Uint8Array(256);
      for (let i = 0; i < TABLE.length; i++) lookup[TABLE.charCodeAt(i)] = i;
      const clean = b64str.replace(/[^A-Za-z0-9+/]/g, "");
      const len = clean.length;
      let outLen = Math.floor(len * 3 / 4);
      if (clean[len - 1] === "=") outLen--;
      if (clean[len - 2] === "=") outLen--;
      const bytes = new Uint8Array(outLen);
      for (let i = 0, j = 0; i < len; i += 4) {
        const a = lookup[clean.charCodeAt(i)];
        const b = lookup[clean.charCodeAt(i + 1)];
        const c = lookup[clean.charCodeAt(i + 2)];
        const d = lookup[clean.charCodeAt(i + 3)];
        bytes[j++] = (a << 2) | (b >> 4);
        if (j < outLen) bytes[j++] = ((b & 15) << 4) | (c >> 2);
        if (j < outLen) bytes[j++] = ((c & 3) << 6) | d;
      }
      return bytes;
    };

    const zip = new JSZip();
    let added = 0;

    for (const entry of entries) {
      try {
        const bytes = await readAsBytes(entry.uri);
        if (bytes.byteLength === 0) continue;
        // Pass raw Uint8Array — no base64 option, no atob/Buffer dependency
        zip.folder(entry.folder)!.file(entry.filename, bytes);
        added++;
      } catch {
        // skip unreadable files
      }
    }

    if (added === 0) {
      flash(setPhotoStatus, { type: "error", msg: "Could not read any photos from storage." });
      setExportingPhotos(false);
      return;
    }

    try {
      // STORE = no compression; avoids any zlib dependency on React Native
      const uint8Zip = await zip.generateAsync({ type: "uint8array", compression: "STORE" });
      const date = new Date().toISOString().slice(0, 10);
      const filename = `pluralnest_photos_${date}.zip`;

      if (Platform.OS === "web") {
        const blob = new Blob([uint8Zip], { type: "application/zip" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
        flash(setPhotoStatus, { type: "success", msg: `Downloading ${added} photo${added !== 1 ? "s" : ""} as ZIP!` });
        return;
      }

      // Convert Uint8Array → base64 in safe chunks (avoids call-stack overflow)
      const CHUNK = 4096;
      let b64Zip = "";
      for (let i = 0; i < uint8Zip.length; i += CHUNK) {
        let str = "";
        const end = Math.min(i + CHUNK, uint8Zip.length);
        for (let j = i; j < end; j++) str += String.fromCharCode(uint8Zip[j]);
        b64Zip += btoa(str);
      }

      const path = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(path, b64Zip, { encoding: "base64" as any });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(path, { mimeType: "application/zip", dialogTitle: "Save Photos ZIP", UTI: "public.zip-archive" });
        flash(setPhotoStatus, { type: "success", msg: `Shared ${added} photo${added !== 1 ? "s" : ""} in ZIP — save it somewhere safe!` });
      } else {
        flash(setPhotoStatus, { type: "error", msg: "Sharing not available on this device." });
      }
    } catch (err: any) {
      flash(setPhotoStatus, { type: "error", msg: `ZIP failed: ${err?.message ?? "unknown error"}` });
    } finally {
      setExportingPhotos(false);
    }
  };

  // ── Simply Plural import transform ──────────────────────────────────────
  const transformSimplyPlural = (sp: any): string => {
    const now = Date.now();

    // GlobalFields for PluralNest settings
    const customGlobalFields = (sp.customFields ?? [])
      .filter((cf: any) => cf._id && cf.name)
      .map((cf: any) => ({ id: cf._id, label: cf.name, showByDefault: true }));

    // Members
    const members = (sp.members ?? []).map((m: any) => {
      const customFields: { fieldId: string; value: string }[] = [];
      if (m.info && typeof m.info === "object") {
        for (const [fieldId, value] of Object.entries(m.info)) {
          if (typeof value === "string" && value.trim()) {
            customFields.push({ fieldId, value: value.trim() });
          }
        }
      }
      return {
        id: m._id,
        name: m.name ?? "Unknown",
        pronouns: m.pronouns ?? "",
        role: "",
        color: m.color ?? "#888888",
        avatarShape: "circle",
        description: m.desc ?? "",
        customFields,
        relationships: [],
        tags: [],
        isArchived: m.archived === true,
        createdAt: m.lastOperationTime ?? now,
        updatedAt: m.lastOperationTime ?? now,
      };
    });

    // Front history
    const frontEntries = (sp.frontHistory ?? []).map((f: any) => ({
      id: f._id,
      memberId: f.member ?? "",
      status: "co-front",
      startTime: f.startTime ?? now,
      endTime: f.live ? undefined : (f.endTime ?? undefined),
    }));

    // Notes → journal entries
    const journalEntries = (sp.notes ?? []).map((n: any) => ({
      id: n._id,
      memberId: n.member ?? "",
      title: n.title ?? "Untitled",
      content: n.note ?? "",
      tags: [],
      createdAt: n.date ?? now,
      updatedAt: n.date ?? now,
      isLocked: false,
      isPinned: false,
    }));

    // Channels
    const chatChannels = [
      { id: "general", name: "general", createdAt: 0 },
      ...(sp.channels ?? []).map((c: any) => ({
        id: c._id,
        name: c.name ?? "Channel",
        createdAt: c.lastOperationTime ?? now,
      })),
    ];

    // Chat messages
    const chatMessages = (sp.chatMessages ?? []).map((m: any) => ({
      id: m._id,
      memberId: m.writer ?? "",
      channelId: m.channel,
      content: m.message ?? "",
      isPinned: false,
      createdAt: m.writtenAt ?? now,
      reactions: [],
    }));

    // Groups — compute subGroupIds by scanning all groups for matching parent
    const spGroups: any[] = sp.groups ?? [];
    const groups = spGroups.map((g: any) => {
      const parentGroupId = g.parent && g.parent !== "root" ? g.parent : undefined;
      const subGroupIds = spGroups
        .filter((sg: any) => sg.parent === g._id)
        .map((sg: any) => sg._id);
      return {
        id: g._id,
        name: g.name ?? "Group",
        color: g.color ?? "#888888",
        memberIds: Array.isArray(g.members) ? g.members : [],
        subGroupIds,
        parentGroupId,
        showMembersInRoot: !parentGroupId,
        description: g.desc ?? "",
        createdAt: g.lastOperationTime ?? now,
      };
    });

    const appData = {
      members,
      frontEntries,
      journalEntries,
      journalTags: [],
      chatChannels,
      chatMessages,
      groups,
      forumPosts: [],
      headspaceNodes: [],
      headspaceBoardNodeIds: [],
      headspaceBoardLinks: [],
      headspaceBoardMemberIds: [],
      memberBoardPositions: {},
      assets: [],
      deletedItems: [],
      customEmojis: [],
      settings: { customGlobalFields },
      systemProfile: { description: "" },
      emergencyInfo: { content: "", contacts: [] },
    };
    return JSON.stringify(appData);
  };

  const runSpImport = (rawJson: string) => {
    const json = rawJson.replace(/^\uFEFF/, "").trim();
    let sp: any;
    try {
      sp = JSON.parse(json);
    } catch (e: any) {
      Alert.alert("Invalid JSON", `Not valid JSON.\n\nParser said: ${e?.message ?? "unknown error"}`);
      return;
    }
    if (!sp || typeof sp !== "object" || Array.isArray(sp)) {
      Alert.alert("Wrong Format", "This doesn't look like a Simply Plural export file.");
      return;
    }
    // Detect if it looks like a SP export (has members array with _id fields)
    const hasSpMembers = Array.isArray(sp.members) && sp.members.every((m: any) => m._id);
    if (!hasSpMembers && !sp.frontHistory) {
      Alert.alert(
        "Not a Simply Plural Export",
        "This file doesn't look like a Simply Plural export. Use the regular Import section for PluralNest backups."
      );
      return;
    }
    let transformed: string;
    try {
      transformed = transformSimplyPlural(sp);
    } catch (e: any) {
      Alert.alert("Transform Failed", `Could not convert the Simply Plural data.\n\nError: ${e?.message ?? "unknown"}`);
      return;
    }

    const memberCount = sp.members?.length ?? 0;
    const frontCount = sp.frontHistory?.length ?? 0;
    const groupCount = sp.groups?.length ?? 0;
    const msgCount = sp.chatMessages?.length ?? 0;
    const noteCount = sp.notes?.length ?? 0;

    const summary = [
      `${memberCount} member${memberCount !== 1 ? "s" : ""}`,
      `${frontCount} front entr${frontCount !== 1 ? "ies" : "y"}`,
      groupCount > 0 ? `${groupCount} group${groupCount !== 1 ? "s" : ""}` : null,
      msgCount > 0 ? `${msgCount} chat message${msgCount !== 1 ? "s" : ""}` : null,
      noteCount > 0 ? `${noteCount} note${noteCount !== 1 ? "s" : ""}` : null,
    ].filter(Boolean).join(", ");

    const confirmMsg =
      `This will import your Simply Plural data and replace everything currently in PluralNest.\n\nFound: ${summary}.\n\nProfile images cannot be transferred (they live on Simply Plural's servers). Everything else will import.`;

    if (Platform.OS === "web") {
      if (!window.confirm(confirmMsg)) return;
      const err = importData(transformed);
      if (err === null) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        Alert.alert("Imported!", `Successfully imported ${summary} from Simply Plural.`);
        setSpPasteJson("");
        setShowSpImport(false);
      } else {
        Alert.alert("Import Failed", `Error: ${err}`);
      }
      return;
    }

    Alert.alert("Import from Simply Plural", confirmMsg, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Import",
        style: "destructive",
        onPress: () => {
          const err = importData(transformed);
          if (err === null) {
            try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
            Alert.alert("Imported!", `Successfully imported ${summary} from Simply Plural.`);
            setSpPasteJson("");
            setShowSpImport(false);
          } else {
            try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
            Alert.alert("Import Failed", `Error applying data: ${err}`);
          }
        },
      },
    ]);
  };

  const pickAndImportSP = async () => {
    if (Platform.OS === "web") {
      try {
        const el = document.createElement("input");
        el.type = "file";
        el.accept = ".json,application/json,text/plain";
        el.onchange = async () => {
          const file = el.files?.[0];
          if (!file) return;
          runSpImport(await file.text());
        };
        el.click();
      } catch {
        Alert.alert("Error", "File picker unavailable. Paste JSON manually.");
      }
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "text/plain", "*/*"],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) { Alert.alert("Error", "No file selected."); return; }
      const text = await readUriAsText(asset.uri);
      runSpImport(text);
    } catch {
      Alert.alert("Error", "Could not read the file. Try pasting manually.");
    }
  };

  const pasteFromClipboardSP = async () => {
    let text = "";
    try { text = (await Clipboard.getStringAsync()) ?? ""; } catch {
      Alert.alert("Error", "Could not read clipboard.");
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) { Alert.alert("Clipboard Empty", "No text found on the clipboard."); return; }
    runSpImport(trimmed);
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

      {/* ── EXPORT ─────────────────────────────────────────────────── */}
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

      {/* ── PHOTO ZIP ──────────────────────────────────────────────── */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 8 }]}>Photos</Text>
      <View style={[styles.infoRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        <Feather name="image" size={14} color={colors.mutedForeground} style={{ marginTop: 1 }} />
        <Text style={[styles.infoRowText, { color: colors.mutedForeground }]}>
          Exports all locally stored images (profile pictures, banners, headspace photos) into a ZIP file with sub-folders by type. Images are not included in the JSON backup.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: exportingPhotos ? colors.secondary : colors.card, borderWidth: 1, borderColor: colors.border }]}
        onPress={doExportPhotos}
        disabled={exportingPhotos}
      >
        <Feather name={exportingPhotos ? "loader" : "archive"} size={18} color={colors.foreground} />
        <Text style={[styles.btnText, { color: colors.foreground }]}>
          {exportingPhotos ? "Building ZIP…" : "Export Photos as ZIP"}
        </Text>
      </TouchableOpacity>

      {photoStatus && (
        <View style={[styles.statusBar, {
          backgroundColor: photoStatus.type === "success" ? "#22c55e22" : "#ef444422",
          borderColor: photoStatus.type === "success" ? "#22c55e55" : "#ef444455",
        }]}>
          <Feather
            name={photoStatus.type === "success" ? "check-circle" : "alert-circle"}
            size={14}
            color={photoStatus.type === "success" ? "#22c55e" : "#ef4444"}
          />
          <Text style={[styles.statusText, { color: photoStatus.type === "success" ? "#22c55e" : "#ef4444" }]}>
            {photoStatus.msg}
          </Text>
        </View>
      )}

      {/* ── IMPORT ─────────────────────────────────────────────────── */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 8 }]}>Import</Text>

      <TouchableOpacity
        style={[styles.importBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={pickAndImport}
      >
        <Feather name="folder" size={18} color={colors.foreground} />
        <Text style={[styles.importBtnText, { color: colors.foreground }]}>
          {Platform.OS === "web" ? "Choose Backup File" : "Pick Backup File"}
        </Text>
      </TouchableOpacity>

      {Platform.OS !== "web" && (
        <TouchableOpacity
          style={[styles.importBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={pasteFromClipboard}
        >
          <Feather name="clipboard" size={18} color={colors.foreground} />
          <Text style={[styles.importBtnText, { color: colors.foreground }]}>
            Paste from Clipboard
          </Text>
        </TouchableOpacity>
      )}

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

      {/* ── SIMPLY PLURAL IMPORT ────────────────────────────────────── */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 16 }]}>
        Import from Simply Plural
      </Text>

      <View style={[styles.infoRow, { backgroundColor: colors.secondary, borderColor: colors.border, marginBottom: 10 }]}>
        <Feather name="info" size={14} color={colors.mutedForeground} style={{ marginTop: 1 }} />
        <Text style={[styles.infoRowText, { color: colors.mutedForeground }]}>
          Imports members, front history, groups, chat, and notes from a Simply Plural data export. Profile images cannot transfer (they are hosted on Simply Plural's servers). Your current PluralNest data will be replaced.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.importBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={pickAndImportSP}
      >
        <Feather name="folder" size={18} color={colors.foreground} />
        <Text style={[styles.importBtnText, { color: colors.foreground }]}>
          {Platform.OS === "web" ? "Choose Simply Plural Export" : "Pick Simply Plural Export"}
        </Text>
      </TouchableOpacity>

      {Platform.OS !== "web" && (
        <TouchableOpacity
          style={[styles.importBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={pasteFromClipboardSP}
        >
          <Feather name="clipboard" size={18} color={colors.foreground} />
          <Text style={[styles.importBtnText, { color: colors.foreground }]}>
            Paste Simply Plural JSON
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.pasteToggle, { borderColor: colors.border }]}
        onPress={() => setShowSpImport((v) => !v)}
      >
        <Feather name={showSpImport ? "chevron-up" : "chevron-down"} size={15} color={colors.mutedForeground} />
        <Text style={[styles.pasteToggleText, { color: colors.mutedForeground }]}>
          Or paste Simply Plural JSON manually
        </Text>
      </TouchableOpacity>

      {showSpImport && (
        <View style={styles.pasteSection}>
          <TextInput
            style={[styles.pasteInput, {
              color: colors.foreground,
              borderColor: colors.border,
              backgroundColor: colors.secondary,
            }]}
            value={spPasteJson}
            onChangeText={setSpPasteJson}
            placeholder="Paste Simply Plural export JSON here..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={() => { const t = spPasteJson.trim(); if (t) runSpImport(t); }}
          >
            <Feather name="upload" size={18} color={colors.primaryForeground} />
            <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Import Simply Plural Data</Text>
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
  infoRow: {
    flexDirection: "row",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    alignItems: "flex-start",
  },
  infoRowText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17, flex: 1 },
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
