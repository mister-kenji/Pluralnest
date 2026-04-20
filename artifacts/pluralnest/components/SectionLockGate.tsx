import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PinModal } from "@/components/PinModal";
import { useLock } from "@/context/LockContext";
import { useStorage } from "@/context/StorageContext";
import type { SectionKey } from "@/context/StorageContext";
import { useColors } from "@/hooks/useColors";

const SECTION_LABELS: Record<SectionKey, string> = {
  emergency: "Emergency Information",
  forums: "Forums",
  chat: "Inner Chat",
  frontingLog: "Fronting Log",
  headspace: "Headspace",
};

type Props = {
  sectionKey: SectionKey;
  children: React.ReactNode;
};

export function SectionLockGate({ sectionKey, children }: Props) {
  const colors = useColors();
  const { isSectionLocked, unlockSection } = useLock();
  const { data } = useStorage();
  const code = data.settings.screenLockCode;

  const locked = isSectionLocked(sectionKey);
  const [showPin, setShowPin] = useState(locked);

  useEffect(() => {
    if (locked) setShowPin(true);
  }, [locked]);

  if (!locked) return <>{children}</>;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.center}>
        <View style={[styles.iconWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="lock" size={32} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {SECTION_LABELS[sectionKey]}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          This section is locked
        </Text>
      </View>
      <PinModal
        visible={showPin}
        code={code}
        title={`Unlock ${SECTION_LABELS[sectionKey]}`}
        onSuccess={() => {
          unlockSection(sectionKey);
          setShowPin(false);
        }}
        onCancel={() => {
          setShowPin(false);
          router.back();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
