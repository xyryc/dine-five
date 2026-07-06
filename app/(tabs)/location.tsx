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
    router.push({
      pathname: "/screens/home/restaurant-details",
      params: {
        providerId: restaurant.providerId || restaurant.id,
      },
    });
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
