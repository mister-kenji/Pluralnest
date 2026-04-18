import { Feather } from "@expo/vector-icons";
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
import { useStorage } from "@/context/StorageContext";
import { useColors } from "@/hooks/useColors";
import { formatDate } from "@/utils/helpers";

type Result =
  | { type: "member"; id: string; name: string; color: string; profileImage?: string; role: string }
  | { type: "journal"; id: string; title: string; memberName: string; memberColor: string; date: number }
  | { type: "forum"; id: string; title: string; memberName: string; memberColor: string; date: number };

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data } = useStorage();
  const [query, setQuery] = useState("");

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const results = useMemo((): Result[] => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    const arr: Result[] = [];

    data.members
      .filter(
        (m) =>
          !m.isArchived &&
          (m.name.toLowerCase().includes(q) ||
            m.role.toLowerCase().includes(q) ||
            m.pronouns.toLowerCase().includes(q) ||
            m.tags.some((t) => t.toLowerCase().includes(q))),
      )
      .forEach((m) =>
        arr.push({ type: "member", id: m.id, name: m.name, color: m.color, profileImage: m.profileImage, role: m.role }),
      );

    data.journalEntries
      .filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.content.toLowerCase().includes(q) ||
          e.tags.some((t) => {
            const tag = data.journalTags.find((jt) => jt.id === t);
            return tag?.label.toLowerCase().includes(q);
          }),
      )
      .forEach((e) => {
        const m = data.members.find((m) => m.id === e.memberId);
        arr.push({ type: "journal", id: e.id, title: e.title || "Untitled", memberName: m?.name ?? "", memberColor: m?.color ?? colors.primary, date: e.updatedAt });
      });

    data.forumPosts
      .filter((p) => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q))
      .forEach((p) => {
        const m = data.members.find((m) => m.id === p.memberId);
        arr.push({ type: "forum", id: p.id, title: p.title, memberName: m?.name ?? "", memberColor: m?.color ?? colors.primary, date: p.updatedAt });
      });

    return arr;
  }, [query, data]);

  const navigate = (item: Result) => {
    if (item.type === "member") router.push(`/member/${item.id}`);
    else if (item.type === "journal") router.push(`/journal/${item.id}`);
    else if (item.type === "forum") router.push(`/forums/${item.id}`);
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
        <View style={[styles.searchBar, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search members, journals, forums..."
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {!query ? (
        <View style={styles.emptySearch}>
          <Feather name="search" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Search members, journals, forums
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptySearch}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No results for "{query}"
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.result, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => navigate(item)}
            >
              {item.type === "member" && (
                <View style={styles.resultRow}>
                  <MemberAvatar name={item.name} color={item.color} profileImage={item.profileImage} size={40} />
                  <View style={styles.resultInfo}>
                    <Text style={[styles.resultTitle, { color: colors.foreground }]}>{item.name}</Text>
                    {item.role ? <Text style={[styles.resultSub, { color: item.color }]}>{item.role}</Text> : null}
                  </View>
                  <View style={[styles.typeTag, { backgroundColor: item.color + "22" }]}>
                    <Text style={[styles.typeText, { color: item.color }]}>member</Text>
                  </View>
                </View>
              )}
              {item.type === "journal" && (
                <View style={styles.resultRow}>
                  <View style={[styles.typeIcon, { backgroundColor: "#a0e8b2" + "22" }]}>
                    <Feather name="book" size={20} color="#a0e8b2" />
                  </View>
                  <View style={styles.resultInfo}>
                    <Text style={[styles.resultTitle, { color: colors.foreground }]}>{item.title}</Text>
                    <Text style={[styles.resultSub, { color: item.memberColor }]}>
                      {item.memberName} · {formatDate(item.date)}
                    </Text>
                  </View>
                  <View style={[styles.typeTag, { backgroundColor: "#a0e8b2" + "22" }]}>
                    <Text style={[styles.typeText, { color: "#a0e8b2" }]}>journal</Text>
                  </View>
                </View>
              )}
              {item.type === "forum" && (
                <View style={styles.resultRow}>
                  <View style={[styles.typeIcon, { backgroundColor: "#a0d9e8" + "22" }]}>
                    <Feather name="message-square" size={20} color="#a0d9e8" />
                  </View>
                  <View style={styles.resultInfo}>
                    <Text style={[styles.resultTitle, { color: colors.foreground }]}>{item.title}</Text>
                    <Text style={[styles.resultSub, { color: item.memberColor }]}>
                      {item.memberName} · {formatDate(item.date)}
                    </Text>
                  </View>
                  <View style={[styles.typeTag, { backgroundColor: "#a0d9e8" + "22" }]}>
                    <Text style={[styles.typeText, { color: "#a0d9e8" }]}>forum</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  emptySearch: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 40 },
  result: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 8 },
  resultRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  typeIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  resultInfo: { flex: 1 },
  resultTitle: { fontSize: 15, fontFamily: "Inter_500Medium", marginBottom: 2 },
  resultSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  typeTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  typeText: { fontSize: 11, fontFamily: "Inter_500Medium" },
});
