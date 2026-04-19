import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MemberAvatar } from "@/components/MemberAvatar";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { EmptyState } from "@/components/EmptyState";
import { useStorage, Group, Member } from "@/context/StorageContext";
import { useColors } from "@/hooks/useColors";
import { genId, MEMBER_COLORS } from "@/utils/helpers";

const GROUP_COLORS = ["#888888", ...MEMBER_COLORS];

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, updateGroups } = useStorage();

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [draftDesc, setDraftDesc] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [addingSubgroup, setAddingSubgroup] = useState(false);
  const [newSubgroupName, setNewSubgroupName] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const group = data.groups.find((g) => g.id === id);

  if (!group) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState icon="users" title="Group not found" />
      </View>
    );
  }

  const subGroups = data.groups.filter((g) => group.subGroupIds.includes(g.id));
  const groupMembers = data.members.filter((m) => group.memberIds.includes(m.id) && !m.isArchived);
  const addableMembers = data.members.filter(
    (m) => !m.isArchived && !group.memberIds.includes(m.id),
  );

  const saveGroupField = (patch: Partial<Group>) => {
    updateGroups(data.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  };

  const commitName = () => {
    const name = draftName.trim();
    if (name) saveGroupField({ name });
    setEditingName(false);
  };

  const commitDesc = () => {
    saveGroupField({ description: draftDesc });
    setEditingDesc(false);
  };

  const pickColor = (color: string) => {
    saveGroupField({ color });
    setShowColorPicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const createSubgroup = () => {
    const name = newSubgroupName.trim();
    if (!name) return;
    const sub: Group = {
      id: genId(),
      name,
      color: group.color,
      memberIds: [],
      subGroupIds: [],
      parentGroupId: group.id,
      showMembersInRoot: false,
      description: "",
      createdAt: Date.now(),
    };
    updateGroups([
      ...data.groups.map((g) =>
        g.id === id ? { ...g, subGroupIds: [...g.subGroupIds, sub.id] } : g,
      ),
      sub,
    ]);
    setNewSubgroupName("");
    setAddingSubgroup(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const addMemberToGroup = (memberId: string) => {
    saveGroupField({ memberIds: [...group.memberIds, memberId] });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const removeMember = (memberId: string) => {
    saveGroupField({ memberIds: group.memberIds.filter((mid) => mid !== memberId) });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const confirmDeleteGroup = () => {
    setShowDeleteConfirm(false);
    const childIds = new Set([group.id, ...group.subGroupIds]);
    updateGroups(
      data.groups
        .filter((g) => !childIds.has(g.id))
        .map((g) => ({ ...g, subGroupIds: g.subGroupIds.filter((sid) => sid !== group.id) })),
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ConfirmSheet
        visible={showDeleteConfirm}
        title="Delete Group"
        message={`Delete "${group.name}" and all its subgroups? Members won't be deleted.`}
        confirmLabel="Delete"
        onConfirm={confirmDeleteGroup}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Top bar */}
      <View
        style={[
          styles.topBar,
          { paddingTop: topInset + 12, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>

        {editingName ? (
          <TextInput
            style={[styles.titleInput, { color: colors.foreground, borderColor: group.color }]}
            value={draftName}
            onChangeText={setDraftName}
            autoFocus
            onBlur={commitName}
            onSubmitEditing={commitName}
          />
        ) : (
          <TouchableOpacity
            style={styles.titleRow}
            onPress={() => { setDraftName(group.name); setEditingName(true); }}
          >
            <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
              {group.name}
            </Text>
            <Feather name="edit-2" size={14} color={colors.mutedForeground} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        )}

        <View style={styles.topActions}>
          <TouchableOpacity
            hitSlop={8}
            onPress={() => setShowColorPicker((v) => !v)}
          >
            <View style={[styles.colorDot, { backgroundColor: group.color }]} />
          </TouchableOpacity>
          <TouchableOpacity hitSlop={8} onPress={() => setShowDeleteConfirm(true)}>
            <Feather name="trash-2" size={18} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Color picker */}
      {showColorPicker && (
        <View style={[styles.colorPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.colorGrid}>
            {GROUP_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.colorSwatch, { backgroundColor: c }, group.color === c && styles.colorSwatchSelected]}
                onPress={() => pickColor(c)}
              />
            ))}
          </View>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Description */}
        <TouchableOpacity
          style={[styles.descCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => { setDraftDesc(group.description ?? ""); setEditingDesc(true); }}
          activeOpacity={0.85}
        >
          {editingDesc ? (
            <TextInput
              style={[styles.descInput, { color: colors.foreground }]}
              value={draftDesc}
              onChangeText={setDraftDesc}
              multiline
              autoFocus
              placeholder="Add a description..."
              placeholderTextColor={colors.mutedForeground}
              onBlur={commitDesc}
            />
          ) : (
            <Text style={[styles.descText, { color: group.description ? colors.foreground : colors.mutedForeground }]}>
              {group.description || "Add a description..."}
            </Text>
          )}
        </TouchableOpacity>

        {/* Subgroups section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            SUBGROUPS ({subGroups.length})
          </Text>
          <TouchableOpacity
            style={[styles.sectionAddBtn, { backgroundColor: group.color + "22", borderColor: group.color + "55" }]}
            onPress={() => { setAddingSubgroup((v) => !v); setNewSubgroupName(""); }}
          >
            <Feather name="folder-plus" size={14} color={group.color} />
            <Text style={[styles.sectionAddText, { color: group.color }]}>Add</Text>
          </TouchableOpacity>
        </View>

        {addingSubgroup && (
          <View style={[styles.inlineInput, { backgroundColor: colors.card, borderColor: group.color + "55" }]}>
            <Feather name="folder" size={14} color={group.color} />
            <TextInput
              style={[styles.inlineInputText, { color: colors.foreground }]}
              placeholder="Subgroup name..."
              placeholderTextColor={colors.mutedForeground}
              value={newSubgroupName}
              onChangeText={setNewSubgroupName}
              autoFocus
              onSubmitEditing={createSubgroup}
            />
            <TouchableOpacity
              style={[styles.inlineConfirm, { backgroundColor: group.color }]}
              onPress={createSubgroup}
            >
              <Feather name="check" size={14} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setAddingSubgroup(false)}>
              <Feather name="x" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        )}

        {subGroups.length === 0 && !addingSubgroup ? (
          <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>
            No subgroups yet
          </Text>
        ) : (
          subGroups.map((sg) => {
            const sgMembers = data.members.filter((m) => sg.memberIds.includes(m.id) && !m.isArchived);
            const sgSubs = data.groups.filter((g) => sg.subGroupIds.includes(g.id));
            return (
              <TouchableOpacity
                key={sg.id}
                style={[styles.subgroupCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: sg.color, borderLeftWidth: 3 }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/groups/${sg.id}`);
                }}
              >
                <View style={styles.subgroupCardBody}>
                  <Text style={[styles.subgroupName, { color: colors.foreground }]}>{sg.name}</Text>
                  <Text style={[styles.subgroupMeta, { color: colors.mutedForeground }]}>
                    {sgMembers.length} member{sgMembers.length !== 1 ? "s" : ""}
                    {sgSubs.length > 0 ? ` · ${sgSubs.length} subgroup${sgSubs.length !== 1 ? "s" : ""}` : ""}
                  </Text>
                </View>
                <View style={styles.subgroupAvatars}>
                  {sgMembers.slice(0, 3).map((m) => (
                    <MemberAvatar key={m.id} name={m.name} color={m.color} profileImage={m.profileImage} size={24} shape={m.avatarShape} />
                  ))}
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            );
          })
        )}

        {/* Members section */}
        <View style={[styles.sectionHeader, { marginTop: 20 }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            MEMBERS ({groupMembers.length})
          </Text>
          <TouchableOpacity
            style={[styles.sectionAddBtn, { backgroundColor: group.color + "22", borderColor: group.color + "55" }]}
            onPress={() => setAddingMember((v) => !v)}
          >
            <Feather name="user-plus" size={14} color={group.color} />
            <Text style={[styles.sectionAddText, { color: group.color }]}>Add</Text>
          </TouchableOpacity>
        </View>

        {addingMember && (
          <View style={[styles.memberPickerBox, { backgroundColor: colors.card, borderColor: group.color + "55" }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.foreground }]}>Add a member</Text>
              <TouchableOpacity onPress={() => setAddingMember(false)}>
                <Feather name="x" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            {addableMembers.length === 0 ? (
              <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>All members already in this group</Text>
            ) : (
              addableMembers.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.pickerRow, { borderTopColor: colors.border }]}
                  onPress={() => { addMemberToGroup(m.id); setAddingMember(false); }}
                >
                  <MemberAvatar name={m.name} color={m.color} profileImage={m.profileImage} size={28} shape={m.avatarShape} />
                  <Text style={[styles.pickerName, { color: colors.foreground }]}>{m.name}</Text>
                  <Feather name="plus" size={14} color={group.color} />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {groupMembers.length === 0 && !addingMember ? (
          <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>
            No members yet — tap Add to include someone
          </Text>
        ) : (
          groupMembers.map((m) => {
            const isFronting = data.frontEntries.some((e) => !e.endTime && e.memberId === m.id);
            return (
              <TouchableOpacity
                key={m.id}
                style={[styles.memberCard, { backgroundColor: colors.card, borderColor: isFronting ? m.color : colors.border }]}
                onPress={() => router.push(`/member/${m.id}`)}
              >
                <View style={[styles.memberColorBar, { backgroundColor: m.color }]} />
                <MemberAvatar name={m.name} color={m.color} profileImage={m.profileImage} size={40} shape={m.avatarShape} />
                <View style={styles.memberInfo}>
                  <Text style={[styles.memberName, { color: colors.foreground }]}>{m.name}</Text>
                  {m.pronouns ? <Text style={[styles.memberSub, { color: colors.mutedForeground }]}>{m.pronouns}</Text> : null}
                  {m.role ? <Text style={[styles.memberRole, { color: m.color }]}>{m.role}</Text> : null}
                </View>
                {isFronting && <View style={[styles.frontingDot, { backgroundColor: "#4ade80" }]} />}
                <TouchableOpacity
                  hitSlop={10}
                  onPress={() => removeMember(m.id)}
                >
                  <Feather name="user-minus" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  titleRow: { flex: 1, flexDirection: "row", alignItems: "center" },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", flex: 1 },
  titleInput: {
    flex: 1,
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    borderBottomWidth: 2,
    paddingBottom: 2,
  },
  topActions: { flexDirection: "row", alignItems: "center", gap: 14 },
  colorDot: { width: 22, height: 22, borderRadius: 11 },
  colorPanel: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  colorSwatch: { width: 28, height: 28, borderRadius: 14 },
  colorSwatchSelected: { borderWidth: 3, borderColor: "#fff" },
  descCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
    minHeight: 48,
  },
  descText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  descInput: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, minHeight: 60 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  sectionAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  sectionAddText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  inlineInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
  },
  inlineInputText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  inlineConfirm: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  emptyHint: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 8, paddingLeft: 2 },
  subgroupCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  subgroupCardBody: { flex: 1 },
  subgroupName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  subgroupMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  subgroupAvatars: { flexDirection: "row", gap: -6 },
  memberPickerBox: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pickerTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderTopWidth: 1,
  },
  pickerName: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    overflow: "hidden",
    gap: 10,
    paddingRight: 12,
    paddingVertical: 10,
  },
  memberColorBar: { width: 4, height: "100%", position: "absolute", left: 0 },
  memberInfo: { flex: 1, paddingLeft: 4 },
  memberName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  memberSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  memberRole: { fontSize: 12, fontFamily: "Inter_500Medium" },
  frontingDot: { width: 8, height: 8, borderRadius: 4 },
});
