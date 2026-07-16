import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { useFonts } from "expo-font";
import { configureReanimatedLogger, ReanimatedLogLevel } from "react-native-reanimated";
import { useNotificationSync } from "@/hooks/useNotificationSync";
import { useStore } from "@/stores/stores";
import "../global.css";

// Suppress Reanimated strict-mode warnings that come from third-party dependencies
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { isInitialized, initializeAuth, accessToken, user } = useStore() as any;
  const segments = useSegments();
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    Fraunces: require("@/assets/fonts/Fraunces-Variable.ttf"),
    "Fraunces-Italic": require("@/assets/fonts/Fraunces-Italic-Variable.ttf"),
    Inter: require("@/assets/fonts/Inter-Variable.ttf"),
    "Inter-Italic": require("@/assets/fonts/Inter-Italic-Variable.ttf"),
  });

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

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
    const isPendingVerification = Boolean(accessToken && user && user.isVerified === false);

    if (!isInitialized || inSplashScreen) return;

    if (isPendingVerification) {
      if (inTabsGroup || inScreensGroup || inStepGroup) {
        router.replace({
          pathname: "/(auth)/verify-otp",
          params: { email: user?.email },
        });
      }
      return;
    }

    if (!accessToken) {
      if (inTabsGroup || inScreensGroup) {
        router.replace("/(auth)/login");
      }
    } else {
      if (inAuthGroup || inStepGroup) {
        router.replace("/(tabs)");
      }
    }
  }, [accessToken, isInitialized, router, segments, user]);

  useNotificationSync();

  if (!isInitialized || !fontsLoaded) {
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
