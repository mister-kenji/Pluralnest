import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
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
import { HeadspaceBoard } from "@/components/HeadspaceBoard";
import { useStorage, HeadspaceNode } from "@/context/StorageContext";
import { useColors } from "@/hooks/useColors";
import { genId } from "@/utils/helpers";
import { persistImage } from "@/utils/persistImage";

type NodeType = HeadspaceNode["type"];

export const TYPE_META: Record<NodeType, { icon: string; color: string; label: string }> = {
  place:       { icon: "map-pin",    color: "#a89de8", label: "Place" },
  image:       { icon: "image",      color: "#a0d9e8", label: "Image" },
  description: { icon: "file-text",  color: "#a0e8b2", label: "Description" },
  text:        { icon: "align-left", color: "#ffd166", label: "Text" },
};

type View = "list" | "board";

export default function HeadspaceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, updateHeadspaceNodes } = useStorage();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState<NodeType>("place");
  const [newImage, setNewImage] = useState("");
  const [linkedMemberIds, setLinkedMemberIds] = useState<string[]>([]);
  const [view, setView] = useState<View>("list");

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const rootNodes = data.headspaceNodes.filter((n) => !n.parentId);

  const openAdd = () => {
    setNewTitle(""); setNewContent(""); setNewImage("");
    setLinkedMemberIds([]); setNewType("place");
    setShowAddModal(true);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets[0]) setNewImage(await persistImage(result.assets[0].uri));
  };

  const addNode = () => {
    if (!newTitle.trim()) return;
    const node: HeadspaceNode = {
      id: genId(), type: newType, title: newTitle.trim(),
      content: newContent.trim() || undefined,
      imageUri: newImage || undefined,
      x: 0, y: 0,
      connectedMemberIds: linkedMemberIds,
      children: [],
    };
    updateHeadspaceNodes([...data.headspaceNodes, node]);
    setShowAddModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const toggleMember = (id: string) =>
    setLinkedMemberIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const renderCard = ({ item: node }: { item: HeadspaceNode }) => {
    const meta = TYPE_META[node.type] ?? TYPE_META.description;
    const childCount = data.headspaceNodes.filter((n) => n.parentId === node.id).length;
    const linkedMembers = node.connectedMemberIds
      .map((id) => data.members.find((m) => m.id === id))
      .filter(Boolean) as typeof data.members;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/headspace/${node.id}`);
        }}
        activeOpacity={0.8}
      >
        {/* Accent strip */}
        <View style={[styles.accentStrip, { backgroundColor: meta.color }]} />

        <View style={styles.cardInner}>
          {/* Image banner */}
          {node.imageUri && (
            <Image source={{ uri: node.imageUri }} style={styles.cardImage} contentFit="cover" />
          )}

          {/* Header: type badge + child count + chevron */}
          <View style={styles.cardHeader}>
            <View style={[styles.typeBadge, { backgroundColor: meta.color + "22" }]}>
              <Feather name={meta.icon as any} size={12} color={meta.color} />
              <Text style={[styles.typeLabel, { color: meta.color }]}>{meta.label}</Text>
            </View>
            <View style={styles.cardHeaderRight}>
              {childCount > 0 && (
                <View style={[styles.childBadge, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                  <Feather name="layers" size={10} color={colors.mutedForeground} />
                  <Text style={[styles.childCount, { color: colors.mutedForeground }]}>{childCount}</Text>
                </View>
              )}
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </View>
          </View>

          {/* Title */}
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{node.title}</Text>

          {/* Content preview */}
          {node.content ? (
            <Text style={[styles.cardDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
              {node.content}
            </Text>
          ) : null}

          {/* Linked members */}
          {linkedMembers.length > 0 && (
            <View style={styles.memberRow}>
              {linkedMembers.map((m) => (
                <View key={m.id} style={styles.memberChip}>
                  <MemberAvatar name={m.name} color={m.color} profileImage={m.profileImage} size={20} />
                  <Text style={[styles.memberChipName, { color: m.color }]}>{m.name}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topInset + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Headspace</Text>
        <View style={styles.topBarRight}>
          {/* List / Board toggle */}
          <View style={[styles.viewToggle, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.viewToggleBtn, view === "list" && { backgroundColor: colors.card }]}
              onPress={() => { setView("list"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <Feather name="list" size={15} color={view === "list" ? colors.foreground : colors.mutedForeground} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggleBtn, view === "board" && { backgroundColor: colors.card }]}
              onPress={() => { setView("board"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <Feather name="share-2" size={15} color={view === "board" ? colors.foreground : colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          {view === "list" && (
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={openAdd}>
              <Feather name="plus" size={20} color={colors.primaryForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {view === "board" ? (
        <HeadspaceBoard />
      ) : (
      <FlatList
        data={rootNodes}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          <EmptyState
            icon="map"
            title="Your headspace is empty"
            subtitle="Document places, images, descriptions, and text entries in your inner world"
            action={{ label: "Add Entry", onPress: openAdd }}
          />
        }
        renderItem={renderCard}
      />
      )}

      {/* ── Add Root Node Modal (list view only) ── */}
      {view === "list" && showAddModal && <Modal visible transparent animationType="slide">
        <View style={[styles.overlay, { backgroundColor: "#0009" }]}>
          <ScrollView style={[styles.modal, { backgroundColor: colors.card, borderColor: colors.border }]} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Headspace Entry</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Type</Text>
            <View style={styles.typeRow}>
              {(Object.entries(TYPE_META) as [NodeType, typeof TYPE_META[NodeType]][]).map(([t, meta]) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, { borderColor: newType === t ? meta.color : colors.border, backgroundColor: newType === t ? meta.color + "22" : colors.secondary }]}
                  onPress={() => setNewType(t)}
                >
                  <Feather name={meta.icon as any} size={13} color={newType === t ? meta.color : colors.mutedForeground} />
                  <Text style={[styles.typeBtnText, { color: newType === t ? meta.color : colors.foreground }]}>{meta.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Title</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
              value={newTitle} onChangeText={setNewTitle}
              placeholder={newType === "text" ? "Entry title..." : "Name this place or entry..."}
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>
              {newType === "text" ? "Body Text" : "Description"}
            </Text>
            <TextInput
              style={[styles.textarea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }, newType === "text" && { minHeight: 140 }]}
              value={newContent} onChangeText={setNewContent}
              placeholder={newType === "text" ? "Write your text here..." : "Describe this place or scene..."}
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
              onPress={addNode} disabled={!newTitle.trim()}
            >
              <Text style={[styles.saveBtnText, { color: newTitle.trim() ? colors.primaryForeground : colors.mutedForeground }]}>Add Entry</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  screenTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  topBarRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  viewToggle: { flexDirection: "row", borderRadius: 10, borderWidth: 1, overflow: "hidden" },
  viewToggleBtn: { paddingHorizontal: 10, paddingVertical: 6, alignItems: "center", justifyContent: "center" },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },

  card: { borderRadius: 14, borderWidth: 1, flexDirection: "row" },
  accentStrip: { width: 5 },
  cardInner: { flex: 1, padding: 14 },
  cardImage: { width: "100%", height: 130, borderRadius: 8, marginBottom: 10 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  cardHeaderRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  typeBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  typeLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  childBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  childCount: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  cardTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 4 },
  cardDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, marginBottom: 8 },
  memberRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
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
