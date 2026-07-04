// RestaurantMapView.web.tsx
import { Ionicons } from "@expo/vector-icons";
const Slider = (props: any) => {
  return (
    <View style={props.style}>
      <View style={{ height: 4, backgroundColor: props.minimumTrackTintColor || '#FFC107', borderRadius: 2 }} />
    </View>
  );
};
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from "react-native";
import { Restaurant, useRestaurantStore } from "../../stores/useRestaurantStore";

type RestaurantMapViewProps = {
  onOpenRestaurant?: (restaurant: Restaurant) => void;
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH * 0.78;
const CARD_MARGIN = 10;
const CARD_SNAP_INTERVAL = CARD_WIDTH + CARD_MARGIN * 2;

// ── Google Maps helpers ────────────────────────────────────────────────────────

/**
 * Opens Google Maps (or falls back to maps.google.com) with a directions URL.
 * On web, this just opens a new tab. On native, Linking.openURL handles the
 * intent/universal-link so the Maps app opens directly.
 */
const openGoogleMapsDirections = (
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  destName: string
) => {
  // Standard Google Maps directions URL — works on all platforms
  const url =
    `https://www.google.com/maps/dir/?api=1` +
    `&origin=${originLat},${originLng}` +
    `&destination=${encodeURIComponent(destName)}+${destLat},${destLng}` +
    `&travelmode=driving`;

  // On web `window` is available; on React Native use Linking
  if (typeof window !== "undefined") {
    window.open(url, "_blank");
  } else {
    // Dynamically import so the native bundle doesn't break on web
    import("react-native").then(({ Linking }) => Linking.openURL(url));
  }
};

/**
 * Haversine distance in km between two lat/lng pairs.
 */
const haversineKm = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/** Rough driving-time estimate: assume ~25 km/h average urban speed */
const estimateDriveMinutes = (distKm: number) =>
  Math.max(1, Math.round((distKm / 25) * 60));

// ── Constants ──────────────────────────────────────────────────────────────────

const CUISINE_FILTERS = [
  { label: "All", value: undefined },
  { label: "Bangladeshi", value: "Bangladeshi" },
  { label: "Pizza", value: "Pizza" },
  { label: "Fast Food", value: "Fast Food" },
  { label: "Chinese", value: "Chinese" },
  { label: "Thai", value: "Thai" },
  { label: "Italian", value: "Italian" },
];

const RADIUS_STEPS = [100, 200, 500, 1000, 2000, 5000];

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const getRestaurantCoords = (restaurant: Restaurant | null) => {
  if (!restaurant) return null;
  const lat = toNumber(
    restaurant.location?.lat ?? (restaurant as any).latitude ?? (restaurant as any).lat,
    NaN,
  );
  const lng = toNumber(
    restaurant.location?.lng ?? (restaurant as any).longitude ?? (restaurant as any).lng,
    NaN,
  );

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

const formatRadius = (meters: number): string => {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
};

const formatDistance = (km: number): string => {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
};

// ── Main component ─────────────────────────────────────────────────────────────

export default function RestaurantMapView({
  onOpenRestaurant,
}: RestaurantMapViewProps) {
  const {
    location,
    locationLoading,
    restaurants,
    restaurantsLoading,
    restaurantsError,
    selectedRestaurant,
    cuisineFilter,
    radiusMeters,
    availableTokenCount,
    fetchLocation,
    fetchNearbyRestaurants,
    fetchFreeMeals,
    setSelectedRestaurant,
    setCuisineFilter,
    setRadiusMeters,
    setActiveFeedMode,
  } = useRestaurantStore();

  const userLat = location?.latitude ?? 23.780704;
  const userLng = location?.longitude ?? 90.407756;
  const hasLocation = !!location && !locationLoading;

  // Index of the card currently centered in the horizontal slider
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [mealFilter, setMealFilter] = useState<"all" | "free">("all");

  // Animation value for the route-info banner slide-up
  const routeBannerAnim = useRef(new Animated.Value(80)).current;
  const flatListRef = useRef<FlatList<Restaurant>>(null);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  // ── Fetch restaurants ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasLocation) return;
    if (mealFilter === "free") {
      fetchFreeMeals({ page: 1, limit: 20 });
      return;
    }

    fetchNearbyRestaurants({
      latitude: userLat,
      longitude: userLng,
      radius: radiusMeters,
      cuisine: cuisineFilter,
      sortBy: "distance",
      page: 1,
      limit: 20,
    });
  }, [
    hasLocation,
    userLat,
    userLng,
    cuisineFilter,
    radiusMeters,
    mealFilter,
    fetchNearbyRestaurants,
    fetchFreeMeals,
  ]);

  // Sync selectedRestaurant → active card index whenever it changes externally
  useEffect(() => {
    if (!selectedRestaurant) return;
    const idx = restaurants.findIndex(
      (r) => r.id === selectedRestaurant.id
    );
    if (idx !== -1 && idx !== activeCardIndex) {
      setActiveCardIndex(idx);
      flatListRef.current?.scrollToIndex({ index: idx, animated: true });
    }
  }, [activeCardIndex, restaurants, selectedRestaurant]);

  useEffect(() => {
    Animated.spring(routeBannerAnim, {
      toValue: selectedRestaurant ? 0 : 80,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, [selectedRestaurant, routeBannerAnim]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleRadiusChange = (value: number) => {
    const nearest = RADIUS_STEPS.reduce((prev, curr) =>
      Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
    );
    if (nearest !== radiusMeters) {
      setRadiusMeters(nearest);
      setSelectedRestaurant(null);
    }
  };

  const handleRestaurantCardPress = (restaurant: Restaurant) => {
    onOpenRestaurant?.(restaurant);
  };

  const handleGetDirections = () => {
    if (!selectedRestaurant) return;
    const coords = getRestaurantCoords(selectedRestaurant);
    if (!coords) return;

    openGoogleMapsDirections(
      userLat,
      userLng,
      coords.lat,
      coords.lng,
      selectedRestaurant.restaurantName
    );
  };

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        const idx = viewableItems[0].index;
        setActiveCardIndex(idx);
        setSelectedRestaurant(restaurants[idx] ?? null);
      }
    },
    [restaurants, setSelectedRestaurant]
  );

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 });

  // ── Derived route info ────────────────────────────────────────────────────────
  const routeInfo = selectedRestaurant
    ? (() => {
        const coords = getRestaurantCoords(selectedRestaurant);
        if (!coords) return null;
        const distKm = haversineKm(
          userLat,
          userLng,
          coords.lat,
          coords.lng
        );
        return {
          distKm,
          minutes: estimateDriveMinutes(distKm),
        };
      })()
    : null;

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (locationLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FDFBF7]">
        <ActivityIndicator size="large" color="#FFC107" />
        <Text className="mt-4 text-gray-500 text-sm">Locating you…</Text>
      </View>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────────
  if (restaurantsError && restaurants.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FDFBF7] px-8">
        <Ionicons name="wifi-outline" size={48} color="#D1D5DB" />
        <Text className="mt-4 text-gray-500 text-center text-sm">
          {restaurantsError}
        </Text>
        <TouchableOpacity
          onPress={() => {
            if (mealFilter === "free") {
              fetchFreeMeals({ page: 1, limit: 20 });
              return;
            }

            fetchNearbyRestaurants({
              latitude: userLat,
              longitude: userLng,
              radius: radiusMeters,
              cuisine: cuisineFilter,
            });
          }}
          className="mt-4 bg-[#FFC107] px-6 py-3 rounded-2xl"
        >
          <Text className="font-bold text-gray-900">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-gray-100">
      {/* ── Header ── */}
      <View className="bg-[#FFC107] pt-12 pb-3 px-4 items-center">
        <Text className="text-gray-900 font-bold text-lg">
          Nearby Restaurants
        </Text>
      </View>

      {/* ── Radius slider strip ── */}
      <View className="bg-white px-4 pt-2 pb-1 shadow-sm">
        <View className="flex-row justify-between mb-1">
          {RADIUS_STEPS.map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => {
                setRadiusMeters(r);
                setSelectedRestaurant(null);
              }}
            >
              <Text
                className={`text-xs font-semibold ${
                  radiusMeters === r ? "text-[#FFC107]" : "text-gray-400"
                }`}
              >
                {formatRadius(r)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Slider
          style={{ height: 28 }}
          minimumValue={RADIUS_STEPS[0]}
          maximumValue={RADIUS_STEPS[RADIUS_STEPS.length - 1]}
          value={radiusMeters}
          onSlidingComplete={handleRadiusChange}
          minimumTrackTintColor="#FFC107"
          maximumTrackTintColor="#E5E7EB"
          thumbTintColor="#FFC107"
        />
      </View>

      {/* ── Cuisine chips ── */}
      <View className="bg-white/90 px-4 py-2">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {CUISINE_FILTERS.map((c) => (
              <TouchableOpacity
                key={c.label}
                onPress={() => {
                  setCuisineFilter(c.value);
                  setSelectedRestaurant(null);
                }}
                className={`px-4 py-1.5 rounded-full border ${
                  cuisineFilter === c.value
                    ? "bg-[#FFC107] border-[#FFC107]"
                    : "bg-white border-gray-200"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    cuisineFilter === c.value ? "text-gray-900" : "text-gray-500"
                  }`}
                >
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* ── Web notice + actions ── */}
      <View className="bg-white px-4 pb-2">
        <View className="self-start flex-row bg-[#FFF4CC] rounded-full p-1 border border-[#FFE066]">
          <TouchableOpacity
            onPress={() => {
              setActiveFeedMode("all");
              setMealFilter("all");
              setActiveCardIndex(0);
              setSelectedRestaurant(null);
            }}
            className={`px-5 py-2 rounded-full ${mealFilter === "all" ? "bg-[#FFC107]" : ""}`}
          >
            <Text
              className={`text-xs font-semibold ${mealFilter === "all" ? "text-gray-900" : "text-[#8B6200]"}`}
            >
              meal near you
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setActiveFeedMode("free");
              setMealFilter("free");
              setActiveCardIndex(0);
              setSelectedRestaurant(null);
            }}
            className={`px-5 py-2 rounded-full ${mealFilter === "free" ? "bg-[#FFC107]" : ""}`}
          >
            <Text
              className={`text-xs font-semibold ${mealFilter === "free" ? "text-gray-900" : "text-[#8B6200]"}`}
            >
              free meal near you
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="bg-white px-4 py-3 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Ionicons name="map-outline" size={16} color="#6B7280" />
            <Text className="text-xs text-gray-500">
              Map view is available on iOS & Android.
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => (!location ? fetchLocation() : undefined)}
            className="flex-row items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-full"
          >
            <Ionicons name="locate" size={14} color="#374151" />
            <Text className="text-xs font-semibold text-gray-700">
              My location
            </Text>
          </TouchableOpacity>
        </View>
        <View className="mt-2">
          {restaurantsLoading ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator size="small" color="#FFC107" />
              <Text className="text-xs text-gray-400">Searching…</Text>
            </View>
          ) : (
            <Text className="text-xs font-semibold text-gray-700">
              {restaurants.length} found within {formatRadius(radiusMeters)}
              {mealFilter === "free" &&
                ` • ${availableTokenCount || restaurants.length} Tokens Available`}
            </Text>
          )}
        </View>
      </View>

      {/* ── Horizontal card slider ── */}
      <View className="flex-1 relative">
        {restaurants.length === 0 && !restaurantsLoading ? (
          <View className="flex-1 items-center justify-center py-16">
            <Text className="text-gray-400 text-sm">
              No restaurants found in this area.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={restaurants}
            keyExtractor={(r) => r.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_SNAP_INTERVAL}
            snapToAlignment="center"
            decelerationRate="fast"
            contentContainerStyle={{
              paddingHorizontal: (SCREEN_WIDTH - CARD_WIDTH) / 2,
              paddingVertical: 12,
            }}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig.current}
            getItemLayout={(_, index) => ({
              length: CARD_SNAP_INTERVAL,
              offset: CARD_SNAP_INTERVAL * index,
              index,
            })}
            renderItem={({ item: restaurant, index }) => {
              const isActive = index === activeCardIndex;
              const isSelected = selectedRestaurant?.id === restaurant.id;

              return (
                <TouchableOpacity
                  activeOpacity={0.92}
                  onPress={() => handleRestaurantCardPress(restaurant)}
                  style={{
                    width: CARD_WIDTH,
                    marginHorizontal: CARD_MARGIN,
                    transform: [{ scale: isActive ? 1 : 0.93 }],
                    opacity: isActive ? 1 : 0.7,
                  }}
                >
                  <View
                    className={`rounded-3xl bg-white shadow-md overflow-hidden ${
                      isSelected ? "border-2 border-[#FFC107]" : "border border-gray-100"
                    }`}
                    style={{
                      shadowColor: isSelected ? "#FFC107" : "#000",
                      shadowOpacity: isSelected ? 0.25 : 0.08,
                      shadowRadius: isSelected ? 12 : 6,
                      elevation: isSelected ? 8 : 3,
                    }}
                  >
                    {/* Colored accent bar */}
                    <View className="h-1.5 bg-[#FFC107]" />

                    <View className="p-5">
                      {/* Name + distance */}
                      <View className="flex-row items-start justify-between mb-2">
                        <Text
                          className="text-gray-900 font-bold text-base flex-1 mr-3"
                          numberOfLines={2}
                        >
                          {restaurant.restaurantName}
                        </Text>
                        <View className="bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-1 items-center">
                          <Ionicons
                            name="navigate-outline"
                            size={12}
                            color="#F59E0B"
                          />
                          <Text className="text-amber-600 text-xs font-bold mt-0.5">
                            {formatDistance(restaurant.distance)}
                          </Text>
                        </View>
                      </View>

                      {/* Address */}
                      <View className="flex-row items-center gap-1.5 mb-1">
                        <Ionicons
                          name="location-outline"
                          size={13}
                          color="#9CA3AF"
                        />
                        <Text
                          className="text-gray-400 text-xs flex-1"
                          numberOfLines={1}
                        >
                          {restaurant.restaurantAddress}
                        </Text>
                      </View>

                      {/* Cuisine tags */}
                      <View className="flex-row flex-wrap gap-1 mt-2">
                        {(Array.isArray(restaurant.cuisine)
                          ? restaurant.cuisine
                          : ["Restaurant"]
                        )
                          .slice(0, 3)
                          .map((tag: string) => (
                            <View
                              key={tag}
                              className="bg-gray-100 rounded-full px-2.5 py-0.5"
                            >
                              <Text className="text-gray-500 text-xs">
                                {tag}
                              </Text>
                            </View>
                          ))}
                      </View>

                      {/* CTA hint when selected */}
                      {isSelected && (
                        <View className="mt-3 flex-row items-center gap-1.5 bg-[#FFC107]/10 rounded-xl px-3 py-2">
                          <Ionicons
                            name="map-outline"
                            size={14}
                            color="#D97706"
                          />
                          <Text className="text-amber-700 text-xs font-semibold">
                            Tap to view details →
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}

        {/* ── Pagination dots ── */}
        {restaurants.length > 1 && (
          <View className="flex-row justify-center gap-1.5 pb-2">
            {restaurants.map((_, i) => (
              <View
                key={i}
                style={{
                  width: i === activeCardIndex ? 18 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor:
                    i === activeCardIndex ? "#FFC107" : "#D1D5DB",
                }}
              />
            ))}
          </View>
        )}

        {/* ── Route info banner (slides up when a restaurant is selected) ── */}
        <Animated.View
          style={[
            {
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              transform: [{ translateY: routeBannerAnim }],
            },
          ]}
          className="mx-4 mb-4 bg-gray-900 rounded-3xl overflow-hidden shadow-xl"
        >
          {selectedRestaurant && routeInfo && (
            <TouchableOpacity
              onPress={handleGetDirections}
              activeOpacity={0.85}
              className="flex-row items-center px-5 py-4 gap-4"
            >
              {/* Route icon */}
              <View className="w-11 h-11 bg-[#FFC107] rounded-2xl items-center justify-center">
                <Ionicons name="navigate" size={22} color="#1F2937" />
              </View>

              {/* Route stats */}
              <View className="flex-1">
                <Text
                  className="text-white font-bold text-sm"
                  numberOfLines={1}
                >
                  {selectedRestaurant.restaurantName}
                </Text>
                <View className="flex-row items-center gap-3 mt-0.5">
                  <View className="flex-row items-center gap-1">
                    <Ionicons
                      name="car-outline"
                      size={12}
                      color="#9CA3AF"
                    />
                    <Text className="text-gray-400 text-xs">
                      ~{routeInfo.minutes} min
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Ionicons
                      name="footsteps-outline"
                      size={12}
                      color="#9CA3AF"
                    />
                    <Text className="text-gray-400 text-xs">
                      {formatDistance(routeInfo.distKm)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Open Maps label */}
              <View className="bg-[#FFC107] px-3 py-2 rounded-xl flex-row items-center gap-1">
                <Text className="text-gray-900 text-xs font-bold">
                  Open Maps
                </Text>
                <Ionicons name="open-outline" size={12} color="#1F2937" />
              </View>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </View>
  );
}
