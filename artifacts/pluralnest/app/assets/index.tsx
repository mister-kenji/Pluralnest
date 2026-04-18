import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import { Image } from "expo-image";
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

import { useStorage, Asset } from "@/context/StorageContext";
import { useColors } from "@/hooks/useColors";
import { genId } from "@/utils/helpers";
import { persistImage } from "@/utils/persistImage";

export default function AssetsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, updateAssets } = useStorage();
  const assets = data.assets ?? [];

  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [pendingName, setPendingName] = useState("");
  const [nameError, setNameError] = useState("");

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setPendingUri(await persistImage(result.assets[0].uri));
      setPendingName("");
      setNameError("");
    }
  };

  const savePending = () => {
    const name = pendingName.trim();
    if (!name) { setNameError("Name is required"); return; }
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      setNameError("Only letters, numbers, _ and - allowed");
      return;
    }
    if (assets.some((a) => a.name.toLowerCase() === name.toLowerCase())) {
      setNameError("An asset with that name already exists");
      return;
    }
    const newAsset: Asset = { id: genId(), name, uri: pendingUri!, createdAt: Date.now() };
    updateAssets([...assets, newAsset]);
    setPendingUri(null);
    setPendingName("");
    setNameError("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const copyToken = async (name: string) => {
    await Clipboard.setStringAsync(`(@${name})`);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Copied!", `(@${name}) copied to clipboard.\n\nPaste it into any description or field.`);
  };

  const deleteAsset = (asset: Asset) => {
    Alert.alert(
      "Delete asset?",
      `"${asset.name}" will be removed. Any (@${asset.name}) tokens that reference it will show as broken images.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => updateAssets(assets.filter((a) => a.id !== asset.id)),
        },
      ],
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topInset + 16, paddingBottom: 120, paddingHorizontal: 16 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Assets</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={pickImage}
        >
          <Feather name="plus" size={18} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      {/* Info banner */}
      <View style={[styles.infoBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="info" size={14} color={colors.mutedForeground} />
        <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
          Upload images and reference them anywhere with{" "}
          <Text style={[styles.infoMono, { color: colors.foreground }]}>(@name)</Text>
          {" "}in descriptions, journals, or custom fields. Tap an asset to copy its token.
        </Text>
      </View>

      {/* Pending upload form */}
      {pendingUri && (
        <View style={[styles.pendingCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
          <Image source={{ uri: pendingUri }} contentFit="cover" style={styles.pendingPreview} />
          <View style={styles.pendingForm}>
            <Text style={[styles.pendingLabel, { color: colors.mutedForeground }]}>Asset name</Text>
            <TextInput
              style={[styles.pendingInput, { backgroundColor: colors.background, borderColor: nameError ? "#ef4444" : colors.border, color: colors.foreground }]}
              value={pendingName}
              onChangeText={(t) => { setPendingName(t); setNameError(""); }}
              placeholder="e.g. my_pic"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
            <Text style={[styles.pendingHint, { color: colors.mutedForeground }]}>
              Use it as: <Text style={{ color: colors.foreground }}>(@{pendingName || "name"})</Text>
            </Text>
            <View style={styles.pendingActions}>
              <TouchableOpacity
                style={[styles.pendingCancel, { borderColor: colors.border }]}
                onPress={() => { setPendingUri(null); setPendingName(""); setNameError(""); }}
              >
                <Text style={[styles.pendingCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pendingSave, { backgroundColor: colors.primary }]}
                onPress={savePending}
              >
                <Text style={[styles.pendingSaveText, { color: colors.primaryForeground }]}>Save Asset</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Asset list */}
      {assets.length === 0 && !pendingUri ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="image" size={32} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No assets yet</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Tap the + button to upload your first image.
          </Text>
        </View>
      ) : (
        assets.map((asset) => (
          <TouchableOpacity
            key={asset.id}
            style={[styles.assetRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => copyToken(asset.name)}
            activeOpacity={0.85}
          >
            <Image source={{ uri: asset.uri }} contentFit="cover" style={styles.assetThumbFull} />
            <View style={[styles.assetRowFooter, { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <View style={styles.assetInfo}>
                <Text style={[styles.assetName, { color: colors.foreground }]}>{asset.name}</Text>
                <Text style={[styles.assetToken, { color: colors.primary }]}>(@{asset.name})</Text>
                <Text style={[styles.assetHint, { color: colors.mutedForeground }]}>Tap to copy token</Text>
              </View>
              <TouchableOpacity
                hitSlop={10}
                onPress={() => deleteAsset(asset)}
              >
                <Feather name="trash-2" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontSize: 22, fontFamily: "Inter_700Bold" },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  infoBanner: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  infoMono: { fontFamily: "Inter_600SemiBold" },
  pendingCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: "hidden",
    marginBottom: 16,
  },
  pendingPreview: { width: "100%", height: 160 },
  pendingForm: { padding: 14, gap: 8 },
  pendingLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8 },
  pendingInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#ef4444" },
  pendingHint: { fontSize: 12, fontFamily: "Inter_400Regular" },
  pendingActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  pendingCancel: { flex: 1, borderRadius: 8, borderWidth: 1, paddingVertical: 10, alignItems: "center" },
  pendingCancelText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  pendingSave: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  pendingSaveText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 12,
    marginTop: 24,
  },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  assetRow: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  assetThumbFull: { width: "100%", height: 160 },
  assetRowFooter: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    gap: 10,
  },
  assetThumb: { width: 64, height: 64, borderRadius: 8 },
  assetInfo: { flex: 1, gap: 2 },
  assetName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  assetToken: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  assetHint: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
