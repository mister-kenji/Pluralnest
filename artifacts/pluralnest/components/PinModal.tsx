import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

type Props = {
  visible: boolean;
  onSuccess: () => void;
  onCancel?: () => void;
  title?: string;
  code: string;
};

export function PinModal({ visible, onSuccess, onCancel, title = "Enter PIN", code }: Props) {
  const colors = useColors();
  const [input, setInput] = useState("");
  const [shake, setShake] = useState(false);

  const handleDigit = (d: string) => {
    const next = input + d;
    setInput(next);
    Haptics.selectionAsync();
    if (next.length === 4) {
      if (next === code) {
        setInput("");
        onSuccess();
      } else {
        setShake(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setTimeout(() => {
          setInput("");
          setShake(false);
        }, 400);
      }
    }
  };

  const handleDelete = () => {
    setInput((prev) => prev.slice(0, -1));
    Haptics.selectionAsync();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.overlay, { backgroundColor: colors.background + "ee" }]}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="lock" size={32} color={colors.primary} style={styles.icon} />
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>

          <View style={[styles.dots, shake && styles.shake]}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: i < input.length ? colors.primary : colors.muted,
                    borderColor: colors.border,
                  },
                ]}
              />
            ))}
          </View>

          <View style={styles.pad}>
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((k, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.key, { backgroundColor: k ? colors.secondary : "transparent" }]}
                onPress={() => (k === "del" ? handleDelete() : k ? handleDigit(k) : null)}
                disabled={!k}
              >
                {k === "del" ? (
                  <Feather name="delete" size={20} color={colors.foreground} />
                ) : (
                  <Text style={[styles.keyText, { color: colors.foreground }]}>{k}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {onCancel && (
            <TouchableOpacity onPress={onCancel} style={styles.cancel}>
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: 300,
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    alignItems: "center",
  },
  icon: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 24,
  },
  dots: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 28,
  },
  shake: {
    opacity: 0.5,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
  },
  pad: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
    width: 220,
  },
  key: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  keyText: {
    fontSize: 22,
    fontFamily: "Inter_400Regular",
  },
  cancel: {
    marginTop: 20,
  },
  cancelText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
