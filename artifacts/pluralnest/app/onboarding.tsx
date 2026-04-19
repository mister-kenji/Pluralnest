import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useStorage } from "@/context/StorageContext";
import { useColors } from "@/hooks/useColors";

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, updateSettings } = useStorage();
  const [systemName, setSystemName] = useState("");

  const handleContinue = () => {
    const name = systemName.trim() || "My System";
    updateSettings({
      ...data.settings,
      systemName: name,
      hasCompletedOnboarding: true,
    });
    router.replace("/(tabs)");
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 },
        ]}
      >
        <View style={styles.top}>
          <View style={[styles.logoMark, { backgroundColor: colors.primary + "22" }]}>
            <Feather name="home" size={32} color={colors.primary} />
          </View>

          <Text style={[styles.appName, { color: colors.primary }]}>Pluralnest</Text>

          <Text style={[styles.welcome, { color: colors.foreground }]}>
            Welcome to Pluralnest — Made with love for systems, by systems
          </Text>
        </View>

        <View style={styles.middle}>
          <Text style={[styles.getStarted, { color: colors.foreground }]}>
            Let's get started
          </Text>

          <Text style={[styles.question, { color: colors.mutedForeground }]}>
            What is your system name?
          </Text>

          <View
            style={[
              styles.inputWrap,
              {
                backgroundColor: colors.card,
                borderColor: systemName.trim() ? colors.primary : colors.border,
              },
            ]}
          >
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="e.g. The Sunrise System"
              placeholderTextColor={colors.mutedForeground}
              value={systemName}
              onChangeText={setSystemName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleContinue}
              maxLength={60}
            />
            {systemName.trim().length > 0 && (
              <TouchableOpacity onPress={() => setSystemName("")} hitSlop={8}>
                <Feather name="x" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>

          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            You can always change this later in settings
          </Text>
        </View>

        <View style={styles.bottom}>
          <TouchableOpacity
            style={[
              styles.continueBtn,
              { backgroundColor: colors.primary },
            ]}
            onPress={handleContinue}
            activeOpacity={0.85}
          >
            <Text style={[styles.continueBtnText, { color: colors.primaryForeground }]}>
              Continue
            </Text>
            <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
          </TouchableOpacity>

          <Text style={[styles.privacy, { color: colors.mutedForeground }]}>
            Everything stays on your device — no accounts, no servers.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: "space-between",
  },
  top: {
    alignItems: "center",
    gap: 16,
  },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  appName: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  welcome: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 24,
  },
  middle: {
    gap: 12,
  },
  getStarted: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  question: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  hint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  bottom: {
    gap: 16,
    alignItems: "center",
  },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 16,
    width: "100%",
  },
  continueBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  privacy: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
});
