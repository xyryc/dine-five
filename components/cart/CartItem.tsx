import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface CartItemProps {
  id: number | string;
  name: string;
  price: string;
  image: string;
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove?: () => void; // Optional remove (trash icon)
}

export const CartItem = ({
  name,
  price,
  image,
  quantity,
  onIncrement,
  onDecrement,
  onRemove,
}: CartItemProps) => {
  return (
    <View className="flex-row items-center bg-white p-3 rounded-2xl mb-4 shadow-sm border border-gray-100">
      <Image
        source={{ uri: image }}
        contentFit="cover"
        style={{ width: 100, height: 80, borderRadius: 12 }}
      />

      <View className="flex-1 ml-3">
        <Text className="text-base font-normal text-[#60655C] mb-1">
          {name}
        </Text>
        <Text className="text-base font-semibold text-[#363A33] mb-2">
          ${price}
        </Text>

        <View className="flex-row justify-end">
          <View className="flex-row items-center  rounded-full px-2 py-1 gap-4">
            <TouchableOpacity
              onPress={onDecrement}
              className="w-8 h-8 items-center justify-center bg-[#FFE69C] rounded-full"
            >
              <Ionicons
                name={quantity === 1 ? "trash-outline" : "remove"}
                size={18}
                color="#332701"
              />
            </TouchableOpacity>
            <Text className="text-base font-bold text-gray-900">
              {quantity}
            </Text>
            <TouchableOpacity
              onPress={onIncrement}
              className="w-8 h-8 items-center justify-center bg-[#FFE69C] rounded-full"
            >
              <Ionicons name="add" size={18} color="#332701" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};
