import { useStore } from "@/stores/stores";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { API_BASE_URL } from "@/utils/api";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRestaurantStore } from "@/stores/useRestaurantStore";
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
      time: Number.isFinite(etaValue)
        ? `${Math.round(etaValue)} min`
        : "15-20 min",
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
  isAdding,
  onAdd,
  onOpen,
  isFreeFlow,
}: {
  item: MenuItemType;
  isAdding: boolean;
  onAdd: () => void;
  onOpen: () => void;
  isFreeFlow?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onOpen}
      className="flex-row border border-gray-100 rounded-3xl p-3 mb-4 items-center bg-white"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 6,
        elevation: 1,
      }}
    >
      {/* Food Image */}
      <View className="w-24 h-24 rounded-2xl overflow-hidden bg-gray-100 mr-4">
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            className="w-24 h-24"
            resizeMode="cover"
          />
        ) : (
          <View className="w-24 h-24 items-center justify-center bg-gray-100">
            <Ionicons name="fast-food-outline" size={26} color="#9CA3AF" />
          </View>
        )}
      </View>

      {/* Info Column */}
      <View className="flex-1 justify-center py-1">
        <Text
          className="text-sm font-heading-semibold text-gray-900 mb-1"
          numberOfLines={1}
        >
          {item.name}
        </Text>

        {item.description ? (
          <Text
            className="text-[11px] text-gray-400 font-body-semibold mb-2 pr-2"
            numberOfLines={2}
          >
            {item.description}
          </Text>
        ) : (
          <Text className="text-[11px] text-gray-300 italic font-body-semibold mb-2">
            No description available
          </Text>
        )}

        <View className="flex-row items-center justify-between">
          <Text className="text-base font-heading text-gray-900">
            {isFreeFlow ? "FREE" : `$${item.price}`}
          </Text>

          <View className="flex-row items-center bg-gray-100 px-2.5 py-1 rounded-full">
            <Ionicons name="time-outline" size={11} color="#6B7280" />
            <Text className="text-[10px] font-body-semibold text-gray-600 ml-1">
              {item.time}
            </Text>
          </View>
        </View>
      </View>

      {/* Add Button */}
      <TouchableOpacity
        onPress={(event) => {
          event.stopPropagation();
          if (isAdding) return;
          onAdd();
        }}
        disabled={isAdding}
        activeOpacity={0.8}
        style={{
          width: 40,
          height: 40,
          borderRadius: 16,
          backgroundColor: isFreeFlow ? "#10B981" : "#F5C518",
          alignItems: "center",
          justifyContent: "center",
          marginLeft: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 1,
        }}
      >
        {isAdding ? (
          <ActivityIndicator size="small" color={isFreeFlow ? "#FFFFFF" : "#1F2937"} />
        ) : (
          <Ionicons name={isFreeFlow ? "arrow-forward" : "add"} size={22} color={isFreeFlow ? "#FFFFFF" : "#1F2937"} />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function RestaurantDetailScreen() {
  try {
    return <RestaurantDetailScreenInner />;
  } catch (error: any) {
    console.error("❌ RestaurantDetailScreen CRASH STACK:", error.stack);
    throw error;
  }
}

function RestaurantDetailScreenInner() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { requestWithAuth, addToCart, fetchCartCount } = useStore() as any;

  const isFreeFlow = params.isFreeAvailable === "true";
  const { claimToken, getAvailableTokens } = useRestaurantStore();
  const [currentTokenId, setCurrentTokenId] = React.useState<string | null>(
    pickString(params.tokenId) || null
  );
  const [isClaimingMeal, setIsClaimingMeal] = React.useState(false);
  const [showSuccessModal, setShowSuccessModal] = React.useState(false);

  const scrollViewRef = React.useRef<ScrollView>(null);
  const sectionPositions = React.useRef<Record<string, number>>({});
  const isManualScroll = React.useRef(false);

  const [fetchedDetails, setFetchedDetails] = React.useState<any>(null);
  const [cartCount, setCartCount] = React.useState(0);
  const [addingItemId, setAddingItemId] = React.useState<string | null>(null);

  const providerId = pickString(params.providerId, params.id);
  const restaurantName =
    pickString(params.name, fetchedDetails?.name) || "Restaurant";
  const restaurantImage = pickString(params.image, fetchedDetails?.image);
  const restaurantRating =
    pickString(params.rating, fetchedDetails?.rating) || "N/A";
  const restaurantAddress =
    pickString(params.address, fetchedDetails?.address) ||
    [pickString(params.city), pickString(params.state)]
      .filter(Boolean)
      .join(", ");
  const restaurantDistance =
    pickString(params.distance, fetchedDetails?.distance) || "N/A";
  const restaurantPhone =
    pickString(params.phoneNumber, fetchedDetails?.phoneNumber) || "";

  const [activeTab, setActiveTab] = React.useState("");
  const [searchText, setSearchText] = React.useState("");
  const [menuSections, setMenuSections] = React.useState<MenuSectionType[]>([]);
  const [menuLoading, setMenuLoading] = React.useState(true);
  const [menuError, setMenuError] = React.useState<string | null>(null);

  const handleClaimMeal = async () => {
    if (isClaimingMeal) return;

    setIsClaimingMeal(true);
    try {
      console.log("[RestaurantDetails] Fetching available tokens...");
      const tokenResult = await getAvailableTokens();
      const tokens = tokenResult?.data?.tokens;
      console.log(
        "[RestaurantDetails] Available tokens found:",
        tokens?.length || 0,
      );

      if (!tokens || tokens.length === 0) {
        Alert.alert(
          "No Tokens",
          "Sorry, there are no free meal tokens available right now.",
        );
        return;
      }

      const tokenIdToClaim = tokens[0].tokenId;
      console.log("[RestaurantDetails] Claiming token:", tokenIdToClaim);

      const result = await claimToken(tokenIdToClaim);
      console.log("[RestaurantDetails] Claim result:", result);

      const newTokenId = result?.data?.token?.tokenId || tokenIdToClaim;
      setCurrentTokenId(newTokenId);
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error("[RestaurantDetails] Claim error:", error);
      Alert.alert("Claim Failed", error.message || "Could not claim free meal");
    } finally {
      setIsClaimingMeal(false);
    }
  };

  const handleCall = () => {
    if (!restaurantPhone) {
      Alert.alert("Error", "Phone number is not available");
      return;
    }
    Linking.openURL(`tel:${restaurantPhone}`).catch((err) => {
      Alert.alert("Error", "Could not open phone app");
    });
  };

  const updateCartCount = React.useCallback(async () => {
    try {
      const count = await fetchCartCount?.();
      setCartCount(count || 0);
    } catch (err) {
      console.log("Error updating cart count:", err);
    }
  }, [fetchCartCount]);

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
      const url = `${API_BASE_URL}/api/v1/feed?providerId=${providerId}&page=1&limit=50`;
      const response = await requestWithAuth(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Failed to load menu.");
      }

      const foods = result.data;
      if (Array.isArray(foods) && foods.length > 0) {
        const first = foods[0];
        setFetchedDetails({
          name: pickString(
            first.restaurantName,
            first.providerRestaurantName,
            first.providerName,
          ),
          image: pickString(
            first.restaurantImage,
            first.restaurantProfile,
            first.providerImage,
            first.providerProfile,
            first.profile,
          ),
          address: pickString(first.restaurantAddress),
          rating:
            first.rating !== undefined && first.rating !== null
              ? String(first.rating)
              : undefined,
          phoneNumber: pickString(first.phoneNumber),
        });
      }

      const normalized = normalizeMenuSections(result);
      setMenuSections(normalized);
      setActiveTab((current) => current || normalized[0]?.title || "");
    } catch (error: any) {
      setMenuSections([]);
      setMenuError(error?.message || "Failed to load menu.");
    } finally {
      setMenuLoading(false);
    }
  }, [requestWithAuth, providerId]);

  React.useEffect(() => {
    loadMenu();
    updateCartCount();
  }, [loadMenu, updateCartCount]);

  const menuTabs = React.useMemo(
    () =>
      (Array.isArray(menuSections) ? menuSections : []).map(
        (section) => section?.title || "",
      ),
    [menuSections],
  );

  const visibleSections = React.useMemo(() => {
    const query = searchText.trim().toLowerCase();
    const sections = Array.isArray(menuSections) ? menuSections : [];

    if (query) {
      return sections
        .map((section) => ({
          ...section,
          items: Array.isArray(section?.items)
            ? section.items.filter((item) =>
                [item?.name, item?.description, section?.title]
                  .join(" ")
                  .toLowerCase()
                  .includes(query),
              )
            : [],
        }))
        .filter(
          (section) =>
            Array.isArray(section?.items) && section.items.length > 0,
        );
    }

    return sections;
  }, [menuSections, searchText]);

  const handleTabPress = (tab: string) => {
    setActiveTab(tab);
    const yPos = sectionPositions.current[tab];
    if (yPos !== undefined && scrollViewRef.current) {
      isManualScroll.current = true;
      scrollViewRef.current.scrollTo({ y: yPos - 120, animated: true });
      setTimeout(() => {
        isManualScroll.current = false;
      }, 350);
    }
  };

  const openFoodDetail = React.useCallback(
    (item: MenuItemType) => {
      router.push({
        pathname: "/screens/home/product-details",
        params: {
          id: item.id,
          foodId: item.id,
          name: item.name,
          price: item.price,
          image: item.image,
          description: item.description,
          restaurantName,
          restaurantProfile: restaurantImage,
          isFreeAvailable: isFreeFlow ? "true" : "false",
          tokenId: currentTokenId || "",
        },
      } as any);
    },
    [restaurantImage, restaurantName, router, isFreeFlow, currentTokenId],
  );

  const handleAdd = React.useCallback(
    async (item: MenuItemType) => {
      if (isFreeFlow) {
        if (!currentTokenId) {
          Alert.alert(
            "Claim Token First",
            "Please claim your free meal token before ordering.",
            [
              { text: "Claim Now", onPress: handleClaimMeal },
              { text: "Cancel", style: "cancel" }
            ]
          );
          return;
        }
        openFoodDetail(item);
        return;
      }
      setAddingItemId(item.id);
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
          Alert.alert(
            "Failed",
            latestError || "Could not add this item to cart.",
          );
          return;
        }

        await fetchCartCount?.();
        await updateCartCount();
        Alert.alert("Added", `${item.name} added to cart.`);
      } catch (error: any) {
        Alert.alert(
          "Failed",
          error?.message || "Could not add this item to cart.",
        );
      } finally {
        setAddingItemId(null);
      }
    },
    [isFreeFlow, currentTokenId, openFoodDetail, addToCart, fetchCartCount, updateCartCount, handleClaimMeal],
  );

  if (menuLoading && !fetchedDetails) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <StatusBar style="dark" />
        <View className="w-16 h-16 rounded-3xl bg-[#F5C518]/10 items-center justify-center mb-4">
          <Ionicons name="restaurant" size={32} color="#F5C518" />
        </View>
        <ActivityIndicator size="small" color="#F5C518" />
        <Text className="text-gray-500 mt-3 font-body-semibold text-sm">
          Preparing menu...
        </Text>
      </View>
    );
  }

  try {
    return (
      <View className="flex-1 bg-white">
        <StatusBar style="light" />

        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: (!isFreeFlow && cartCount > 0) ? 150 : 100 }}
          onScroll={(e) => {
            if (isManualScroll.current) return;
            const scrollY = e.nativeEvent.contentOffset.y;

            let activeSection = "";
            const sortedPositions = Object.entries(
              sectionPositions.current,
            ).sort((a, b) => a[1] - b[1]);

            for (const [title, yPos] of sortedPositions) {
              if (scrollY >= yPos - 140) {
                activeSection = title;
              }
            }

            if (activeSection && activeSection !== activeTab) {
              setActiveTab(activeSection);
            }
          }}
          scrollEventThrottle={16}
        >
          <View className="relative h-72">
            {restaurantImage ? (
              <Image
                source={{ uri: restaurantImage }}
                className="w-full h-72"
                resizeMode="cover"
              />
            ) : (
              <View className="w-full h-72 items-center justify-center bg-gray-100">
                <Ionicons name="restaurant-outline" size={40} color="#9CA3AF" />
              </View>
            )}

            <View
              className="absolute inset-0"
              style={{ backgroundColor: "rgba(0,0,0,0.2)" }}
            />

            <View
              className="absolute left-0 right-0 flex-row justify-between items-center px-4"
              style={{ top: insets.top + 8 }}
            >
              <TouchableOpacity
                onPress={() => router.back()}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "rgba(255, 255, 255, 0.9)",
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Ionicons name="chevron-back" size={22} color="#1F2937" />
              </TouchableOpacity>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => router.push("/(tabs)/cart")}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <Ionicons name="bag-outline" size={20} color="#1F2937" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View className="bg-white px-5 pt-6 pb-6 -mt-8 rounded-t-[32px] flex-1">
            <View className="mb-6">
              <View className="flex-row items-start justify-between gap-3">
                <Text className="text-2xl font-heading text-gray-900 leading-tight flex-1">
                  {restaurantName}
                </Text>

                <View className="flex-row items-center gap-1.5 mt-1">
                  <View className="flex-row items-center px-2.5 py-1 rounded-full bg-amber-50 border border-amber-100 gap-1">
                    <Ionicons name="star" size={12} color="#F5C518" />
                    <Text className="text-[10px] font-body-bold text-amber-800">
                      {restaurantRating}
                    </Text>
                  </View>

                  <View className="flex-row items-center px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 gap-1">
                    <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <Text className="text-[10px] font-body-bold text-emerald-800">
                      Open Now
                    </Text>
                  </View>
                </View>
              </View>

              <View className="flex-row items-center mt-2 justify-between">
                <View className="flex-row items-center flex-1 mr-2">
                  <Ionicons name="location-outline" size={14} color="#9CA3AF" />
                  <Text
                    className="text-xs font-body-semibold text-gray-500 ml-1 flex-1"
                    numberOfLines={1}
                  >
                    {restaurantAddress || "Address not available"}
                  </Text>
                </View>

                {restaurantDistance !== "N/A" && (
                  <View className="flex-row items-center px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 gap-1">
                    <Ionicons name="bicycle-outline" size={12} color="#2D9CDB" />
                    <Text className="text-[10px] font-body-bold text-blue-800">
                      Pickup {restaurantDistance}
                    </Text>
                  </View>
                )}
              </View>

              {restaurantPhone ? (
                <View className="flex-row items-center mt-3 justify-between bg-gray-50 border border-gray-100 rounded-2xl p-3">
                  <View className="flex-row items-center flex-1 mr-2">
                    <View className="w-8 h-8 rounded-full bg-gray-200/60 items-center justify-center mr-2">
                      <Ionicons name="call-outline" size={16} color="#4B5563" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[10px] font-body-semibold text-gray-400 uppercase tracking-wider">
                        Phone Number
                      </Text>
                      <Text className="text-sm font-body-semibold text-gray-800" numberOfLines={1} adjustsFontSizeToFit>
                        {restaurantPhone}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={handleCall}
                    className="flex-row items-center bg-[#F5C518] px-4 py-2 rounded-xl gap-1.5"
                    activeOpacity={0.8}
                  >
                    <Ionicons name="call" size={14} color="#1F2937" />
                    <Text className="text-xs font-body-bold text-gray-900">
                      Call
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            {isFreeFlow && (
              <View
                className="mb-6 p-5 rounded-[24px] border"
                style={{
                  backgroundColor: currentTokenId ? "#ECFDF5" : "#FEF3C7",
                  borderColor: currentTokenId ? "#A7F3D0" : "#FDE68A",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.05,
                  shadowRadius: 10,
                  elevation: 2,
                }}
              >
                <View className="flex-row items-start gap-3">
                  <View
                    className="w-10 h-10 rounded-2xl items-center justify-center"
                    style={{
                      backgroundColor: currentTokenId ? "#10B981" : "#F5C518",
                    }}
                  >
                    <Ionicons
                      name={currentTokenId ? "checkmark-circle" : "gift"}
                      size={22}
                      color={currentTokenId ? "#FFFFFF" : "#1F2937"}
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-base font-heading text-gray-900 mb-1"
                      style={{ color: currentTokenId ? "#065F46" : "#78350F" }}
                    >
                      {currentTokenId
                        ? "Token Claimed!"
                        : "Free Meal Token Available"}
                    </Text>
                    <Text
                      className="text-xs font-body-semibold leading-normal mb-3"
                      style={{ color: currentTokenId ? "#047857" : "#B45309" }}
                    >
                      {currentTokenId
                        ? "You have claimed a token for this session. Select any food item below to place your free order."
                        : "Claim a free meal token to order one food item from this restaurant for free."}
                    </Text>

                    {!currentTokenId ? (
                      <TouchableOpacity
                        onPress={handleClaimMeal}
                        disabled={isClaimingMeal}
                        activeOpacity={0.8}
                        style={{
                          backgroundColor: "#1F2937",
                          paddingVertical: 12,
                          paddingHorizontal: 20,
                          borderRadius: 14,
                          alignItems: "center",
                          justifyContent: "center",
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.1,
                          shadowRadius: 4,
                          elevation: 2,
                        }}
                      >
                        {isClaimingMeal ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text className="text-white font-body-bold text-xs">
                            Claim Free Meal Token
                          </Text>
                        )}
                      </TouchableOpacity>
                    ) : (
                      <View className="flex-row items-center gap-1.5 bg-emerald-100 border border-emerald-200 self-start px-3 py-1.5 rounded-full">
                        <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <Text className="text-[10px] font-body-bold text-emerald-800 uppercase tracking-wider">
                          Ready to order
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            )}

            <View className="mb-6">
              <View className="flex-row items-center rounded-2xl px-4 py-2 bg-gray-50 border border-gray-100">
                <Ionicons name="search-outline" size={18} color="#9CA3AF" />
                <TextInput
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder="Search restaurant menu..."
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 ml-2 text-sm text-gray-700 py-1"
                />
              </View>
            </View>

            {menuTabs.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 16, gap: 8 }}
                className="mb-4"
              >
                {menuTabs.map((tab) => {
                  const isActive = tab === activeTab;

                  return (
                    <TouchableOpacity
                      key={tab}
                      onPress={() => handleTabPress(tab)}
                      activeOpacity={0.8}
                      style={{
                        backgroundColor: isActive ? "#1F2937" : "#F9FAFB",
                        borderColor: isActive ? "#1F2937" : "#F3F4F6",
                        borderWidth: 1,
                        borderRadius: 9999,
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        ...(isActive
                          ? {
                              shadowColor: "#000",
                              shadowOffset: { width: 0, height: 1 },
                              shadowOpacity: 0.05,
                              shadowRadius: 2,
                              elevation: 1,
                            }
                          : {}),
                      }}
                    >
                      <Text
                        className={`text-xs font-body-semibold ${
                          isActive ? "text-[#F5C518]" : "text-gray-500"
                        }`}
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
                <Text className="text-gray-400 font-body mt-2">Loading menu...</Text>
              </View>
            )}

            {!menuLoading && !!menuError && (
              <View className="py-10 items-center justify-center px-4">
                <Text className="text-gray-400 font-body text-center">{menuError}</Text>
                <TouchableOpacity
                  onPress={loadMenu}
                  className="mt-3 px-4 py-2 rounded-full"
                  style={{ backgroundColor: "#F5C518" }}
                >
                  <Text className="text-xs font-body-semibold text-gray-900">Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {!menuLoading &&
              !menuError &&
              visibleSections.map((section) => (
                <View
                  key={section.title}
                  onLayout={(e) => {
                    sectionPositions.current[section.title] =
                      e.nativeEvent.layout.y + 256;
                  }}
                  className="mt-4"
                >
                  <Text className="text-base font-heading text-gray-900 px-1 mb-3">
                    {section.title}
                  </Text>

                  {section.items.map((item) => (
                    <MenuItem
                      key={item.id}
                      item={item}
                      isAdding={addingItemId === item.id}
                      onAdd={() => handleAdd(item)}
                      onOpen={() => openFoodDetail(item)}
                      isFreeFlow={isFreeFlow}
                    />
                  ))}
                </View>
              ))}

            {!menuLoading && !menuError && visibleSections.length === 0 && (
              <View className="py-10 items-center justify-center">
                <Text className="text-gray-400 font-body">No menu items found.</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {!isFreeFlow && cartCount > 0 && (
          <View
            className="absolute bottom-16 left-5 right-5 bg-gray-900 rounded-[24px] p-4 flex-row items-center justify-between shadow-lg"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.25,
              shadowRadius: 15,
              elevation: 8,
            }}
          >
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-2xl bg-[#F5C518] items-center justify-center">
                <Ionicons name="bag" size={20} color="#1F2937" />
              </View>
              <View>
                <Text className="text-white font-body-bold text-sm">
                  {cartCount} {cartCount === 1 ? "item" : "items"} in bag
                </Text>
                <Text className="text-gray-400 text-xs font-body-semibold">
                  Fresh food ready for pickup
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/cart")}
              activeOpacity={0.8}
              className="bg-[#F5C518] px-5 py-2.5 rounded-2xl"
            >
              <Text className="text-gray-900 font-body-bold text-xs">
                View Bag
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Success Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={showSuccessModal}
          onRequestClose={() => setShowSuccessModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
            <View style={{ backgroundColor: '#FFFFFF', width: '100%', borderRadius: 24, padding: 32, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 5 }}>
              <View style={{ width: 80, height: 80, backgroundColor: '#DCFCE7', borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                <Ionicons
                  name="checkmark-circle"
                  size={50}
                  color="#22C55E"
                />
              </View>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8, textAlign: 'center' }}>
                Claim Successful!
              </Text>
              <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 32, lineHeight: 20, fontWeight: '600' }}>
                You have successfully claimed a free meal token. Select any item from the menu below to order it for free!
              </Text>
              <TouchableOpacity
                onPress={() => setShowSuccessModal(false)}
                style={{ backgroundColor: '#22C55E', width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#22C55E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 18 }}>
                  Continue
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  } catch (error: any) {
    console.error(
      "❌ RestaurantDetailScreenInner RENDER CRASH STACK:",
      error.stack,
    );
    throw error;
  }
}
