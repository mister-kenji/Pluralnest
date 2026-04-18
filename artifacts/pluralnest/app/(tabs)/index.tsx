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
import { formatDuration, formatTime } from "@/utils/helpers";

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data } = useStorage();
  const lastTapRef = useRef(0);

  const activeFronters = useMemo(() => {
    const active = data.frontEntries.filter((e) => !e.endTime);
    return active.map((e) => {
      const member = data.members.find((m) => m.id === e.memberId);
      return { entry: e, member };
    });
  }, [data.frontEntries, data.members]);

  const recentSwitches = useMemo(() => {
    return data.frontEntries
      .filter((e) => e.endTime)
      .sort((a, b) => (b.endTime ?? 0) - (a.endTime ?? 0))
      .slice(0, 5)
      .map((e) => {
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
      onPress: () => router.push("/headspace/index"),
      color: "#e8a0bf",
    },
    {
      icon: "book" as const,
      label: "Journals",
      onPress: () => router.push("/(tabs)/journals"),
      color: "#a0e8b2",
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: topInset + 16,
        paddingBottom: Platform.OS === "web" ? 120 : 90,
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
          <TouchableOpacity onPress={() => router.push("/fronting/index")}>
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
                router.push("/fronting/index");
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
                router.push("/fronting/index");
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

      {recentSwitches.length > 0 && (
        <>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Recent Switches</Text>
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {recentSwitches.map(({ entry, member }) =>
              member ? (
                <View key={entry.id} style={[styles.switchRow, { borderBottomColor: colors.border }]}>
                  <MemberAvatar
                    name={member.name}
                    color={member.color}
                    profileImage={member.profileImage}
                    size={32}
                  />
                  <View style={styles.switchInfo}>
                    <Text style={[styles.switchName, { color: colors.foreground }]}>
                      {member.name}
                    </Text>
                    <Text style={[styles.switchTime, { color: colors.mutedForeground }]}>
                      {formatTime(entry.startTime)} → {entry.endTime ? formatTime(entry.endTime) : "now"}{" "}
                      · {formatDuration((entry.endTime ?? Date.now()) - entry.startTime)}
                    </Text>
                  </View>
                  <FrontingBadge status={entry.status} customStatus={entry.customStatus} />
                </View>
              ) : null,
            )}
          </View>
        </>
      )}
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
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
  },
  switchInfo: { flex: 1 },
  switchName: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    marginBottom: 2,
  },
  switchTime: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
