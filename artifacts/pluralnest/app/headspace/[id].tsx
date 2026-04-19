import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
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
import { TYPE_META } from "./index";

type NodeType = HeadspaceNode["type"];

export default function HeadspaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, updateHeadspaceNodes } = useStorage();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState<NodeType>("place");
  const [newImage, setNewImage] = useState("");
  const [linkedMemberIds, setLinkedMemberIds] = useState<string[]>([]);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const node = data.headspaceNodes.find((n) => n.id === id);
  const children = data.headspaceNodes.filter((n) => n.parentId === id);

  if (!node) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TouchableOpacity style={[styles.backBtn, { paddingTop: topInset + 16 }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <EmptyState icon="alert-circle" title="Entry not found" subtitle="This headspace entry may have been deleted." />
      </View>
    );
  }

  const meta = TYPE_META[node.type] ?? TYPE_META.description;
  const linkedMembers = node.connectedMemberIds
    .map((mid) => data.members.find((m) => m.id === mid))
    .filter(Boolean) as typeof data.members;

  const openAdd = () => {
    setNewTitle(""); setNewContent(""); setNewImage("");
    setLinkedMemberIds([]); setNewType("place");
    setShowAddModal(true);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets[0]) setNewImage(await persistImage(result.assets[0].uri));
  };

  const addChild = () => {
    if (!newTitle.trim()) return;
    const child: HeadspaceNode = {
      id: genId(), type: newType, title: newTitle.trim(),
      content: newContent.trim() || undefined,
      imageUri: newImage || undefined,
      x: 0, y: 0,
      connectedMemberIds: linkedMemberIds,
      parentId: id,
      children: [],
    };
    const updated = [...data.headspaceNodes, child].map((n) =>
      n.id === id ? { ...n, children: [...n.children, child.id] } : n
    );
    updateHeadspaceNodes(updated);
    setShowAddModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const deleteChild = (childId: string) => {
    Alert.alert("Delete Entry", "Remove this nested entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: () => {
          updateHeadspaceNodes(
            data.headspaceNodes
              .filter((n) => n.id !== childId)
              .map((n) => ({ ...n, children: n.children.filter((c) => c !== childId) }))
          );
        },
      },
    ]);
  };

  const deleteParent = () => {
    Alert.alert("Delete Entry", `Delete "${node.title}" and all its nested entries?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: () => {
          const childIds = new Set(children.map((c) => c.id));
          updateHeadspaceNodes(
            data.headspaceNodes
              .filter((n) => n.id !== id && !childIds.has(n.id))
              .map((n) => ({ ...n, children: n.children.filter((c) => c !== id) }))
          );
          router.back();
        },
      },
    ]);
  };

  const toggleMember = (mid: string) =>
    setLinkedMemberIds((prev) => prev.includes(mid) ? prev.filter((x) => x !== mid) : [...prev, mid]);

  const renderChildCard = (child: HeadspaceNode) => {
    const cm = TYPE_META[child.type] ?? TYPE_META.description;
    const childLinked = child.connectedMemberIds
      .map((mid) => data.members.find((m) => m.id === mid))
      .filter(Boolean) as typeof data.members;

    return (
      <View key={child.id} style={[styles.childCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.childAccent, { backgroundColor: cm.color }]} />
        <View style={styles.childInner}>
          {child.imageUri && (
            <Image source={{ uri: child.imageUri }} style={styles.childImage} contentFit="cover" />
          )}
          <View style={styles.childHeader}>
            <View style={[styles.typeBadge, { backgroundColor: cm.color + "22" }]}>
              <Feather name={cm.icon as any} size={11} color={cm.color} />
              <Text style={[styles.typeLabel, { color: cm.color }]}>{cm.label}</Text>
            </View>
            <TouchableOpacity onPress={() => deleteChild(child.id)} hitSlop={8}>
              <Feather name="trash-2" size={15} color={colors.destructive} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.childTitle, { color: colors.foreground }]}>{child.title}</Text>
          {child.content ? (
            <Text style={[styles.childDesc, { color: colors.mutedForeground }]}>{child.content}</Text>
          ) : null}
          {childLinked.length > 0 && (
            <View style={styles.memberRow}>
              {childLinked.map((m) => (
                <View key={m.id} style={styles.memberChip}>
                  <MemberAvatar name={m.name} color={m.color} profileImage={m.profileImage} size={18} />
                  <Text style={[styles.memberChipName, { color: m.color }]}>{m.name}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: topInset + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.foreground }]} numberOfLines={1}>
          {node.title}
        </Text>
        <TouchableOpacity onPress={deleteParent}>
          <Feather name="trash-2" size={20} color={colors.destructive} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Parent node — full detail card */}
        <View style={[styles.parentCard, { backgroundColor: colors.card, borderColor: meta.color + "55" }]}>
          <View style={[styles.parentAccent, { backgroundColor: meta.color }]} />
          <View style={styles.parentInner}>
            {node.imageUri && (
              <Image source={{ uri: node.imageUri }} style={styles.parentImage} contentFit="cover" />
            )}
            <View style={[styles.typeBadge, { backgroundColor: meta.color + "22", alignSelf: "flex-start", marginBottom: 8 }]}>
              <Feather name={meta.icon as any} size={12} color={meta.color} />
              <Text style={[styles.typeLabel, { color: meta.color }]}>{meta.label}</Text>
            </View>
            <Text style={[styles.parentTitle, { color: colors.foreground }]}>{node.title}</Text>
            {node.content ? (
              <Text style={[styles.parentDesc, { color: colors.mutedForeground }]}>{node.content}</Text>
            ) : null}
            {linkedMembers.length > 0 && (
              <View style={[styles.memberRow, { marginTop: 10 }]}>
                {linkedMembers.map((m) => (
                  <TouchableOpacity key={m.id} style={styles.memberChip} onPress={() => router.push(`/member/${m.id}`)}>
                    <MemberAvatar name={m.name} color={m.color} profileImage={m.profileImage} size={22} />
                    <Text style={[styles.memberChipName, { color: m.color }]}>{m.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Nested entries section */}
        <View style={styles.nestedHeader}>
          <Text style={[styles.nestedTitle, { color: colors.mutedForeground }]}>
            Nested Entries {children.length > 0 ? `(${children.length})` : ""}
          </Text>
          <TouchableOpacity style={[styles.addChildBtn, { backgroundColor: colors.primary }]} onPress={openAdd}>
            <Feather name="plus" size={16} color={colors.primaryForeground} />
            <Text style={[styles.addChildBtnText, { color: colors.primaryForeground }]}>Add</Text>
          </TouchableOpacity>
        </View>

        {children.length === 0 ? (
          <View style={[styles.emptyNested, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="layers" size={22} color={colors.mutedForeground} style={{ marginBottom: 6 }} />
            <Text style={[styles.emptyNestedText, { color: colors.mutedForeground }]}>
              No nested entries yet — tap Add to create one
            </Text>
          </View>
        ) : (
          <View style={styles.childList}>
            {children.map(renderChildCard)}
          </View>
        )}
      </ScrollView>

      {/* ── Add Nested Node Modal ── */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={[styles.overlay, { backgroundColor: "#0009" }]}>
          <ScrollView style={[styles.modal, { backgroundColor: colors.card, borderColor: colors.border }]} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Nested Entry</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Type</Text>
            <View style={styles.typeRow}>
              {(Object.entries(TYPE_META) as [NodeType, typeof TYPE_META[NodeType]][]).map(([t, m]) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, { borderColor: newType === t ? m.color : colors.border, backgroundColor: newType === t ? m.color + "22" : colors.secondary }]}
                  onPress={() => setNewType(t)}
                >
                  <Feather name={m.icon as any} size={13} color={newType === t ? m.color : colors.mutedForeground} />
                  <Text style={[styles.typeBtnText, { color: newType === t ? m.color : colors.foreground }]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Title</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
              value={newTitle} onChangeText={setNewTitle}
              placeholder={newType === "text" ? "Entry title..." : "Name this entry..."}
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>
              {newType === "text" ? "Body Text" : "Description"}
            </Text>
            <TextInput
              style={[styles.textarea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }, newType === "text" && { minHeight: 140 }]}
              value={newContent} onChangeText={setNewContent}
              placeholder={newType === "text" ? "Write your text here..." : "Describe this entry..."}
              placeholderTextColor={colors.mutedForeground}
              multiline
            />

            {newType !== "text" && (
              <>
                <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Image (optional)</Text>
                <TouchableOpacity style={[styles.imagePicker, { backgroundColor: colors.secondary, borderColor: colors.border }]} onPress={pickImage}>
                  <Feather name="image" size={18} color={colors.mutedForeground} />
                  <Text style={[styles.imagePickerText, { color: colors.mutedForeground }]}>{newImage ? "Image selected ✓" : "Pick image"}</Text>
                </TouchableOpacity>
              </>
            )}

            <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Link Members</Text>
            <View style={styles.memberGrid}>
              {data.members.filter((m) => !m.isArchived).map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.memberChipBtn, { borderColor: linkedMemberIds.includes(m.id) ? m.color : colors.border, backgroundColor: linkedMemberIds.includes(m.id) ? m.color + "22" : colors.secondary }]}
                  onPress={() => toggleMember(m.id)}
                >
                  <MemberAvatar name={m.name} color={m.color} size={22} profileImage={m.profileImage} />
                  <Text style={[styles.memberChipBtnName, { color: linkedMemberIds.includes(m.id) ? m.color : colors.foreground }]}>{m.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: newTitle.trim() ? colors.primary : colors.muted }]}
              onPress={addChild} disabled={!newTitle.trim()}
            >
              <Text style={[styles.saveBtnText, { color: newTitle.trim() ? colors.primaryForeground : colors.mutedForeground }]}>Add Nested Entry</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { padding: 16 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  screenTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center", marginHorizontal: 8 },

  parentCard: { borderRadius: 14, borderWidth: 1.5, overflow: "hidden", flexDirection: "row", marginBottom: 20 },
  parentAccent: { width: 6 },
  parentInner: { flex: 1, padding: 14 },
  parentImage: { width: "100%", height: 160, borderRadius: 8, marginBottom: 10 },
  parentTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 6 },
  parentDesc: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },

  nestedHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  nestedTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8 },
  addChildBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  addChildBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  emptyNested: { borderRadius: 12, borderWidth: 1, padding: 24, alignItems: "center" },
  emptyNestedText: { fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic", textAlign: "center" },

  childList: { gap: 10 },
  childCard: { borderRadius: 12, borderWidth: 1, overflow: "hidden", flexDirection: "row" },
  childAccent: { width: 4 },
  childInner: { flex: 1, padding: 12 },
  childImage: { width: "100%", height: 100, borderRadius: 6, marginBottom: 8 },
  childHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  childTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 3 },
  childDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },

  typeBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  typeLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  memberRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  memberChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  memberChipName: { fontSize: 12, fontFamily: "Inter_500Medium" },

  overlay: { flex: 1, justifyContent: "flex-end" },
  modal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modalLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, marginTop: 12 },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  typeBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, fontFamily: "Inter_400Regular" },
  textarea: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 80 },
  imagePicker: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 10, padding: 12, borderStyle: "dashed" },
  imagePickerText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  memberGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  memberChipBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5 },
  memberChipBtnName: { fontSize: 12, fontFamily: "Inter_500Medium" },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 20, marginBottom: 20 },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
