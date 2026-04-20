import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

import { useColors } from "@/hooks/useColors";

const QUICK_EMOJIS = [
  "❤️","😂","😮","😢","😡","👍","👎","🎉",
  "🔥","✨","💯","🙏","👀","💀","🥲","😅",
  "🫶","💜","🌟","🤔","💕","😭","🫂","✅",
];

type Reaction = { emoji: string; memberIds: string[] };

type Props = {
  reactions: Reaction[];
  currentMemberId: string;
  onToggle: (emoji: string) => void;
  style?: ViewStyle;
};

export function ReactionBar({ reactions, currentMemberId, onToggle, style }: Props) {
  const colors = useColors();
  const [pickerOpen, setPickerOpen] = useState(false);

  const visible = reactions.filter((r) => r.memberIds.length > 0);

  const handlePick = (emoji: string) => {
    setPickerOpen(false);
    onToggle(emoji);
  };

  return (
    <View style={[styles.row, style]}>
      {visible.map((r) => {
        const mine = r.memberIds.includes(currentMemberId);
        return (
          <TouchableOpacity
            key={r.emoji}
            onPress={() => onToggle(r.emoji)}
            style={[
              styles.pill,
              {
                backgroundColor: mine ? colors.primary + "22" : colors.secondary,
                borderColor: mine ? colors.primary : colors.border,
              },
            ]}
            hitSlop={4}
          >
            <Text style={styles.pillEmoji}>{r.emoji}</Text>
            <Text style={[styles.pillCount, { color: mine ? colors.primary : colors.mutedForeground }]}>
              {r.memberIds.length}
            </Text>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        onPress={() => setPickerOpen(true)}
        style={[styles.addBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
        hitSlop={4}
      >
        <Text style={[styles.addText, { color: colors.mutedForeground }]}>+</Text>
      </TouchableOpacity>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          onPress={() => setPickerOpen(false)}
          activeOpacity={1}
        >
          <View
            style={[
              styles.pickerPanel,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.pickerLabel, { color: colors.mutedForeground }]}>
              Add reaction
            </Text>
            <ScrollView contentContainerStyle={styles.emojiGrid}>
              {QUICK_EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => handlePick(emoji)}
                  style={styles.emojiCell}
                >
                  <Text style={styles.emojiGlyph}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

/** Helper used by screens to toggle a single reaction entry. */
export function toggleReaction(
  reactions: Reaction[],
  emoji: string,
  memberId: string,
): Reaction[] {
  const existing = reactions.find((r) => r.emoji === emoji);
  if (existing) {
    const alreadyIn = existing.memberIds.includes(memberId);
    const updated = reactions.map((r) =>
      r.emoji === emoji
        ? { ...r, memberIds: alreadyIn ? r.memberIds.filter((id) => id !== memberId) : [...r.memberIds, memberId] }
        : r,
    );
    return updated.filter((r) => r.memberIds.length > 0);
  }
  return [...reactions, { emoji, memberIds: [memberId] }];
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 5,
    alignItems: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillEmoji: { fontSize: 13 },
  pillCount: { fontSize: 11, fontFamily: "Inter_500Medium" },
  addBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  addText: { fontSize: 14, lineHeight: 16, fontFamily: "Inter_500Medium" },
  backdrop: {
    flex: 1,
    backgroundColor: "#00000066",
    alignItems: "center",
    justifyContent: "center",
  },
  pickerPanel: {
    width: 280,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  pickerLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  emojiCell: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  emojiGlyph: { fontSize: 24 },
});
