import React from "react";
import { ScrollView, Text, TouchableOpacity, View, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { type Restaurant } from "@/stores/useRestaurantStore";

const formatDistance = (distanceKm?: number) => {
  if (typeof distanceKm !== "number" || !Number.isFinite(distanceKm)) return "";
  if (distanceKm < 1) return `${Math.max(1, Math.round(distanceKm * 1000))} m`;
  return `${distanceKm.toFixed(1)} mi`;
};

const getCuisineLabel = (restaurant: Restaurant) =>
  restaurant.cuisine?.filter(Boolean).join(" • ") || "Restaurant";

export function RestaurantCard({
  restaurant,
  onOpen,
}: {
  restaurant: Restaurant;
  onOpen: () => void;
}) {
  const distanceLabel = formatDistance(restaurant.distance);
  const rating = (restaurant.rating ?? 4.2).toFixed(1);
  const cuisineLabel = getCuisineLabel(restaurant);
  const deliveryMin =
    restaurant.deliveryTimeMinutes ??
    Math.max(5, Math.min(30, Math.round(restaurant.distance * 2) + 5));

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onOpen}
      className="w-56 mr-4 bg-white rounded-[10px] p-1.5  border border-gray-50"
    >
      <View className="rounded-[12px] overflow-hidden bg-gray-50 mb-3.5 relative">
        {restaurant.profile ? (
          <Image
            source={{ uri: restaurant.profile }}
            className="w-full h-40"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-40 items-center justify-center bg-gray-50">
            <Ionicons name="restaurant-outline" size={32} color="#D1D5DB" />
          </View>
        )}

        <View className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-[#F5C518]">
          <Text className="text-[10px] font-black text-gray-900">
            {restaurant.availableFoods > 0
              ? `${restaurant.availableFoods} items`
              : "Open"}
          </Text>
        </View>
        </View>

      <View className="px-1 pb-1">
        <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>
          {restaurant.restaurantName}
        </Text>

        <View className="flex-row items-center mt-1 gap-1 flex-wrap">
          <Ionicons name="star" size={11} color="#F5C518" />
          <Text className="text-[11px] font-bold text-gray-700">{rating}</Text>
          <Text className="text-[10px] text-gray-300">•</Text>
          <Text className="text-[11px] text-gray-500 flex-1" numberOfLines={1}>
            {cuisineLabel}
          </Text>
          <Text className="text-[11px] font-medium text-gray-500">{deliveryMin}min</Text>
        </View>

        <View className="flex-row items-center mt-1">
          <Ionicons name="location-sharp" size={10} color="#9CA3AF" />
          <Text className="text-[10px] text-gray-400 ml-0.5" numberOfLines={1}>
            {distanceLabel || "Nearby"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function RestaurantSection({
  title,
  restaurants,
  onOpenRestaurant,
}: {
  title: string;
  restaurants: Restaurant[];
  onOpenRestaurant: (restaurant: Restaurant) => void;
}) {
  if (!restaurants.length) return null;

  return (
    <View className="mb-6">
      <View className="flex-row justify-between items-center px-4 mb-2">
        <Text className="text-lg font-bold text-gray-900">{title}</Text>
        <TouchableOpacity>
          <Text className="text-sm font-semibold" style={{ color: "#F5C518" }}>
            View all
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {restaurants.map((restaurant) => (
          <RestaurantCard
            key={restaurant.providerId}
            restaurant={restaurant}
            onOpen={() => onOpenRestaurant(restaurant)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
