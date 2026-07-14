import { Categories } from "@/components/home/Categories";
import { DonateCard } from "@/components/home/DonateCard";
import { HomeHeader } from "@/components/home/HomeHeader";
import { PromoBanner } from "@/components/home/PromoBanner";
import { RestaurantSection, SectionErrorBoundary } from "@/components/home/RestaurantSection";
import { useStore } from "@/stores/stores";
import {
  type Restaurant,
  useRestaurantStore,
} from "@/stores/useRestaurantStore";
import { extractHomeRestaurants } from "@/utils/homeFeedRestaurants";
import { getUserAvatarUri, normalizeImageUri } from "@/utils/userAvatar";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type BannerData = {
  title: string;
  subtitle: string;
  ctaText: string;
  image: string;
};

type RestaurantSectionData = {
  title: string;
  items: Restaurant[];
};

const FALLBACK_PROMO: BannerData = {
  title: "Welcome to Dine Five!",
  subtitle: "Discover restaurants near you",
  ctaText: "Explore",
  image:
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&q=80",
};
const pickString = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
};

const normalizeBannerList = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.banners)) return payload.banners;
  return [];
};

const normalizeBanner = (payload: any): BannerData => {
  const banner = normalizeBannerList(payload)[0] ?? payload?.data ?? payload ?? {};

  return {
    title:
      pickString(banner?.title, banner?.headline, banner?.name) ||
      FALLBACK_PROMO.title,
    subtitle:
      pickString(
        banner?.subtitle,
        banner?.description,
        banner?.tagline,
        banner?.subTitle,
      ) || FALLBACK_PROMO.subtitle,
    ctaText:
      pickString(
        banner?.ctaText,
        banner?.buttonText,
        banner?.actionText,
      ) || FALLBACK_PROMO.ctaText,
    image:
      normalizeImageUri(
        pickString(
          banner?.image,
          banner?.imageUrl,
          banner?.bannerImage,
          banner?.thumbnail,
        ),
      ) || FALLBACK_PROMO.image,
  };
};

const formatDistance = (distanceKm?: number) => {
  if (typeof distanceKm !== "number" || !Number.isFinite(distanceKm)) return "";
  if (distanceKm < 1) return `${Math.max(1, Math.round(distanceKm * 1000))} m`;
  return `${distanceKm.toFixed(1)} mi`;
};




export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const { fetchBanners, fetchProfile, fetchCategories, fetchHomeFeed, user } = useStore() as any;
  const {
    location,
    locationLoading,
    locationPermissionGranted,
    restaurants: storeRestaurants,
    restaurantsLoading,
    restaurantsError,
    fetchLocation,
    fetchNearbyRestaurants,
    setLocationManually,
  } = useRestaurantStore();

  const [homeFeed, setHomeFeed] = React.useState<any>(null);
  const [manualAddressInput, setManualAddressInput] = React.useState("");
  const [isSearchingAddress, setIsSearchingAddress] = React.useState(false);
  const [isAddressModalVisible, setIsAddressModalVisible] = React.useState(false);

  const { setHomeRestaurants } = useRestaurantStore();

  const extractedHomeRestaurants = React.useMemo(
    () => extractHomeRestaurants(homeFeed, []),
    [homeFeed],
  );

  const restaurants = React.useMemo((): Restaurant[] => {
    return storeRestaurants || [];
  }, [storeRestaurants]);

  React.useEffect(() => {
    setHomeRestaurants(extractedHomeRestaurants);
  }, [extractedHomeRestaurants, setHomeRestaurants]);

  const [searchText, setSearchText] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState("All");
  const [bannerPayload, setBannerPayload] = React.useState<any>(null);
  const [dynamicCategories, setDynamicCategories] = React.useState<any[]>([]);
  const [currentLocationLabel, setCurrentLocationLabel] = React.useState("");
  const [refreshing, setRefreshing] = React.useState(false);

  const loadBannerData = React.useCallback(async () => {
    try {
      const payload = await fetchBanners?.();
      setBannerPayload(payload ?? null);
    } catch {
      setBannerPayload(null);
    }
  }, [fetchBanners]);

  const loadCategories = React.useCallback(async () => {
    try {
      const data = await fetchCategories?.();
      setDynamicCategories(data || []);
    } catch (error) {
      console.log("Error loading categories:", error);
    }
  }, [fetchCategories]);

  const loadHomeFeed = React.useCallback(async () => {
    try {
      const data = await fetchHomeFeed?.();
      setHomeFeed(data);
    } catch (error) {
      console.log("Error loading home feed:", error);
    }
  }, [fetchHomeFeed]);

  const loadNearbyRestaurants = React.useCallback(
    async (
      targetLocation: { latitude: number; longitude: number } | null | undefined,
      searchQuery = "",
      cuisineFilter = "All",
    ) => {
      if (!targetLocation) return;

      console.log("🔍 [HomeScreen] Querying Nearby API:", {
        latitude: targetLocation.latitude,
        longitude: targetLocation.longitude,
        radius: 100000,
        search: searchQuery.trim() || undefined,
      });

      await fetchNearbyRestaurants({
        latitude: targetLocation.latitude,
        longitude: targetLocation.longitude,
        radius: 100000,
        limit: 100,
        sortBy: "distance",
        search: searchQuery.trim() || undefined,
      });
    },
    [fetchNearbyRestaurants],
  );

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);

    try {
      const nextLocationPromise = fetchLocation().catch(() => undefined);

      await Promise.allSettled([
        loadBannerData(),
        loadCategories(),
        loadHomeFeed(),
        fetchProfile?.(),
        nextLocationPromise,
      ]);

      const latestLocation = useRestaurantStore.getState().location ?? location;
      await loadNearbyRestaurants(latestLocation, searchText);
    } finally {
      setRefreshing(false);
    }
  }, [
    fetchLocation,
    fetchProfile,
    loadBannerData,
    loadCategories,
    loadHomeFeed,
    loadNearbyRestaurants,
    location,
    searchText,
  ]);

  React.useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  React.useEffect(() => {
    loadBannerData();
    loadCategories();
    loadHomeFeed();
  }, [loadBannerData, loadCategories, loadHomeFeed]);

  React.useEffect(() => {
    if (params.category) {
      setActiveCategory(String(params.category));
    }
  }, [params.category]);

  React.useEffect(() => {
    let isMounted = true;

    const resolveLocationLabel = async () => {
      if (!location) return;

      try {
        const result = await Location.reverseGeocodeAsync({
          latitude: location.latitude,
          longitude: location.longitude,
        });

        if (!isMounted) return;

        const place = result?.[0];
        const label = pickString(
          place?.district,
          place?.subregion,
          place?.city,
          place?.region,
          place?.street,
        );

        setCurrentLocationLabel(label);
      } catch {
        if (isMounted) {
          setCurrentLocationLabel("Current Location");
        }
      }
    };

    resolveLocationLabel();

    return () => {
      isMounted = false;
    };
  }, [location]);

  React.useEffect(() => {
    const delayDebounceId = setTimeout(() => {
      loadNearbyRestaurants(location, searchText);
    }, 400);

    return () => clearTimeout(delayDebounceId);
  }, [loadNearbyRestaurants, location, searchText]);

  const categories = React.useMemo(() => {
    const cuisineSet = new Set<string>();

    // Add categories from API
    if (Array.isArray(dynamicCategories)) {
      dynamicCategories.forEach((cat: any) => {
        if (cat?.categoryName) cuisineSet.add(cat.categoryName);
      });
    }

    // Add categories from restaurants
    if (Array.isArray(restaurants)) {
      restaurants.forEach((restaurant) => {
        if (Array.isArray(restaurant?.cuisine)) {
          restaurant.cuisine.forEach((cuisine) => {
            if (cuisine) cuisineSet.add(cuisine);
          });
        }
      });
    }

    return ["All", ...Array.from(cuisineSet)];
  }, [dynamicCategories, restaurants]);

  React.useEffect(() => {
    if (!categories.includes(activeCategory)) {
      setActiveCategory("All");
    }
  }, [activeCategory, categories]);

  const filteredRestaurants = React.useMemo(() => {
    const list = Array.isArray(restaurants) ? restaurants : [];

    return list.filter((restaurant) => {
      const matchesCategory =
        activeCategory === "All" ||
        (Array.isArray(restaurant?.cuisine) &&
          restaurant.cuisine.some(
            (cuisine) => cuisine && String(cuisine).toLowerCase() === activeCategory.toLowerCase(),
          ));
      return matchesCategory;
    });
  }, [activeCategory, restaurants]);

  const sections = React.useMemo<RestaurantSectionData[]>(() => {
    if (!filteredRestaurants.length) return [];

    if (filteredRestaurants.length <= 4) {
      return [{ title: "Start the Day", items: filteredRestaurants }];
    }

    if (filteredRestaurants.length <= 8) {
      const midpoint = Math.ceil(filteredRestaurants.length / 2);
      return [
        { title: "Start the Day", items: filteredRestaurants.slice(0, midpoint) },
        {
          title: "Late Night Cravings",
          items: filteredRestaurants.slice(midpoint),
        },
      ].filter((section) => section.items.length > 0);
    }

    const third = Math.ceil(filteredRestaurants.length / 3);
    return [
      { title: "Start the Day", items: filteredRestaurants.slice(0, third) },
      {
        title: "Late Night Cravings",
        items: filteredRestaurants.slice(third, third * 2),
      },
      {
        title: "Popular Near You",
        items: filteredRestaurants.slice(third * 2),
      },
    ].filter((section) => section.items.length > 0);
  }, [filteredRestaurants]);

  const promoDeals = React.useMemo((): BannerData[] => {
    const list = normalizeBannerList(bannerPayload);
    if (Array.isArray(list) && list.length > 0) {
      return list.map((b: any) => normalizeBanner(b));
    }
    return [normalizeBanner(bannerPayload)];
  }, [bannerPayload]);

  const userName = React.useMemo(() => {
    const fullName = pickString(user?.fullName, user?.name);
    if (fullName) return fullName;

    const firstName = pickString(user?.firstName);
    const lastName = pickString(user?.lastName);
    const combinedName = [firstName, lastName].filter(Boolean).join(", ").trim();

    return combinedName || pickString(user?.email) || "Maria's Kitchen";
  }, [user]);

  const locationLabel = React.useMemo(() => {
    return (
      pickString(
        currentLocationLabel,
        user?.address,
        user?.city,
        user?.state,
      ) || "Fetching location..."
    );
  }, [currentLocationLabel, user]);

  const profileImage = React.useMemo(
    () => getUserAvatarUri(user),
    [user],
  );

  const openRestaurantDetail = React.useCallback(
    (restaurant: Restaurant) => {
      router.push({
        pathname: "/screens/home/restaurant-details",
        params: {
          providerId: restaurant.providerId || restaurant.id,
        },
      });
    },
    [router],
  );

  const isInitialLoading =
    (locationLoading && restaurants.length === 0) ||
    (restaurantsLoading && restaurants.length === 0);

  const handleManualLocationPress = () => {
    setIsAddressModalVisible(true);
  };

  const handleAddressModalConfirm = async (address: string) => {
    const res = await setLocationManually(address);
    if (res && res.success) {
      setCurrentLocationLabel(address);
      return true;
    } else {
      Alert.alert("Error", res?.error || "Could not resolve address. Please try again.");
      return false;
    }
  };

  const handleLocationPress = () => {
    Alert.alert(
      "Update Location",
      "Choose how you want to set your address:",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Use GPS Location",
          onPress: () => fetchLocation(true),
        },
        {
          text: "Enter Address Manually",
          onPress: () => handleManualLocationPress(),
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <StatusBar style="dark" />
      <View style={{ paddingTop: insets.top, flex: 1, backgroundColor: '#FFFFFF' }}>
        <ScrollView
          style={{ flex: 1, backgroundColor: '#FFFFFF' }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100, backgroundColor: '#FFFFFF' }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#F5C518"
              colors={["#F5C518"]}
            />
          }
        >
          <DonateCard />
          <HomeHeader
            name={userName}
            location={locationLabel}
            profileImage={profileImage || undefined}
            onLocationPress={handleLocationPress}
          />

          {locationPermissionGranted === false ? (
            <View className="mx-6 my-10 p-6 bg-amber-50/50 border border-amber-100 rounded-[28px] items-center gap-y-4 shadow-sm">
              <View className="w-16 h-16 bg-amber-100 rounded-full items-center justify-center">
                <Ionicons name="location-outline" size={32} color="#E29E10" />
              </View>
              <View className="items-center px-4">
                <Text className="text-base font-bold text-gray-900 text-center">Location Access Required</Text>
                <Text className="text-xs text-gray-400 font-semibold text-center mt-1.5 leading-relaxed">
                  Dine Five uses your location to discover restaurants and food pickup points near you. Please enable location permissions.
                </Text>
              </View>
              
              <View className="w-full mt-2 px-4 gap-y-3">
                <TouchableOpacity
                  onPress={() => fetchLocation(true)}
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
                      value={manualAddressInput}
                      onChangeText={setManualAddressInput}
                      placeholder="e.g. New York, Dhaka, 94043..."
                      placeholderTextColor="#9CA3AF"
                      className="flex-1 text-sm text-gray-800 py-1"
                    />
                    {manualAddressInput.trim().length > 0 && (
                      <TouchableOpacity
                        onPress={async () => {
                          if (isSearchingAddress) return;
                          setIsSearchingAddress(true);
                          const res = await setLocationManually(manualAddressInput);
                          setIsSearchingAddress(false);
                          if (res && res.success) {
                            setCurrentLocationLabel(manualAddressInput);
                          } else {
                            Alert.alert("Error", res?.error || "Could not resolve address. Please try again.");
                          }
                        }}
                        className="bg-[#E29E10] px-3.5 py-1.5 rounded-xl"
                      >
                        {isSearchingAddress ? (
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
          ) : (
            <>
              <PromoBanner deals={promoDeals ?? [FALLBACK_PROMO]} />

              <Categories
                activeCategory={activeCategory}
                categories={categories}
                onCategoryChange={setActiveCategory}
              />

              {isInitialLoading && (
                <View className="py-8 items-center">
                  <ActivityIndicator size="small" color="#F5C518" />
                  <Text className="text-xs text-gray-400 mt-2">
                    Loading restaurants...
                  </Text>
                </View>
              )}

              <SectionErrorBoundary>
                {!isInitialLoading &&
                  sections.map((section) => (
                    <RestaurantSection
                      key={section.title}
                      title={section.title}
                      restaurants={section.items}
                      onOpenRestaurant={openRestaurantDetail}
                    />
                  ))}
              </SectionErrorBoundary>

              {!isInitialLoading && !sections.length && (
                <View className="items-center justify-center py-12 px-6">
                  <View className="w-16 h-16 bg-[#FFFBEB] rounded-full items-center justify-center mb-4">
                    <Ionicons name="restaurant-outline" size={28} color="#F5C518" />
                  </View>
                  <Text className="text-base font-bold text-[#1C1C1C] mb-1">
                    No Restaurants Found
                  </Text>
                  <Text className="text-xs text-gray-400 text-center max-w-[260px] leading-relaxed">
                    We couldn't find any restaurants near your location. Try searching for something else or adjusting your filters.
                  </Text>
                  {(searchText || activeCategory !== "All") && (
                    <TouchableOpacity
                      onPress={() => {
                        setSearchText("");
                        setActiveCategory("All");
                      }}
                      className="mt-5 px-5 py-2.5 bg-gray-900 rounded-xl"
                    >
                      <Text className="text-white text-xs font-black uppercase tracking-wider">
                        Clear Filters
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {!!restaurantsError && (
                <View className="px-4 pb-4">
                  <Text className="text-xs text-amber-700 text-center">
                    {restaurantsError}
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
        
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
  const [address, setAddress] = React.useState("");
  const [loading, setLoading] = React.useState(false);

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
