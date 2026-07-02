import { Categories } from "@/components/home/Categories";
import { DonateCard } from "@/components/home/DonateCard";
import { HomeHeader } from "@/components/home/HomeHeader";
import { PromoBanner } from "@/components/home/PromoBanner";
import { SearchBar } from "@/components/home/SearchBar";
import { useStore } from "@/stores/stores";
import {
  type Restaurant,
  useRestaurantStore,
} from "@/stores/useRestaurantStore";
import { extractHomeRestaurants } from "@/utils/homeFeedRestaurants";
import { getUserAvatarUri, normalizeImageUri } from "@/utils/userAvatar";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
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

type RestaurantSection = {
  title: string;
  items: Restaurant[];
};

const FALLBACK_PROMO: BannerData = {
  title: "35% OFF on Burgers!",
  subtitle: "35% OFF on Burgers!",
  ctaText: "Buy now",
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

const getCuisineLabel = (restaurant: Restaurant) =>
  restaurant.cuisine?.filter(Boolean).join(" • ") || "Restaurant";

function RestaurantCard({
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

        <TouchableOpacity className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-md items-center justify-center shadow-sm">
          <Ionicons name="heart-outline" size={15} color="#374151" />
        </TouchableOpacity>
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

function Section({
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



export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const { fetchBanners, fetchProfile, fetchCategories, fetchHomeFeed, user } = useStore() as any;
  const {
    location,
    locationLoading,
    restaurants: storeRestaurants,
    restaurantsLoading,
    restaurantsError,
    fetchLocation,
    fetchNearbyRestaurants,
  } = useRestaurantStore();

  const [homeFeed, setHomeFeed] = React.useState<any>(null);

  const { setHomeRestaurants } = useRestaurantStore();

  const extractedHomeRestaurants = React.useMemo(
    () => extractHomeRestaurants(homeFeed, []),
    [homeFeed],
  );

  const restaurants = React.useMemo((): Restaurant[] => {
    // Start with feed restaurants
    const list = [...extractedHomeRestaurants];

    // Fill up to 4 using store restaurants if they aren't already there
    if (list.length < 4 && storeRestaurants) {
      storeRestaurants.forEach(res => {
        if (list.length < 4 && !list.some(item => item.providerId === res.providerId)) {
          list.push(res);
        }
      });
    }

    return list.slice(0, 4);
  }, [extractedHomeRestaurants, storeRestaurants]);

  React.useEffect(() => {
    setHomeRestaurants(extractedHomeRestaurants);
  }, [extractedHomeRestaurants, setHomeRestaurants]);

  const [searchText, setSearchText] = React.useState("");
  const [filterModalVisible, setFilterModalVisible] = React.useState(false);
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
    ) => {
      if (!targetLocation) return;

      await fetchNearbyRestaurants({
        latitude: targetLocation.latitude,
        longitude: targetLocation.longitude,
        radius: 100000,
        limit: 100,
        sortBy: "distance",
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
      await loadNearbyRestaurants(latestLocation);
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
          setCurrentLocationLabel("");
        }
      }
    };

    resolveLocationLabel();

    return () => {
      isMounted = false;
    };
  }, [location]);

  React.useEffect(() => {
    loadNearbyRestaurants(location);
  }, [loadNearbyRestaurants, location]);

  const categories = React.useMemo(() => {
    const cuisineSet = new Set<string>();

    // Add categories from API
    dynamicCategories.forEach((cat: any) => {
      if (cat.categoryName) cuisineSet.add(cat.categoryName);
    });

    // Add categories from restaurants
    restaurants.forEach((restaurant) => {
      restaurant.cuisine.forEach((cuisine) => {
        if (cuisine) cuisineSet.add(cuisine);
      });
    });

    return ["All", ...Array.from(cuisineSet)];
  }, [dynamicCategories, restaurants]);

  React.useEffect(() => {
    if (!categories.includes(activeCategory)) {
      setActiveCategory("All");
    }
  }, [activeCategory, categories]);

  const filteredRestaurants = React.useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return restaurants.filter((restaurant) => {
      const matchesCategory =
        activeCategory === "All" ||
        restaurant.cuisine.some(
          (cuisine) => cuisine.toLowerCase() === activeCategory.toLowerCase(),
        );

      const searchable = [
        restaurant.restaurantName,
        restaurant.restaurantAddress,
        restaurant.city,
        restaurant.state,
        restaurant.contactEmail,
        ...restaurant.cuisine,
      ]
        .join(", ")
        .toLowerCase();

      const matchesSearch = !query || searchable.includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, restaurants, searchText]);

  const sections = React.useMemo<RestaurantSection[]>(() => {
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
        user?.address?.street,
        user?.address?.line1,
        user?.address?.address,
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
          id: restaurant.providerId,
          providerId: restaurant.providerId,
          name: restaurant.restaurantName,
          image: restaurant.profile,
          rating: "",
          address: restaurant.restaurantAddress,
          distance: formatDistance(restaurant.distance),
          city: restaurant.city,
          state: restaurant.state,
          cuisine: restaurant.cuisine.join(", "),
          availableFoods: String(restaurant.availableFoods || 0),
        },
      } as any);
    },
    [router],
  );

  const isInitialLoading =
    (locationLoading && restaurants.length === 0) ||
    (restaurantsLoading && restaurants.length === 0);

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
          />

          <SearchBar searchText={searchText} onSearch={setSearchText} />
          <PromoBanner deals={promoDeals ?? [FALLBACK_PROMO]} />

          {!isInitialLoading && filteredRestaurants.length > 0 && (
            <View className="mt-4">
              {/* <View className="flex-row justify-between items-center px-4 mb-3">
                <Text className="text-base font-bold text-gray-900">Start the Dayttyt</Text>
              </View> */}
              {/* <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
              >
                {filteredRestaurants.map((restaurant) => (
                  <RestaurantCard
                    key={restaurant.providerId}
                    restaurant={restaurant}
                    onOpen={() => openRestaurantDetail(restaurant)}
                  />
                ))}
              </ScrollView> */}
            </View>
          )}

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

          {!isInitialLoading &&
            sections.map((section) => (
              <Section
                key={section.title}
                title={section.title}
                restaurants={section.items}
                onOpenRestaurant={openRestaurantDetail}
              />
            ))}

          {!isInitialLoading && !sections.length && (
            <View className="px-4 py-8">
              <Text className="text-sm text-gray-400 text-center">
                No restaurants found.
              </Text>
            </View>
          )}

          {!!restaurantsError && (
            <View className="px-4 pb-4">
              <Text className="text-xs text-amber-700 text-center">
                {restaurantsError}
              </Text>
            </View>
          )}
        </ScrollView>

        <Modal
          animationType="fade"
          transparent
          visible={filterModalVisible}
          onRequestClose={() => setFilterModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setFilterModalVisible(false)}
            className="flex-1 bg-black/40 items-center justify-center"
          >
            <View className="bg-white m-4 p-4 rounded-2xl w-3/4 shadow-xl">
              <Text className="text-lg font-bold text-gray-900 mb-4 text-center">
                Filter Options
              </Text>
              <TouchableOpacity
                onPress={() => setFilterModalVisible(false)}
                className="p-3 rounded-xl mb-2 flex-row justify-between items-center"
                style={{
                  backgroundColor: "#FFF7E0",
                  borderWidth: 1,
                  borderColor: "#F5C518",
                }}
              >
                <Text className="font-semibold" style={{ color: "#B45309" }}>
                  Restaurants
                </Text>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color="#F5C518"
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setFilterModalVisible(false)}
                className="mt-4 p-3 rounded-xl bg-gray-900"
              >
                <Text className="text-white text-center font-bold">Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </View>
  );
}
