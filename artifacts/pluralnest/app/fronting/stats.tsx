import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
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
import { useStorage } from "@/context/StorageContext";
import { useColors } from "@/hooks/useColors";
import { formatDuration } from "@/utils/helpers";
import { MOODS } from "@/utils/moods";

type Period = "7d" | "30d" | "all";

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "7d",  label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "all", label: "All time" },
];

const TIME_BUCKETS = [
  { label: "Morning",   range: "6am–12pm",  start: 6,  end: 12, color: "#f59e0b" },
  { label: "Afternoon", range: "12pm–6pm",  start: 12, end: 18, color: "#f97316" },
  { label: "Evening",   range: "6pm–12am",  start: 18, end: 24, color: "#8b5cf6" },
  { label: "Night",     range: "12am–6am",  start: 0,  end: 6,  color: "#3b82f6" },
];

function SectionTitle({ title, colors }: { title: string; colors: any }) {
  return (
    <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
      {title}
    </Text>
  );
}

function StatCard({ label, value, sub, accent, colors }: { label: string; value: string; sub?: string; accent?: string; colors: any }) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {accent && <View style={[styles.statAccent, { backgroundColor: accent }]} />}
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
      {sub && <Text style={[styles.statSub, { color: colors.mutedForeground }]}>{sub}</Text>}
    </View>
  );
}

export default function FrontingStatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data } = useStorage();
  const [period, setPeriod] = useState<Period>("30d");

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  // ── Filter entries by period ──────────────────────────────────────────────
  const cutoff = useMemo(() => {
    if (period === "all") return 0;
    const days = period === "7d" ? 7 : 30;
    return Date.now() - days * 24 * 60 * 60 * 1000;
  }, [period]);

  const entries = useMemo(
    () => data.frontEntries.filter((e) => e.startTime >= cutoff),
    [data.frontEntries, cutoff],
  );

  const completedEntries = useMemo(
    () => entries.filter((e) => e.endTime),
    [entries],
  );

  // ── Summary numbers ───────────────────────────────────────────────────────
  const totalSessions = entries.length;
  const totalMs = completedEntries.reduce((sum, e) => sum + (e.endTime! - e.startTime), 0);
  const avgMs = completedEntries.length > 0 ? totalMs / completedEntries.length : 0;
  const longestMs = completedEntries.reduce((max, e) => Math.max(max, e.endTime! - e.startTime), 0);

  // ── Per-member stats ──────────────────────────────────────────────────────
  const memberStats = useMemo(() => {
    const map = new Map<string, { totalMs: number; count: number }>();
    for (const e of completedEntries) {
      const existing = map.get(e.memberId) ?? { totalMs: 0, count: 0 };
      map.set(e.memberId, {
        totalMs: existing.totalMs + (e.endTime! - e.startTime),
        count: existing.count + 1,
      });
    }
    // Also count sessions without endTime
    for (const e of entries.filter((x) => !x.endTime)) {
      const existing = map.get(e.memberId) ?? { totalMs: 0, count: 0 };
      map.set(e.memberId, { ...existing, count: existing.count + 1 });
    }
    return Array.from(map.entries())
      .map(([memberId, stats]) => {
        const member = data.members.find((m) => m.id === memberId);
        return { memberId, member, ...stats };
      })
      .filter((s) => s.member)
      .sort((a, b) => b.totalMs - a.totalMs);
  }, [completedEntries, entries, data.members]);

  const maxMemberMs = memberStats[0]?.totalMs ?? 1;

  // ── Time-of-day stats ─────────────────────────────────────────────────────
  const timeOfDayStats = useMemo(() => {
    return TIME_BUCKETS.map((bucket) => {
      const count = entries.filter((e) => {
        const hour = new Date(e.startTime).getHours();
        return hour >= bucket.start && hour < bucket.end;
      }).length;
      return { ...bucket, count };
    });
  }, [entries]);

  const maxTimeCount = Math.max(...timeOfDayStats.map((b) => b.count), 1);

  // ── Mood stats ────────────────────────────────────────────────────────────
  const moodEntries = useMemo(() => entries.filter((e) => e.mood != null), [entries]);
  const moodStats = useMemo(() => {
    return MOODS.map((m) => ({
      ...m,
      count: moodEntries.filter((e) => e.mood === m.value).length,
    }));
  }, [moodEntries]);
  const maxMoodCount = Math.max(...moodStats.map((m) => m.count), 1);
  const avgMood = moodEntries.length > 0
    ? moodEntries.reduce((sum, e) => sum + e.mood!, 0) / moodEntries.length
    : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: topInset + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Fronting Stats</Text>
        {/* Period selector */}
        <View style={[styles.periodRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          {PERIOD_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.periodBtn, period === opt.value && { backgroundColor: colors.primary }]}
              onPress={() => setPeriod(opt.value)}
            >
              <Text style={[styles.periodBtnText, { color: period === opt.value ? colors.primaryForeground : colors.mutedForeground }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {totalSessions === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="bar-chart-2" size={32} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No fronting data for this period yet
            </Text>
          </View>
        ) : (
          <>
            {/* ── Summary ── */}
            <SectionTitle title="Summary" colors={colors} />
            <View style={styles.statRow}>
              <StatCard label="Sessions"      value={String(totalSessions)}          colors={colors} />
              <StatCard label="Total time"    value={formatDuration(totalMs)}        colors={colors} />
              <StatCard label="Average"       value={formatDuration(avgMs)}          colors={colors} />
              <StatCard label="Longest"       value={formatDuration(longestMs)}      colors={colors} />
            </View>

            {/* ── By Member ── */}
            {memberStats.length > 0 && (
              <>
                <SectionTitle title="Time by Member" colors={colors} />
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {memberStats.map(({ member, memberId, totalMs: ms, count }) => (
                    <View key={memberId} style={styles.memberRow}>
                      <MemberAvatar
                        name={member!.name}
                        color={member!.color}
                        profileImage={member!.profileImage}
                        size={28}
                      />
                      <View style={styles.memberBarWrap}>
                        <View style={styles.memberBarHeader}>
                          <Text style={[styles.memberBarName, { color: colors.foreground }]}>{member!.name}</Text>
                          <Text style={[styles.memberBarDetail, { color: colors.mutedForeground }]}>
                            {formatDuration(ms)}  ·  {count} session{count !== 1 ? "s" : ""}
                          </Text>
                        </View>
                        <View style={[styles.barTrack, { backgroundColor: colors.secondary }]}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                backgroundColor: member!.color,
                                width: `${Math.max((ms / maxMemberMs) * 100, 4)}%` as any,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* ── Time of Day ── */}
            <SectionTitle title="Time of Day" colors={colors} />
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {timeOfDayStats.map((bucket) => (
                <View key={bucket.label} style={styles.timeRow}>
                  <View style={styles.timeLabelWrap}>
                    <Text style={[styles.timeLabel, { color: colors.foreground }]}>{bucket.label}</Text>
                    <Text style={[styles.timeRange, { color: colors.mutedForeground }]}>{bucket.range}</Text>
                  </View>
                  <View style={styles.timeBarWrap}>
                    <View style={[styles.barTrack, { backgroundColor: colors.secondary }]}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            backgroundColor: bucket.color,
                            width: bucket.count === 0 ? 0 : `${Math.max((bucket.count / maxTimeCount) * 100, 4)}%` as any,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.timeCount, { color: colors.mutedForeground }]}>
                      {bucket.count}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* ── Mood ── */}
            {moodEntries.length > 0 && (
              <>
                <SectionTitle title="Mood Check-ins" colors={colors} />
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {avgMood != null && (
                    <View style={styles.avgMoodRow}>
                      <Text style={[styles.avgMoodText, { color: colors.mutedForeground }]}>Average mood</Text>
                      <View style={styles.avgMoodRight}>
                        {(() => {
                          const rounded = Math.round(avgMood);
                          const meta = MOODS.find((m) => m.value === rounded);
                          return meta ? (
                            <>
                              <Text style={styles.avgMoodEmoji}>{meta.emoji}</Text>
                              <Text style={[styles.avgMoodLabel, { color: meta.color }]}>{meta.label}</Text>
                            </>
                          ) : null;
                        })()}
                        <Text style={[styles.avgMoodScore, { color: colors.mutedForeground }]}>
                          ({avgMood.toFixed(1)} / 5)
                        </Text>
                      </View>
                    </View>
                  )}
                  {moodStats.map((m) => (
                    <View key={m.value} style={styles.moodStatRow}>
                      <Text style={styles.moodStatEmoji}>{m.emoji}</Text>
                      <Text style={[styles.moodStatLabel, { color: colors.foreground }]}>{m.label}</Text>
                      <View style={styles.moodBarWrap}>
                        <View style={[styles.barTrack, { backgroundColor: colors.secondary }]}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                backgroundColor: m.color,
                                width: m.count === 0 ? 0 : `${Math.max((m.count / maxMoodCount) * 100, 4)}%` as any,
                              },
                            ]}
                          />
                        </View>
                      </View>
                      <Text style={[styles.moodStatCount, { color: colors.mutedForeground }]}>{m.count}</Text>
                    </View>
                  ))}
                  <Text style={[styles.moodFootnote, { color: colors.mutedForeground }]}>
                    Based on {moodEntries.length} of {totalSessions} sessions with a mood logged
                  </Text>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  screenTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  periodRow: {
    flexDirection: "row",
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    alignSelf: "flex-start",
  },
  periodBtn: { paddingHorizontal: 14, paddingVertical: 7 },
  periodBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 8,
  },

  statRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  statCard: {
    flex: 1,
    minWidth: 80,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 2,
    overflow: "hidden",
  },
  statAccent: { position: "absolute", top: 0, left: 0, right: 0, height: 3 },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  statSub:   { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },

  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 14,
  },

  memberRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  memberBarWrap: { flex: 1 },
  memberBarHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  memberBarName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  memberBarDetail: { fontSize: 11, fontFamily: "Inter_400Regular" },

  barTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 4 },

  timeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  timeLabelWrap: { width: 80 },
  timeLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  timeRange: { fontSize: 10, fontFamily: "Inter_400Regular" },
  timeBarWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  timeCount: { fontSize: 12, fontFamily: "Inter_600SemiBold", minWidth: 20, textAlign: "right" },

  avgMoodRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#ffffff15" },
  avgMoodText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  avgMoodRight: { flexDirection: "row", alignItems: "center", gap: 5 },
  avgMoodEmoji: { fontSize: 18 },
  avgMoodLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  avgMoodScore: { fontSize: 11, fontFamily: "Inter_400Regular" },

  moodStatRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  moodStatEmoji: { fontSize: 16, width: 22, textAlign: "center" },
  moodStatLabel: { fontSize: 12, fontFamily: "Inter_500Medium", width: 40 },
  moodBarWrap: { flex: 1 },
  moodStatCount: { fontSize: 12, fontFamily: "Inter_600SemiBold", minWidth: 20, textAlign: "right" },
  moodFootnote: { fontSize: 11, fontFamily: "Inter_400Regular", fontStyle: "italic", marginTop: 4 },

  emptyBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 40,
    alignItems: "center",
  },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
