import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
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

export default function JournalsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data } = useStorage();
  const [search, setSearch] = useState("");
  const [filterMemberId, setFilterMemberId] = useState<string | null>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return data.journalEntries
      .filter((e) => {
        if (filterMemberId && e.memberId !== filterMemberId) return false;
        if (!q) return true;
        return (
          e.title.toLowerCase().includes(q) ||
          e.content.toLowerCase().includes(q) ||
          e.tags.some((t) => t.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [data.journalEntries, search, filterMemberId]);

  const getTag = (id: string) => data.journalTags.find((t) => t.id === id);
  const getMember = (id: string) => data.members.find((m) => m.id === id);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.topBar,
          { paddingTop: topInset + 12, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>Journals</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/journal/create")}
          >
            <Feather name="plus" size={20} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search journals..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.memberFilter}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor: !filterMemberId ? colors.primary : colors.secondary,
                borderColor: !filterMemberId ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setFilterMemberId(null)}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: !filterMemberId ? colors.primaryForeground : colors.foreground },
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {data.members
            .filter((m) => !m.isArchived)
            .slice(0, 5)
            .map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: filterMemberId === m.id ? m.color + "33" : colors.secondary,
                    borderColor: filterMemberId === m.id ? m.color : colors.border,
                  },
                ]}
                onPress={() => setFilterMemberId(filterMemberId === m.id ? null : m.id)}
              >
                <MemberAvatar name={m.name} color={m.color} size={18} />
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: filterMemberId === m.id ? m.color : colors.foreground,
                    },
                  ]}
                >
                  {m.name}
                </Text>
              </TouchableOpacity>
            ))}
        </View>
      </View>

      <FlatList
        data={filtered}
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
            title="No journal entries"
            subtitle="Create your first journal entry"
            action={{ label: "New Entry", onPress: () => router.push("/journal/create") }}
          />
        }
        renderItem={({ item }) => {
          const member = getMember(item.memberId);
          return (
            <TouchableOpacity
              style={[styles.journalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/journal/${item.id}`);
              }}
            >
              {item.coverImage && (
                <Image
                  source={{ uri: item.coverImage }}
                  style={styles.coverImage}
                  contentFit="cover"
                />
              )}
              <View style={styles.journalContent}>
                <View style={styles.journalHeader}>
                  {member && (
                    <View style={styles.journalAuthor}>
                      <MemberAvatar
                        name={member.name}
                        color={member.color}
                        profileImage={member.profileImage}
                        size={22}
                      />
                      <Text style={[styles.authorName, { color: member.color }]}>{member.name}</Text>
                    </View>
                  )}
                  {item.isLocked && (
                    <Feather name="lock" size={14} color={colors.mutedForeground} />
                  )}
                </View>
                <Text style={[styles.journalTitle, { color: colors.foreground }]} numberOfLines={2}>
                  {item.title || "Untitled"}
                </Text>
                <Text
                  style={[styles.journalPreview, { color: colors.mutedForeground }]}
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
                <Text style={[styles.journalDate, { color: colors.mutedForeground }]}>
                  {formatDate(item.updatedAt)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
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
    marginBottom: 12,
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  memberFilter: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  journalCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  coverImage: { width: "100%", height: 120 },
  journalContent: { padding: 14 },
  journalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  journalAuthor: { flexDirection: "row", alignItems: "center", gap: 6 },
  authorName: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  journalTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  journalPreview: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    marginBottom: 8,
  },
  tagRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 6 },
  journalDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
