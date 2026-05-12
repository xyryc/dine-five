import RestaurantMapView from '@/components/map/RestaurantMapView';
import { Restaurant } from '@/stores/restaurantService';
import { navigateToRestaurantDetail } from '@/utils/restaurantDetailNavigation';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LocationScreen() {
  const handleOpenRestaurant = (restaurant: Restaurant) => {
    navigateToRestaurantDetail(router as any, restaurant);
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
