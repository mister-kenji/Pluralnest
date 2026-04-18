import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
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

import { MemberAvatar } from "@/components/MemberAvatar";
import { TagChip } from "@/components/TagChip";
import { MarkdownText } from "@/components/MarkdownText";
import { PinModal } from "@/components/PinModal";
import { EmptyState } from "@/components/EmptyState";
import { useStorage } from "@/context/StorageContext";
import { useLock } from "@/context/LockContext";
import { useColors } from "@/hooks/useColors";
import { formatDateTime, genId } from "@/utils/helpers";

export default function JournalEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, updateJournalEntries, updateJournalTags, softDelete } = useStorage();
  const { isJournalLocked, lockJournal, unlockJournal } = useLock();

  const entry = useMemo(
    () => data.journalEntries.find((e) => e.id === id),
    [data.journalEntries, id],
  );

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(entry?.title ?? "");
  const [editContent, setEditContent] = useState(entry?.content ?? "");
  const [editCover, setEditCover] = useState(entry?.coverImage ?? "");
  const [editTags, setEditTags] = useState<string[]>(entry?.tags ?? []);
  const [editLocked, setEditLocked] = useState(entry?.isLocked ?? false);
  const [editLockCode, setEditLockCode] = useState(entry?.lockCode ?? "");
  const [newTagLabel, setNewTagLabel] = useState("");
  const [showPinModal, setShowPinModal] = useState(isJournalLocked(id));

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const member = entry ? data.members.find((m) => m.id === entry.memberId) : null;
  const locked = isJournalLocked(id);

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setEditCover(result.assets[0].uri);
    }
  };

  const addTag = () => {
    const label = newTagLabel.trim();
    if (!label) return;
    let tag = data.journalTags.find((t) => t.label.toLowerCase() === label.toLowerCase());
    if (!tag) {
      tag = {
        id: genId(),
        label,
        color: member?.color ?? colors.primary,
      };
      updateJournalTags([...data.journalTags, tag]);
    }
    if (!editTags.includes(tag.id)) {
      setEditTags((prev) => [...prev, tag!.id]);
    }
    setNewTagLabel("");
  };

  const save = () => {
    if (!entry) return;
    const updated = {
      ...entry,
      title: editTitle.trim(),
      content: editContent,
      coverImage: editCover || undefined,
      tags: editTags,
      isLocked: editLocked,
      lockCode: editLockCode || undefined,
      updatedAt: Date.now(),
    };
    updateJournalEntries(data.journalEntries.map((e) => (e.id === id ? updated : e)));
    if (editLocked) lockJournal(id);
    setIsEditing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const deleteEntry = () => {
    Alert.alert("Delete Entry", "Move to recently deleted?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          if (entry) {
            softDelete(entry.id, "journal", entry);
            updateJournalEntries(data.journalEntries.filter((e) => e.id !== id));
          }
          router.back();
        },
      },
    ]);
  };

  if (!entry) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState icon="book" title="Entry not found" />
      </View>
    );
  }

  if (locked && entry.isLocked) {
    return (
      <>
        <View style={[styles.container, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
          <Feather name="lock" size={40} color={colors.mutedForeground} />
          <Text style={[styles.lockedText, { color: colors.foreground }]}>Journal Locked</Text>
        </View>
        <PinModal
          visible={showPinModal}
          code={entry.lockCode ?? "0000"}
          title="Unlock Journal"
          onSuccess={() => {
            unlockJournal(id);
            setShowPinModal(false);
          }}
          onCancel={() => router.back()}
        />
      </>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {entry.coverImage ? (
          <View style={styles.coverWrap}>
            <Image source={{ uri: entry.coverImage }} style={styles.coverImage} contentFit="cover" />
            <TouchableOpacity
              style={[styles.backBtnOverlay, { backgroundColor: colors.card + "cc" }]}
              onPress={() => router.back()}
            >
              <Feather name="arrow-left" size={20} color={colors.foreground} />
            </TouchableOpacity>
            {isEditing && (
              <TouchableOpacity
                style={[styles.changeCoverBtn, { backgroundColor: colors.card + "cc" }]}
                onPress={pickCover}
              >
                <Feather name="camera" size={16} color={colors.foreground} />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View
            style={[
              styles.topBar,
              { paddingTop: topInset + 10, backgroundColor: colors.background, borderBottomColor: colors.border },
            ]}
          >
            <TouchableOpacity onPress={() => router.back()}>
              <Feather name="arrow-left" size={22} color={colors.foreground} />
            </TouchableOpacity>
            {isEditing && (
              <TouchableOpacity onPress={pickCover}>
                <Feather name="image" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
            <View style={styles.topBarRight}>
              {isEditing ? (
                <>
                  <TouchableOpacity onPress={() => setIsEditing(false)}>
                    <Feather name="x" size={20} color={colors.mutedForeground} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={save}>
                    <Feather name="check" size={22} color={colors.primary} />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity onPress={() => setIsEditing(true)}>
                    <Feather name="edit-2" size={20} color={colors.foreground} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={deleteEntry}>
                    <Feather name="trash-2" size={20} color={colors.destructive} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}

        <View style={styles.body}>
          {member && (
            <View style={styles.authorRow}>
              <MemberAvatar
                name={member.name}
                color={member.color}
                profileImage={member.profileImage}
                size={28}
              />
              <Text style={[styles.authorName, { color: member.color }]}>{member.name}</Text>
              <Text style={[styles.entryDate, { color: colors.mutedForeground }]}>
                {formatDateTime(entry.updatedAt)}
              </Text>
              {entry.isLocked && (
                <Feather name="lock" size={14} color={colors.mutedForeground} />
              )}
            </View>
          )}

          {isEditing ? (
            <TextInput
              style={[styles.titleInput, { color: colors.foreground }]}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Title..."
              placeholderTextColor={colors.mutedForeground}
              multiline
            />
          ) : (
            <Text style={[styles.title, { color: colors.foreground }]}>
              {entry.title || "Untitled"}
            </Text>
          )}

          {editTags.length > 0 && (
            <View style={styles.tagRow}>
              {editTags.map((tagId) => {
                const tag = data.journalTags.find((t) => t.id === tagId);
                return tag ? (
                  <TagChip
                    key={tagId}
                    label={tag.label}
                    color={tag.color}
                    onRemove={isEditing ? () => setEditTags((prev) => prev.filter((t) => t !== tagId)) : undefined}
                  />
                ) : null;
              })}
            </View>
          )}

          {isEditing && (
            <View style={styles.addTagRow}>
              <TextInput
                style={[styles.tagInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
                value={newTagLabel}
                onChangeText={setNewTagLabel}
                placeholder="Add tag..."
                placeholderTextColor={colors.mutedForeground}
                onSubmitEditing={addTag}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[styles.addTagBtn, { backgroundColor: colors.primary }]}
                onPress={addTag}
              >
                <Feather name="plus" size={16} color={colors.primaryForeground} />
              </TouchableOpacity>
            </View>
          )}

          {isEditing ? (
            <TextInput
              style={[styles.contentInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
              value={editContent}
              onChangeText={setEditContent}
              placeholder="Write your entry... (supports markdown)"
              placeholderTextColor={colors.mutedForeground}
              multiline
              textAlignVertical="top"
            />
          ) : (
            <MarkdownText content={entry.content || "No content yet."} />
          )}

          {isEditing && (
            <View style={[styles.lockSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.lockRow}>
                <Feather name="lock" size={16} color={colors.foreground} />
                <Text style={[styles.lockLabel, { color: colors.foreground }]}>Lock this entry</Text>
                <Switch
                  value={editLocked}
                  onValueChange={setEditLocked}
                  trackColor={{ false: colors.border, true: colors.primary }}
                />
              </View>
              {editLocked && (
                <TextInput
                  style={[styles.pinInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
                  value={editLockCode}
                  onChangeText={setEditLockCode}
                  placeholder="4-digit PIN"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                />
              )}
            </View>
          )}

          {isEditing && (
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={save}
              >
                <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteBtn, { borderColor: colors.destructive }]}
                onPress={deleteEntry}
              >
                <Feather name="trash-2" size={16} color={colors.destructive} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  coverWrap: { position: "relative" },
  coverImage: { width: "100%", height: 200 },
  backBtnOverlay: {
    position: "absolute",
    top: 50,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  changeCoverBtn: {
    position: "absolute",
    top: 50,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: 1,
  },
  topBarRight: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  body: { paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  authorName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  entryDate: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", lineHeight: 28 },
  titleInput: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    lineHeight: 28,
  },
  tagRow: { flexDirection: "row", flexWrap: "wrap" },
  addTagRow: { flexDirection: "row", gap: 8 },
  tagInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  addTagBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  contentInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    minHeight: 200,
  },
  lockSection: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  lockRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  lockLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  pinInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    letterSpacing: 8,
  },
  editActions: { flexDirection: "row", gap: 10 },
  saveBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  deleteBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  lockedText: { fontSize: 18, fontFamily: "Inter_600SemiBold", marginTop: 12 },
});
