import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { DonateModal } from "./DonateModal";

export const DonateCard = () => {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);

  const handleConfirm = (mealCount: number) => {
    setModalVisible(false);
    router.push({
      pathname: "/screens/card/checkout",
      params: {
        mealCount: String(mealCount),
        type: "donation",
      },
    } as any);
  };

  return (
    <View className="px-5 py-3 flex-row items-center justify-between">
      <View className="flex-row items-center flex-1">
        {/* Logo Container */}
        <View className="w-16 h-16 rounded-xl bg-white items-center justify-center shadow-sm overflow-hidden border border-[#FDF6E3]">
          <Image
            source={require("@/assets/images/icon.png")}
            style={{ width: 48, height: 64 }}
            resizeMode="contain"
          />
        </View>

        {/* Text Section */}
        <View className="ml-4">
          <Text className="text-2xl font-bold text-[#1F2937] leading-tight">
            $5.99
          </Text>
          <Text className="text-base text-[#6B7280] font-medium">
            for Every Meal.
          </Text>
        </View>
      </View>

      {/* Action Button */}
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
        className="bg-[#F8F9FF] border border-[#D1D5DB] px-3 py-2 rounded-xl shadow-sm"
      >
        <Text className="text-[#1F2937] text-[11px] font-bold tracking-tight">
          DONATE A MEAL
        </Text>
      </TouchableOpacity>

      {/* Donate Modal */}
      <DonateModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onConfirm={handleConfirm}
      />
    </View>
  );
};
