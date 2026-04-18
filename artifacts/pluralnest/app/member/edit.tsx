import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MemberAvatar } from "@/components/MemberAvatar";
import { TagChip } from "@/components/TagChip";
import { useStorage, Member, Relationship, AvatarShape } from "@/context/StorageContext";
import { useColors } from "@/hooks/useColors";
import { genId } from "@/utils/helpers";

type FieldValues = Record<string, string>;

const ALL_COLORS = [
  // Reds / pinks
  "#ff6b6b","#ff8787","#ffa0a0","#ffb3ba","#ff85a1","#e05c8a","#c94b8a","#b5179e",
  // Oranges
  "#ff9a3c","#ffb347","#ffc87a","#ffaa64","#ff7043","#f4511e",
  // Yellows
  "#ffd166","#ffe08a","#fff0a0","#f7c948","#e6b800",
  // Greens
  "#a0e8b2","#6fcf97","#43b97f","#27ae60","#b8f2c0","#c8f7a0","#a3d977","#52b788",
  // Teals / Cyans
  "#a0e8d4","#72efdd","#4ecdc4","#26c6da","#00bcd4","#80deea","#a0d9e8","#64b5f6",
  // Blues
  "#74b9ff","#4dabf7","#339af0","#228be6","#1971c2","#a8c7fa","#aecbfa",
  // Purples / Violets
  "#c0a0e8","#a89de8","#b39ddb","#9575cd","#7e57c2","#d4a5f5","#e0c3fc","#f3d9fa",
  // Pinks / Lavender
  "#e8a0bf","#f48fb1","#f06292","#e91e8c","#f8bbd9","#fce4ec",
  // Warm neutrals
  "#e8c0a0","#e8d0a0","#d4a574","#c19a6b","#bc8a5f",
  // Greys / Whites
  "#ffffff","#dddddd","#bbbbbb","#999999","#777777","#555555",
];

function isDark(hex: string): boolean {
  const c = hex.replace("#", "");
  if (c.length < 6) return true;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

export default function EditMemberScreen() {
  const { id, isNew } = useLocalSearchParams<{ id: string; isNew?: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, updateMembers, softDelete } = useStorage();

  const existingMember = useMemo(
    () => data.members.find((m) => m.id === id),
    [data.members, id],
  );

  const [name, setName] = useState(existingMember?.name ?? "");
  const [pronouns, setPronouns] = useState(existingMember?.pronouns ?? "");
  const [role, setRole] = useState(existingMember?.role ?? "");
  const [color, setColor] = useState(existingMember?.color ?? MEMBER_COLORS[0]);
  const [description, setDescription] = useState(existingMember?.description ?? "");
  const [profileImage, setProfileImage] = useState(existingMember?.profileImage ?? "");
  const [tags, setTags] = useState<string[]>(existingMember?.tags ?? []);
  const [newTag, setNewTag] = useState("");
  const globalFields = data.settings.customGlobalFields ?? [];
  const [fieldValues, setFieldValues] = useState<FieldValues>(() => {
    const existing = existingMember?.customFields ?? [];
    const map: FieldValues = {};
    for (const fv of existing) {
      if (fv.fieldId) map[fv.fieldId] = fv.value;
    }
    return map;
  });
  const [relationships, setRelationships] = useState<Relationship[]>(
    existingMember?.relationships ?? [],
  );
  const [isArchived, setIsArchived] = useState(existingMember?.isArchived ?? false);
  const [avatarShape, setAvatarShape] = useState<AvatarShape>(existingMember?.avatarShape ?? "circle");
  const [showRelPicker, setShowRelPicker] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const addTag = () => {
    const t = newTag.trim();
    if (t && !tags.includes(t)) {
      setTags((prev) => [...prev, t]);
      setNewTag("");
    }
  };

  const setFieldValue = (fieldId: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const addRelationship = (memberId: string) => {
    if (!relationships.find((r) => r.memberId === memberId)) {
      setRelationships((prev) => [...prev, { memberId, type: "related" }]);
    }
    setShowRelPicker(false);
  };

  const updateRelType = (memberId: string, type: string) => {
    setRelationships((prev) =>
      prev.map((r) => (r.memberId === memberId ? { ...r, type } : r)),
    );
  };

  const removeRelationship = (memberId: string) => {
    setRelationships((prev) => prev.filter((r) => r.memberId !== memberId));
  };

  const save = () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Please enter a name for this member.");
      return;
    }
    const updated: Member = {
      id: existingMember?.id ?? genId(),
      name: name.trim(),
      pronouns: pronouns.trim(),
      role: role.trim(),
      color,
      avatarShape,
      profileImage: profileImage || undefined,
      description: description.trim(),
      customFields: globalFields
        .map((f) => ({ fieldId: f.id, value: fieldValues[f.id] ?? "" }))
        .filter((fv) => fv.value.trim() !== ""),
      relationships,
      tags,
      isArchived,
      createdAt: existingMember?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };
    if (existingMember) {
      updateMembers(data.members.map((m) => (m.id === updated.id ? updated : m)));
    } else {
      updateMembers([...data.members, updated]);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const deleteMember = () => {
    Alert.alert(
      "Delete Member",
      `Move ${name} to recently deleted? This can be undone within 30 days.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            if (existingMember) {
              softDelete(existingMember.id, "member", existingMember);
              updateMembers(data.members.filter((m) => m.id !== existingMember.id));
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
          },
        },
      ],
    );
  };

  const otherMembers = data.members.filter(
    (m) => m.id !== id && !relationships.find((r) => r.memberId === m.id),
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: topInset + 8,
        paddingBottom: 60,
        paddingHorizontal: 16,
      }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.secondary }]}>
          <Feather name="x" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>
          {isNew === "true" ? "New Member" : "Edit Member"}
        </Text>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={save}
        >
          <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.avatarPicker} onPress={pickImage}>
        <MemberAvatar name={name || "?"} color={color} profileImage={profileImage} size={80} shape={avatarShape} />
        <View style={[styles.avatarOverlay, { backgroundColor: colors.card + "bb" }]}>
          <Feather name="camera" size={18} color={colors.foreground} />
        </View>
      </TouchableOpacity>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Name *</Text>
        <TextInput
          style={[styles.input, { color: colors.foreground, borderBottomColor: colors.border }]}
          value={name}
          onChangeText={setName}
          placeholder="Member name"
          placeholderTextColor={colors.mutedForeground}
        />
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 14 }]}>
          Pronouns
        </Text>
        <TextInput
          style={[styles.input, { color: colors.foreground, borderBottomColor: colors.border }]}
          value={pronouns}
          onChangeText={setPronouns}
          placeholder="e.g. they/them"
          placeholderTextColor={colors.mutedForeground}
        />
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 14 }]}>
          Role
        </Text>
        <TextInput
          style={[styles.input, { color: colors.foreground, borderBottomColor: colors.border }]}
          value={role}
          onChangeText={setRole}
          placeholder="e.g. protector, host"
          placeholderTextColor={colors.mutedForeground}
        />
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 14 }]}>
          Description
        </Text>
        <TextInput
          style={[styles.textarea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
          value={description}
          onChangeText={setDescription}
          placeholder="About this member..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          numberOfLines={4}
        />
      </View>

      <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>Profile Color</Text>
      <View style={[styles.colorSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.colorGrid}>
          {ALL_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.colorDot,
                { backgroundColor: c },
                color === c && styles.colorDotSelected,
              ]}
              onPress={() => setColor(c)}
            >
              {color === c && <Feather name="check" size={12} color={isDark(c) ? "#fff" : "#111"} />}
            </TouchableOpacity>
          ))}
        </View>
        <View style={[styles.hexRow, { borderTopColor: colors.border }]}>
          <View style={[styles.hexPreview, { backgroundColor: color, borderColor: colors.border }]} />
          <TextInput
            style={[styles.hexInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
            value={color}
            onChangeText={(v) => {
              const val = v.startsWith("#") ? v : "#" + v;
              if (/^#[0-9a-fA-F]{0,6}$/.test(val)) setColor(val);
            }}
            placeholder="#aabbcc"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            maxLength={7}
          />
          <Text style={[styles.hexLabel, { color: colors.mutedForeground }]}>Custom hex</Text>
        </View>
      </View>

      <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>Avatar Shape</Text>
      <View style={[styles.shapeRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {(["circle", "square", "diamond", "heart"] as AvatarShape[]).map((s) => {
          const labels: Record<AvatarShape, string> = {
            circle: "Circle", square: "Square", diamond: "Diamond", heart: "Heart",
          };
          const selected = avatarShape === s;
          return (
            <TouchableOpacity
              key={s}
              style={[
                styles.shapeOption,
                {
                  borderColor: selected ? color : colors.border,
                  backgroundColor: selected ? color + "22" : colors.secondary,
                },
              ]}
              onPress={() => setAvatarShape(s)}
            >
              <MemberAvatar
                name={name || "?"}
                color={color}
                profileImage={profileImage}
                size={44}
                shape={s}
              />
              <Text style={[styles.shapeLabel, { color: selected ? color : colors.mutedForeground }]}>
                {labels[s]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>Tags</Text>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.tagWrap}>
          {tags.map((t) => (
            <TagChip key={t} label={t} color={color} onRemove={() => setTags((prev) => prev.filter((x) => x !== t))} />
          ))}
        </View>
        <View style={styles.tagInputRow}>
          <TextInput
            style={[styles.tagInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
            value={newTag}
            onChangeText={setNewTag}
            placeholder="Add tag..."
            placeholderTextColor={colors.mutedForeground}
            onSubmitEditing={addTag}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[styles.addTagBtn, { backgroundColor: color }]}
            onPress={addTag}
          >
            <Feather name="plus" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>Custom Fields</Text>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {globalFields.length === 0 ? (
          <TouchableOpacity
            style={styles.noFieldsRow}
            onPress={() => router.push("/settings/custom-fields")}
          >
            <Feather name="sliders" size={15} color={colors.mutedForeground} />
            <Text style={[styles.noFieldsText, { color: colors.mutedForeground }]}>
              No custom fields defined — tap to set them up in Settings
            </Text>
          </TouchableOpacity>
        ) : (
          globalFields.map((gf, idx) => (
            <View
              key={gf.id}
              style={[
                styles.fieldRow,
                idx < globalFields.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
              <Text style={[styles.fieldLabelText, { color: colors.mutedForeground }]}>{gf.label}</Text>
              <TextInput
                style={[styles.fieldValueInput, { color: colors.foreground, borderColor: colors.border }]}
                value={fieldValues[gf.id] ?? ""}
                onChangeText={(v) => setFieldValue(gf.id, v)}
                placeholder="Enter value..."
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
          ))
        )}
      </View>

      <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>Relationships</Text>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {relationships.map((rel) => {
          const m = data.members.find((x) => x.id === rel.memberId);
          return m ? (
            <View key={rel.memberId} style={[styles.relRow, { borderBottomColor: colors.border }]}>
              <MemberAvatar name={m.name} color={m.color} profileImage={m.profileImage} size={28} />
              <Text style={[styles.relName, { color: colors.foreground }]}>{m.name}</Text>
              <TextInput
                style={[styles.relTypeInput, { color: colors.foreground, borderColor: colors.border }]}
                value={rel.type}
                onChangeText={(v) => updateRelType(rel.memberId, v)}
                placeholder="relationship type"
                placeholderTextColor={colors.mutedForeground}
              />
              <TouchableOpacity onPress={() => removeRelationship(rel.memberId)} hitSlop={8}>
                <Feather name="x" size={16} color={colors.destructive} />
              </TouchableOpacity>
            </View>
          ) : null;
        })}
        <TouchableOpacity
          style={[styles.addFieldBtn, { borderColor: colors.border }]}
          onPress={() => setShowRelPicker((v) => !v)}
        >
          <Feather name="plus" size={16} color={colors.primary} />
          <Text style={[styles.addFieldText, { color: colors.primary }]}>Link member</Text>
        </TouchableOpacity>
        {showRelPicker &&
          otherMembers.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[styles.pickerRow, { borderTopColor: colors.border }]}
              onPress={() => addRelationship(m.id)}
            >
              <MemberAvatar name={m.name} color={m.color} profileImage={m.profileImage} size={28} />
              <Text style={[styles.pickerName, { color: colors.foreground }]}>{m.name}</Text>
            </TouchableOpacity>
          ))}
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, { color: colors.foreground }]}>Archived</Text>
          <Switch
            value={isArchived}
            onValueChange={setIsArchived}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
      </View>

      {existingMember && (
        <TouchableOpacity
          style={[styles.deleteBtn, { borderColor: colors.destructive }]}
          onPress={deleteMember}
        >
          <Feather name="trash-2" size={16} color={colors.destructive} />
          <Text style={[styles.deleteBtnText, { color: colors.destructive }]}>Delete Member</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  pageTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  avatarPicker: {
    alignSelf: "center",
    marginBottom: 24,
    position: "relative",
  },
  avatarOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  input: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  textarea: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    minHeight: 80,
    marginTop: 4,
  },
  groupLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
    marginTop: 4,
  },
  colorSection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  colorDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  colorDotSelected: {
    borderWidth: 2.5,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 4,
  },
  hexRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  hexPreview: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
  },
  hexInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    width: 110,
  },
  hexLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  shapeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  shapeOption: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  shapeLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  tagWrap: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  tagInputRow: { flexDirection: "row", gap: 8 },
  tagInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addTagBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  noFieldsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  noFieldsText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    flex: 1,
  },
  fieldRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  fieldLabelText: {
    width: 100,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  fieldValueInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  addFieldBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  addFieldText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  relRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
  },
  relName: { fontSize: 14, fontFamily: "Inter_500Medium", width: 80 },
  relTypeInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  pickerName: { fontSize: 14, fontFamily: "Inter_400Regular" },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  deleteBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
