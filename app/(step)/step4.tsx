import GradientButton from "@/components/GradientButton";
import { router } from "expo-router";
import React from "react";
import {
    ImageBackground,
    StatusBar,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const step4 = () => {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const bottomSectionHeight = height * 0.4;

  return (
    <View className="flex-1 bg-black">
      <StatusBar barStyle="light-content" />

      <View className="flex-1 relative">
        <ImageBackground
          source={require("@/assets/images/44.jpg")}
          resizeMode="cover"
          className="flex-1"
        >
          {/* Skip button - adjusted for safe area top */}
          <View
            style={{ top: Math.max(insets.top, 20) }}
            className="absolute right-4"
          >
            <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
              <Text className="text-base font-medium text-[#FFCD39]">Skip</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </View>

      {/* Bottom section - dynamic height and safe area padding */}
      <View
        style={{
          height: bottomSectionHeight + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 24,
        }}
        className="bg-white px-6 pt-8 items-center"
      >
        {/* Progress indicators above title */}
        <View className="flex-row justify-center gap-2 mb-6">
          <View className="w-6 h-2 bg-gray-200 rounded-full" />
          <View className="w-6 h-2 bg-gray-200 rounded-full" />
          <View className="w-6 h-2 bg-gray-200 rounded-full" />
          <View className="w-10 h-2 bg-yellow-400 rounded-full" />
        </View>

        {/* Title */}
        <Text
          numberOfLines={2}
          adjustsFontSizeToFit
          className="text-3xl font-bold text-[#1F2937] mb-4 text-center"
        >
          Your Next Meal is Ready
        </Text>

        {/* Description */}
        <Text className="text-base text-gray-600 leading-relaxed mb-6 text-center px-2">
          No pick up fees. No hidden markups. No long waits. Simply browse
          available meals, reserve your favorite, and pick it up fresh from the
          restaurant when it's ready.
        </Text>

        {/* Get Started button */}
        <View className="mt-auto w-full">
          <GradientButton
            title="Get Started"
            onPress={() => router.push("/(auth)/login")}
            className="w-full"
          />
        </View>
      </View>
    </View>
  );
};

export default step4;
