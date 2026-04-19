import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MemberAvatar } from "@/components/MemberAvatar";
import { FrontingBadge } from "@/components/FrontingBadge";
import { EmptyState } from "@/components/EmptyState";
import { useStorage, FrontEntry, FrontStatus } from "@/context/StorageContext";
import { useColors } from "@/hooks/useColors";
import { genId, formatDate, formatTime, formatDuration } from "@/utils/helpers";

const STATUS_OPTIONS: { value: FrontStatus; label: string }[] = [
  { value: "main", label: "Main Front" },
  { value: "co-front", label: "Co-Front" },
  { value: "co-conscious", label: "Co-Conscious" },
];

export default function FrontingLogScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, updateFrontEntries } = useStorage();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<FrontStatus>("main");
  const [customStatus, setCustomStatus] = useState("");
  const [switchNote, setSwitchNote] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const activeFronters = useMemo(
    () => data.frontEntries.filter((e) => !e.endTime),
    [data.frontEntries],
  );

  const sortedEntries = useMemo(() => {
    const q = filterDate.toLowerCase();
    return data.frontEntries
      .filter((e) => {
        if (!q) return true;
        return formatDate(e.startTime).toLowerCase().includes(q);
      })
      .sort((a, b) => b.startTime - a.startTime);
  }, [data.frontEntries, filterDate]);

  const getMember = (id: string) => data.members.find((m) => m.id === id);

  const submitting = React.useRef(false);

  const logSwitch = () => {
    if (!selectedMemberId || submitting.current) return;
    submitting.current = true;

    const newEntry: FrontEntry = {
      id: genId(),
      memberId: selectedMemberId,
      status: selectedStatus,
      customStatus: customStatus || undefined,
      startTime: Date.now(),
      note: switchNote || undefined,
    };
    updateFrontEntries([...data.frontEntries, newEntry]);
    setShowAddModal(false);
    setSelectedMemberId("");
    setSelectedStatus("main");
    setCustomStatus("");
    setSwitchNote("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => { submitting.current = false; }, 800);
  };

  const endFront = (entryId: string) => {
    updateFrontEntries(
      data.frontEntries.map((e) =>
        e.id === entryId ? { ...e, endTime: Date.now() } : e,
      ),
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const renderEntry = ({ item }: { item: FrontEntry }) => {
    const member = getMember(item.memberId);
    const duration = item.endTime
      ? formatDuration(item.endTime - item.startTime)
      : formatDuration(Date.now() - item.startTime);

    return (
      <View style={[styles.entryCard, { backgroundColor: colors.card, borderColor: item.endTime ? colors.border : member?.color ?? colors.primary }]}>
        <View style={styles.entryLeft}>
          {member && (
            <MemberAvatar
              name={member.name}
              color={member.color}
              profileImage={member.profileImage}
              size={40}
            />
          )}
        </View>
        <View style={styles.entryInfo}>
          <View style={styles.entryTopRow}>
            <Text
              style={[styles.memberName, { color: colors.foreground }]}
              onPress={() => member && router.push(`/member/${member.id}`)}
            >
              {member?.name ?? "Unknown"}
            </Text>
            <FrontingBadge status={item.status} customStatus={item.customStatus} />
          </View>
          <Text style={[styles.entryTime, { color: colors.mutedForeground }]}>
            {formatTime(item.startTime)}
            {item.endTime ? ` → ${formatTime(item.endTime)}` : " → now"}
            {"  ·  "}
            {duration}
          </Text>
          <Text style={[styles.entryDate, { color: colors.mutedForeground }]}>
            {formatDate(item.startTime)}
          </Text>
          {item.note && (
            <View style={[styles.noteBubble, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.noteText, { color: colors.foreground }]}>
                {item.note}
              </Text>
            </View>
          )}
        </View>
        {!item.endTime && (
          <TouchableOpacity
            style={[styles.endBtn, { backgroundColor: colors.destructive + "22", borderColor: colors.destructive + "44" }]}
            onPress={() => endFront(item.id)}
          >
            <Feather name="square" size={14} color={colors.destructive} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.topBar,
          { paddingTop: topInset + 12, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Fronting Log</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowAddModal(true)}
          >
            <Feather name="plus" size={20} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>

        {activeFronters.length > 0 && (
          <View style={styles.activeBanner}>
            <View style={[styles.activeDot, { backgroundColor: "#4ade80" }]} />
            <Text style={[styles.activeText, { color: colors.foreground }]}>
              {activeFronters.length} currently fronting
            </Text>
          </View>
        )}

        <View style={[styles.filterRow, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
          <Feather name="calendar" size={14} color={colors.mutedForeground} />
          <TextInput
            style={[styles.filterInput, { color: colors.foreground }]}
            placeholder="Filter by date (e.g. Jan 15)"
            placeholderTextColor={colors.mutedForeground}
            value={filterDate}
            onChangeText={setFilterDate}
          />
        </View>
      </View>

      <FlatList
        data={sortedEntries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="clock"
            title="No fronting logs"
            subtitle="Log your first switch"
            action={{ label: "Log Switch", onPress: () => setShowAddModal(true) }}
          />
        }
        renderItem={renderEntry}
      />

      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: "#0009" }]}>
          <View style={[styles.modal, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Log Switch</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Select Member</Text>
            <FlatList
              data={data.members.filter((m) => !m.isArchived)}
              keyExtractor={(m) => m.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.memberList}
              renderItem={({ item: m }) => (
                <TouchableOpacity
                  style={[
                    styles.memberPickerItem,
                    {
                      borderColor: selectedMemberId === m.id ? m.color : colors.border,
                      backgroundColor: selectedMemberId === m.id ? m.color + "22" : colors.secondary,
                    },
                  ]}
                  onPress={() => setSelectedMemberId(m.id)}
                >
                  <MemberAvatar name={m.name} color={m.color} profileImage={m.profileImage} size={36} />
                  <Text
                    style={[
                      styles.memberPickerName,
                      { color: selectedMemberId === m.id ? m.color : colors.foreground },
                    ]}
                    numberOfLines={1}
                  >
                    {m.name}
                  </Text>
                </TouchableOpacity>
              )}
            />

            <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Status</Text>
            <View style={styles.statusRow}>
              {STATUS_OPTIONS.map((s) => (
                <TouchableOpacity
                  key={s.value}
                  style={[
                    styles.statusBtn,
                    {
                      borderColor: selectedStatus === s.value ? colors.primary : colors.border,
                      backgroundColor: selectedStatus === s.value ? colors.primary + "22" : colors.secondary,
                    },
                  ]}
                  onPress={() => setSelectedStatus(s.value)}
                >
                  <Text
                    style={[
                      styles.statusBtnText,
                      { color: selectedStatus === s.value ? colors.primary : colors.foreground },
                    ]}
                  >
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>
              Custom Status (optional)
            </Text>
            <TextInput
              style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
              value={customStatus}
              onChangeText={setCustomStatus}
              placeholder="e.g. rapid switching, background..."
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>
              Switch Note (optional)
            </Text>
            <TextInput
              style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
              value={switchNote}
              onChangeText={setSwitchNote}
              placeholder="Note between switches..."
              placeholderTextColor={colors.mutedForeground}
              multiline
            />

            <TouchableOpacity
              style={[
                styles.logBtn,
                { backgroundColor: selectedMemberId ? colors.primary : colors.muted },
              ]}
              onPress={logSwitch}
              disabled={!selectedMemberId}
            >
              <Text
                style={[
                  styles.logBtnText,
                  { color: selectedMemberId ? colors.primaryForeground : colors.mutedForeground },
                ]}
              >
                Log Switch
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  activeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  activeText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  filterInput: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  entryCard: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 10,
    padding: 12,
    gap: 12,
  },
  entryLeft: { justifyContent: "flex-start" },
  entryInfo: { flex: 1 },
  entryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
    flexWrap: "wrap",
  },
  memberName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  entryTime: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 2 },
  entryDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  noteBubble: {
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
  },
  noteText: { fontSize: 12, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  endBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modalLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 12,
  },
  memberList: { gap: 8 },
  memberPickerItem: {
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    width: 75,
    gap: 6,
  },
  memberPickerName: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },
  statusRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  statusBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  logBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  logBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
