import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { StorageProvider } from "@/context/StorageContext";
import { LockProvider } from "@/context/LockContext";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="member/[id]" />
      <Stack.Screen name="member/edit" />
      <Stack.Screen name="fronting/index" />
      <Stack.Screen name="fronting/stats" />
      <Stack.Screen name="journal/[id]" />
      <Stack.Screen name="journal/create" />
      <Stack.Screen name="headspace/index" />
      <Stack.Screen name="headspace/[id]" />
      <Stack.Screen name="forums/index" />
      <Stack.Screen name="forums/[id]" />
      <Stack.Screen name="forums/create" />
      <Stack.Screen name="settings/index" />
      <Stack.Screen name="settings/export" />
      <Stack.Screen name="deleted/index" />
      <Stack.Screen name="search" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <StorageProvider>
          <LockProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </LockProvider>
        </StorageProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
