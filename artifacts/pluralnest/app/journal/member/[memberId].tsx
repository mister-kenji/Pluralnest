import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MemberAvatar } from "@/components/MemberAvatar";
import { TagChip } from "@/components/TagChip";
import { EmptyState } from "@/components/EmptyState";
import { useStorage } from "@/context/StorageContext";
import { useColors } from "@/hooks/useColors";
import { formatDate } from "@/utils/helpers";

export default function MemberJournalScreen() {
  const { memberId } = useLocalSearchParams<{ memberId: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, updateJournalEntries } = useStorage();

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const member = useMemo(
    () => data.members.find((m) => m.id === memberId),
    [data.members, memberId],
  );

  const entries = useMemo(
    () =>
      data.journalEntries
        .filter((e) => e.memberId === memberId)
        .sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return b.updatedAt - a.updatedAt;
        }),
    [data.journalEntries, memberId],
  );

  const getTag = (id: string) => data.journalTags.find((t) => t.id === id);

  const togglePin = (entryId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateJournalEntries(
      data.journalEntries.map((e) =>
        e.id === entryId ? { ...e, isPinned: !e.isPinned } : e,
      ),
    );
  };

  if (!member) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground, padding: 20 }}>Member not found.</Text>
      </View>
    );
  }

  const pinnedCount = entries.filter((e) => e.isPinned).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.topBar,
          {
            paddingTop: topInset + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.titleCenter}>
            <MemberAvatar
              name={member.name}
              color={member.color}
              profileImage={member.profileImage}
              size={28}
            />
            <Text style={[styles.title, { color: colors.foreground }]}>
              {member.name}'s Journal
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: member.color }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/journal/create?memberId=${memberId}&locked=1`);
            }}
          >
            <Feather name="plus" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={[styles.entryCount, { color: colors.mutedForeground }]}>
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
          {pinnedCount > 0 && `  ·  ${pinnedCount} pinned`}
        </Text>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: Platform.OS === "web" ? 120 : 90,
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="book"
            title="No entries yet"
            subtitle={`Start writing in ${member.name}'s journal`}
            action={{
              label: "New Entry",
              onPress: () =>
                router.push(`/journal/create?memberId=${memberId}&locked=1`),
            }}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: item.isPinned ? colors.primary + "60" : colors.border,
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/journal/${item.id}`);
            }}
            onLongPress={() => togglePin(item.id)}
            delayLongPress={400}
          >
            {item.coverImage && (
              <Image
                source={{ uri: item.coverImage }}
                style={styles.coverImage}
                contentFit="cover"
              />
            )}
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Text
                  style={[styles.cardTitle, { color: colors.foreground }]}
                  numberOfLines={2}
                >
                  {item.title || "Untitled"}
                </Text>
                <View style={styles.cardIcons}>
                  {item.isPinned && (
                    <Feather name="bookmark" size={14} color={colors.primary} />
                  )}
                  {item.isLocked && (
                    <Feather name="lock" size={14} color={colors.mutedForeground} />
                  )}
                </View>
              </View>
              <Text
                style={[styles.cardPreview, { color: colors.mutedForeground }]}
                numberOfLines={2}
              >
                {item.content.replace(/[#*`]/g, "")}
              </Text>
              {item.tags.length > 0 && (
                <View style={styles.tagRow}>
                  {item.tags.slice(0, 3).map((tagId) => {
                    const tag = getTag(tagId);
                    return tag ? (
                      <TagChip key={tagId} label={tag.label} color={tag.color} small />
                    ) : null;
                  })}
                </View>
              )}
              <Text style={[styles.cardDate, { color: colors.mutedForeground }]}>
                {formatDate(item.updatedAt)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  backBtn: { padding: 2 },
  titleCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", flexShrink: 1 },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  entryCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  coverImage: { width: "100%", height: 120 },
  cardContent: { padding: 14 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  cardTitle: { flex: 1, fontSize: 16, fontFamily: "Inter_600SemiBold" },
  cardIcons: { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 2 },
  cardPreview: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    marginBottom: 8,
  },
  tagRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 6 },
  cardDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
