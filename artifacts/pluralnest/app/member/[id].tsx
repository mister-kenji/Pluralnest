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
import { formatDate, formatTime, formatDuration } from "@/utils/helpers";

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
      if (node.sourceInfo === "center") {
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
          {/* Banner image or color strip — in its own clipping wrapper so the
              outer banner does NOT need overflow:hidden (which would break
              expo-image inside the avatar's own overflow:hidden circle). */}
          <View style={styles.bannerStripClip}>
            {member.bannerImage ? (
              <Image
                source={{ uri: member.bannerImage }}
                contentFit="cover"
                style={StyleSheet.absoluteFill}
              />
            ) : (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor:
                      member.bannerColor === "none"
                        ? "#3d3d3d"
                        : member.bannerColor
                        ? member.bannerColor + "cc"
                        : member.color + "55",
                  },
                ]}
              />
            )}
          </View>

          <MemberAvatar
            name={member.name}
            color={member.color}
            profileImage={member.profileImage}
            size={160}
            shape={member.avatarShape}
            style={styles.avatar}
          />

          <Text style={[styles.name, { color: colors.foreground }]}>{member.name}</Text>
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
            {/* Pronouns + Role cards */}
            {(member.pronouns || member.role) && (
              <View style={styles.metaRow}>
                {member.pronouns ? (
                  <View style={[styles.card, styles.metaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>Pronouns</Text>
                    <Text style={[styles.metaValue, { color: colors.foreground }]}>{member.pronouns}</Text>
                  </View>
                ) : null}
                {member.role ? (
                  <View style={[styles.card, styles.metaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>Role</Text>
                    <Text style={[styles.metaValue, { color: colors.foreground }]}>{member.role}</Text>
                  </View>
                ) : null}
              </View>
            )}

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

            {/* ── Front History ── */}
            {(() => {
              const allEntries = data.frontEntries
                .filter((e) => e.memberId === member.id && e.endTime)
                .sort((a, b) => b.startTime - a.startTime);
              const LIMIT = 15;
              const shown = allEntries.slice(0, LIMIT);
              return (
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>Front History</Text>
                  {shown.length === 0 ? (
                    <Text style={[styles.emptyTabText, { color: colors.mutedForeground }]}>
                      No past front entries recorded yet.
                    </Text>
                  ) : (
                    shown.map((entry, idx) => (
                      <View
                        key={entry.id}
                        style={[
                          styles.frontHistoryRow,
                          { borderTopColor: colors.border },
                          idx === 0 && { borderTopWidth: 0, marginTop: 0, paddingTop: 0 },
                        ]}
                      >
                        <View style={styles.frontHistoryMain}>
                          <View style={styles.frontHistoryTop}>
                            <Text style={[styles.frontHistoryDate, { color: colors.foreground }]}>
                              {formatDate(entry.startTime)}
                            </Text>
                            <FrontingBadge status={entry.status} customStatus={entry.customStatus} />
                          </View>
                          <Text style={[styles.frontHistoryTime, { color: colors.mutedForeground }]}>
                            {formatTime(entry.startTime)} → {entry.endTime ? formatTime(entry.endTime) : "now"}
                            {"  ·  "}{formatDuration((entry.endTime ?? Date.now()) - entry.startTime)}
                          </Text>
                          {entry.note ? (
                            <Text style={[styles.frontHistoryNote, { color: colors.mutedForeground }]}>
                              {entry.note}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    ))
                  )}
                  {allEntries.length > LIMIT && (
                    <Text style={[styles.frontHistoryMore, { color: colors.mutedForeground }]}>
                      Showing {LIMIT} most recent — {allEntries.length - LIMIT} older entries in the Front Log
                    </Text>
                  )}
                </View>
              );
            })()}

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
                {/* Horizontal rule under the title */}
                <View style={[styles.detailsHRule, { backgroundColor: colors.border }]} />
                {(data.settings.customGlobalFields ?? []).map((gf, idx) => {
                  const fv = member.customFields.find((c) => c.fieldId === gf.id);
                  const rawValue = fv?.value ?? "";
                  const hasAsset = rawValue.includes("(@");
                  if (hasAsset) {
                    return (
                      <View
                        key={gf.id}
                        style={[
                          styles.fieldRowStacked,
                          idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                        ]}
                      >
                        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{gf.label}</Text>
                        <View style={[styles.fieldHRule, { backgroundColor: colors.border }]} />
                        <Markdown style={mdStyles} rules={mdRules}>
                          {preprocessMarkdown(rawValue, data.assets)}
                        </Markdown>
                      </View>
                    );
                  }
                  return (
                    <View
                      key={gf.id}
                      style={[
                        styles.fieldRow,
                        idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                      ]}
                    >
                      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{gf.label}</Text>
                      {/* Vertical divider */}
                      <View style={[styles.fieldVDivider, { backgroundColor: colors.border }]} />
                      <Text style={[styles.fieldValue, { color: rawValue ? colors.foreground : colors.mutedForeground }]}>
                        {rawValue || "—"}
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

            {/* Linked headspace entries */}
            {(() => {
              const linkedNodes = (data.headspaceNodes ?? []).filter((n) =>
                n.connectedMemberIds?.includes(member.id)
              );
              if (linkedNodes.length === 0) return null;
              const nodeIcon = (type: string) => {
                if (type === "image") return "image" as const;
                if (type === "place") return "map-pin" as const;
                if (type === "text") return "align-left" as const;
                return "file-text" as const;
              };
              return (
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>In the Headspace</Text>
                  {linkedNodes.map((node, idx) => (
                    <TouchableOpacity
                      key={node.id}
                      style={[styles.relRow, { borderTopColor: colors.border }, idx === 0 && { borderTopWidth: 0 }]}
                      onPress={() => router.push("/headspace")}
                    >
                      <View style={[styles.headspaceIconWrap, { backgroundColor: member.color + "22" }]}>
                        <Feather name={nodeIcon(node.type)} size={16} color={member.color} />
                      </View>
                      <View style={styles.relInfo}>
                        <Text style={[styles.relName, { color: colors.foreground }]}>{node.title || "Untitled"}</Text>
                        <Text style={[styles.relType, { color: colors.mutedForeground }]}>
                          {node.type === "image" ? "Image" : node.type === "place" ? "Place" : node.type === "text" ? "Text" : "Description"}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  ))}
                </View>
              );
            })()}
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

      {/* ── Floating nav buttons (fixed to screen, never scroll) ── */}
      <TouchableOpacity
        style={[styles.backBtn, { backgroundColor: colors.card + "cc", top: topInset + 10 }]}
        onPress={() => router.back()}
      >
        <Feather name="arrow-left" size={20} color={colors.foreground} />
      </TouchableOpacity>

      {(activeTab === "profile" || activeTab === "info") && (
        <TouchableOpacity
          style={[styles.editBtn, { backgroundColor: colors.card + "cc", top: topInset + 10 }]}
          onPress={handleEdit}
        >
          <Feather name="edit-2" size={18} color={colors.foreground} />
        </TouchableOpacity>
      )}

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
    /* No overflow:hidden here — it breaks expo-image inside nested overflow:hidden views */
  },
  bannerStripClip: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 180,
    overflow: "hidden",
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
  metaRow: { flexDirection: "row", gap: 10 },
  metaCard: { flex: 1 },
  metaValue: { fontSize: 15, fontFamily: "Inter_500Medium" },
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
  detailsHRule: {
    height: 1,
    marginHorizontal: -14,
    marginBottom: 0,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "stretch",
    paddingVertical: 10,
    marginHorizontal: -14,
    paddingHorizontal: 14,
  },
  fieldRowStacked: {
    flexDirection: "column",
    paddingVertical: 10,
    marginHorizontal: -14,
    paddingHorizontal: 14,
    gap: 6,
  },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1, paddingRight: 12 },
  fieldVDivider: { width: 1, alignSelf: "stretch" },
  fieldHRule: { height: 1, width: "100%" },
  fieldValue: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 2, textAlign: "right", paddingLeft: 12 },
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
  headspaceIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  frontHistoryRow: {
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 10,
  },
  frontHistoryMain: { flex: 1 },
  frontHistoryTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  frontHistoryDate: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  frontHistoryTime: { fontSize: 12, fontFamily: "Inter_400Regular" },
  frontHistoryNote: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    marginTop: 4,
  },
  frontHistoryMore: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 12,
    fontStyle: "italic",
  },
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
