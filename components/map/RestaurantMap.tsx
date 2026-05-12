// RestaurantMap.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT, Region } from "react-native-maps";
import { Restaurant, useRestaurantStore } from "../../stores/useRestaurantStore";
import { navigateToRestaurantDetail } from "../../utils/restaurantDetailNavigation";
import { RestaurantCard } from "./RestaurantCard";

const RADIUS_OPTIONS = [
  { label: "50", value: 50 },
  { label: "100", value: 100 },
  { label: "200", value: 200 },
  { label: "500", value: 500 },
  { label: "1k", value: 1000 },
  { label: "2k", value: 2000 },
];

const formatRadius = (meters: number): string => {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
};

const getRadiusLabel = (meters: number): string => {
  return (
    RADIUS_OPTIONS.find((r) => r.value === meters)?.label ??
    formatRadius(meters)
  );
};

export const RestaurantMap = () => {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  const {
    location,
    locationLoading,
    restaurants,
    restaurantsLoading,
    restaurantsError,
    selectedRestaurant,
    cuisineFilter,
    radiusMeters,
    fetchLocation,
    fetchNearbyRestaurants,
    setSelectedRestaurant,
    setRadiusMeters,
  } = useRestaurantStore();

  const userLat = location?.latitude ?? 23.780704;
  const userLng = location?.longitude ?? 90.407756;
  const hasLocation = !!location && !locationLoading;

  // ─── Init location ───────────────────────────────────────────────────────────
  useEffect(() => {
    fetchLocation();
  }, []);

  // ─── Fetch when location, filter, or radius changes ──────────────────────────
  useEffect(() => {
    if (!hasLocation) return;
    fetchNearbyRestaurants({
      latitude: userLat,
      longitude: userLng,
      radius: radiusMeters,
      cuisine: cuisineFilter,
      sortBy: "distance",
      page: 1,
      limit: 20,
    });
  }, [hasLocation, userLat, userLng, cuisineFilter, radiusMeters]);

  // Auto-zoom to user location when it's first loaded
  const hasAutoZoomed = useRef(false);
  useEffect(() => {
    if (location && !locationLoading && !hasAutoZoomed.current && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.001,
        longitudeDelta: 0.001,
      }, 1000);
      hasAutoZoomed.current = true;
    }
  }, [location, locationLoading]);

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const handleMarkerPress = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    mapRef.current?.animateToRegion(
      {
        latitude: restaurant.location.lat,
        longitude: restaurant.location.lng,
        latitudeDelta: 0.002,
        longitudeDelta: 0.002,
      } as Region,
      500
    );
  };

  const goToMyLocation = () => {
    if (!location) { fetchLocation(); return; }
    mapRef.current?.animateToRegion(
      {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.001,
        longitudeDelta: 0.001,
      } as Region,
      800
    );
  };

  const handleRadiusPress = (value: number) => {
    if (value !== radiusMeters) {
      setRadiusMeters(value);
      setSelectedRestaurant(null);
    }
  };

  const openRestaurantDetail = (restaurant: Restaurant) =>
    navigateToRestaurantDetail(router, restaurant);

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (locationLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FDFBF7]">
        <ActivityIndicator size="large" color="#FFC107" />
        <Text className="mt-4 text-gray-500 text-sm">Locating you...</Text>
      </View>
    );
  }

  // ─── Error ───────────────────────────────────────────────────────────────────
  if (restaurantsError && restaurants.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FDFBF7] px-8">
        <Ionicons name="wifi-outline" size={48} color="#D1D5DB" />
        <Text className="mt-4 text-gray-500 text-center text-sm">
          {restaurantsError}
        </Text>
        <TouchableOpacity
          onPress={() =>
            fetchNearbyRestaurants({
              latitude: userLat,
              longitude: userLng,
              radius: radiusMeters,
              cuisine: cuisineFilter,
            })
          }
          className="mt-4 bg-[#FFC107] px-6 py-3 rounded-2xl"
        >
          <Text className="font-bold text-gray-900">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-gray-100">
      {/* ── Header ── */}
      <View className="bg-[#FFC107] pt-10 pb-3 px-4 items-center">
        <Text className="text-gray-900 font-semibold text-sm">
          Nearby Restaurants
        </Text>
      </View>

      {/* ── Map ── */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={{ flex: 1 }}
        initialRegion={{
          latitude: userLat,
          longitude: userLng,
          latitudeDelta: 0.001,
          longitudeDelta: 0.001,
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={false}
        onPress={() => setSelectedRestaurant(null)}
      >
        {restaurants.map((restaurant) => (
          <Marker
            key={restaurant.providerId}
            coordinate={{
              latitude: restaurant.location.lat,
              longitude: restaurant.location.lng,
            }}
            onPress={() => handleMarkerPress(restaurant)}
          >
            <View className="items-center justify-center">
              {/* Distance Badge */}
              <View className="bg-[#FFC107] px-2 py-0.5 rounded-full mb-0.5 shadow-md border border-white">
                <Text className="text-[11px] font-black text-gray-900">
                  {restaurant.distance < 1
                    ? `${Math.round(restaurant.distance * 1000)}m`
                    : `${restaurant.distance.toFixed(1)}km`}
                </Text>
              </View>

              {/* Restaurant Icon */}
              <View
                className={`w-10 h-10 rounded-full items-center justify-center border-2 shadow-md ${selectedRestaurant?.providerId === restaurant.providerId
                  ? "bg-[#FFC107] border-[#FFC107]"
                  : "bg-white border-white"
                  }`}
              >
                <Ionicons
                  name="restaurant"
                  size={18}
                  color={
                    selectedRestaurant?.providerId === restaurant.providerId
                      ? "#fff"
                      : "#FFC107"
                  }
                />
              </View>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* ── Radius chips overlay ── */}
      <View className="absolute top-[70px] left-4 right-16">
        <View className="bg-white rounded-full px-2 py-1.5 shadow-md flex-row items-center justify-between">
          {RADIUS_OPTIONS.map((r) => (
            <TouchableOpacity
              key={r.value}
              onPress={() => handleRadiusPress(r.value)}
              className={`px-3 py-1 rounded-full ${radiusMeters === r.value
                ? "bg-[#FFF3C4] border border-[#FFC107]"
                : "bg-white"
                }`}
            >
              <Text
                className={`text-[11px] font-semibold ${radiusMeters === r.value ? "text-gray-900" : "text-gray-400"
                  }`}
              >
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── My location button (top-right) ── */}
      <TouchableOpacity
        onPress={goToMyLocation}
        className="absolute top-[70px] right-4 bg-white w-9 h-9 rounded-lg items-center justify-center shadow-md"
      >
        <Ionicons name="locate" size={18} color="#6B7280" />
      </TouchableOpacity>

      {/* ── Bottom pill ── */}
      <View className="absolute bottom-24 left-0 right-0 items-center">
        <View className="bg-[#2D9CDB] px-4 py-1.5 rounded-full shadow-md">
          <Text className="text-xs font-semibold text-white">
            {restaurantsLoading
              ? "Searching..."
              : `${restaurants.length} x ${getRadiusLabel(radiusMeters)} Hug`}
          </Text>
        </View>
      </View>

      {/* ── Restaurant detail card ── */}
      {selectedRestaurant && (
        <RestaurantCard
          restaurant={selectedRestaurant}
          onClose={() => setSelectedRestaurant(null)}
          onOrder={() => openRestaurantDetail(selectedRestaurant)}
        />
      )}
    </View>
  );
};
