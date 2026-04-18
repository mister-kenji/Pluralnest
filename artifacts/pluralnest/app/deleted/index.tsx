import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect } from "react";
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { useStorage, DeletedItem, Member, JournalEntry, ForumPost } from "@/context/StorageContext";
import { useColors } from "@/hooks/useColors";
import { formatDate } from "@/utils/helpers";

export default function DeletedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, restoreDeleted, updateMembers, updateJournalEntries, updateForumPosts, updateChatMessages, updateDeletedItems, purgeOldDeleted } =
    useStorage();

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    purgeOldDeleted();
  }, []);

  const sorted = [...data.deletedItems].sort((a, b) => b.deletedAt - a.deletedAt);

  const restore = (item: DeletedItem) => {
    Alert.alert("Restore Item", "Do you want to restore this item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Restore",
        onPress: () => {
          restoreDeleted(item.id);
          if (item.type === "member") {
            updateMembers([...data.members, item.data as Member]);
          } else if (item.type === "journal") {
            updateJournalEntries([...data.journalEntries, item.data as JournalEntry]);
          } else if (item.type === "forum") {
            updateForumPosts([...data.forumPosts, item.data as ForumPost]);
          } else if (item.type === "message") {
            updateChatMessages([...data.chatMessages, item.data as any]);
          }
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  const permanentDelete = (id: string) => {
    Alert.alert("Permanently Delete", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete Forever",
        style: "destructive",
        onPress: () => {
          updateDeletedItems(data.deletedItems.filter((d) => d.id !== id));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  };

  const getTitle = (item: DeletedItem): string => {
    if (item.type === "member") return (item.data as Member).name;
    if (item.type === "journal") return (item.data as JournalEntry).title || "Untitled Journal";
    if (item.type === "forum") return (item.data as ForumPost).title;
    if (item.type === "message") {
      const content = (item.data as { content: string }).content ?? "";
      return content.length > 60 ? content.slice(0, 60) + "…" : content || "Chat message";
    }
    return "Deleted item";
  };

  const typeColors: Record<string, string> = {
    member: "#a89de8",
    journal: "#a0e8b2",
    forum: "#a0d9e8",
    message: "#e8a0bf",
    group: "#e8d0a0",
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.topBar,
          { paddingTop: topInset + 12, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Recently Deleted</Text>
        <View style={{ width: 22 }} />
      </View>

      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        Items are kept for 30 days before being permanently removed.
      </Text>

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="trash-2"
            title="Nothing here"
            subtitle="Recently deleted items appear here for 30 days"
          />
        }
        renderItem={({ item }) => {
          const daysLeft = Math.max(
            0,
            30 - Math.floor((Date.now() - item.deletedAt) / 86400000),
          );
          return (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.typeTag,
                  { backgroundColor: (typeColors[item.type] ?? colors.primary) + "22" },
                ]}
              >
                <Text style={[styles.typeText, { color: typeColors[item.type] ?? colors.primary }]}>
                  {item.type}
                </Text>
              </View>
              <Text style={[styles.itemTitle, { color: colors.foreground }]} numberOfLines={1}>
                {getTitle(item)}
              </Text>
              <Text style={[styles.deletedDate, { color: colors.mutedForeground }]}>
                Deleted {formatDate(item.deletedAt)} · {daysLeft}d left
              </Text>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.restoreBtn, { borderColor: colors.primary }]}
                  onPress={() => restore(item)}
                >
                  <Feather name="rotate-ccw" size={14} color={colors.primary} />
                  <Text style={[styles.restoreText, { color: colors.primary }]}>Restore</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.deleteBtn, { borderColor: colors.destructive }]}
                  onPress={() => permanentDelete(item.id)}
                >
                  <Feather name="trash-2" size={14} color={colors.destructive} />
                  <Text style={[styles.deleteText, { color: colors.destructive }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  hint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 20,
    paddingVertical: 10,
    lineHeight: 18,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  typeTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  typeText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  itemTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  deletedDate: { fontSize: 12, fontFamily: "Inter_400Regular" },
  actions: { flexDirection: "row", gap: 10 },
  restoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  restoreText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  deleteText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
