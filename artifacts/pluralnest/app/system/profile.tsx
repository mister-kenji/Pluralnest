import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useStorage } from "@/context/StorageContext";
import { useColors } from "@/hooks/useColors";
import { persistImage } from "@/utils/persistImage";

export default function SystemProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, updateSystemProfile } = useStorage();
  const { width: screenWidth } = useWindowDimensions();

  const profile = data.systemProfile ?? { description: "" };
  const systemName = data.settings.systemName;

  const [description, setDescription] = useState(profile.description ?? "");
  const [saved, setSaved] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const BANNER_H = 150;
  const AVATAR_SIZE = 90;

  const save = () => {
    updateSystemProfile({ ...profile, description });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const pickBanner = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
    if (!result.canceled && result.assets[0]) {
      const uri = await persistImage(result.assets[0].uri);
      updateSystemProfile({ ...profile, description, bannerImage: uri });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const removeBanner = () => {
    updateSystemProfile({ ...profile, description, bannerImage: undefined });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const pickProfileImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
    if (!result.canceled && result.assets[0]) {
      const uri = await persistImage(result.assets[0].uri);
      updateSystemProfile({ ...profile, description, profileImage: uri });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const removeProfileImage = () => {
    updateSystemProfile({ ...profile, description, profileImage: undefined });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Back button floated over banner ── */}
      <View style={[styles.backBtn, { top: topInset + 10 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backCircle, { backgroundColor: "#00000066" }]}
        >
          <Feather name="arrow-left" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── Banner ── */}
      <View style={[styles.bannerWrapper, { height: BANNER_H + topInset }]}>
        {profile.bannerImage ? (
          <Image source={{ uri: profile.bannerImage }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.primary + "44" }]} />
        )}
        <View style={[styles.bannerOverlay, { paddingTop: topInset + 10 }]}>
          <TouchableOpacity
            style={[styles.bannerEditBtn, { backgroundColor: "#00000066" }]}
            onPress={pickBanner}
          >
            <Feather name="camera" size={14} color="#fff" />
            <Text style={styles.bannerEditText}>
              {profile.bannerImage ? "Change" : "Add Banner"}
            </Text>
          </TouchableOpacity>
          {profile.bannerImage && (
            <TouchableOpacity
              style={[styles.bannerEditBtn, { backgroundColor: "#00000066" }]}
              onPress={removeBanner}
            >
              <Feather name="x" size={14} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Avatar ── */}
      <View style={[styles.avatarRow, { marginTop: -(AVATAR_SIZE / 2) }]}>
        <View style={styles.avatarWrap}>
          <TouchableOpacity onPress={pickProfileImage} activeOpacity={0.85}>
            {profile.profileImage ? (
              <Image
                source={{ uri: profile.profileImage }}
                style={[styles.avatar, { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, borderColor: colors.background }]}
                contentFit="cover"
              />
            ) : (
              <View
                style={[
                  styles.avatarPlaceholder,
                  { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, backgroundColor: colors.primary + "44", borderColor: colors.background },
                ]}
              >
                <Feather name="users" size={34} color={colors.primary} />
              </View>
            )}
            <View style={[styles.avatarEditBadge, { backgroundColor: colors.primary }]}>
              <Feather name="camera" size={11} color={colors.primaryForeground} />
            </View>
          </TouchableOpacity>
          {profile.profileImage && (
            <TouchableOpacity style={styles.removeAvatarBtn} onPress={removeProfileImage} hitSlop={6}>
              <Feather name="x" size={12} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Name ── */}
      <View style={styles.nameSection}>
        <Text style={[styles.systemName, { color: colors.foreground }]}>{systemName}</Text>
        <Text style={[styles.systemSub, { color: colors.mutedForeground }]}>Collective Profile</Text>
      </View>

      {/* ── Description ── */}
      <View style={{ paddingHorizontal: 16 }}>
        <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>Description</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.descInput, { color: colors.foreground, backgroundColor: colors.secondary, borderColor: colors.border }]}
            value={description}
            onChangeText={setDescription}
            placeholder={"A description of your system — who you are, your origins, your collective identity, anything you'd like to share…"}
            placeholderTextColor={colors.mutedForeground}
            multiline
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={save}
        >
          <Feather name={saved ? "check" : "save"} size={18} color={colors.primaryForeground} />
          <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
            {saved ? "Saved!" : "Save Description"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { position: "absolute", left: 16, zIndex: 10 },
  backCircle: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  bannerWrapper: { width: "100%", overflow: "hidden" },
  bannerOverlay: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    padding: 12,
    gap: 8,
  },
  bannerEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  bannerEditText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#fff" },
  avatarRow: { paddingHorizontal: 20, marginBottom: 6 },
  avatarWrap: { position: "relative", alignSelf: "flex-start" },
  avatar: { borderWidth: 3 },
  avatarPlaceholder: { borderWidth: 3, alignItems: "center", justifyContent: "center" },
  avatarEditBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  removeAvatarBtn: {
    position: "absolute",
    top: 0,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#444",
    alignItems: "center",
    justifyContent: "center",
  },
  nameSection: { paddingHorizontal: 20, marginBottom: 16, gap: 2 },
  systemName: { fontSize: 24, fontFamily: "Inter_700Bold" },
  systemSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
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
  descInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 140,
    lineHeight: 21,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 12,
  },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
