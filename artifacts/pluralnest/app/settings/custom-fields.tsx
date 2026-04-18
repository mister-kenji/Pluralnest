import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
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

import { useStorage, GlobalField } from "@/context/StorageContext";
import { useColors } from "@/hooks/useColors";
import { genId } from "@/utils/helpers";

export default function CustomFieldsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, updateSettings } = useStorage();
  const [newLabel, setNewLabel] = useState("");

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const fields = data.settings.customGlobalFields ?? [];

  const save = (updated: GlobalField[]) => {
    updateSettings({ ...data.settings, customGlobalFields: updated });
  };

  const addField = () => {
    const label = newLabel.trim();
    if (!label) return;
    const field: GlobalField = { id: genId(), label, showByDefault: true };
    save([...fields, field]);
    setNewLabel("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const updateLabel = (id: string, label: string) => {
    save(fields.map((f) => (f.id === id ? { ...f, label } : f)));
  };

  const toggleDefault = (id: string) => {
    save(fields.map((f) => (f.id === id ? { ...f, showByDefault: !f.showByDefault } : f)));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const removeField = (id: string) => {
    save(fields.filter((f) => f.id !== id));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

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
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Custom Fields</Text>
        <View style={{ width: 22 }} />
      </View>

      <Text style={[styles.description, { color: colors.mutedForeground }]}>
        Define fields that appear on every member's profile. Each member fills in their own value.
      </Text>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {fields.length === 0 ? (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>
            No custom fields yet. Add one below.
          </Text>
        ) : (
          fields.map((field, idx) => (
            <View
              key={field.id}
              style={[
                styles.fieldRow,
                idx < fields.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
              <Feather name="menu" size={16} color={colors.mutedForeground} style={styles.drag} />
              <TextInput
                style={[styles.labelInput, { color: colors.foreground, borderColor: colors.border }]}
                value={field.label}
                onChangeText={(v) => updateLabel(field.id, v)}
                placeholder="Field name"
                placeholderTextColor={colors.mutedForeground}
              />
              <View style={styles.rowRight}>
                <View style={styles.defaultToggle}>
                  <Text style={[styles.defaultLabel, { color: colors.mutedForeground }]}>Show</Text>
                  <Switch
                    value={field.showByDefault}
                    onValueChange={() => toggleDefault(field.id)}
                    trackColor={{ false: colors.secondary, true: colors.primary + "88" }}
                    thumbColor={field.showByDefault ? colors.primary : colors.mutedForeground}
                  />
                </View>
                <TouchableOpacity onPress={() => removeField(field.id)} hitSlop={8}>
                  <Feather name="trash-2" size={16} color={colors.destructive} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={[styles.addRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="plus" size={16} color={colors.primary} />
        <TextInput
          style={[styles.addInput, { color: colors.foreground }]}
          value={newLabel}
          onChangeText={setNewLabel}
          placeholder="New field name..."
          placeholderTextColor={colors.mutedForeground}
          onSubmitEditing={addField}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary, opacity: newLabel.trim() ? 1 : 0.4 }]}
          onPress={addField}
          disabled={!newLabel.trim()}
        >
          <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>Add</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        "Show" means the field is visible on member profiles by default. Members can still fill in values for hidden fields.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  description: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    marginBottom: 16,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  empty: {
    padding: 16,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  drag: { opacity: 0.5 },
  labelInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    borderBottomWidth: 1,
    paddingVertical: 4,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  defaultToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  defaultLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  addInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  hint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
    paddingHorizontal: 4,
  },
});
