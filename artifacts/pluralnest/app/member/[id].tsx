import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MemberAvatar } from "@/components/MemberAvatar";
import { FrontingBadge } from "@/components/FrontingBadge";
import { TagChip } from "@/components/TagChip";
import { EmptyState } from "@/components/EmptyState";
import { useStorage } from "@/context/StorageContext";
import { useColors } from "@/hooks/useColors";
import { formatDate, hexToRgba } from "@/utils/helpers";

export default function MemberProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data } = useStorage();

  const member = useMemo(() => data.members.find((m) => m.id === id), [data.members, id]);

  const activeFront = useMemo(
    () => data.frontEntries.find((e) => e.memberId === id && !e.endTime),
    [data.frontEntries, id],
  );

  const memberJournals = useMemo(
    () =>
      data.journalEntries
        .filter((e) => e.memberId === id)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 3),
    [data.journalEntries, id],
  );

  const memberForums = useMemo(
    () => data.forumPosts.filter((p) => p.memberId === id).slice(0, 3),
    [data.forumPosts, id],
  );

  const relatedMembers = useMemo(
    () =>
      member?.relationships.map((rel) => ({
        rel,
        m: data.members.find((m) => m.id === rel.memberId),
      })) ?? [],
    [member?.relationships, data.members],
  );

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  if (!member) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState icon="user" title="Member not found" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: Platform.OS === "web" ? 60 : 40,
        }}
      >
        <View
          style={[
            styles.banner,
            { backgroundColor: hexToRgba(member.color, 0.15), paddingTop: topInset + 10 },
          ]}
        >
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.card + "cc" }]}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: colors.card + "cc" }]}
            onPress={() => router.push(`/member/edit?id=${member.id}`)}
          >
            <Feather name="edit-2" size={18} color={colors.foreground} />
          </TouchableOpacity>

          <MemberAvatar
            name={member.name}
            color={member.color}
            profileImage={member.profileImage}
            size={88}
            style={styles.avatar}
          />

          <Text style={[styles.name, { color: colors.foreground }]}>{member.name}</Text>
          {member.pronouns ? (
            <Text style={[styles.pronouns, { color: colors.mutedForeground }]}>
              {member.pronouns}
            </Text>
          ) : null}
          {member.role ? (
            <Text style={[styles.role, { color: member.color }]}>{member.role}</Text>
          ) : null}

          {activeFront && (
            <View style={styles.frontingRow}>
              <View style={[styles.frontDot, { backgroundColor: "#4ade80" }]} />
              <FrontingBadge status={activeFront.status} customStatus={activeFront.customStatus} />
            </View>
          )}

          {member.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {member.tags.map((t) => (
                <TagChip key={t} label={t} color={member.color} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.body}>
          {member.description ? (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>About</Text>
              <Text style={[styles.description, { color: colors.foreground }]}>
                {member.description}
              </Text>
            </View>
          ) : null}

          {member.customFields.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>Details</Text>
              {member.customFields.map((cf) => (
                <View key={cf.id} style={[styles.fieldRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                    {cf.label}
                  </Text>
                  <Text style={[styles.fieldValue, { color: colors.foreground }]}>
                    {cf.value}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {relatedMembers.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>
                Relationships
              </Text>
              {relatedMembers.map(({ rel, m }) =>
                m ? (
                  <TouchableOpacity
                    key={rel.memberId}
                    style={[styles.relRow, { borderTopColor: colors.border }]}
                    onPress={() => router.push(`/member/${m.id}`)}
                  >
                    <MemberAvatar name={m.name} color={m.color} profileImage={m.profileImage} size={32} />
                    <View style={styles.relInfo}>
                      <Text style={[styles.relName, { color: colors.foreground }]}>{m.name}</Text>
                      <Text style={[styles.relType, { color: colors.mutedForeground }]}>
                        {rel.type}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                ) : null,
              )}
            </View>
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(`/journal/create?memberId=${member.id}`)}
            >
              <Feather name="book" size={18} color={colors.primary} />
              <Text style={[styles.actionLabel, { color: colors.foreground }]}>New Journal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(`/forums/create?memberId=${member.id}`)}
            >
              <Feather name="message-square" size={18} color={colors.primary} />
              <Text style={[styles.actionLabel, { color: colors.foreground }]}>New Forum</Text>
            </TouchableOpacity>
          </View>

          {memberJournals.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>Journals</Text>
                <TouchableOpacity onPress={() => router.push("/(tabs)/journals")}>
                  <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
                </TouchableOpacity>
              </View>
              {memberJournals.map((j) => (
                <TouchableOpacity
                  key={j.id}
                  style={[styles.miniEntry, { borderTopColor: colors.border }]}
                  onPress={() => router.push(`/journal/${j.id}`)}
                >
                  <Text style={[styles.miniTitle, { color: colors.foreground }]} numberOfLines={1}>
                    {j.title || "Untitled"}
                  </Text>
                  <Text style={[styles.miniDate, { color: colors.mutedForeground }]}>
                    {formatDate(j.updatedAt)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {memberForums.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>Forums</Text>
              {memberForums.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.miniEntry, { borderTopColor: colors.border }]}
                  onPress={() => router.push(`/forums/${f.id}`)}
                >
                  <View style={styles.miniForumRow}>
                    <Feather
                      name={f.type === "poll" ? "bar-chart-2" : "message-square"}
                      size={14}
                      color={colors.primary}
                    />
                    <Text style={[styles.miniTitle, { color: colors.foreground }]} numberOfLines={1}>
                      {f.title}
                    </Text>
                  </View>
                  <Text style={[styles.miniDate, { color: colors.mutedForeground }]}>
                    {f.replies.length} replies
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  banner: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    alignItems: "center",
  },
  backBtn: {
    position: "absolute",
    top: 0,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  editBtn: {
    position: "absolute",
    top: 0,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: { marginTop: 40, marginBottom: 12 },
  name: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center" },
  pronouns: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 4 },
  role: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
  frontingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  frontDot: { width: 8, height: 8, borderRadius: 4 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginTop: 8, gap: 4 },
  body: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 4,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  seeAll: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 10 },
  description: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  fieldRow: {
    flexDirection: "row",
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
    gap: 12,
  },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  fieldValue: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 2, textAlign: "right" },
  relRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  relInfo: { flex: 1 },
  relName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  relType: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  actionRow: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  miniEntry: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1,
  },
  miniForumRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  miniTitle: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  miniDate: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
