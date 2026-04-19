import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Modal,
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
import { EmptyState } from "@/components/EmptyState";
import { useStorage, HeadspaceNode } from "@/context/StorageContext";
import { useColors } from "@/hooks/useColors";
import { genId } from "@/utils/helpers";
import { persistImage } from "@/utils/persistImage";

type NodeType = HeadspaceNode["type"];

const TYPE_META: Record<NodeType, { icon: string; color: string; label: string }> = {
  place:       { icon: "map-pin",    color: "#a89de8", label: "Place" },
  image:       { icon: "image",      color: "#a0d9e8", label: "Image" },
  description: { icon: "file-text",  color: "#a0e8b2", label: "Description" },
  text:        { icon: "align-left", color: "#ffd166", label: "Text" },
};

export default function HeadspaceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, updateHeadspaceNodes } = useStorage();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState<NodeType>("place");
  const [newImage, setNewImage] = useState("");
  const [linkedMemberIds, setLinkedMemberIds] = useState<string[]>([]);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const rootNodes = useMemo(
    () => data.headspaceNodes.filter((n) => !n.parentId),
    [data.headspaceNodes],
  );

  const openAdd = (parentId: string | null = null) => {
    setSelectedNodeId(parentId);
    setNewTitle("");
    setNewContent("");
    setNewImage("");
    setLinkedMemberIds([]);
    setNewType("place");
    setShowAddModal(true);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setNewImage(await persistImage(result.assets[0].uri));
    }
  };

  const addNode = () => {
    if (!newTitle.trim()) return;
    const node: HeadspaceNode = {
      id: genId(),
      type: newType,
      title: newTitle.trim(),
      content: newContent.trim() || undefined,
      imageUri: newImage || undefined,
      x: Math.random() * 200,
      y: Math.random() * 200,
      connectedMemberIds: linkedMemberIds,
      parentId: selectedNodeId ?? undefined,
      children: [],
    };
    let updated = [...data.headspaceNodes, node];
    if (selectedNodeId) {
      updated = updated.map((n) =>
        n.id === selectedNodeId ? { ...n, children: [...n.children, node.id] } : n,
      );
    }
    updateHeadspaceNodes(updated);
    setShowAddModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const deleteNode = (id: string) => {
    updateHeadspaceNodes(
      data.headspaceNodes
        .filter((n) => n.id !== id)
        .map((n) => ({ ...n, children: n.children.filter((c) => c !== id) })),
    );
  };

  const toggleMemberLink = (memberId: string) => {
    setLinkedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId],
    );
  };

  const renderNode = (node: HeadspaceNode, depth = 0) => {
    const children = data.headspaceNodes.filter((n) => n.parentId === node.id);
    const linkedMembers = node.connectedMemberIds
      .map((id) => data.members.find((m) => m.id === id))
      .filter(Boolean);
    const meta = TYPE_META[node.type] ?? TYPE_META.description;
    const isText = node.type === "text";

    return (
      <View key={node.id} style={[styles.nodeWrap, { marginLeft: depth * 16 }]}>
        <View style={[styles.nodeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {node.imageUri && !isText && (
            <Image source={{ uri: node.imageUri }} style={styles.nodeImage} contentFit="cover" />
          )}
          <View style={styles.nodeContent}>
            <View style={styles.nodeHeader}>
              <View style={[styles.typeTag, { backgroundColor: meta.color + "22" }]}>
                <Feather name={meta.icon as any} size={12} color={meta.color} />
                <Text style={[styles.typeText, { color: meta.color }]}>{meta.label}</Text>
              </View>
              <View style={styles.nodeActions}>
                <TouchableOpacity onPress={() => openAdd(node.id)} hitSlop={8}>
                  <Feather name="plus" size={16} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteNode(node.id)} hitSlop={8}>
                  <Feather name="trash-2" size={16} color={colors.destructive} />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={[styles.nodeTitle, { color: colors.foreground }]}>{node.title}</Text>

            {node.content ? (
              isText ? (
                /* Text nodes: show full body without truncation */
                <Text style={[styles.nodeBody, { color: colors.foreground }]}>{node.content}</Text>
              ) : (
                <Text style={[styles.nodeDesc, { color: colors.mutedForeground }]} numberOfLines={3}>
                  {node.content}
                </Text>
              )
            ) : null}

            {linkedMembers.length > 0 && (
              <View style={styles.linkedMembers}>
                {linkedMembers.map(
                  (m) =>
                    m && (
                      <TouchableOpacity
                        key={m.id}
                        onPress={() => router.push(`/member/${m.id}`)}
                        style={styles.linkedMember}
                      >
                        <MemberAvatar name={m.name} color={m.color} size={22} profileImage={m.profileImage} />
                        <Text style={[styles.linkedMemberName, { color: m.color }]}>{m.name}</Text>
                      </TouchableOpacity>
                    ),
                )}
              </View>
            )}
          </View>
        </View>
        {children.length > 0 && (
          <View style={styles.children}>
            {children.map((child) => renderNode(child, depth + 1))}
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
          { paddingTop: topInset + 12, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Headspace</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => openAdd(null)}
        >
          <Feather name="plus" size={20} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 }}
      >
        {rootNodes.length === 0 ? (
          <EmptyState
            icon="map"
            title="Your headspace is empty"
            subtitle="Document your inner world — places, images, descriptions, and text"
            action={{ label: "Add Entry", onPress: () => openAdd(null) }}
          />
        ) : (
          rootNodes.map((node) => renderNode(node))
        )}
      </ScrollView>

      {/* ── Add Modal ── */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: "#0009" }]}>
          <ScrollView
            style={[styles.modal, { backgroundColor: colors.card, borderColor: colors.border }]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {selectedNodeId ? "Add Nested Entry" : "Add Headspace Entry"}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            {/* Type picker */}
            <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Type</Text>
            <View style={styles.typeRow}>
              {(Object.entries(TYPE_META) as [NodeType, typeof TYPE_META[NodeType]][]).map(([t, meta]) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeBtn,
                    {
                      borderColor: newType === t ? meta.color : colors.border,
                      backgroundColor: newType === t ? meta.color + "22" : colors.secondary,
                    },
                  ]}
                  onPress={() => setNewType(t)}
                >
                  <Feather name={meta.icon as any} size={14} color={newType === t ? meta.color : colors.mutedForeground} />
                  <Text style={[styles.typeBtnText, { color: newType === t ? meta.color : colors.foreground }]}>
                    {meta.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Title */}
            <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Title</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder={newType === "text" ? "Entry title..." : "Name this place or entry..."}
              placeholderTextColor={colors.mutedForeground}
            />

            {/* Body / description */}
            <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>
              {newType === "text" ? "Body Text" : "Description"}
            </Text>
            <TextInput
              style={[
                styles.modalTextarea,
                { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary },
                newType === "text" && { minHeight: 140 },
              ]}
              value={newContent}
              onChangeText={setNewContent}
              placeholder={newType === "text" ? "Write your text here..." : "Describe this place or scene..."}
              placeholderTextColor={colors.mutedForeground}
              multiline
            />

            {/* Image picker — hidden for text type */}
            {newType !== "text" && (
              <>
                <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Image (optional)</Text>
                <TouchableOpacity
                  style={[styles.imagePicker, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                  onPress={pickImage}
                >
                  <Feather name="image" size={18} color={colors.mutedForeground} />
                  <Text style={[styles.imagePickerText, { color: colors.mutedForeground }]}>
                    {newImage ? "Image selected ✓" : "Pick image"}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Link members */}
            <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Link Members</Text>
            <View style={styles.memberLinkGrid}>
              {data.members
                .filter((m) => !m.isArchived)
                .map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.memberLinkChip,
                      {
                        borderColor: linkedMemberIds.includes(m.id) ? m.color : colors.border,
                        backgroundColor: linkedMemberIds.includes(m.id) ? m.color + "22" : colors.secondary,
                      },
                    ]}
                    onPress={() => toggleMemberLink(m.id)}
                  >
                    <MemberAvatar name={m.name} color={m.color} size={22} profileImage={m.profileImage} />
                    <Text style={[styles.memberLinkName, { color: linkedMemberIds.includes(m.id) ? m.color : colors.foreground }]}>
                      {m.name}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity
              style={[styles.addNodeBtn, { backgroundColor: newTitle.trim() ? colors.primary : colors.muted }]}
              onPress={addNode}
              disabled={!newTitle.trim()}
            >
              <Text style={[styles.addNodeBtnText, { color: newTitle.trim() ? colors.primaryForeground : colors.mutedForeground }]}>
                Add Entry
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  nodeWrap: { marginBottom: 10 },
  nodeCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  nodeImage: { width: "100%", height: 140 },
  nodeContent: { padding: 12 },
  nodeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  typeTag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  typeText: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "capitalize" },
  nodeActions: { flexDirection: "row", gap: 10 },
  nodeTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  nodeDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, color: "#aaa" },
  nodeBody: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  linkedMembers: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  linkedMember: { flexDirection: "row", alignItems: "center", gap: 4 },
  linkedMemberName: { fontSize: 12, fontFamily: "Inter_500Medium" },
  children: { paddingLeft: 12, paddingTop: 4, borderLeftWidth: 2, borderLeftColor: "#33334444", marginLeft: 20 },
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modalLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, marginTop: 12 },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  typeBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  modalInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, fontFamily: "Inter_400Regular" },
  modalTextarea: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 80 },
  imagePicker: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 10, padding: 12, borderStyle: "dashed" },
  imagePickerText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  memberLinkGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  memberLinkChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5 },
  memberLinkName: { fontSize: 12, fontFamily: "Inter_500Medium" },
  addNodeBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 20, marginBottom: 20 },
  addNodeBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
