import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { Image } from "expo-image";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Markdown from "react-native-markdown-display";

import { MemberAvatar } from "@/components/MemberAvatar";
import { preprocessMarkdown } from "@/utils/assetMarkdown";
import { FrontingBadge } from "@/components/FrontingBadge";
import { TagChip } from "@/components/TagChip";
import { EmptyState } from "@/components/EmptyState";
import { useStorage } from "@/context/StorageContext";
import { useColors } from "@/hooks/useColors";
import { formatDate } from "@/utils/helpers";

type Tab = "profile" | "info" | "notes";

export default function MemberProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { data } = useStorage();
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  const member = useMemo(() => data.members.find((m) => m.id === id), [data.members, id]);

  const activeFront = useMemo(
    () => data.frontEntries.find((e) => e.memberId === id && !e.endTime),
    [data.frontEntries, id],
  );

  const memberJournals = useMemo(
    () =>
      data.journalEntries
        .filter((e) => e.memberId === id)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [data.journalEntries, id],
  );

  const memberForums = useMemo(
    () => data.forumPosts.filter((p) => p.memberId === id),
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

  const mdStyles = {
    body: { color: colors.foreground, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
    paragraph: { marginTop: 0, marginBottom: 6 },
    strong: { fontFamily: "Inter_700Bold" },
    em: { fontStyle: "italic" as const },
    heading1: { fontFamily: "Inter_700Bold", fontSize: 20, marginBottom: 4 },
    heading2: { fontFamily: "Inter_700Bold", fontSize: 17, marginBottom: 4 },
    heading3: { fontFamily: "Inter_600SemiBold", fontSize: 15, marginBottom: 4 },
    code_inline: { backgroundColor: colors.secondary, color: colors.foreground, borderRadius: 4, paddingHorizontal: 4 },
    blockquote: { backgroundColor: colors.secondary, borderLeftColor: colors.border, paddingHorizontal: 10, borderRadius: 4 },
    hr: { backgroundColor: colors.border, height: 1, marginVertical: 8 },
    link: { color: colors.primary },
  };

  // body paddingHorizontal 16×2=32 + card padding 14×2=28 = 60px; subtract 4 extra for safety
  const mdImgW = screenWidth - 64;
  const mdImgH = Math.round(mdImgW * 0.5);
  const mdRules = {
    image: (node: any) => (
      <Image
        key={node.key}
        source={{ uri: node.attributes.src }}
        contentFit="cover"
        style={{ width: mdImgW, height: mdImgH, borderRadius: 8, marginVertical: 6 }}
      />
    ),
    fence: (node: any) => {
      if (node.attributes.language === "center") {
        return (
          <Text
            key={node.key}
            style={{ textAlign: "center", color: colors.foreground, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22, marginBottom: 6 }}
          >
            {node.content.trim()}
          </Text>
        );
      }
      return (
        <View key={node.key} style={{ backgroundColor: colors.secondary, borderRadius: 8, padding: 10, marginVertical: 4 }}>
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.foreground }}>{node.content}</Text>
        </View>
      );
    },
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "profile", label: "Profile" },
    { key: "info", label: "Info" },
    { key: "notes", label: "Notes" },
  ];

  const handleTabPress = (tab: Tab) => {
    setActiveTab(tab);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeTab === "info") {
      router.push(`/member/edit?id=${member.id}&section=info`);
    } else {
      router.push(`/member/edit?id=${member.id}`);
    }
  };

  const bottomInset = Platform.OS === "web" ? 0 : insets.bottom;
  const tabBarHeight = 56 + bottomInset;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}
      >
        {/* ── Banner ── */}
        <View style={[styles.banner, { paddingTop: topInset + 10 }]}>
          {/* Banner image or color strip */}
          {member.bannerImage ? (
            <Image
              source={{ uri: member.bannerImage }}
              contentFit="cover"
              style={[styles.bannerStrip, { top: 0 }]}
            />
          ) : (
            <View
              style={[
                styles.bannerStrip,
                {
                  backgroundColor:
                    member.bannerColor === "none"
                      ? "#3d3d3d"
                      : member.bannerColor
                      ? member.bannerColor + "cc"
                      : member.color + "55",
                  top: 0,
                },
              ]}
            />
          )}

          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.card + "cc" }]}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </TouchableOpacity>

          {(activeTab === "profile" || activeTab === "info") && (
            <TouchableOpacity
              style={[styles.editBtn, { backgroundColor: colors.card + "cc" }]}
              onPress={handleEdit}
            >
              <Feather name="edit-2" size={18} color={colors.foreground} />
            </TouchableOpacity>
          )}

          <MemberAvatar
            name={member.name}
            color={member.color}
            profileImage={member.profileImage}
            size={160}
            shape={member.avatarShape}
            style={styles.avatar}
          />

          <Text style={[styles.name, { color: colors.foreground }]}>{member.name}</Text>
          {member.pronouns ? (
            <Text style={[styles.pronouns, { color: colors.mutedForeground }]}>{member.pronouns}</Text>
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

        {/* ── Profile Tab ── */}
        {activeTab === "profile" && (
          <View style={styles.body}>
            {member.description ? (
              <View style={[styles.card, styles.aboutCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>About</Text>
                <Markdown style={mdStyles} rules={mdRules}>{preprocessMarkdown(member.description, data.assets ?? [])}</Markdown>
              </View>
            ) : (
              <View style={[styles.card, styles.aboutCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.emptyTabText, { color: colors.mutedForeground }]}>
                  No description yet — tap the edit button to add one.
                </Text>
              </View>
            )}

          </View>
        )}

        {/* ── Info Tab ── */}
        {activeTab === "info" && (
          <View style={styles.body}>
            {(data.settings.customGlobalFields ?? []).length === 0 ? (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.emptyTabText, { color: colors.mutedForeground }]}>
                  No custom fields defined yet. Go to Settings → Custom Fields to create some.
                </Text>
              </View>
            ) : (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.mutedForeground, textAlign: "center" }]}>Details</Text>
                {(data.settings.customGlobalFields ?? []).map((gf, idx, arr) => {
                  const fv = member.customFields.find((c) => c.fieldId === gf.id);
                  return (
                    <View
                      key={gf.id}
                      style={[
                        styles.fieldRow,
                        idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                      ]}
                    >
                      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{gf.label}</Text>
                      <Text style={[styles.fieldValue, { color: fv?.value ? colors.foreground : colors.mutedForeground }]}>
                        {fv?.value || "—"}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {relatedMembers.length > 0 && (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>Relationships</Text>
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
                        <Text style={[styles.relType, { color: colors.mutedForeground }]}>{rel.type}</Text>
                      </View>
                      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  ) : null,
                )}
              </View>
            )}
          </View>
        )}

        {/* ── Notes Tab ── */}
        {activeTab === "notes" && (
          <View style={styles.body}>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(`/journal/member/${member.id}`)}
              >
                <Feather name="book" size={18} color={colors.primary} />
                <Text style={[styles.actionLabel, { color: colors.foreground }]}>All Journals</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(`/forums/create?memberId=${member.id}`)}
              >
                <Feather name="message-square" size={18} color={colors.primary} />
                <Text style={[styles.actionLabel, { color: colors.foreground }]}>New Forum</Text>
              </TouchableOpacity>
            </View>

            {memberJournals.length > 0 ? (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: colors.mutedForeground, textAlign: "center" }]}>Journals</Text>
                  <TouchableOpacity onPress={() => router.push(`/journal/member/${member.id}`)}>
                    <Text style={[styles.seeAll, { color: colors.primary }]}>Open</Text>
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
            ) : (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.emptyTabText, { color: colors.mutedForeground }]}>
                  No journal entries yet.
                </Text>
              </View>
            )}

            {memberForums.length > 0 && (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.mutedForeground, textAlign: "center" }]}>Forum Posts</Text>
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
        )}
      </ScrollView>

      {/* ── Tab Bar (pinned bottom) ── */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            height: tabBarHeight,
            paddingBottom: bottomInset,
          },
        ]}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabBtn,
              activeTab === tab.key && [styles.tabBtnActive, { borderTopColor: colors.primary }],
            ]}
            onPress={() => handleTabPress(tab.key)}
          >
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === tab.key ? colors.primary : colors.mutedForeground },
              ]}
            >
              {tab.label}
            </Text>
            {tab.key === "notes" && (memberJournals.length + memberForums.length) > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: colors.primary }]}>
                <Text style={[styles.tabBadgeText, { color: colors.primaryForeground }]}>
                  {memberJournals.length + memberForums.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  banner: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  bannerStrip: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 180,
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

  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 14,
    borderTopWidth: 2,
    borderTopColor: "transparent",
    gap: 6,
  },
  tabBtnActive: {
    borderTopWidth: 2,
  },
  tabLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },

  body: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  aboutCard: {
    alignSelf: "stretch",
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
  emptyTabText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 8,
  },
  fieldRow: {
    flexDirection: "row",
    paddingTop: 10,
    marginTop: 10,
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
