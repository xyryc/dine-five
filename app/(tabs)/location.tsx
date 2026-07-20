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
          id: restaurant.foodId || restaurant.id,
          foodId: restaurant.foodId || restaurant.id,
          name: restaurant.mealName || restaurant.title || restaurant.restaurantName || "",
          price: String(restaurant.price ?? 0),
          image: restaurant.mealImage || restaurant.profile || "",
          description: restaurant.productDescription || "",
          restaurantName: restaurant.restaurantName || "",
          restaurantProfile: restaurant.profile || "",
          isFreeAvailable: "true",
          freeTokenCount: String(restaurant.freeTokenCount || 0),
          providerId: restaurant.providerId || restaurant.id,
        },
      });
    } else {
      router.push({
        pathname: "/screens/home/restaurant-details",
        params: {
          providerId: restaurant.providerId || restaurant.id,
          isFreeAvailable: "false",
          freeTokenCount: String(restaurant.freeTokenCount || 0),
          name: restaurant.restaurantName || (restaurant as any).name || (restaurant as any).title || "",
          image: (restaurant as any).image || (restaurant as any).profile || "",
          rating: restaurant.rating !== undefined && restaurant.rating !== null ? String(restaurant.rating) : "",
          address: restaurant.restaurantAddress || "",
          distance: (restaurant as any).distance || "",
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
