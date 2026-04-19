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
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MemberAvatar } from "@/components/MemberAvatar";
import { EmptyState } from "@/components/EmptyState";
import { useStorage } from "@/context/StorageContext";
import { useColors } from "@/hooks/useColors";
import { useBottomTabClearance } from "@/hooks/useBottomTabClearance";

const COLS = 2;
const SIDE_PAD = 16;
const GAP = 12;
const AVATAR_SIZE = 56;
const AVATAR_OVERLAP = AVATAR_SIZE * 0.55; // how far avatar dips into the book top

export default function JournalsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data } = useStorage();
  const { width } = useWindowDimensions();

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomClearance = useBottomTabClearance(16);
  const CARD_WIDTH = (width - SIDE_PAD * 2 - GAP) / COLS;
  const BOOK_HEIGHT = CARD_WIDTH * 1.5;

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

  const renderBook = ({ item: { member, count } }: { item: typeof memberJournals[0] }) => (
    <TouchableOpacity
      style={[styles.cell, { width: CARD_WIDTH }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/journal/member/${member.id}`);
      }}
      activeOpacity={0.8}
    >
      {/* Avatar floating above the book — rendered first so it appears on top */}
      <View style={styles.avatarRow}>
        <MemberAvatar
          name={member.name}
          color={member.color}
          profileImage={member.profileImage}
          size={AVATAR_SIZE}
          shape={member.avatarShape}
          style={{ zIndex: 2 }}
        />
      </View>

      {/* Book cover */}
      <View
        style={[
          styles.book,
          {
            width: CARD_WIDTH,
            height: BOOK_HEIGHT,
            backgroundColor: colors.card,
            borderColor: member.color + "66",
            marginTop: -AVATAR_OVERLAP,
          },
        ]}
      >
        {/* Left spine strip */}
        <View style={[styles.spine, { backgroundColor: member.color }]} />

        {/* Cover face */}
        <View style={[styles.face, { backgroundColor: member.color + "12" }]}>
          {/* Space for avatar overlap at top */}
          <View style={{ height: AVATAR_OVERLAP + 10 }} />

          <View style={{ flex: 1 }} />

          {/* Entry count badge at bottom */}
          <View style={[styles.countBadge, { backgroundColor: member.color + "22", borderColor: member.color + "44" }]}>
            <Feather name="edit-3" size={10} color={member.color} />
            <Text style={[styles.countText, { color: member.color }]}>
              {count} {count === 1 ? "entry" : "entries"}
            </Text>
          </View>
        </View>
      </View>

      {/* Name label below */}
      <Text style={[styles.bookLabel, { color: colors.foreground }]} numberOfLines={2}>
        {member.name}{"'"}s Journal
      </Text>
    </TouchableOpacity>
  );

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
        numColumns={COLS}
        columnWrapperStyle={{ gap: GAP }}
        contentContainerStyle={{
          paddingHorizontal: SIDE_PAD,
          paddingTop: AVATAR_SIZE / 2 + 16, // room for avatar above first row
          paddingBottom: bottomClearance,
          gap: GAP + 8,
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
        renderItem={renderBook}
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

  cell: {
    alignItems: "center",
  },
  avatarRow: {
    zIndex: 2,
    alignItems: "center",
  },
  book: {
    borderRadius: 10,
    borderWidth: 1.5,
    flexDirection: "row",
    overflow: "hidden",
    zIndex: 1,
    /* subtle shadow */
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  spine: {
    width: 10,
  },
  face: {
    flex: 1,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  countBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  countText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  bookLabel: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
});
