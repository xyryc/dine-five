import { Categories } from "@/components/home/Categories";
import { DonateCard } from "@/components/home/DonateCard";
import { HomeHeader } from "@/components/home/HomeHeader";
import { PromoBanner } from "@/components/home/PromoBanner";
import { SearchBar } from "@/components/home/SearchBar";
import { RestaurantSection } from "@/components/home/RestaurantSection";
import { useStore } from "@/stores/stores";
import {
  type Restaurant,
  useRestaurantStore,
} from "@/stores/useRestaurantStore";
import { extractHomeRestaurants } from "@/utils/homeFeedRestaurants";
import { getUserAvatarUri, normalizeImageUri } from "@/utils/userAvatar";
import { navigateToRestaurantDetail } from "@/utils/restaurantDetailNavigation";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
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
    const query = searchText.trim().toLowerCase();
    const list = Array.isArray(restaurants) ? restaurants : [];

    return list.filter((restaurant) => {
      const matchesCategory =
        activeCategory === "All" ||
        (Array.isArray(restaurant?.cuisine) &&
          restaurant.cuisine.some(
            (cuisine) => cuisine && String(cuisine).toLowerCase() === activeCategory.toLowerCase(),
          ));

      const searchable = [
        restaurant?.restaurantName,
        restaurant?.restaurantAddress,
        restaurant?.city,
        restaurant?.state,
        restaurant?.contactEmail,
        ...(Array.isArray(restaurant?.cuisine) ? restaurant.cuisine : []),
      ]
        .filter(Boolean)
        .join(", ")
        .toLowerCase();

      const matchesSearch = !query || searchable.includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, restaurants, searchText]);

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
        user?.address,
        currentLocationLabel,
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
      navigateToRestaurantDetail(router as any, restaurant);
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
              <RestaurantSection
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
        </View>
    </View>
  );
}
