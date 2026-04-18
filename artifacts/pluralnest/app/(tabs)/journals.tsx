import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
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
import { EmptyState } from "@/components/EmptyState";
import { useStorage } from "@/context/StorageContext";
import { useColors } from "@/hooks/useColors";
import { formatDate } from "@/utils/helpers";

export default function JournalsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data } = useStorage();

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const memberJournals = useMemo(() => {
    return data.members
      .filter((m) => !m.isArchived)
      .map((m) => {
        const entries = data.journalEntries
          .filter((e) => e.memberId === m.id)
          .sort((a, b) => b.updatedAt - a.updatedAt);
        return { member: m, entries, count: entries.length, latest: entries[0] };
      })
      .sort((a, b) => {
        if (a.latest && b.latest) return b.latest.updatedAt - a.latest.updatedAt;
        if (a.latest) return -1;
        if (b.latest) return 1;
        return a.member.name.localeCompare(b.member.name);
      });
  }, [data.members, data.journalEntries]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.topBar,
          { paddingTop: topInset + 12, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Journals</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Each member's personal journal
        </Text>
      </View>

      <FlatList
        data={memberJournals}
        keyExtractor={(item) => item.member.id}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: Platform.OS === "web" ? 120 : 90,
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="book"
            title="No members yet"
            subtitle="Add members to start their journals"
            action={{ label: "Add Member", onPress: () => router.push("/member/edit") }}
          />
        }
        renderItem={({ item: { member, entries, count, latest } }) => (
          <TouchableOpacity
            style={[styles.journalBook, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/journal/member/${member.id}`);
            }}
          >
            <View style={[styles.spine, { backgroundColor: member.color + "66" }]} />
            <View style={styles.bookBody}>
              <View style={styles.bookHeader}>
                <MemberAvatar
                  name={member.name}
                  color={member.color}
                  profileImage={member.profileImage}
                  size={40}
                />
                <View style={styles.bookInfo}>
                  <Text style={[styles.memberName, { color: colors.foreground }]}>
                    {member.name}
                  </Text>
                  {member.pronouns ? (
                    <Text style={[styles.pronouns, { color: colors.mutedForeground }]}>
                      {member.pronouns}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.bookMeta}>
                  <View style={[styles.countBadge, { backgroundColor: member.color + "22", borderColor: member.color + "44" }]}>
                    <Feather name="book" size={11} color={member.color} />
                    <Text style={[styles.countText, { color: member.color }]}>
                      {count}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                </View>
              </View>

              {latest ? (
                <View style={[styles.latestEntry, { borderTopColor: colors.border }]}>
                  <Text style={[styles.latestLabel, { color: colors.mutedForeground }]}>
                    Latest
                  </Text>
                  <View style={styles.latestRow}>
                    <Text
                      style={[styles.latestTitle, { color: colors.foreground }]}
                      numberOfLines={1}
                    >
                      {latest.title || "Untitled"}
                    </Text>
                    <Text style={[styles.latestDate, { color: colors.mutedForeground }]}>
                      {formatDate(latest.updatedAt)}
                    </Text>
                  </View>
                  {latest.content ? (
                    <Text
                      style={[styles.latestPreview, { color: colors.mutedForeground }]}
                      numberOfLines={1}
                    >
                      {latest.content.replace(/[#*`]/g, "")}
                    </Text>
                  ) : null}
                </View>
              ) : (
                <View style={[styles.emptyBook, { borderTopColor: colors.border }]}>
                  <Text style={[styles.emptyBookText, { color: colors.mutedForeground }]}>
                    No entries yet — tap to start writing
                  </Text>
                </View>
              )}
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
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", marginBottom: 2 },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular" },
  journalBook: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    flexDirection: "row",
    overflow: "hidden",
  },
  spine: { width: 6 },
  bookBody: { flex: 1, padding: 14 },
  bookHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  bookInfo: { flex: 1 },
  memberName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  pronouns: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  bookMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  countBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  countText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  latestEntry: { borderTopWidth: 1, paddingTop: 10 },
  latestLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  latestRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 2,
  },
  latestTitle: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  latestDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  latestPreview: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
  emptyBook: { borderTopWidth: 1, paddingTop: 10 },
  emptyBookText: { fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic" },
});
