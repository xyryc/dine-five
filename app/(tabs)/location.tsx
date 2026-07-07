import RestaurantMapView from '@/components/map/RestaurantMapView';
import { Restaurant } from '@/stores/restaurantService';
import { useRestaurantStore } from '@/stores/useRestaurantStore';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LocationScreen() {
  const { setRadiusMeters } = useRestaurantStore();

  useEffect(() => {
    setRadiusMeters(5000);
  }, [setRadiusMeters]);

  const handleOpenRestaurant = (restaurant: Restaurant) => {
    if (restaurant.isFreeAvailable) {
      router.push({
        pathname: "/screens/home/product-details",
        params: {
          id: restaurant.id,
          foodId: (restaurant as any).foodId || restaurant.id,
          name: (restaurant as any).name || (restaurant as any).title || (restaurant as any).mealName || restaurant.restaurantName,
          price: "0.00",
          image: (restaurant as any).image || (restaurant as any).foodImage || (restaurant as any).mealImage || (restaurant as any).profile || "",
          description: (restaurant as any).description || "",
          restaurantName: restaurant.restaurantName || "Donated Meal",
          restaurantProfile: (restaurant as any).profile || "",
          providerId: restaurant.providerId || (restaurant as any).restaurantId || restaurant.id,
          isFreeAvailable: "true",
          freeTokenCount: String(restaurant.freeTokenCount || 1),
        },
      });
    } else {
      router.push({
        pathname: "/screens/home/restaurant-details",
        params: {
          providerId: restaurant.providerId || restaurant.id,
        },
      });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <StatusBar style="dark" />

      {/* Map Container */}
      <View className="flex-1">
        <RestaurantMapView onOpenRestaurant={handleOpenRestaurant} />
      </View>
    </SafeAreaView>
  );
}
