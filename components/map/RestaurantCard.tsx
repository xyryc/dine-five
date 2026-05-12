// RestaurantCard.tsx
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { Restaurant } from "../../stores/useRestaurantStore";

interface Props {
  restaurant: Restaurant;
  onClose: () => void;
  onOrder?: () => void;
}

const formatDistance = (km: number): string => {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
};

export const RestaurantCard: React.FC<Props> = ({
  restaurant,
  onClose,
  onOrder,
}) => {
  const cuisineLabel =
    Array.isArray(restaurant.cuisine) && restaurant.cuisine.length > 0
      ? restaurant.cuisine.join(", ")
      : "Restaurant";

  return (
    <View className="absolute bottom-6 left-4 right-4 bg-white rounded-3xl shadow-2xl overflow-hidden">
      {/* Drag handle */}
      <View className="items-center pt-3 pb-1">
        <View className="w-10 h-1 bg-gray-200 rounded-full" />
      </View>

      <View className="flex-row p-4 gap-3">
        {/* Restaurant Image */}
        <Image
          source={{
            uri:
              restaurant.profile ||
              "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=200",
          }}
          className="w-20 h-20 rounded-2xl bg-gray-100"
          resizeMode="cover"
        />

        {/* Info */}
        <View className="flex-1 justify-between">
          <View>
            <Text
              className="text-gray-900 font-bold text-base leading-tight"
              numberOfLines={1}
            >
              {restaurant.restaurantName}
            </Text>
            <Text className="text-gray-400 text-xs mt-0.5" numberOfLines={1}>
              {cuisineLabel}
            </Text>
            <Text className="text-gray-400 text-xs mt-0.5" numberOfLines={1}>
              📍 {restaurant.restaurantAddress}
            </Text>
          </View>

          {/* Distance row */}
          <View className="flex-row items-center gap-3 mt-2">
            <View className="flex-row items-center gap-1 bg-amber-50 px-2 py-1 rounded-full">
              <Ionicons name="navigate-outline" size={11} color="#F59E0B" />
              <Text className="text-amber-600 text-xs font-semibold">
                {formatDistance(restaurant.distance)}
              </Text>
            </View>
            {restaurant.availableFoods > 0 && (
              <View className="flex-row items-center gap-1">
                <Ionicons name="fast-food-outline" size={11} color="#9CA3AF" />
                <Text className="text-gray-400 text-xs">
                  {restaurant.availableFoods} items
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Close button */}
        <TouchableOpacity
          onPress={onClose}
          className="w-7 h-7 rounded-full bg-gray-100 items-center justify-center self-start"
        >
          <Ionicons name="close" size={14} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* CTA Button */}
      <TouchableOpacity
        onPress={onOrder}
        className="mx-4 mb-4 bg-[#FFC107] rounded-2xl py-3 items-center"
      >
        <Text className="text-gray-900 font-bold text-sm">View Restaurant</Text>
      </TouchableOpacity>
    </View>
  );
};
