import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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
import { useStorage, ForumPost } from "@/context/StorageContext";
import { useColors } from "@/hooks/useColors";
import { genId } from "@/utils/helpers";

export default function CreateForumScreen() {
  const { memberId: paramMemberId } = useLocalSearchParams<{ memberId?: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, updateForumPosts } = useStorage();

  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    paramMemberId ?? (data.members[0]?.id ?? ""),
  );
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<"discussion" | "poll">("discussion");
  const [pollOptions, setPollOptions] = useState(["", ""]);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const save = () => {
    if (!title.trim() || !selectedMemberId) return;
    const post: ForumPost = {
      id: genId(),
      memberId: selectedMemberId,
      title: title.trim(),
      content: content.trim(),
      type,
      pollOptions:
        type === "poll"
          ? pollOptions
              .filter((o) => o.trim())
              .map((o) => ({ id: genId(), text: o.trim(), votes: [] }))
          : undefined,
      replies: [],
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    updateForumPosts([...data.forumPosts, post]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace(`/forums/${post.id}`);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topInset + 8, paddingBottom: 60, paddingHorizontal: 16 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>New Forum Post</Text>
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={save}>
          <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Post</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.label, { color: colors.mutedForeground }]}>Post as</Text>
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

      <Text style={[styles.label, { color: colors.mutedForeground }]}>Type</Text>
      <View style={styles.typeRow}>
        {(["discussion", "poll"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[
              styles.typeBtn,
              {
                borderColor: type === t ? colors.primary : colors.border,
                backgroundColor: type === t ? colors.primary + "22" : colors.secondary,
              },
            ]}
            onPress={() => setType(t)}
          >
            <Feather
              name={t === "poll" ? "bar-chart-2" : "message-square"}
              size={16}
              color={type === t ? colors.primary : colors.mutedForeground}
            />
            <Text style={[styles.typeBtnText, { color: type === t ? colors.primary : colors.foreground }]}>
              {t === "poll" ? "Poll" : "Discussion"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={[styles.titleInput, { color: colors.foreground }]}
        value={title}
        onChangeText={setTitle}
        placeholder="Topic title..."
        placeholderTextColor={colors.mutedForeground}
        multiline
      />

      <TextInput
        style={[styles.contentInput, { color: colors.foreground, backgroundColor: colors.secondary, borderColor: colors.border }]}
        value={content}
        onChangeText={setContent}
        placeholder={type === "poll" ? "Context for the poll..." : "Share your thoughts..."}
        placeholderTextColor={colors.mutedForeground}
        multiline
        textAlignVertical="top"
      />

      {type === "poll" && (
        <View style={[styles.pollSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Poll Options</Text>
          {pollOptions.map((opt, i) => (
            <TextInput
              key={i}
              style={[styles.pollInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
              value={opt}
              onChangeText={(v) => setPollOptions((prev) => prev.map((p, j) => (j === i ? v : p)))}
              placeholder={`Option ${i + 1}...`}
              placeholderTextColor={colors.mutedForeground}
            />
          ))}
          <TouchableOpacity
            style={[styles.addOptionBtn, { borderColor: colors.border }]}
            onPress={() => setPollOptions((prev) => [...prev, ""])}
          >
            <Feather name="plus" size={16} color={colors.primary} />
            <Text style={[styles.addOptionText, { color: colors.primary }]}>Add option</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  pageTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  saveBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, marginTop: 4 },
  memberScroll: { marginBottom: 16 },
  memberChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, marginRight: 8 },
  memberChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  typeRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  typeBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, flex: 1, justifyContent: "center" },
  typeBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  titleInput: { fontSize: 20, fontFamily: "Inter_700Bold", lineHeight: 26, marginBottom: 12 },
  contentInput: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22, minHeight: 120, marginBottom: 16 },
  pollSection: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  pollInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, fontFamily: "Inter_400Regular" },
  addOptionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, borderTopWidth: 1, borderStyle: "dashed" },
  addOptionText: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
