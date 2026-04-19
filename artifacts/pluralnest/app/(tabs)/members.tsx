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

export default function MembersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, updateMembers, updateGroups } = useStorage();
  const [search, setSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [addingSubgroupToId, setAddingSubgroupToId] = useState<string | null>(null);
  const [newSubgroupName, setNewSubgroupName] = useState("");
  const [addingMemberToGroupId, setAddingMemberToGroupId] = useState<string | null>(null);

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
    () => data.groups.filter((g) => !g.parentGroupId),
    [data.groups],
  );

  const ungroupedMembers = useMemo(() => {
    const groupedIds = new Set(data.groups.flatMap((g) => g.memberIds));
    return filteredMembers.filter((m) => !groupedIds.has(m.id));
  }, [filteredMembers, data.groups]);

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
      color: colors.primary,
      memberIds: [],
      subGroupIds: [],
      showMembersInRoot: true,
      description: "",
      createdAt: Date.now(),
    };
    updateGroups([...data.groups, group]);
    setNewGroupName("");
    setShowAddGroup(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const addSubgroup = (parentId: string) => {
    if (!newSubgroupName.trim()) return;
    const subgroup: Group = {
      id: genId(),
      name: newSubgroupName.trim(),
      color: data.groups.find((g) => g.id === parentId)?.color ?? colors.primary,
      memberIds: [],
      subGroupIds: [],
      parentGroupId: parentId,
      showMembersInRoot: false,
      description: "",
      createdAt: Date.now(),
    };
    const updated = data.groups.map((g) =>
      g.id === parentId
        ? { ...g, subGroupIds: [...g.subGroupIds, subgroup.id] }
        : g,
    );
    updateGroups([...updated, subgroup]);
    setNewSubgroupName("");
    setAddingSubgroupToId(null);
    // Auto-expand the parent
    setExpandedGroups((prev) => new Set([...prev, parentId]));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const addMemberToGroup = (groupId: string, memberId: string) => {
    updateGroups(
      data.groups.map((g) =>
        g.id === groupId ? { ...g, memberIds: [...g.memberIds, memberId] } : g,
      ),
    );
    setAddingMemberToGroupId(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const removeMemberFromGroup = (groupId: string, memberId: string) => {
    updateGroups(
      data.groups.map((g) =>
        g.id === groupId ? { ...g, memberIds: g.memberIds.filter((id) => id !== memberId) } : g,
      ),
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const renderMemberCard = (member: Member, groupId?: string) => {
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
          {member.tags.length > 0 && (
            <View style={styles.tags}>
              {member.tags.slice(0, 2).map((t) => (
                <TagChip key={t} label={t} color={member.color} small />
              ))}
            </View>
          )}
        </View>
        {groupId ? (
          <TouchableOpacity
            hitSlop={8}
            onPress={(e) => { e.stopPropagation?.(); removeMemberFromGroup(groupId, member.id); }}
          >
            <Feather name="user-minus" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        ) : (
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        )}
      </TouchableOpacity>
    );
  };

  const renderGroup = (group: Group, depth = 0) => {
    const isExpanded = expandedGroups.has(group.id);
    const groupMembers = filteredMembers.filter((m) => group.memberIds.includes(m.id));
    const subGroups = data.groups.filter((g) => group.subGroupIds.includes(g.id));
    const totalCount = groupMembers.length + subGroups.reduce((acc, sg) => acc + sg.memberIds.length, 0);
    const indent = depth * 14;
    const isAddingHere = addingSubgroupToId === group.id;

    return (
      <View key={group.id} style={[styles.groupWrap, depth > 0 && { marginLeft: indent }]}>
        <TouchableOpacity
          style={[styles.groupHeader, {
            backgroundColor: depth > 0 ? colors.background : colors.secondary,
            borderColor: depth > 0 ? group.color + "55" : colors.border,
            borderLeftWidth: depth > 0 ? 3 : 1,
            borderLeftColor: depth > 0 ? group.color : colors.border,
          }]}
          onPress={() => toggleGroup(group.id)}
        >
          <View style={[styles.groupDot, { backgroundColor: group.color }]} />
          <Text style={[styles.groupName, { color: colors.foreground }]}>{group.name}</Text>
          {subGroups.length > 0 && (
            <Text style={[styles.subgroupBadge, { color: colors.mutedForeground }]}>
              {subGroups.length} sub
            </Text>
          )}
          <Text style={[styles.groupCount, { color: colors.mutedForeground }]}>
            {totalCount}
          </Text>
          <TouchableOpacity
            style={styles.addSubgroupBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              setAddingMemberToGroupId(addingMemberToGroupId === group.id ? null : group.id);
              setAddingSubgroupToId(null);
              setExpandedGroups((prev) => new Set([...prev, group.id]));
            }}
          >
            <Feather name="user-plus" size={14} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addSubgroupBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              setAddingSubgroupToId(isAddingHere ? null : group.id);
              setNewSubgroupName("");
              setAddingMemberToGroupId(null);
              setExpandedGroups((prev) => new Set([...prev, group.id]));
            }}
          >
            <Feather name="folder-plus" size={14} color={colors.mutedForeground} />
          </TouchableOpacity>
          <Feather
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.mutedForeground}
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.groupMembers}>
            {/* Add subgroup input */}
            {isAddingHere && (
              <View style={[styles.subgroupInput, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="folder" size={14} color={group.color} />
                <TextInput
                  style={[styles.subgroupInputText, { color: colors.foreground }]}
                  placeholder="Subgroup name..."
                  placeholderTextColor={colors.mutedForeground}
                  value={newSubgroupName}
                  onChangeText={setNewSubgroupName}
                  autoFocus
                  onSubmitEditing={() => addSubgroup(group.id)}
                />
                <TouchableOpacity
                  style={[styles.subgroupConfirm, { backgroundColor: group.color }]}
                  onPress={() => addSubgroup(group.id)}
                >
                  <Feather name="plus" size={14} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setAddingSubgroupToId(null)}>
                  <Feather name="x" size={14} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            )}

            {/* Member picker */}
            {addingMemberToGroupId === group.id && (() => {
              const pickable = data.members.filter(
                (m) => !m.isArchived && !group.memberIds.includes(m.id),
              );
              return (
                <View style={[styles.memberPickerBox, { backgroundColor: colors.card, borderColor: group.color + "55" }]}>
                  <View style={styles.memberPickerHeader}>
                    <Feather name="user-plus" size={13} color={group.color} />
                    <Text style={[styles.memberPickerTitle, { color: colors.foreground }]}>
                      Add member to group
                    </Text>
                    <TouchableOpacity onPress={() => setAddingMemberToGroupId(null)}>
                      <Feather name="x" size={14} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>
                  {pickable.length === 0 ? (
                    <Text style={[styles.emptyGroupText, { color: colors.mutedForeground }]}>
                      All members are already in this group
                    </Text>
                  ) : (
                    pickable.map((m) => (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.memberPickerRow, { borderTopColor: colors.border }]}
                        onPress={() => addMemberToGroup(group.id, m.id)}
                      >
                        <MemberAvatar name={m.name} color={m.color} profileImage={m.profileImage} size={28} shape={m.avatarShape} />
                        <Text style={[styles.memberPickerName, { color: colors.foreground }]}>{m.name}</Text>
                        <Feather name="plus" size={14} color={group.color} />
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              );
            })()}

            {/* Subgroups (recursive) */}
            {subGroups.map((sg) => renderGroup(sg, depth + 1))}

            {/* Members */}
            {groupMembers.length === 0 && subGroups.length === 0 && !isAddingHere && addingMemberToGroupId !== group.id ? (
              <Text style={[styles.emptyGroupText, { color: colors.mutedForeground }]}>
                No members — tap <Feather name="user-plus" size={12} color={colors.mutedForeground} /> to add one
              </Text>
            ) : (
              groupMembers.map((m) => renderMemberCard(m, group.id))
            )}
          </View>
        )}
      </View>
    );
  };

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
                setShowAddGroup(true);
                setShowAddMember(false);
              }}
            >
              <Feather name="folder-plus" size={18} color={colors.foreground} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                setShowAddMember(true);
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
          <View style={[styles.quickAdd, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.quickAddInput, { color: colors.foreground, borderColor: colors.border }]}
              placeholder="Group name..."
              placeholderTextColor={colors.mutedForeground}
              value={newGroupName}
              onChangeText={setNewGroupName}
              autoFocus
              onSubmitEditing={addGroup}
            />
            <TouchableOpacity
              style={[styles.quickAddBtn, { backgroundColor: colors.primary }]}
              onPress={addGroup}
            >
              <Feather name="plus" size={18} color={colors.primaryForeground} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAddBtn, { backgroundColor: colors.secondary }]}
              onPress={() => setShowAddGroup(false)}
            >
              <Feather name="x" size={18} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <FlatList
        data={[...rootGroups, ...ungroupedMembers]}
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
          if ("memberIds" in item) return renderGroup(item as Group);
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
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
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
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  quickAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 10,
    gap: 12,
    overflow: "hidden",
  },
  colorBar: {
    width: 4,
    alignSelf: "stretch",
  },
  memberInfo: { flex: 1, paddingVertical: 12 },
  memberNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  memberName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  frontingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  memberPronouns: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  memberRole: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 1,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
  },
  groupWrap: {
    marginBottom: 12,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  groupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  groupName: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  groupCount: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  groupMembers: { paddingLeft: 12, paddingTop: 6 },
  subgroupBadge: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginRight: -4,
  },
  addSubgroupBtn: {
    padding: 4,
  },
  subgroupInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  subgroupInputText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  subgroupConfirm: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyGroupText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  memberPickerBox: {
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    overflow: "hidden",
  },
  memberPickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  memberPickerTitle: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  memberPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  memberPickerName: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
