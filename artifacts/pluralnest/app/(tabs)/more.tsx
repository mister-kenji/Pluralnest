import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useStorage } from "@/context/StorageContext";
import { useColors } from "@/hooks/useColors";

type MenuItem = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  sublabel?: string;
  route?: string;
  color?: string;
  featureKey?: keyof ReturnType<typeof useStorage>["data"]["settings"]["featuresEnabled"];
};

const menuGroups: { title: string; items: MenuItem[] }[] = [
  {
    title: "Features",
    items: [
      { icon: "clock", label: "Fronting Log", sublabel: "Track who is fronting", route: "/fronting" },
      { icon: "map", label: "Headspace", sublabel: "Document your inner world", route: "/headspace", featureKey: "headspace" },
      { icon: "message-square", label: "Forums", sublabel: "Discussions & polls", route: "/forums", featureKey: "forums" },
      { icon: "trash-2", label: "Recently Deleted", route: "/deleted", color: "#ef4444" },
    ],
  },
  {
    title: "System",
    items: [
      { icon: "image", label: "Assets", sublabel: "Reusable images for descriptions", route: "/assets" },
      { icon: "settings", label: "Settings", sublabel: "Customize & configure", route: "/settings" },
      { icon: "search", label: "Search", route: "/search", featureKey: "search" },
      { icon: "download", label: "Export / Backup", route: "/settings/export" },
    ],
  },
];

export default function MoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data } = useStorage();

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: topInset + 16,
        paddingBottom: Platform.OS === "web" ? 120 : 90,
        paddingHorizontal: 16,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>More</Text>

      {menuGroups.map((group) => (
        <View key={group.title} style={styles.group}>
          <Text style={[styles.groupTitle, { color: colors.mutedForeground }]}>{group.title}</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {group.items
              .filter((item) => {
                if (!item.featureKey) return true;
                return data.settings.featuresEnabled[item.featureKey];
              })
              .map((item, idx, arr) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.menuItem,
                    idx < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (item.route) router.push(item.route as any);
                  }}
                >
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: (item.color ?? colors.primary) + "1a" },
                    ]}
                  >
                    <Feather
                      name={item.icon}
                      size={18}
                      color={item.color ?? colors.primary}
                    />
                  </View>
                  <View style={styles.menuText}>
                    <Text
                      style={[styles.menuLabel, { color: item.color ?? colors.foreground }]}
                    >
                      {item.label}
                    </Text>
                    {item.sublabel && (
                      <Text style={[styles.menuSublabel, { color: colors.mutedForeground }]}>
                        {item.sublabel}
                      </Text>
                    )}
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              ))}
          </View>
        </View>
      ))}

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12 }]}>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>System name</Text>
          <Text style={[styles.infoValue, { color: colors.foreground }]}>
            {data.settings.systemName}
          </Text>
        </View>
        <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
          <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Members</Text>
          <Text style={[styles.infoValue, { color: colors.foreground }]}>
            {data.members.filter((m) => !m.isArchived).length}
          </Text>
        </View>
        <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
          <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Journals</Text>
          <Text style={[styles.infoValue, { color: colors.foreground }]}>
            {data.journalEntries.length}
          </Text>
        </View>
      </View>

      <Text style={[styles.version, { color: colors.mutedForeground }]}>
        PluralNest · Privacy-first
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", marginBottom: 20 },
  group: { marginBottom: 16 },
  groupTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
    marginLeft: 4,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  menuSublabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 14, fontFamily: "Inter_500Medium" },
  version: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 12,
    marginBottom: 8,
  },
});
