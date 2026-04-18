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

  const topInset = Platform.OS === "web" ? 67 : insets.top;

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

  const renderMemberCard = (member: Member, compact = false) => {
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
        <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
      </TouchableOpacity>
    );
  };

  const renderGroup = (group: Group) => {
    const isExpanded = expandedGroups.has(group.id);
    const groupMembers = filteredMembers.filter((m) => group.memberIds.includes(m.id));
    return (
      <View key={group.id} style={styles.groupWrap}>
        <TouchableOpacity
          style={[styles.groupHeader, { backgroundColor: colors.secondary, borderColor: colors.border }]}
          onPress={() => toggleGroup(group.id)}
        >
          <View style={[styles.groupDot, { backgroundColor: group.color }]} />
          <Text style={[styles.groupName, { color: colors.foreground }]}>{group.name}</Text>
          <Text style={[styles.groupCount, { color: colors.mutedForeground }]}>
            {groupMembers.length}
          </Text>
          <Feather
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.mutedForeground}
          />
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.groupMembers}>
            {groupMembers.length === 0 ? (
              <Text style={[styles.emptyGroupText, { color: colors.mutedForeground }]}>
                No members in this group
              </Text>
            ) : (
              groupMembers.map((m) => renderMemberCard(m, true))
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
          paddingBottom: Platform.OS === "web" ? 120 : 90,
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
  groupMembers: { paddingLeft: 16, paddingTop: 6 },
  emptyGroupText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
});
