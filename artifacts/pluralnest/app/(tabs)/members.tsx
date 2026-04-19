import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MemberAvatar } from "@/components/MemberAvatar";
import { EmptyState } from "@/components/EmptyState";
import { TagChip } from "@/components/TagChip";
import { useStorage, Member, Group } from "@/context/StorageContext";
import { useColors } from "@/hooks/useColors";
import { useBottomTabClearance } from "@/hooks/useBottomTabClearance";
import { genId, MEMBER_COLORS } from "@/utils/helpers";

const DEFAULT_GROUP_COLOR = "#888888";
const GROUP_COLORS = [DEFAULT_GROUP_COLOR, ...MEMBER_COLORS];

export default function MembersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, updateMembers, updateGroups } = useStorage();
  const [search, setSearch] = useState("");
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState(DEFAULT_GROUP_COLOR);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomClearance = useBottomTabClearance(16);

  const activeFronterIds = useMemo(
    () => new Set(data.frontEntries.filter((e) => !e.endTime).map((e) => e.memberId)),
    [data.frontEntries],
  );

  const filteredMembers = useMemo(() => {
    const q = search.toLowerCase();
    return data.members.filter(
      (m) =>
        !m.isArchived &&
        (m.name.toLowerCase().includes(q) ||
          m.role.toLowerCase().includes(q) ||
          m.tags.some((t) => t.toLowerCase().includes(q))),
    );
  }, [data.members, search]);

  const rootGroups = useMemo(
    () => (data.groups ?? []).filter((g) => !g.parentGroupId),
    [data.groups],
  );

  const ungroupedMembers = useMemo(() => {
    const groupedIds = new Set((data.groups ?? []).flatMap((g) => g.memberIds));
    return filteredMembers.filter((m) => !groupedIds.has(m.id));
  }, [filteredMembers, data.groups]);

  const addMember = () => {
    if (!newName.trim()) return;
    const member: Member = {
      id: genId(),
      name: newName.trim(),
      pronouns: "",
      role: "",
      color: MEMBER_COLORS[data.members.length % MEMBER_COLORS.length],
      avatarShape: "circle",
      description: "",
      customFields: [],
      relationships: [],
      tags: [],
      isArchived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    updateMembers([...data.members, member]);
    setNewName("");
    setShowAddMember(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push(`/member/edit?id=${member.id}&isNew=true`);
  };

  const addGroup = () => {
    if (!newGroupName.trim()) return;
    const group: Group = {
      id: genId(),
      name: newGroupName.trim(),
      color: newGroupColor,
      memberIds: [],
      subGroupIds: [],
      showMembersInRoot: true,
      description: "",
      createdAt: Date.now(),
    };
    updateGroups([...(data.groups ?? []), group]);
    setNewGroupName("");
    setNewGroupColor(DEFAULT_GROUP_COLOR);
    setShowAddGroup(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push(`/groups/${group.id}`);
  };

  const renderGroupCard = (group: Group) => {
    const memberCount = group.memberIds.length;
    const subGroupCount = group.subGroupIds.length;
    const previewMembers = data.members.filter((m) => group.memberIds.includes(m.id) && !m.isArchived).slice(0, 4);
    return (
      <TouchableOpacity
        key={group.id}
        style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: group.color, borderLeftWidth: 3 }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/groups/${group.id}`);
        }}
        activeOpacity={0.85}
      >
        <View style={styles.groupCardBody}>
          <View style={styles.groupCardTop}>
            <Text style={[styles.groupName, { color: colors.foreground }]}>{group.name}</Text>
            {subGroupCount > 0 && (
              <View style={[styles.subBadge, { backgroundColor: group.color + "22" }]}>
                <Feather name="folder" size={10} color={group.color} />
                <Text style={[styles.subBadgeText, { color: group.color }]}>{subGroupCount}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.groupMeta, { color: colors.mutedForeground }]}>
            {memberCount} member{memberCount !== 1 ? "s" : ""}
          </Text>
          {previewMembers.length > 0 && (
            <View style={styles.previewAvatars}>
              {previewMembers.map((m) => (
                <MemberAvatar key={m.id} name={m.name} color={m.color} profileImage={m.profileImage} size={22} shape={m.avatarShape} />
              ))}
            </View>
          )}
        </View>
        <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
      </TouchableOpacity>
    );
  };

  const renderMemberCard = (member: Member) => {
    const isFronting = activeFronterIds.has(member.id);
    return (
      <TouchableOpacity
        key={member.id}
        style={[
          styles.memberCard,
          { backgroundColor: colors.card, borderColor: isFronting ? member.color : colors.border },
        ]}
        onPress={() => router.push(`/member/${member.id}`)}
      >
        <View style={[styles.colorBar, { backgroundColor: member.color }]} />
        <MemberAvatar
          name={member.name}
          color={member.color}
          profileImage={member.profileImage}
          size={44}
          shape={member.avatarShape}
        />
        <View style={styles.memberInfo}>
          <View style={styles.memberNameRow}>
            <Text style={[styles.memberName, { color: colors.foreground }]}>{member.name}</Text>
            {isFronting && (
              <View style={[styles.frontingDot, { backgroundColor: "#4ade80" }]} />
            )}
          </View>
          {member.pronouns ? (
            <Text style={[styles.memberPronouns, { color: colors.mutedForeground }]}>
              {member.pronouns}
            </Text>
          ) : null}
          {member.role ? (
            <Text style={[styles.memberRole, { color: member.color }]}>{member.role}</Text>
          ) : null}
          {(member.tags?.length ?? 0) > 0 && (
            <View style={styles.tags}>
              {member.tags.slice(0, 2).map((t) => (
                <TagChip key={t} label={t} color={member.color} small />
              ))}
            </View>
          )}
        </View>
        <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
      </TouchableOpacity>
    );
  };

  const listData: (Group | Member)[] = [...rootGroups, ...ungroupedMembers];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.topBar,
          {
            paddingTop: topInset + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>Members</Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: colors.secondary }]}
              onPress={() => {
                setShowAddGroup((v) => !v);
                setShowAddMember(false);
              }}
            >
              <Feather name="folder-plus" size={18} color={colors.foreground} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                setShowAddMember((v) => !v);
                setShowAddGroup(false);
              }}
            >
              <Feather name="user-plus" size={18} color={colors.primaryForeground} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search members, tags, roles..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ) : null}
        </View>

        {showAddMember && (
          <View style={[styles.quickAdd, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.quickAddInput, { color: colors.foreground, borderColor: colors.border }]}
              placeholder="Member name..."
              placeholderTextColor={colors.mutedForeground}
              value={newName}
              onChangeText={setNewName}
              autoFocus
              onSubmitEditing={addMember}
            />
            <TouchableOpacity
              style={[styles.quickAddBtn, { backgroundColor: colors.primary }]}
              onPress={addMember}
            >
              <Feather name="plus" size={18} color={colors.primaryForeground} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAddBtn, { backgroundColor: colors.secondary }]}
              onPress={() => setShowAddMember(false)}
            >
              <Feather name="x" size={18} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        )}

        {showAddGroup && (
          <View style={[styles.quickAdd, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: "column", gap: 10 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={[styles.groupDotPreview, { backgroundColor: newGroupColor }]} />
              <TextInput
                style={[styles.quickAddInput, { color: colors.foreground, borderColor: colors.border, flex: 1 }]}
                placeholder="Group name..."
                placeholderTextColor={colors.mutedForeground}
                value={newGroupName}
                onChangeText={setNewGroupName}
                autoFocus
                onSubmitEditing={addGroup}
              />
              <TouchableOpacity
                style={[styles.quickAddBtn, { backgroundColor: newGroupColor }]}
                onPress={addGroup}
              >
                <Feather name="plus" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickAddBtn, { backgroundColor: colors.secondary }]}
                onPress={() => { setShowAddGroup(false); setNewGroupColor(DEFAULT_GROUP_COLOR); }}
              >
                <Feather name="x" size={18} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <View style={styles.colorSwatchGrid}>
              {GROUP_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c },
                    newGroupColor === c && styles.colorSwatchSelected,
                  ]}
                  onPress={() => setNewGroupColor(c)}
                />
              ))}
            </View>
          </View>
        )}
      </View>

      <FlatList
        data={listData}
        keyExtractor={(item) => ("memberIds" in item ? `group-${item.id}` : item.id)}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: bottomClearance,
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="users"
            title="No members yet"
            subtitle="Add your first system member to get started"
            action={{ label: "Add Member", onPress: () => setShowAddMember(true) }}
          />
        }
        renderItem={({ item }) => {
          if ("memberIds" in item) return renderGroupCard(item as Group);
          return renderMemberCard(item as Member);
        }}
      />
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
    marginBottom: 12,
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  actions: { flexDirection: "row", gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  quickAdd: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  quickAddInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  quickAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  groupDotPreview: { width: 20, height: 20, borderRadius: 10 },
  colorSwatchGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  colorSwatch: { width: 26, height: 26, borderRadius: 13 },
  colorSwatchSelected: { borderWidth: 3, borderColor: "#fff" },
  groupCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
    gap: 10,
  },
  groupCardBody: { flex: 1 },
  groupCardTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
  groupName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  subBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  subBadgeText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  groupMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  previewAvatars: { flexDirection: "row", gap: 4, marginTop: 6 },
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
  colorBar: { width: 4, alignSelf: "stretch" },
  memberInfo: { flex: 1 },
  memberNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  memberName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  memberPronouns: { fontSize: 12, fontFamily: "Inter_400Regular" },
  memberRole: { fontSize: 12, fontFamily: "Inter_500Medium" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 3 },
  frontingDot: { width: 8, height: 8, borderRadius: 4 },
});
