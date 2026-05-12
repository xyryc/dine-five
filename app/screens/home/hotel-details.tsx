import { useStore } from "@/stores/stores";
import { Ionicons } from "@expo/vector-icons";
import {
  useLocalSearchParams,
  usePathname,
  useRouter,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type MenuItemType = {
  id: string;
  name: string;
  price: string;
  time: string;
  image: string;
  description: string;
};

type MenuSectionType = {
  title: string;
  items: MenuItemType[];
};

const pickString = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
};

const toNumber = (value: unknown, fallback = NaN): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const getFoodsFromFeed = (payload: any): any[] => {
  const root = payload?.data ?? payload;

  if (Array.isArray(root?.foods)) return root.foods;
  if (Array.isArray(root?.items)) return root.items;
  if (Array.isArray(root?.results)) return root.results;
  if (Array.isArray(root)) return root;

  const sections = root?.sections ?? {};

  return [
    ...(Array.isArray(sections?.startTheDay) ? sections.startTheDay : []),
    ...(Array.isArray(sections?.lateNightCravings)
      ? sections.lateNightCravings
      : []),
    ...(Array.isArray(sections?.popularItems) ? sections.popularItems : []),
  ];
};

const normalizeMenuSections = (payload: any): MenuSectionType[] => {
  const foods = getFoodsFromFeed(payload);
  if (!foods.length) return [];

  const grouped = new Map<string, MenuItemType[]>();
  const seenIds = new Set<string>();

  foods.forEach((entry: any) => {
    const food =
      entry?.food && typeof entry.food === "object" ? entry.food : entry;

    const id = pickString(
      food?.foodId,
      food?._id,
      food?.id,
      entry?.foodId,
      entry?._id,
      entry?.id,
    );
    const name = pickString(
      food?.title,
      food?.name,
      food?.foodName,
      entry?.title,
      entry?.name,
      entry?.foodName,
    );

    if (!id || !name || seenIds.has(id)) return;
    seenIds.add(id);

    const priceValue = toNumber(
      food?.baseRevenue ??
      entry?.baseRevenue ??
      food?.finalPriceTag ??
      food?.price ??
      entry?.finalPriceTag ??
      entry?.price,
      NaN,
    );
    const etaValue = toNumber(
      food?.etaMinutes ??
      food?.deliveryTime ??
      food?.prepTime ??
      entry?.etaMinutes ??
      entry?.deliveryTime ??
      entry?.prepTime,
      NaN,
    );
    const sectionTitle = pickString(
      food?.categoryName,
      food?.category,
      entry?.categoryName,
      entry?.category,
      "Popular Items",
    );

    const item: MenuItemType = {
      id,
      name,
      price: Number.isFinite(priceValue) ? priceValue.toFixed(2) : "0.00",
      time: Number.isFinite(etaValue) ? `${Math.round(etaValue)} min` : "15-20 min",
      image: pickString(
        food?.image,
        food?.imageUrl,
        food?.photo,
        food?.thumbnail,
        entry?.image,
        entry?.imageUrl,
        entry?.photo,
        entry?.thumbnail,
      ),
      description: pickString(
        food?.productDescription,
        food?.description,
        entry?.productDescription,
        entry?.description,
      ),
    };

    grouped.set(sectionTitle, [...(grouped.get(sectionTitle) || []), item]);
  });

  return Array.from(grouped.entries()).map(([title, items]) => ({
    title,
    items,
  }));
};

function MenuItem({
  item,
  onAdd,
  onOpen,
}: {
  item: MenuItemType;
  onAdd: () => void;
  onOpen: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onOpen}
      className="flex-row items-center px-4 py-3"
    >
      <View className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 mr-3">
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            className="w-20 h-20"
            resizeMode="cover"
          />
        ) : (
          <View className="w-20 h-20 items-center justify-center bg-gray-100">
            <Ionicons name="fast-food-outline" size={22} color="#9CA3AF" />
          </View>
        )}
      </View>

      <View className="flex-1">
        <Text className="text-sm font-bold text-gray-900 mb-1" numberOfLines={2}>
          {item.name}
        </Text>
        <Text className="text-base font-extrabold text-gray-900 mb-1">
          ${item.price}
        </Text>
        <View className="flex-row items-center">
          <Ionicons name="time-outline" size={12} color="#9CA3AF" />
          <Text className="text-xs text-gray-400 ml-1">{item.time}</Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={(event) => {
          event.stopPropagation();
          onAdd();
        }}
        className="w-9 h-9 rounded-full items-center justify-center"
        style={{ backgroundColor: "#F5C518" }}
      >
        <Ionicons name="add" size={22} color="#1F2937" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}


export default function RestaurantDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { fetchHomeFeed, addToCart, fetchCartCount } = useStore() as any;

  const providerId = pickString(params.providerId, params.id);
  const restaurantName = pickString(params.name) || "Restaurant";
  const restaurantImage = pickString(params.image);
  const restaurantRating = pickString(params.rating) || "N/A";
  const restaurantAddress =
    pickString(params.address) ||
    [pickString(params.city), pickString(params.state)]
      .filter(Boolean)
      .join(", ");
  const restaurantDistance = pickString(params.distance) || "N/A";

  const [activeTab, setActiveTab] = React.useState("");
  const [searchText, setSearchText] = React.useState("");
  const [menuSections, setMenuSections] = React.useState<MenuSectionType[]>([]);
  const [menuLoading, setMenuLoading] = React.useState(true);
  const [menuError, setMenuError] = React.useState<string | null>(null);

  const loadMenu = React.useCallback(async () => {
    if (!providerId) {
      setMenuSections([]);
      setMenuError("Restaurant id is missing.");
      setMenuLoading(false);
      return;
    }

    setMenuLoading(true);
    setMenuError(null);

    try {
      const feedData = await fetchHomeFeed({
        page: 1,
        limit: 60,
        providerId,
      });

      if (!feedData) {
        setMenuSections([]);
        setMenuError("Failed to load menu.");
        return;
      }

      const normalized = normalizeMenuSections(feedData);
      setMenuSections(normalized);
      setActiveTab((current) => current || normalized[0]?.title || "");
    } catch (error: any) {
      setMenuSections([]);
      setMenuError(error?.message || "Failed to load menu.");
    } finally {
      setMenuLoading(false);
    }
  }, [fetchHomeFeed, providerId]);

  React.useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  const menuTabs = React.useMemo(
    () => menuSections.map((section) => section.title),
    [menuSections],
  );

  const visibleSections = React.useMemo(() => {
    const query = searchText.trim().toLowerCase();

    if (query) {
      return menuSections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) =>
            [item.name, item.description, section.title]
              .join(" ")
              .toLowerCase()
              .includes(query),
          ),
        }))
        .filter((section) => section.items.length > 0);
    }

    if (!activeTab) return menuSections;
    return menuSections.filter((section) => section.title === activeTab);
  }, [activeTab, menuSections, searchText]);

  const handleAdd = React.useCallback(
    async (item: MenuItemType) => {
      try {
        const result = await addToCart(
          {
            foodId: item.id,
            id: item.id,
            _id: item.id,
            name: item.name,
            price: item.price,
            image: item.image,
          },
          1,
        );

        if (!result) {
          const latestError = (useStore.getState() as any)?.error;
          Alert.alert("Failed", latestError || "Could not add this item to cart.");
          return;
        }

        await fetchCartCount?.();
        Alert.alert("Added", `${item.name} added to cart.`);
      } catch (error: any) {
        Alert.alert("Failed", error?.message || "Could not add this item to cart.");
      }
    },
    [addToCart, fetchCartCount],
  );

  const openFoodDetail = React.useCallback(
    (item: MenuItemType) => {
      router.push({
        pathname: "/(tabs)/product-details",
        params: {
          id: item.id,
          foodId: item.id,
          name: item.name,
          price: item.price,
          image: item.image,
          description: item.description,
          restaurantName,
          restaurantProfile: restaurantImage,
        },
      } as any);
    },
    [restaurantImage, restaurantName, router],
  );

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View className="relative h-64">
          {restaurantImage ? (
            <Image
              source={{ uri: restaurantImage }}
              className="w-full h-64"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-64 items-center justify-center bg-gray-200">
              <Ionicons name="restaurant-outline" size={40} color="#9CA3AF" />
            </View>
          )}

          <View
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(0,0,0,0.15)" }}
          />

          <View
            className="absolute left-0 right-0 flex-row justify-between items-center px-4"
            style={{ top: insets.top + 8 }}
          >
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-9 h-9 rounded-full bg-white items-center justify-center shadow"
            >
              <Ionicons name="chevron-back" size={20} color="#1F2937" />
            </TouchableOpacity>

            <View className="flex-row gap-3">
              <TouchableOpacity className="w-9 h-9 rounded-full bg-white/20 items-center justify-center">
                <Ionicons name="bag-outline" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity className="w-9 h-9 rounded-full bg-white/20 items-center justify-center">
                <Ionicons name="heart-outline" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View className="px-4 pt-4 pb-3 border-b border-gray-100">
          <View className="flex-row items-center gap-3">
            <View className="w-14 h-14 rounded-2xl overflow-hidden bg-gray-200">
              {restaurantImage ? (
                <Image
                  source={{ uri: restaurantImage }}
                  className="w-14 h-14"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-14 h-14 items-center justify-center bg-gray-200">
                  <Ionicons name="restaurant-outline" size={18} color="#9CA3AF" />
                </View>
              )}
            </View>

            <View className="flex-1">
              <Text className="text-base font-extrabold text-gray-900">
                {restaurantName}
              </Text>
              <View className="flex-row items-center mt-0.5">
                <Ionicons name="location-outline" size={12} color="#9CA3AF" />
                <Text className="text-xs text-gray-500 ml-1" numberOfLines={1}>
                  {restaurantAddress || "Address not available"}
                </Text>
              </View>
              <Text
                className="text-xs font-semibold mt-0.5"
                style={{ color: "#22C55E" }}
              >
                Open Now
              </Text>
            </View>
          </View>

          <View className="flex-row items-center mt-3 gap-3">
            <View
              className="flex-row items-center px-3 py-1.5 rounded-full gap-1"
              style={{ borderWidth: 1, borderColor: "#E5E7EB" }}
            >
              <Ionicons name="star" size={13} color="#F5C518" />
              <Text className="text-xs font-semibold text-gray-700">
                {restaurantRating} � ratings
              </Text>
            </View>
            <View
              className="flex-row items-center px-3 py-1.5 rounded-full gap-1"
              style={{ borderWidth: 1, borderColor: "#E5E7EB" }}
            >
              <Ionicons name="bicycle-outline" size={13} color="#6B7280" />
              <Text className="text-xs font-semibold text-gray-700">
                Pickup � {restaurantDistance}
              </Text>
            </View>
          </View>
        </View>

        <View className="mx-4 mt-4 mb-3">
          <View
            className="flex-row items-center rounded-full px-4 h-10"
            style={{ borderWidth: 1, borderColor: "#E5E7EB" }}
          >
            <Ionicons name="search-outline" size={16} color="#9CA3AF" />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search menu"
              placeholderTextColor="#9CA3AF"
              className="flex-1 ml-2 text-sm text-gray-700"
            />
          </View>
        </View>

        {menuTabs.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 0 }}
            className="border-b border-gray-100"
          >
            {menuTabs.map((tab) => {
              const isActive = tab === activeTab;

              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  className="mr-5 pb-3"
                  style={{
                    borderBottomWidth: isActive ? 2 : 0,
                    borderBottomColor: "#1F2937",
                  }}
                >
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: isActive ? "#1F2937" : "#9CA3AF" }}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {menuLoading && (
          <View className="py-10 items-center justify-center">
            <ActivityIndicator size="small" color="#F5C518" />
            <Text className="text-gray-400 mt-2">Loading menu...</Text>
          </View>
        )}

        {!menuLoading && !!menuError && (
          <View className="py-10 items-center justify-center px-4">
            <Text className="text-gray-400 text-center">{menuError}</Text>
            <TouchableOpacity
              onPress={loadMenu}
              className="mt-3 px-4 py-2 rounded-full"
              style={{ backgroundColor: "#F5C518" }}
            >
              <Text className="text-xs font-bold text-gray-900">Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!menuLoading &&
          !menuError &&
          visibleSections.map((section) => (
            <View key={section.title} className="mt-4">
              <Text className="text-base font-bold text-gray-900 px-4 mb-2">
                {section.title}
              </Text>

              {section.items.map((item, index) => (
                <View key={item.id}>
                  <MenuItem
                    item={item}
                    onAdd={() => handleAdd(item)}
                    onOpen={() => openFoodDetail(item)}
                  />
                  {index < section.items.length - 1 && (
                    <View className="h-px bg-gray-100 mx-4" />
                  )}
                </View>
              ))}
            </View>
          ))}

        {!menuLoading && !menuError && visibleSections.length === 0 && (
          <View className="py-10 items-center justify-center">
            <Text className="text-gray-400">No menu items found.</Text>
          </View>
        )}
      </ScrollView>

    </View>
  );
}
