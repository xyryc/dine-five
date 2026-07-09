import { useStore } from "@/stores/stores";
import { useRestaurantStore } from "@/stores/useRestaurantStore";
import { restaurantService } from "@/stores/restaurantService";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";

type Restaurant = any;

const formatDistance = (distanceKm?: any) => {
  const dist = Number(distanceKm);
  if (!Number.isFinite(dist)) return "";
  if (dist < 1) return `${Math.max(1, Math.round(dist * 1000))} m`;
  return `${dist.toFixed(1)} mi`;
};

const getCuisineLabel = (restaurant: Restaurant) =>
  restaurant?.cuisine?.filter(Boolean).join(" • ") || "Restaurant";

export default function AllRestaurantsScreen() {
  const router = useRouter();
  const { location, fetchLocation, setLocationManually, locationLoading } = useRestaurantStore();
  const { fetchCategories } = useStore() as any;

  // Filter and Search States
  const [searchText, setSearchText] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState<"distance" | "rating">("distance");
  const [radiusMeters, setRadiusMeters] = useState(16000); // Default 10 miles
  const [freeMealsOnly, setFreeMealsOnly] = useState(false);

  // Location States
  const [locationName, setLocationName] = useState<string>("Detecting location...");
  const [addressSearch, setAddressSearch] = useState("");
  const [locationSearching, setLocationSearching] = useState(false);

  // Data Loading States
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dynamicCategories, setDynamicCategories] = useState<any[]>([]);

  // Reverse geocode user location to display address name
  useEffect(() => {
    const getAddress = async () => {
      if (location) {
        try {
          const reverse = await Location.reverseGeocodeAsync({
            latitude: location.latitude,
            longitude: location.longitude,
          });
          if (reverse && reverse.length > 0) {
            const addr = reverse[0];
            const city = addr.city || addr.subregion || "";
            const street = addr.street || addr.name || "";
            const region = addr.region || "";
            const name = [street, city, region].filter(Boolean).join(", ");
            setLocationName(name || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`);
          } else {
            setLocationName(`${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`);
          }
        } catch (err) {
          setLocationName(`${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`);
        }
      } else {
        setLocationName("Unknown Location");
      }
    };
    getAddress();
  }, [location]);

  const handleLocationSearch = async () => {
    if (!addressSearch.trim()) return;
    setLocationSearching(true);
    try {
      const result = await setLocationManually(addressSearch);
      if (result.success) {
        setAddressSearch(""); // Clear search field
      } else {
        Alert.alert(
          "Location Not Found",
          "Could not find coordinates for this address. Please try another query."
        );
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to search location.");
    } finally {
      setLocationSearching(false);
    }
  };

  // Fetch Categories
  const fetchCategoriesData = useCallback(async () => {
    try {
      const result = await fetchCategories?.();
      setDynamicCategories(result || []);
    } catch (err) {
      console.log("Error fetching categories:", err);
    }
  }, [fetchCategories]);

  // Dynamically compute unique categories from API metadata & currently loaded restaurants
  const categories = React.useMemo(() => {
    const cuisineSet = new Set<string>();

    if (Array.isArray(dynamicCategories)) {
      dynamicCategories.forEach((cat: any) => {
        if (cat?.categoryName) cuisineSet.add(cat.categoryName);
      });
    }

    if (Array.isArray(restaurants)) {
      restaurants.forEach((restaurant) => {
        if (Array.isArray(restaurant?.cuisine)) {
          restaurant.cuisine.forEach((cuisine: any) => {
            if (cuisine) cuisineSet.add(String(cuisine));
          });
        }
      });
    }

    return ["All", ...Array.from(cuisineSet)];
  }, [dynamicCategories, restaurants]);

  // Fetch Restaurants
  const loadRestaurants = useCallback(async (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);
    setError(null);

    const lat = location?.latitude ?? 40.7128; // fallback coordinates
    const lng = location?.longitude ?? -74.006;

    try {
      const params = {
        latitude: lat,
        longitude: lng,
        radius: radiusMeters,
        sortBy,
        freeNearYou: freeMealsOnly,
        cuisine: activeCategory === "All" ? undefined : activeCategory,
        search: searchText.trim() || undefined,
        limit: 100,
      };

      console.log("🔍 [AllRestaurantsScreen] Fetching nearby restaurants:", params);
      const response = await restaurantService.getNearby(params);
      
      if (response.success) {
        setRestaurants(response.data ?? []);
      } else {
        setError(response.message || "Failed to load restaurants.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [location, radiusMeters, sortBy, freeMealsOnly, activeCategory, searchText]);

  // Initial load
  useEffect(() => {
    fetchLocation();
    fetchCategoriesData();
  }, [fetchLocation, fetchCategoriesData]);

  // Keep active category "All" if selected category becomes missing
  useEffect(() => {
    if (!categories.includes(activeCategory)) {
      setActiveCategory("All");
    }
  }, [activeCategory, categories]);

  // Debounced load on search or filter change
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      loadRestaurants();
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [loadRestaurants]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLocation();
    loadRestaurants(true);
  };

  const handleOpenRestaurant = (restaurant: Restaurant) => {
    router.push({
      pathname: "/screens/home/restaurant-details",
      params: {
        providerId: restaurant.providerId || restaurant.id,
        isFreeAvailable: restaurant.isFreeAvailable ? "true" : "false",
        freeTokenCount: String(restaurant.freeTokenCount || 0),
        name: restaurant.restaurantName || restaurant.name || "",
        image: restaurant.profile || restaurant.image || "",
        rating: restaurant.rating !== undefined && restaurant.rating !== null ? String(restaurant.rating) : "",
        address: restaurant.restaurantAddress || "",
        distance: restaurant.distance || "",
      },
    });
  };

  const renderRestaurantCard = ({ item }: { item: Restaurant }) => {
    const rating = (() => {
      const r = Number(item.rating);
      return Number.isFinite(r) ? r.toFixed(1) : "4.2";
    })();
    const cuisineLabel = getCuisineLabel(item);
    const distanceLabel = formatDistance(item.distance);
    const deliveryMin =
      item.deliveryTimeMinutes ??
      Math.max(5, Math.min(30, Math.round((Number(item.distance) || 0) * 2) + 5));

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => handleOpenRestaurant(item)}
        className="flex-row bg-white rounded-3xl p-3 mb-4 items-center border border-gray-100/60 shadow-sm"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.02,
          shadowRadius: 6,
          elevation: 1,
        }}
      >
        {/* Restaurant Image */}
        <View className="w-24 h-24 rounded-2xl overflow-hidden bg-gray-50 mr-4">
          {item.profile || item.image ? (
            <Image
              source={{ uri: item.profile || item.image }}
              className="w-24 h-24"
              resizeMode="cover"
            />
          ) : (
            <View className="w-24 h-24 items-center justify-center bg-gray-50">
              <Ionicons name="restaurant-outline" size={26} color="#9CA3AF" />
            </View>
          )}
        </View>

        {/* Info Column */}
        <View className="flex-1 py-1 justify-center">
          <View className="flex-row justify-between items-center pr-1">
            <Text
              className="text-sm font-black text-gray-900 flex-1 mr-2"
              numberOfLines={1}
            >
              {item.restaurantName || item.name}
            </Text>
            {item.isFreeAvailable && (
              <View className="bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
                <Text className="text-[9px] font-black text-emerald-800 uppercase tracking-wide">
                  Free
                </Text>
              </View>
            )}
          </View>

          <Text
            className="text-[11px] text-gray-400 font-semibold mt-0.5 mb-2 pr-2"
            numberOfLines={1}
          >
            {cuisineLabel}
          </Text>

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              {/* Rating */}
              <View className="flex-row items-center bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 gap-1">
                <Ionicons name="star" size={11} color="#F5C518" />
                <Text className="text-[10px] font-black text-amber-800">
                  {rating}
                </Text>
              </View>

              {/* Distance */}
              {distanceLabel ? (
                <View className="flex-row items-center gap-0.5">
                  <Ionicons name="location-outline" size={11} color="#6B7280" />
                  <Text className="text-[10px] font-bold text-gray-500">
                    {distanceLabel}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Delivery time */}
            <View className="flex-row items-center bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
              <Ionicons name="time-outline" size={10} color="#6B7280" />
              <Text className="text-[10px] font-bold text-gray-600 ml-1">
                {deliveryMin} min
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-4 py-3 justify-between border-b border-gray-50">
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "#F9FAFB",
            borderWidth: 1,
            borderColor: "#F3F4F6",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="chevron-back" size={20} color="#1F2937" />
        </TouchableOpacity>

        <Text className="text-base font-black text-gray-900">All Restaurants</Text>

        <View className="w-10" />
      </View>

      {/* Scrollable Filters & List */}
      <FlatList
        data={restaurants}
        keyExtractor={(item) => item.providerId || item.id}
        renderItem={renderRestaurantCard}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#F5C518"]} />
        }
        ListHeaderComponent={
          <View className="pt-4 pb-3">
            {/* Location Selector Card */}
            <View className="bg-amber-50 border border-amber-100 rounded-3xl p-4 mb-4 shadow-sm">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center flex-1 mr-2">
                  <Ionicons name="location" size={18} color="#F5C518" />
                  <Text className="text-xs font-black text-gray-900 ml-1.5 flex-1" numberOfLines={1}>
                    {locationName}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={async () => {
                    setLocationSearching(true);
                    await fetchLocation(true);
                    setLocationSearching(false);
                  }}
                  disabled={locationLoading || locationSearching}
                  className="flex-row items-center bg-white border border-gray-200 px-3 py-1.5 rounded-full"
                >
                  {(locationLoading || locationSearching) ? (
                    <ActivityIndicator size="small" color="#1F2937" style={{ marginRight: 4 }} />
                  ) : (
                    <Ionicons name="locate" size={14} color="#1F2937" style={{ marginRight: 4 }} />
                  )}
                  <Text className="text-[10px] font-black text-gray-800">Locate Me</Text>
                </TouchableOpacity>
              </View>

              {/* Location Search Bar */}
              <View className="flex-row items-center bg-white rounded-2xl border border-gray-200 px-3 shadow-inner">
                <Ionicons name="map-outline" size={16} color="#9CA3AF" />
                <TextInput
                  placeholder="Enter city, address or zip code..."
                  className="flex-1 ml-2 text-gray-700 text-xs py-2"
                  placeholderTextColor="#9CA3AF"
                  value={addressSearch}
                  onChangeText={setAddressSearch}
                  onSubmitEditing={handleLocationSearch}
                />
                {addressSearch ? (
                  <TouchableOpacity onPress={() => setAddressSearch("")} className="mr-1.5">
                    <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  onPress={handleLocationSearch}
                  disabled={!addressSearch.trim() || locationSearching}
                  className="bg-gray-900 px-3 py-1.5 rounded-xl"
                >
                  <Text className="text-white text-[10px] font-black">Search</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Search Input */}
            <View className="flex-row items-center bg-gray-50 rounded-2xl border border-gray-100 px-3 shadow-sm mb-4">
              <Ionicons name="search-outline" size={18} color="#9CA3AF" />
              <TextInput
                placeholder="Search restaurants, cuisines..."
                className="flex-1 ml-2 text-gray-700 text-sm py-2.5"
                placeholderTextColor="#9CA3AF"
                value={searchText}
                onChangeText={setSearchText}
              />
              {searchText ? (
                <TouchableOpacity onPress={() => setSearchText("")} className="mr-1">
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* dynamic Category Chips (Horizontal list) */}
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={categories}
              keyExtractor={(item) => item}
              contentContainerStyle={{ gap: 8 }}
              className="mb-4"
              renderItem={({ item }) => {
                const isActive = activeCategory === item;
                return (
                  <TouchableOpacity
                    onPress={() => setActiveCategory(item)}
                    activeOpacity={0.8}
                    style={{
                      backgroundColor: isActive ? "#1F2937" : "#F9FAFB",
                      borderColor: isActive ? "#1F2937" : "#F3F4F6",
                      borderWidth: 1,
                      borderRadius: 9999,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                    }}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isActive ? "text-[#F5C518]" : "text-gray-500"
                      }`}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />

            {/* Second row filters: Sort By and Free Only */}
            <View className="flex-row items-center justify-between gap-3 mb-4">
              {/* Sort selector */}
              <View className="flex-row bg-gray-100 p-0.5 rounded-full flex-1">
                <TouchableOpacity
                  onPress={() => setSortBy("distance")}
                  className={`flex-1 py-1.5 rounded-full items-center ${
                    sortBy === "distance" ? "bg-white shadow-sm" : ""
                  }`}
                >
                  <Text className="text-[10px] font-bold text-gray-700">Distance</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSortBy("rating")}
                  className={`flex-1 py-1.5 rounded-full items-center ${
                    sortBy === "rating" ? "bg-white shadow-sm" : ""
                  }`}
                >
                  <Text className="text-[10px] font-bold text-gray-700">Rating</Text>
                </TouchableOpacity>
              </View>

              {/* Free Meals Toggle */}
              <TouchableOpacity
                onPress={() => setFreeMealsOnly(!freeMealsOnly)}
                activeOpacity={0.8}
                className={`flex-row items-center px-4 py-2 rounded-full border ${
                  freeMealsOnly
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-gray-50 border-gray-100"
                }`}
              >
                <Ionicons
                  name={freeMealsOnly ? "checkbox" : "square-outline"}
                  size={14}
                  color={freeMealsOnly ? "#10B981" : "#9CA3AF"}
                />
                <Text
                  className={`text-[10px] font-extrabold ml-1.5 ${
                    freeMealsOnly ? "text-emerald-800" : "text-gray-600"
                  }`}
                >
                  Free Meals Only
                </Text>
              </TouchableOpacity>
            </View>

            {/* Third row: Radius Filters */}
            <View className="mb-2">
              <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                Distance Radius
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {[
                  { label: "1 mi", value: 1600 },
                  { label: "5 mi", value: 8000 },
                  { label: "10 mi", value: 16000 },
                  { label: "25 mi", value: 40000 },
                  { label: "50 mi", value: 80000 },
                ].map((rad) => {
                  const isActive = radiusMeters === rad.value;
                  return (
                    <TouchableOpacity
                      key={rad.label}
                      onPress={() => setRadiusMeters(rad.value)}
                      className={`px-3 py-1.5 rounded-full border ${
                        isActive
                          ? "bg-amber-100 border-amber-300"
                          : "bg-gray-50 border-gray-100"
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-bold ${
                          isActive ? "text-amber-800" : "text-gray-500"
                        }`}
                      >
                        {rad.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <View className="items-center justify-center py-16 px-6">
              <View className="w-16 h-16 bg-[#FFFBEB] rounded-full items-center justify-center mb-4">
                <Ionicons name="restaurant-outline" size={28} color="#F5C518" />
              </View>
              <Text className="text-base font-bold text-[#1C1C1C] mb-1">
                No Restaurants Found
              </Text>
              <Text className="text-xs text-gray-400 text-center max-w-[260px] leading-relaxed">
                {error ? error : "We couldn't find any restaurants matching your filters or location. Try searching for something else or adjusting your filters."}
              </Text>
              {error ? (
                <TouchableOpacity
                  onPress={() => loadRestaurants()}
                  className="mt-5 px-5 py-2.5 bg-gray-900 rounded-xl"
                >
                  <Text className="text-white text-xs font-black uppercase tracking-wider">
                    Retry Loading
                  </Text>
                </TouchableOpacity>
              ) : (
                (searchText || activeCategory !== "All" || freeMealsOnly || radiusMeters !== 16000) && (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchText("");
                      setActiveCategory("All");
                      setSortBy("distance");
                      setRadiusMeters(16000);
                      setFreeMealsOnly(false);
                    }}
                    className="mt-5 px-5 py-2.5 bg-gray-900 rounded-xl"
                  >
                    <Text className="text-white text-xs font-black uppercase tracking-wider">
                      Clear Filters
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          )
        }
        ListFooterComponent={
          loading ? (
            <View className="py-6 items-center justify-center">
              <ActivityIndicator size="small" color="#F5C518" />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
