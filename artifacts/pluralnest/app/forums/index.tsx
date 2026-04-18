import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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
import { formatRelative } from "@/utils/helpers";

export default function ForumsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data } = useStorage();
  const [search, setSearch] = useState("");

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const sorted = useMemo(() => {
    const q = search.toLowerCase();
    return data.forumPosts
      .filter((p) => !q || p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [data.forumPosts, search]);

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
        <Text style={[styles.title, { color: colors.foreground }]}>Forums</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/forums/create")}
        >
          <Feather name="plus" size={20} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchWrap, { paddingHorizontal: 16, paddingTop: 10 }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search forums..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="message-square"
            title="No forums yet"
            subtitle="Start a discussion or poll"
            action={{ label: "New Forum", onPress: () => router.push("/forums/create") }}
          />
        }
        renderItem={({ item }) => {
          const member = data.members.find((m) => m.id === item.memberId);
          return (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/forums/${item.id}`);
              }}
            >
              <View style={styles.cardHeader}>
                {member && (
                  <View style={styles.authorRow}>
                    <MemberAvatar name={member.name} color={member.color} profileImage={member.profileImage} size={26} />
                    <Text style={[styles.authorName, { color: member.color }]}>{member.name}</Text>
                  </View>
                )}
                <View style={[styles.typeTag, { backgroundColor: item.type === "poll" ? "#a0d9e8" + "22" : "#a89de8" + "22" }]}>
                  <Feather
                    name={item.type === "poll" ? "bar-chart-2" : "message-square"}
                    size={12}
                    color={item.type === "poll" ? "#a0d9e8" : "#a89de8"}
                  />
                  <Text style={[styles.typeText, { color: item.type === "poll" ? "#a0d9e8" : "#a89de8" }]}>
                    {item.type}
                  </Text>
                </View>
              </View>
              <Text style={[styles.forumTitle, { color: colors.foreground }]}>{item.title}</Text>
              <Text style={[styles.forumPreview, { color: colors.mutedForeground }]} numberOfLines={2}>
                {item.content}
              </Text>
              {item.tags.length > 0 && (
                <View style={styles.tagRow}>
                  {item.tags.slice(0, 3).map((t) => (
                    <TagChip key={t} label={t} color={colors.primary} small />
                  ))}
                </View>
              )}
              <View style={styles.footer}>
                <View style={styles.footerItem}>
                  <Feather name="message-circle" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
                    {item.replies.length} replies
                  </Text>
                </View>
                <Text style={[styles.footerDate, { color: colors.mutedForeground }]}>
                  {formatRelative(item.updatedAt)}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  searchWrap: { paddingBottom: 8 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  authorName: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  typeTag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  typeText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  forumTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  forumPreview: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  tagRow: { flexDirection: "row", flexWrap: "wrap" },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  footerDate: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
