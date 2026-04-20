import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
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

import { ConfirmSheet } from "@/components/ConfirmSheet";
import { SectionLockGate } from "@/components/SectionLockGate";
import { useStorage, EmergencyContact } from "@/context/StorageContext";
import { useColors } from "@/hooks/useColors";
import { genId } from "@/utils/helpers";

type ContactForm = { name: string; relationship: string; phone: string; notes: string };
const EMPTY_FORM: ContactForm = { name: "", relationship: "", phone: "", notes: "" };

export default function EmergencyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, updateEmergencyInfo } = useStorage();
  const info = data.emergencyInfo ?? { content: "", contacts: [] };

  const [editingContact, setEditingContact] = useState<{ id: string | null; form: ContactForm } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const saveNotes = (text: string) => {
    updateEmergencyInfo({ ...info, content: text });
  };

  const openAdd = () => {
    setEditingContact({ id: null, form: { ...EMPTY_FORM } });
  };

  const openEdit = (c: EmergencyContact) => {
    setEditingContact({ id: c.id, form: { name: c.name, relationship: c.relationship, phone: c.phone ?? "", notes: c.notes ?? "" } });
  };

  const saveContact = () => {
    if (!editingContact) return;
    const { id, form } = editingContact;
    if (!form.name.trim()) return;
    const contacts = id
      ? info.contacts.map((c) =>
          c.id === id ? { ...c, name: form.name.trim(), relationship: form.relationship.trim(), phone: form.phone.trim() || undefined, notes: form.notes.trim() || undefined } : c,
        )
      : [...info.contacts, { id: genId(), name: form.name.trim(), relationship: form.relationship.trim(), phone: form.phone.trim() || undefined, notes: form.notes.trim() || undefined }];
    updateEmergencyInfo({ ...info, contacts });
    setEditingContact(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    updateEmergencyInfo({ ...info, contacts: info.contacts.filter((c) => c.id !== deleteId) });
    setDeleteId(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <SectionLockGate sectionKey="emergency">
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ConfirmSheet
        visible={!!deleteId}
        title="Remove Contact"
        message="Remove this emergency contact?"
        confirmLabel="Remove"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />

      {editingContact && (
        <Modal visible animationType="slide" transparent onRequestClose={() => setEditingContact(null)}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  {editingContact.id ? "Edit Contact" : "Add Contact"}
                </Text>
                <TouchableOpacity onPress={() => setEditingContact(null)}>
                  <Feather name="x" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 10 }}>
                <View>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Name *</Text>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
                    value={editingContact.form.name}
                    onChangeText={(v) => setEditingContact((e) => e ? { ...e, form: { ...e.form, name: v } } : e)}
                    placeholder="e.g. Jane Smith"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>
                <View>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Relationship</Text>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
                    value={editingContact.form.relationship}
                    onChangeText={(v) => setEditingContact((e) => e ? { ...e, form: { ...e.form, relationship: v } } : e)}
                    placeholder="e.g. Therapist, Friend, Doctor"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>
                <View>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Phone (optional)</Text>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
                    value={editingContact.form.phone}
                    onChangeText={(v) => setEditingContact((e) => e ? { ...e, form: { ...e.form, phone: v } } : e)}
                    placeholder="e.g. +1 555 000 0000"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="phone-pad"
                  />
                </View>
                <View>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Notes (optional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
                    value={editingContact.form.notes}
                    onChangeText={(v) => setEditingContact((e) => e ? { ...e, form: { ...e.form, notes: v } } : e)}
                    placeholder="Any relevant notes…"
                    placeholderTextColor={colors.mutedForeground}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: editingContact.form.name.trim() ? colors.primary : colors.muted }]}
                  onPress={saveContact}
                  disabled={!editingContact.form.name.trim()}
                >
                  <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Save Contact</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      <ScrollView
        contentContainerStyle={{ paddingTop: topInset + 8, paddingBottom: 60, paddingHorizontal: 16 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Emergency Info</Text>
          <View style={{ width: 22 }} />
        </View>

        <View style={[styles.disclaimerCard, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "44" }]}>
          <Feather name="info" size={16} color={colors.primary} style={{ marginTop: 1 }} />
          <Text style={[styles.disclaimerText, { color: colors.mutedForeground }]}>
            You are not obligated to include any sensitive details such as addresses, phone numbers, or real names. Add only what feels safe and useful to you.
          </Text>
        </View>

        <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>General Notes</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.notesInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
            value={info.content}
            onChangeText={saveNotes}
            placeholder={"Notes about care needs, triggers, grounding techniques, diagnoses, medications, or anything else that could help in an emergency…"}
            placeholderTextColor={colors.mutedForeground}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.sectionRow}>
          <Text style={[styles.groupLabel, { color: colors.mutedForeground, marginBottom: 0 }]}>Contacts</Text>
          <TouchableOpacity
            style={[styles.addContactBtn, { backgroundColor: colors.primary }]}
            onPress={openAdd}
          >
            <Feather name="plus" size={14} color={colors.primaryForeground} />
            <Text style={[styles.addContactText, { color: colors.primaryForeground }]}>Add</Text>
          </TouchableOpacity>
        </View>

        {info.contacts.length === 0 ? (
          <View style={[styles.emptyContacts, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="users" size={24} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No contacts yet</Text>
          </View>
        ) : (
          <View style={styles.contactList}>
            {info.contacts.map((c) => (
              <View key={c.id} style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.contactMain}>
                  <View style={[styles.contactIcon, { backgroundColor: colors.primary + "22" }]}>
                    <Feather name="user" size={16} color={colors.primary} />
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={[styles.contactName, { color: colors.foreground }]}>{c.name}</Text>
                    {c.relationship ? (
                      <Text style={[styles.contactRel, { color: colors.mutedForeground }]}>{c.relationship}</Text>
                    ) : null}
                    {c.phone ? (
                      <Text style={[styles.contactPhone, { color: colors.mutedForeground }]}>{c.phone}</Text>
                    ) : null}
                    {c.notes ? (
                      <Text style={[styles.contactNotes, { color: colors.mutedForeground }]} numberOfLines={2}>{c.notes}</Text>
                    ) : null}
                  </View>
                  <View style={styles.contactActions}>
                    <TouchableOpacity onPress={() => openEdit(c)} hitSlop={8}>
                      <Feather name="edit-2" size={16} color={colors.mutedForeground} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setDeleteId(c.id)} hitSlop={8}>
                      <Feather name="trash-2" size={16} color={colors.destructive ?? "#ef4444"} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
    </SectionLockGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  disclaimerCard: {
    flexDirection: "row",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
    alignItems: "flex-start",
  },
  disclaimerText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  groupLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
    marginTop: 4,
  },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, marginBottom: 8 },
  addContactBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  addContactText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12 },
  notesInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 120,
    lineHeight: 20,
  },
  emptyContacts: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  contactList: { gap: 8, marginBottom: 12 },
  contactCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  contactMain: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  contactIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  contactInfo: { flex: 1, gap: 2 },
  contactName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  contactRel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  contactPhone: { fontSize: 13, fontFamily: "Inter_400Regular" },
  contactNotes: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 17 },
  contactActions: { flexDirection: "row", gap: 12, alignItems: "center", paddingTop: 4 },
  modalBackdrop: { flex: 1, backgroundColor: "#00000066", justifyContent: "flex-end" },
  modalPanel: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, maxHeight: "85%", gap: 12 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, fontFamily: "Inter_400Regular" },
  textArea: { minHeight: 80, textAlignVertical: "top", paddingTop: 10 },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
