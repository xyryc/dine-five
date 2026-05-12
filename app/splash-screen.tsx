import { useStore } from "@/stores/stores";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useEffect } from "react";
import { View } from "react-native";

const SplashScreen = () => {
  const { initializeAuth } = useStore() as any;

  useEffect(() => {
    let timer: any;

    const init = async () => {
      // Initialize auth state (fetch from storage)
      const auth = await initializeAuth();

      // Artificial delay to show the "DineFive" logo
      timer = setTimeout(() => {
        if (auth && auth.user && auth.accessToken) {
          router.replace("/(tabs)");
        } else {
          router.replace("/(step)/step1");
        }
      }, 2000); // Back to 2s as requested by user in their manual edit
    };

    init();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
      <Image
        source={require("@/assets/images/icon.png")}
        contentFit="contain"
        style={{
          height: 320,
          width: 320,
        }}
      />
    </View>
  );
};

export default SplashScreen;
