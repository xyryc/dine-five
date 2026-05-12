import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import "../global.css";

import { useNotificationSync } from "@/hooks/useNotificationSync";
import { useStore } from "@/stores/stores";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { isInitialized, initializeAuth, accessToken } = useStore() as any;
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    if (isInitialized) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isInitialized]);

  useEffect(() => {
    const group = segments[0] as string;

    const inAuthGroup = group === "(auth)";
    const inStepGroup = group === "(step)";
    const inTabsGroup = group === "(tabs)";
    const inScreensGroup = group === "screens";
    const inSplashScreen = group === "splash-screen";

    if (!isInitialized || inSplashScreen) return;

    if (!accessToken) {
      if (inTabsGroup || inScreensGroup) {
        router.replace("/(auth)/login");
      }
    } else {
      if (inAuthGroup || inStepGroup) {
        router.replace("/(tabs)");
      }
    }
  }, [accessToken, isInitialized, segments]);

  useNotificationSync();

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
        <StatusBar style="dark" />
        <Image
          source={require("@/assets/images/icon.png")}
          contentFit="contain"
          style={{ width: 320, height: 320 }}
        />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="splash-screen" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(step)" options={{ headerShown: false }} />
        <Stack.Screen name="screens" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
