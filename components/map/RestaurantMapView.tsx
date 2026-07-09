import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  NativeSyntheticEvent,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT, Region } from "react-native-maps";
import * as Location from "expo-location";
import { Restaurant, useRestaurantStore } from "../../stores/useRestaurantStore";
const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getRestaurantImage = (restaurant: Restaurant): string =>
  (restaurant.profile as string) ||
  (restaurant as any).image ||
  (restaurant as any).imageUrl ||
  "https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=500";

const formatRestaurantDistance = (distanceKm: number): string => {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return "0 m";
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(1)} km`;
};

const buildRestaurantSearchHaystack = (restaurant: Restaurant): string => {
  const searchParts = [
    restaurant.restaurantName,
    restaurant.restaurantAddress,
    restaurant.city,
    restaurant.state,
    restaurant.contactEmail,
    restaurant.phoneNumber,
    (restaurant as any).providerName,
    (restaurant as any).name,
    restaurant.title,
    restaurant.mealName,
    Array.isArray(restaurant.cuisine) ? restaurant.cuisine.join(" ") : "",
  ];

  return normalizeText(searchParts.filter(Boolean).join(" "));
};

const normalizeRestaurantSearchQuery = (query: string): string =>
  normalizeText(query);

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH * 0.82;
const CARD_GAP = 12;
const CARD_SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;

const RADIUS_STEPS = [100, 200, 500, 1000, 2000, 5000, 10000];

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const formatRadius = (meters: number): string => {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
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

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    // If it's a free meal and missing coords, we could fallback to a specific logic
    // but for now return null to avoid map crashes
    return null;
  }
  return { latitude: lat, longitude: lng };
};

type RestaurantMapViewProps = {
  onOpenRestaurant?: (restaurant: Restaurant) => void;
};

const SkeletonCard = () => {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.9,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={{ width: CARD_WIDTH, opacity: pulseAnim }}
      className="rounded-3xl bg-white border border-gray-100 overflow-hidden p-3 gap-y-3 shadow-md"
    >
      {/* Image Skeleton */}
      <View className="w-full h-32 bg-gray-200 rounded-2xl" />
      
      {/* Title Skeleton */}
      <View className="h-5 w-3/4 bg-gray-200 rounded-lg" />
      
      {/* Subtitle / Stars Skeleton */}
      <View className="flex-row items-center gap-x-2">
        <View className="w-4 h-4 bg-gray-200 rounded-full" />
        <View className="h-4 w-12 bg-gray-200 rounded-lg" />
        <View className="h-4 w-20 bg-gray-200 rounded-lg" />
      </View>
      
      {/* Bottom Row Skeleton */}
      <View className="flex-row items-center justify-between pt-3 border-t border-gray-100">
        <View className="flex-row items-center gap-x-1">
          <View className="w-4 h-4 bg-gray-200 rounded-full" />
          <View className="h-4 w-12 bg-gray-200 rounded-lg" />
        </View>
        <View className="h-8 w-24 bg-gray-200 rounded-xl" />
      </View>
    </Animated.View>
  );
};

export default function RestaurantMapView({
  onOpenRestaurant,
}: RestaurantMapViewProps) {
  const mapRef = useRef<MapView>(null);
  const flatListRef = useRef<FlatList<Restaurant>>(null);

  const {
    location,
    locationLoading,
    locationPermissionGranted,
    restaurants,
    restaurantsLoading,
    restaurantsError,
    selectedRestaurant,
    cuisineFilter,
    radiusMeters,
    fetchLocation,
    fetchNearbyRestaurants,
    fetchFreeMeals,
    setSelectedRestaurant,
    setActiveFeedMode,
    setRadiusMeters,
    setLocationManually,
  } = useRestaurantStore();

  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [mealFilter, setMealFilter] = useState<"all" | "free">("all");
  const [manualMapAddressInput, setManualMapAddressInput] = useState("");
  const [isSearchingMapAddress, setIsSearchingMapAddress] = useState(false);
  const [isAddressModalVisible, setIsAddressModalVisible] = useState(false);

  const [addressLabel, setAddressLabel] = useState("3067 Fifth Ave");

  useEffect(() => {
    let isMounted = true;
    const updateAddressLabel = async () => {
      if (!location) return;
      try {
        const result = await Location.reverseGeocodeAsync({
          latitude: location.latitude,
          longitude: location.longitude,
        });
        if (!isMounted) return;
        const place = result?.[0];
        if (place) {
          const label = place.street || place.district || place.subregion || place.city || place.name || "Selected Location";
          setAddressLabel(label);
        }
      } catch (err) {
        console.log("Reverse geocoding error:", err);
        if (isMounted) {
          setAddressLabel("Current Location");
        }
      }
    };
    updateAddressLabel();
    return () => {
      isMounted = false;
    };
  }, [location]);

  const handleAutoLocate = async () => {
    await fetchLocation(true);
    const { location: updatedLocation } = useRestaurantStore.getState();
    if (updatedLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: updatedLocation.latitude,
        longitude: updatedLocation.longitude,
        latitudeDelta: 0.002,
        longitudeDelta: 0.002,
      }, 1000);
    }
  };

  const handlePickerPress = () => {
    setIsAddressModalVisible(true);
  };

  const [debouncedSearchText, setDebouncedSearchText] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchText]);

  const userLat = location?.latitude ?? 23.780704;
  const userLng = location?.longitude ?? 90.407756;
  const hasLocation = !!location && !locationLoading;

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  useEffect(() => {
    if (!hasLocation) return;

    const loadData = async () => {
      if (mealFilter === "free") {
        console.log("[RestaurantMapView] Fetching free meals (provider/nearby?freeNearYou=true)...");
        await fetchFreeMeals({ page: 1, limit: 20, search: debouncedSearchText || undefined });
        return;
      }

      console.log("[RestaurantMapView] Fetching nearby providers...");
      fetchNearbyRestaurants({
        latitude: userLat,
        longitude: userLng,
        radius: radiusMeters,
        cuisine: cuisineFilter,
        sortBy: "distance",
        page: 1,
        limit: 20,
        search: debouncedSearchText || undefined,
        freeNearYou: false,
      });
    };

    loadData();
  }, [
    mealFilter,
    hasLocation,
    userLat,
    userLng,
    radiusMeters,
    cuisineFilter,
    debouncedSearchText,
    fetchFreeMeals,
    fetchNearbyRestaurants,
  ]);

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

  const allRestaurants = useMemo(() => {
    return Array.isArray(restaurants) ? restaurants : [];
  }, [restaurants]);

  const filteredRestaurants = useMemo(() => {
    const normalizedQuery = normalizeRestaurantSearchQuery(debouncedSearchText);
    const restaurantsList = Array.isArray(allRestaurants) ? allRestaurants : [];
    if (!normalizedQuery) return restaurantsList;

    const queryTokens = normalizedQuery.split(" ").filter(Boolean);
    if (!queryTokens.length) {
      console.log(`[RestaurantMapView] Filter: ${mealFilter}, Items: ${restaurantsList.length}`);
      return restaurantsList;
    }

    const list = restaurantsList.filter((restaurant) => {
      const haystack = buildRestaurantSearchHaystack(restaurant);
      return queryTokens.every((token) => haystack.includes(token));
    });
    console.log(`[RestaurantMapView] Filter: ${mealFilter}, Items: ${list.length}`);
    return list;
  }, [allRestaurants, debouncedSearchText, mealFilter]);

  useEffect(() => {
    if (filteredRestaurants.length === 0) {
      if (selectedRestaurant !== null) setSelectedRestaurant(null);
      if (activeCardIndex !== 0) setActiveCardIndex(0);
      return;
    }

    if (!selectedRestaurant) {
      setSelectedRestaurant(filteredRestaurants[0]);
      setActiveCardIndex(0);
      return;
    }

    const selectedIndex = filteredRestaurants.findIndex(
      (restaurant) => restaurant.id === selectedRestaurant.id,
    );

    if (selectedIndex === -1) {
      const firstRes = filteredRestaurants[0];
      if (firstRes) {
        setSelectedRestaurant(firstRes);
        setActiveCardIndex(0);
        try {
          flatListRef.current?.scrollToIndex({ index: 0, animated: true });
        } catch { }
      }
      return;
    }

    if (selectedIndex !== activeCardIndex) {
      setActiveCardIndex(selectedIndex);
      try {
        flatListRef.current?.scrollToIndex({ index: selectedIndex, animated: true });
      } catch { }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredRestaurants, selectedRestaurant?.id]); // Only depend on list and selected ID

  useEffect(() => {
    if (!selectedRestaurant || !mapRef.current) return;

    const coords = getRestaurantCoords(selectedRestaurant);
    if (!coords) return;

    mapRef.current.animateToRegion(
      {
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.002,
        longitudeDelta: 0.002,
      } as Region,
      450,
    );
  }, [selectedRestaurant]);

  const handleMarkerPress = (restaurant: Restaurant) => {
    const index = filteredRestaurants.findIndex(
      (item) => item.id === restaurant.id,
    );

    setSelectedRestaurant(restaurant);

    if (index !== -1) {
      setActiveCardIndex(index);
      try {
        flatListRef.current?.scrollToIndex({ index, animated: true });
      } catch {
        // List might not be ready
      }
    }
  };

  const handleCardSnap = (event: NativeSyntheticEvent<any>) => {
    if (!filteredRestaurants.length) return;

    const x = event.nativeEvent.contentOffset?.x ?? 0;
    const index = Math.round(x / CARD_SNAP_INTERVAL);
    const safeIndex = Math.max(0, Math.min(index, filteredRestaurants.length - 1));

    const restaurant = filteredRestaurants[safeIndex];
    if (!restaurant) return;

    setActiveCardIndex(safeIndex);
    if (selectedRestaurant?.id !== restaurant.id) {
      setSelectedRestaurant(restaurant);
    }
  };

  const openRestaurantDetail = (restaurant: Restaurant) => {
    const isFreeMode = mealFilter === "free";
    onOpenRestaurant?.({
      ...restaurant,
      isFreeAvailable: isFreeMode ? true : restaurant.isFreeAvailable,
      freeTokenCount: isFreeMode ? (restaurant.freeTokenCount || 1) : restaurant.freeTokenCount
    });
  };

  const handleRadiusPress = (radius: number) => {
    if (radius !== radiusMeters) {
      setRadiusMeters(radius);
      setSelectedRestaurant(null);
    }
  };



  const isShowingHomeProviders = false;

  const handleManualLocationPrompt = () => {
    setIsAddressModalVisible(true);
  };

  const handleAddressModalConfirm = async (address: string) => {
    const res = await setLocationManually(address);
    if (res && res.success) {
      setAddressLabel(address);
      if (res.location && mapRef.current) {
        mapRef.current.animateToRegion({
          ...res.location,
          latitudeDelta: 0.002,
          longitudeDelta: 0.002,
        }, 1000);
      }
      return true;
    } else {
      Alert.alert("Error", res?.error || "Could not resolve address. Please try again.");
      return false;
    }
  };

  if (locationPermissionGranted === false) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FDFBF7] px-8 gap-y-5">
        <View className="w-20 h-20 bg-amber-50 border border-amber-100 rounded-full items-center justify-center shadow-sm">
          <Ionicons name="location-outline" size={40} color="#E29E10" />
        </View>
        <View className="items-center px-4">
          <Text className="text-lg font-bold text-gray-900 text-center">Location Access Required</Text>
          <Text className="text-sm text-gray-400 font-semibold text-center mt-1.5 leading-relaxed">
            Dine Five uses your location to show nearby food options and restaurants on the map. Please enable location permissions.
          </Text>
        </View>
        <View className="w-full gap-y-3 px-6">
          <TouchableOpacity
            onPress={handleAutoLocate}
            className="bg-[#E29E10] h-12 rounded-2xl flex-row items-center justify-center gap-2 shadow-sm"
          >
            <Ionicons name="pin" size={16} color="#FFF" />
            <Text className="text-white font-extrabold text-sm">Enable Location Access</Text>
          </TouchableOpacity>

          <View className="w-full border-t border-gray-200/60 my-1 pt-3">
            <Text className="text-xs font-bold text-gray-500 mb-2">Or enter address manually:</Text>
            <View className="flex-row items-center gap-2 bg-white border border-gray-200 rounded-2xl px-3 py-1.5 shadow-sm">
              <Ionicons name="search" size={16} color="#9CA3AF" />
              <TextInput
                value={manualMapAddressInput}
                onChangeText={setManualMapAddressInput}
                placeholder="e.g. New York, Dhaka..."
                placeholderTextColor="#9CA3AF"
                className="flex-1 text-sm text-gray-800 py-1"
              />
              {manualMapAddressInput.trim().length > 0 && (
                <TouchableOpacity
                  onPress={async () => {
                    if (isSearchingMapAddress) return;
                    setIsSearchingMapAddress(true);
                    const res = await setLocationManually(manualMapAddressInput);
                    setIsSearchingMapAddress(false);
                    if (res && res.success) {
                      setAddressLabel(manualMapAddressInput);
                      if (res.location && mapRef.current) {
                        mapRef.current.animateToRegion({
                          ...res.location,
                          latitudeDelta: 0.002,
                          longitudeDelta: 0.002,
                        }, 1000);
                      }
                    } else {
                      Alert.alert("Error", res?.error || "Could not resolve address. Please try again.");
                    }
                  }}
                  className="bg-[#E29E10] px-3.5 py-1.5 rounded-xl"
                >
                  {isSearchingMapAddress ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text className="text-white text-xs font-extrabold">Set</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (locationLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FDFBF7]">
        <ActivityIndicator size="large" color="#FFC107" />
        <Text className="mt-4 text-gray-500 text-sm">Locating you...</Text>
      </View>
    );
  }

  if (restaurantsError && restaurants.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FDFBF7] px-8">
        <Ionicons name="wifi-outline" size={48} color="#D1D5DB" />
        <Text className="mt-4 text-gray-500 text-center text-sm">{restaurantsError}</Text>
        <TouchableOpacity
          onPress={() => {
            if (mealFilter === "free") {
              fetchFreeMeals({ page: 1, limit: 20 });
            } else {
              fetchNearbyRestaurants({
                latitude: userLat,
                longitude: userLng,
                radius: radiusMeters,
                cuisine: cuisineFilter,
                sortBy: "distance",
                page: 1,
                limit: 20,
              });
            }
          }}
          className="mt-6 bg-[#FFC107] px-8 py-3 rounded-full shadow-sm"
        >
          <Text className="font-bold text-gray-900">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100">
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
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        onPress={() => setSelectedRestaurant(null)}
      >
        {hasLocation && (
          <Marker
            coordinate={{ latitude: userLat, longitude: userLng }}
            title="My Location"
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View className="w-6 h-6 items-center justify-center">
              <View className="absolute w-5 h-5 bg-blue-500/20 rounded-full border border-blue-500/30" />
              <View className="w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-white shadow-sm" />
            </View>
          </Marker>
        )}

        {filteredRestaurants.map((restaurant) => {
          const coords = getRestaurantCoords(restaurant);
          if (!coords) return null;

          const isSelected = selectedRestaurant?.id === restaurant.id;

          return (
            <Marker
              key={restaurant.id}
              coordinate={coords}
              onPress={() => handleMarkerPress(restaurant)}
            >
              <View className="items-center justify-center">
                {/* Distance Badge */}
                <View className="bg-[#FFC107] px-2 py-0.5 rounded-full mb-0.5 shadow-md border border-white">
                  <Text className="text-[11px] font-black text-gray-900">
                    {formatRestaurantDistance(restaurant.distance)}
                  </Text>
                </View>

                {/* Restaurant Icon */}
                <View
                  className={`w-10 h-10 rounded-full items-center justify-center border-2 shadow-md ${isSelected ? "bg-[#FFC107] border-[#FFC107]" : "bg-white border-white"}`}
                >
                  <Ionicons
                    name="restaurant"
                    size={18}
                    color={isSelected ? "#fff" : "#FFC107"}
                  />
                </View>
              </View>
            </Marker>
          );
        })}
      </MapView>

      <View className="absolute top-4 left-4 right-4">
        <View className="flex-row items-center">
          <View className="bg-white p-1.5 rounded-xl shadow-md mr-3 border border-gray-100">
            <Image
              source={require("@/assets/images/icon.png")}
              style={{ width: 34, height: 34 }}
              resizeMode="contain"
            />
          </View>

          <View className="flex-1 bg-white rounded-full h-[46px] shadow-md flex-row items-center px-4 border border-gray-100">
            <View className="flex-row items-center flex-1">
              <Ionicons name="search-outline" size={20} color="#D1D5DB" />
              <TextInput
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search"
                placeholderTextColor="#D1D5DB"
                className="flex-1 ml-2 text-[15px] text-gray-700"
              />
            </View>

            {/* auto locate. also picker button */}
            <TouchableOpacity onPress={handleAutoLocate} className="p-1">
              <Ionicons name="locate-outline" size={20} color="#FFC107" />
            </TouchableOpacity>
            <View className="w-[1px] h-5 bg-gray-200 mx-2" />
            <TouchableOpacity onPress={handlePickerPress} className="flex-row items-center">
              <Ionicons name="location-sharp" size={18} color="#9CA3AF" />
              <Text className="ml-1 text-[14px] text-[#9CA3AF] font-medium max-w-[120px]" numberOfLines={1}>
                {addressLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-2"
          contentContainerStyle={{ gap: 6, paddingHorizontal: 2 }}
        >
          {RADIUS_STEPS.map((radius) => {
            const active = radius === radiusMeters;
            return (
              <TouchableOpacity
                key={radius}
                onPress={() => handleRadiusPress(radius)}
                className={`px-3 py-1.5 rounded-full border ${active ? "bg-[#FFC107] border-[#FFC107]" : "bg-white border-gray-200"
                  }`}
              >
                <Text className={`text-xs font-semibold ${active ? "text-gray-900" : "text-gray-500"}`}>
                  {formatRadius(radius)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View className="absolute top-[100px] left-4 bg-white px-3 py-1.5 rounded-full shadow-md border border-gray-100">
        {restaurantsLoading ? (
          <View className="flex-row items-center gap-2">
            <ActivityIndicator size="small" color="#FFC107" />
            <Text className="text-xs text-gray-500">Searching...</Text>
          </View>
        ) : (
          <Text className="text-xs font-semibold text-gray-700">
            {isShowingHomeProviders
              ? `${filteredRestaurants.length} providers available`
              : `${filteredRestaurants.length} found within ${formatRadius(radiusMeters)}`}
          </Text>
        )}
      </View>

      <View className="absolute bottom-36 left-0 right-0">
        <View className="flex-row justify-center gap-3 px-4 mb-4">
          <TouchableOpacity
            onPress={async () => {
              if (mealFilter === "all") return;
              const newFilter = "all";
              setMealFilter(newFilter);
              setActiveFeedMode(newFilter);
              setActiveCardIndex(0);
              setSelectedRestaurant(null);

              useRestaurantStore.setState({
                restaurants: [],
                restaurantsError: null,
                availableTokenCount: 0,
              });

              if (!hasLocation) return;

              fetchNearbyRestaurants({
                latitude: userLat,
                longitude: userLng,
                radius: radiusMeters,
                cuisine: cuisineFilter,
                sortBy: "distance",
                page: 1,
                limit: 20,
                freeNearYou: false,
              });
            }}
            className={`flex-1 flex-row items-center justify-center px-4 py-2.5 rounded-full shadow-lg border ${mealFilter === "all" ? "bg-[#FFC107] border-white" : "bg-white border-gray-100"
              }`}
            activeOpacity={0.8}
          >
            <Ionicons
              name="restaurant"
              size={16}
              color={mealFilter === "all" ? "#000" : "#6B7280"}
            />
            <Text className={`font-bold text-[12px] ml-2 uppercase tracking-tight ${mealFilter === "all" ? "text-gray-900" : "text-gray-500"
              }`}>
              Meal near you
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              if (mealFilter === "free") return;
              const newFilter = "free";
              setMealFilter(newFilter);
              setActiveFeedMode(newFilter);
              setActiveCardIndex(0);
              setSelectedRestaurant(null);

              useRestaurantStore.setState({
                restaurants: [],
                restaurantsError: null,
                availableTokenCount: 0,
              });

              if (!hasLocation) return;
              await fetchFreeMeals({ page: 1, limit: 20 });
            }}
            className={`flex-1 flex-row items-center justify-center px-4 py-2.5 rounded-full shadow-lg border ${mealFilter === "free" ? "bg-[#FFC107] border-white" : "bg-white border-gray-100"
              }`}
            activeOpacity={0.8}
          >
            <Ionicons
              name="gift"
              size={16}
              color={mealFilter === "free" ? "#000" : "#6B7280"}
            />
            <Text className={`font-bold text-[12px] ml-2 uppercase tracking-tight ${mealFilter === "free" ? "text-gray-900" : "text-gray-500"
              }`}>
              free meal near you
            </Text>
          </TouchableOpacity>
        </View>

        {restaurantsLoading ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 12,
              gap: CARD_GAP,
            }}
          >
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </ScrollView>
        ) : filteredRestaurants.length === 0 ? (
          <View className="mx-4 bg-white/95 rounded-2xl px-4 py-3 shadow-md">
            <Text className="text-sm text-gray-500 text-center">
              No restaurants found in this area.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={filteredRestaurants}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_SNAP_INTERVAL}
            decelerationRate="fast"
            snapToAlignment="start"
            onMomentumScrollEnd={handleCardSnap}
            contentContainerStyle={{
              paddingLeft: 12,
              paddingRight: 12,
              gap: CARD_GAP,
            }}
            getItemLayout={(_, index) => ({
              length: CARD_SNAP_INTERVAL,
              offset: CARD_SNAP_INTERVAL * index,
              index,
            })}
            renderItem={({ item, index }) => {
              const isActive = index === activeCardIndex;
              const isSelected = selectedRestaurant?.id === item.id;
              const cuisine = item.cuisine?.[0] || "cake";
              const rating = toNumber((item as any).rating ?? (item as any).averageRating, 4.2);
              const isFreeMode = mealFilter === "free";

              return (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => openRestaurantDetail(item)}
                  style={{ width: CARD_WIDTH }}
                >
                  <View
                    className={`rounded-3xl bg-white overflow-hidden ${isSelected ? "border-2 border-[#FFC107]" : "border border-gray-100"} ${isActive ? "scale-100 opacity-100" : "scale-95 opacity-80"}`}
                  >
                    {isFreeMode ? (
                      <View className="flex-row items-center px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                        <View className="w-7 h-7 rounded-full bg-gray-200 overflow-hidden mr-2 border border-white">
                          <Image
                            source={{ uri: (item as any).profile }}
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                        </View>
                        <Text className="text-xs font-bold text-gray-700 flex-1" numberOfLines={1}>
                          {item.restaurantName}
                        </Text>
                        <View className="bg-green-100 px-2 py-0.5 rounded-full">
                          <Text className="text-[10px] font-bold text-green-700 uppercase">Free</Text>
                        </View>
                      </View>
                    ) : null}

                    <Image
                      source={{ uri: isFreeMode ? ((item as any).image || (item as any).foodImage || (item as any).mealImage || (item as any).profile) : getRestaurantImage(item) }}
                      className="w-full h-32"
                      resizeMode="cover"
                    />

                    <View className="px-3 py-2.5">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-base font-bold text-gray-900 flex-1" numberOfLines={1}>
                          {isFreeMode ? ((item as any).name || (item as any).title || (item as any).mealName) : item.restaurantName}
                        </Text>
                      </View>

                      <View className="flex-row items-center mt-1">
                        <Ionicons name="star" size={12} color="#F5C518" />
                        <Text className="text-xs text-gray-600 ml-1">{rating.toFixed(1)}</Text>
                        <Text className="text-xs text-gray-300 mx-2">|</Text>
                        <Text className="text-xs text-gray-600">{isFreeMode ? "Free Meal" : cuisine}</Text>
                      </View>

                      <View className="flex-row items-center justify-between pt-3 border-t border-gray-50">
                        <View className="flex-row items-center">
                          <Ionicons name="navigate-outline" size={14} color="#FFC107" />
                          <Text className="text-[11px] font-bold text-gray-700 ml-1">
                            {formatRestaurantDistance(item.distance)}
                          </Text>
                        </View>

                        <TouchableOpacity
                           className="bg-[#FFC107] px-5 py-2 rounded-2xl shadow-sm"
                           onPress={() => openRestaurantDetail(item)}
                         >
                           <Text className="text-gray-900 font-black text-[11px] uppercase tracking-wide">
                             View Details
                           </Text>
                         </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
        <AddressModal
          visible={isAddressModalVisible}
          onClose={() => setIsAddressModalVisible(false)}
          onConfirm={handleAddressModalConfirm}
        />
      </View>
    </View>
  );
}

function AddressModal({
  visible,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (address: string) => Promise<boolean>;
}) {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!address.trim()) return;
    setLoading(true);
    const success = await onConfirm(address);
    setLoading(false);
    if (success) {
      setAddress("");
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
        <View className="bg-white rounded-[28px] w-full p-6 shadow-xl gap-y-4">
          <View className="flex-row justify-between items-center">
            <Text className="text-lg font-black text-gray-900">Set Location</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
          <Text className="text-xs text-gray-400 font-semibold leading-relaxed">
            Enter your address, city, or zip code below to find nearby restaurants:
          </Text>
          <View className="flex-row items-center gap-2 bg-gray-50 border border-gray-100 rounded-2xl px-3 py-2">
            <Ionicons name="location-outline" size={18} color="#9CA3AF" />
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="e.g. New York, Dhaka..."
              placeholderTextColor="#9CA3AF"
              className="flex-1 text-sm text-gray-800 py-1"
              autoFocus
            />
          </View>
          <View className="flex-row gap-3 mt-2">
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 bg-gray-50 border border-gray-200/60 h-12 rounded-2xl items-center justify-center"
            >
              <Text className="text-gray-500 font-extrabold text-sm">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSearch}
              disabled={loading || !address.trim()}
              className={`flex-1 bg-[#E29E10] h-12 rounded-2xl items-center justify-center ${loading || !address.trim() ? 'opacity-60' : ''}`}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text className="text-white font-extrabold text-sm">Search</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
