import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
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

import { MemberAvatar } from "@/components/MemberAvatar";
import { TagChip } from "@/components/TagChip";
import { useStorage, JournalEntry } from "@/context/StorageContext";
import { useColors } from "@/hooks/useColors";
import { genId } from "@/utils/helpers";

export default function CreateJournalScreen() {
  const { memberId: paramMemberId, locked } = useLocalSearchParams<{ memberId?: string; locked?: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, updateJournalEntries, updateJournalTags } = useStorage();

  const isLockedToMember = locked === "1" && !!paramMemberId;
  const [selectedMemberId, setSelectedMemberId] = useState<string>(paramMemberId ?? (data.members[0]?.id ?? ""));
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTagLabel, setNewTagLabel] = useState("");

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const selectedMember = useMemo(
    () => data.members.find((m) => m.id === selectedMemberId),
    [data.members, selectedMemberId],
  );

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setCoverImage(result.assets[0].uri);
    }
  };

  const addTag = () => {
    const label = newTagLabel.trim();
    if (!label) return;
    let tag = data.journalTags.find((t) => t.label.toLowerCase() === label.toLowerCase());
    if (!tag) {
      tag = { id: genId(), label, color: selectedMember?.color ?? colors.primary };
      updateJournalTags([...data.journalTags, tag]);
    }
    if (!tags.includes(tag.id)) setTags((prev) => [...prev, tag!.id]);
    setNewTagLabel("");
  };

  const save = () => {
    if (!selectedMemberId) return;
    const entry: JournalEntry = {
      id: genId(),
      memberId: selectedMemberId,
      title: title.trim(),
      content,
      coverImage: coverImage || undefined,
      tags,
      isLocked: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    updateJournalEntries([...data.journalEntries, entry]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (isLockedToMember) {
      router.replace(`/journal/member/${selectedMemberId}`);
    } else {
      router.replace(`/journal/${entry.id}`);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: topInset + 8,
        paddingBottom: 60,
        paddingHorizontal: 16,
      }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>New Journal Entry</Text>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={save}
        >
          <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Save</Text>
        </TouchableOpacity>
      </View>

      {isLockedToMember && selectedMember ? (
        <View style={[styles.lockedMember, { backgroundColor: selectedMember.color + "18", borderColor: selectedMember.color + "44" }]}>
          <MemberAvatar name={selectedMember.name} color={selectedMember.color} profileImage={selectedMember.profileImage} size={26} />
          <Text style={[styles.lockedMemberText, { color: selectedMember.color }]}>
            {selectedMember.name}'s Journal
          </Text>
        </View>
      ) : (
        <>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Member</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.memberScroll}>
            {data.members
              .filter((m) => !m.isArchived)
              .map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.memberChip,
                    {
                      borderColor: selectedMemberId === m.id ? m.color : colors.border,
                      backgroundColor: selectedMemberId === m.id ? m.color + "22" : colors.secondary,
                    },
                  ]}
                  onPress={() => setSelectedMemberId(m.id)}
                >
                  <MemberAvatar name={m.name} color={m.color} profileImage={m.profileImage} size={26} />
                  <Text style={[styles.memberChipText, { color: selectedMemberId === m.id ? m.color : colors.foreground }]}>
                    {m.name}
                  </Text>
                </TouchableOpacity>
              ))}
          </ScrollView>
        </>
      )}

      <Text style={[styles.label, { color: colors.mutedForeground }]}>Cover Image</Text>
      <TouchableOpacity
        style={[styles.coverPicker, { backgroundColor: colors.secondary, borderColor: colors.border }]}
        onPress={pickCover}
      >
        {coverImage ? (
          <View style={styles.coverPreviewRow}>
            <Text style={[styles.coverPickerText, { color: colors.foreground }]}>Cover selected</Text>
            <TouchableOpacity onPress={() => setCoverImage("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Feather name="image" size={22} color={colors.mutedForeground} />
            <Text style={[styles.coverPickerText, { color: colors.mutedForeground }]}>
              Add cover image (optional)
            </Text>
          </>
        )}
      </TouchableOpacity>

      <TextInput
        style={[styles.titleInput, { color: colors.foreground }]}
        value={title}
        onChangeText={setTitle}
        placeholder="Title..."
        placeholderTextColor={colors.mutedForeground}
        multiline
      />

      <View style={styles.tagSection}>
        <View style={styles.tagWrap}>
          {tags.map((tagId) => {
            const tag = data.journalTags.find((t) => t.id === tagId);
            return tag ? (
              <TagChip
                key={tagId}
                label={tag.label}
                color={tag.color}
                onRemove={() => setTags((prev) => prev.filter((t) => t !== tagId))}
              />
            ) : null;
          })}
        </View>
        <View style={styles.tagInputRow}>
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
            style={[styles.addTagBtn, { backgroundColor: selectedMember?.color ?? colors.primary }]}
            onPress={addTag}
          >
            <Feather name="plus" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <TextInput
        style={[styles.contentInput, { color: colors.foreground, backgroundColor: colors.secondary, borderColor: colors.border }]}
        value={content}
        onChangeText={setContent}
        placeholder="Write your entry... (supports **bold**, *italic*, # headers)"
        placeholderTextColor={colors.mutedForeground}
        multiline
        textAlignVertical="top"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  pageTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  saveBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  label: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },
  lockedMember: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  lockedMemberText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  memberScroll: { marginBottom: 16 },
  memberChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    marginRight: 8,
  },
  memberChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  coverPicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderStyle: "dashed",
  },
  coverPreviewRow: { flex: 1, flexDirection: "row", justifyContent: "space-between" },
  coverPickerText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  titleInput: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    lineHeight: 28,
    marginBottom: 12,
  },
  tagSection: { marginBottom: 12 },
  tagWrap: { flexDirection: "row", flexWrap: "wrap", marginBottom: 6 },
  tagInputRow: { flexDirection: "row", gap: 8 },
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
    minHeight: 240,
  },
});
