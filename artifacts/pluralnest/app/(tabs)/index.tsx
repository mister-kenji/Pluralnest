import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useRef } from "react";
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
import { useStorage } from "@/context/StorageContext";
import { useColors } from "@/hooks/useColors";
import { useBottomTabClearance } from "@/hooks/useBottomTabClearance";
import { formatDuration, formatTime } from "@/utils/helpers";
import { getMood } from "@/utils/moods";

const ACTIVITY_COLORS = {
  front:   "#4ade80",
  journal: "#a0e8b2",
  forum:   "#a89de8",
  chat:    "#a0d9e8",
} as const;

type ActivityKind = "front" | "journal" | "forum" | "chat";

type ActivityItem = {
  id: string;
  kind: ActivityKind;
  time: number;
  memberId?: string;
  title: string;
  subtitle?: string;
  route?: string;
  mood?: number;
};

function kindIcon(kind: ActivityKind): keyof typeof Feather.glyphMap {
  if (kind === "front")   return "clock";
  if (kind === "journal") return "book-open";
  if (kind === "forum")   return "message-square";
  return "message-circle";
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data } = useStorage();
  const lastTapRef = useRef(0);
  const bottomClearance = useBottomTabClearance(16);

  const activeFronters = useMemo(() => {
    const active = data.frontEntries.filter((e) => !e.endTime);
    return active.map((e) => {
      const member = data.members.find((m) => m.id === e.memberId);
      return { entry: e, member };
    });
  }, [data.frontEntries, data.members]);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const quickActions = [
    {
      icon: "users" as const,
      label: "Members",
      onPress: () => router.push("/(tabs)/members"),
      color: "#a89de8",
    },
    {
      icon: "message-circle" as const,
      label: "Inner Chat",
      onPress: () => router.push("/(tabs)/chat"),
      color: "#a0d9e8",
    },
    {
      icon: "map" as const,
      label: "Headspace",
      onPress: () => router.push("/headspace"),
      color: "#e8a0bf",
    },
    {
      icon: "book" as const,
      label: "Journals",
      onPress: () => router.push("/(tabs)/journals"),
      color: "#a0e8b2",
    },
  ];

  const dailyActivity = useMemo((): ActivityItem[] => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const items: ActivityItem[] = [];

    data.frontEntries.forEach((e) => {
      if (e.startTime < cutoff && (e.endTime == null || e.endTime < cutoff)) return;
      const member = data.members.find((m) => m.id === e.memberId);
      if (!member) return;
      const statusLabel =
        e.status === "main" ? "Main Front"
        : e.status === "co-front" ? "Co-Front"
        : "Co-Conscious";
      const duration = e.endTime
        ? formatDuration(e.endTime - e.startTime)
        : formatDuration(Date.now() - e.startTime) + " (ongoing)";
      items.push({
        id: `front-${e.id}`,
        kind: "front",
        time: e.startTime,
        memberId: e.memberId,
        title: `${member.name} fronted`,
        subtitle: `${statusLabel} · ${duration}`,
        route: "/fronting",
        mood: e.mood,
      });
    });

    data.journalEntries.forEach((e) => {
      if (e.createdAt < cutoff) return;
      const member = data.members.find((m) => m.id === e.memberId);
      items.push({
        id: `journal-${e.id}`,
        kind: "journal",
        time: e.createdAt,
        memberId: e.memberId,
        title: e.title || "Untitled entry",
        subtitle: member ? `Journal — ${member.name}` : "Journal",
        route: "/(tabs)/journals",
      });
    });

    data.forumPosts.forEach((p) => {
      if (p.createdAt < cutoff) return;
      const member = data.members.find((m) => m.id === p.memberId);
      items.push({
        id: `forum-${p.id}`,
        kind: "forum",
        time: p.createdAt,
        memberId: p.memberId,
        title: p.title || "Untitled post",
        subtitle: member ? `Forum — ${member.name}` : "Forum",
        route: "/(tabs)/more",
      });
    });

    const recentChat = data.chatMessages.filter((m) => m.createdAt >= cutoff);
    if (recentChat.length > 0) {
      const latest = Math.max(...recentChat.map((m) => m.createdAt));
      items.push({
        id: "chat-summary",
        kind: "chat",
        time: latest,
        title: `${recentChat.length} message${recentChat.length !== 1 ? "s" : ""} in Inner Chat`,
        route: "/(tabs)/chat",
      });
    }

    return items.sort((a, b) => b.time - a.time);
  }, [data.frontEntries, data.journalEntries, data.forumPosts, data.chatMessages, data.members]);

  const todayLabel = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  }, []);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: topInset + 16,
        paddingBottom: bottomClearance,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.systemName, { color: colors.mutedForeground }]}>
            {data.settings.systemName}
          </Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Dashboard</Text>
        </View>
        <TouchableOpacity
          style={[styles.searchBtn, { backgroundColor: colors.secondary }]}
          onPress={() => router.push("/search")}
        >
          <Feather name="search" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.dot, { backgroundColor: "#4ade80" }]} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Currently Fronting</Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/fronting")}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>Log</Text>
          </TouchableOpacity>
        </View>

        {activeFronters.length === 0 ? (
          <View style={styles.emptyFront}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No one is currently fronting
            </Text>
            <TouchableOpacity
              style={[styles.addFrontBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/fronting");
              }}
            >
              <Feather name="plus" size={16} color={colors.primaryForeground} />
              <Text style={[styles.addFrontText, { color: colors.primaryForeground }]}>
                Log Switch
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.frontersList}>
            {activeFronters.map(({ entry, member }) =>
              member ? (
                <TouchableOpacity
                  key={entry.id}
                  style={styles.fronterRow}
                  onPress={() => router.push(`/member/${member.id}`)}
                >
                  <MemberAvatar
                    name={member.name}
                    color={member.color}
                    profileImage={member.profileImage}
                    size={44}
                  />
                  <View style={styles.fronterInfo}>
                    <Text style={[styles.fronterName, { color: colors.foreground }]}>
                      {member.name}
                    </Text>
                    <Text style={[styles.fronterTime, { color: colors.mutedForeground }]}>
                      {formatTime(entry.startTime)} · {formatDuration(Date.now() - entry.startTime)}
                    </Text>
                  </View>
                  <FrontingBadge status={entry.status} customStatus={entry.customStatus} />
                </TouchableOpacity>
              ) : null,
            )}
            <TouchableOpacity
              style={[styles.addFrontInline, { borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/fronting");
              }}
            >
              <Feather name="plus" size={16} color={colors.mutedForeground} />
              <Text style={[styles.addFrontInlineText, { color: colors.mutedForeground }]}>
                Add fronter / log switch
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text style={[styles.label, { color: colors.mutedForeground }]}>Quick Access</Text>
      <View style={styles.quickGrid}>
        {quickActions
          .filter((qa) => {
            if (qa.label === "Inner Chat" && !data.settings.featuresEnabled.chat) return false;
            if (qa.label === "Headspace" && !data.settings.featuresEnabled.headspace) return false;
            if (qa.label === "Journals" && !data.settings.featuresEnabled.journals) return false;
            return true;
          })
          .map((qa) => (
            <TouchableOpacity
              key={qa.label}
              style={[styles.quickBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                qa.onPress();
              }}
            >
              <View
                style={[styles.quickIcon, { backgroundColor: qa.color + "22" }]}
              >
                <Feather name={qa.icon} size={22} color={qa.color} />
              </View>
              <Text style={[styles.quickLabel, { color: colors.foreground }]}>{qa.label}</Text>
            </TouchableOpacity>
          ))}
      </View>

      <View style={styles.overviewHeader}>
        <Text style={[styles.label, { color: colors.mutedForeground, marginHorizontal: 0, marginBottom: 0 }]}>
          Past 24 Hours
        </Text>
        <Text style={[styles.overviewDate, { color: colors.mutedForeground }]}>
          {todayLabel}
        </Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 10 }]}>
        {dailyActivity.length === 0 ? (
          <View style={styles.emptyActivity}>
            <Feather name="moon" size={22} color={colors.mutedForeground} style={{ opacity: 0.5 }} />
            <Text style={[styles.emptyActivityText, { color: colors.mutedForeground }]}>
              Quiet day — nothing logged yet
            </Text>
          </View>
        ) : (
          dailyActivity.map((item, idx) => {
            const accentColor = ACTIVITY_COLORS[item.kind];
            const member = item.memberId
              ? data.members.find((m) => m.id === item.memberId)
              : undefined;
            const mood = getMood(item.mood);
            const isLast = idx === dailyActivity.length - 1;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.activityRow,
                  !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
                activeOpacity={item.route ? 0.7 : 1}
                onPress={() => {
                  if (item.route) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(item.route as any);
                  }
                }}
              >
                <View style={[styles.activityAccent, { backgroundColor: accentColor }]} />
                <View style={styles.activityIconWrap}>
                  <Feather name={kindIcon(item.kind)} size={14} color={accentColor} />
                </View>
                {member ? (
                  <MemberAvatar
                    name={member.name}
                    color={member.color}
                    profileImage={member.profileImage}
                    size={30}
                  />
                ) : (
                  <View style={styles.activityNoAvatar} />
                )}
                <View style={styles.activityText}>
                  <View style={styles.activityTitleRow}>
                    <Text
                      style={[styles.activityTitle, { color: colors.foreground }]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    {mood && (
                      <Text style={styles.activityMoodEmoji}>{mood.emoji}</Text>
                    )}
                  </View>
                  {item.subtitle ? (
                    <Text style={[styles.activitySub, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  ) : null}
                </View>
                <Text style={[styles.activityTime, { color: colors.mutedForeground }]}>
                  {formatTime(item.time)}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  systemName: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  seeAll: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  emptyFront: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignItems: "flex-start",
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  addFrontBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addFrontText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  frontersList: { paddingBottom: 8 },
  fronterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  fronterInfo: { flex: 1 },
  fronterName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  fronterTime: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  addFrontInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  addFrontInlineText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginHorizontal: 20,
    marginBottom: 10,
    marginTop: 4,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 10,
    marginBottom: 20,
  },
  quickBtn: {
    width: "47%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: "flex-start",
    gap: 10,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  overviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginTop: 4,
  },
  overviewDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  emptyActivity: {
    paddingVertical: 28,
    alignItems: "center",
    gap: 10,
  },
  emptyActivityText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingRight: 16,
    gap: 10,
  },
  activityAccent: {
    width: 3,
    alignSelf: "stretch",
    borderRadius: 2,
    marginLeft: 0,
  },
  activityIconWrap: {
    width: 22,
    alignItems: "center",
  },
  activityNoAvatar: {
    width: 30,
    height: 30,
  },
  activityText: {
    flex: 1,
    gap: 1,
  },
  activityTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  activityTitle: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    flexShrink: 1,
  },
  activityMoodEmoji: {
    fontSize: 13,
  },
  activitySub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  activityTime: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    flexShrink: 0,
  },
});
