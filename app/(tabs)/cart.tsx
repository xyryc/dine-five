import { EmptyState } from "@/components/common/EmptyState";
import { useStore } from "@/stores/stores";
import { useRestaurantStore } from "@/stores/useRestaurantStore";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const pickString = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
};

const formatMoney = (value: number) => `$${value.toFixed(2)}`;

const formatTaxRate = (value: number) => `${(value * 100).toFixed(0)}%`;

const normalizeTaxRate = (value: unknown): number => {
  const rate = toNumber(value, 0);
  return rate > 1 ? rate / 100 : rate;
};

const extractStateName = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
};

const US_STATE_CODES: Record<string, string> = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
};

const normalizeLocationCandidate = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return value
    .replace(/\b(division|district|province|state|region)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
};

const buildTaxLocationCandidates = (place: any): string[] => {
  const rawCandidates = [
    place?.city,
    place?.district,
    place?.subregion,
    place?.region,
  ]
    .map((value) => normalizeLocationCandidate(value))
    .filter(Boolean);

  const usaCode = US_STATE_CODES[normalizeLocationCandidate(place?.region)];
  if (usaCode) {
    rawCandidates.push(usaCode);
  }

  return Array.from(new Set(rawCandidates));
};

const findMatchedTaxRule = (payload: any, stateName: string) => {
  const normalizedStateName = stateName.trim().toLowerCase();
  const source = payload?.data ?? payload;
  const stateRules = Array.isArray(source?.StateTexRules)
    ? source.StateTexRules
    : Array.isArray(source?.stateTaxRules)
      ? source.stateTaxRules
      : Array.isArray(source)
        ? source
        : [];

  return stateRules.find((rule: any) => {
    const ruleState =
      typeof rule?.state === "string" ? rule.state.trim().toLowerCase() : "";
    return ruleState === normalizedStateName;
  });
};

const extractTaxRateFromPayload = (
  payload: any,
  stateName?: string,
): number => {
  if (typeof payload === "number" || typeof payload === "string") {
    return normalizeTaxRate(payload);
  }

  const source = payload?.data ?? payload;
  const matchedRule =
    stateName && source && typeof source === "object"
      ? findMatchedTaxRule(source, stateName)
      : null;
  const taxSource = matchedRule ?? source;

  return normalizeTaxRate(
    taxSource?.stateTaxRate ??
    taxSource?.taxRate ??
    taxSource?.rate ??
    taxSource?.percentage ??
    taxSource?.tax ??
    taxSource?.TaxRules ??
    taxSource?.tax_rate ??
    taxSource?.state_tax_rate ??
    taxSource?.combinedRate ??
    taxSource?.combined_rate ??
    taxSource?.totalTaxRate ??
    taxSource?.total_tax_rate,
  );
};

export default function CartScreen() {
  const router = useRouter();
  const {
    fetchCart,
    updateCartQuantity,
    removeCartItem,
    clearCart,
    fetchStateTax,
  } = useStore() as any;
  const insets = useSafeAreaInsets();
  const { location, fetchLocation } = useRestaurantStore();
  const [cartItems, setCartItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [subtotal, setSubtotal] = React.useState(0);
  const [cartMeta, setCartMeta] = React.useState<any>(null);
  const [includeUtensils, setIncludeUtensils] = React.useState(true);
  const [resolvedStateName, setResolvedStateName] = React.useState("");
  const [locationTaxRate, setLocationTaxRate] = React.useState(0);

  const loadCart = React.useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true);
      const cartData = await fetchCart();
      const root = cartData?.items
        ? cartData
        : cartData?.data?.items
          ? cartData.data
          : null;
      const rawItems = Array.isArray(root?.items) ? root.items : [];

      if (root && rawItems.length) {
        setCartMeta(root);
        const formattedItems = rawItems.map((item: any) => {
          const foodData =
            item?.foodId && typeof item.foodId === "object"
              ? item.foodId
              : item?.food && typeof item.food === "object"
                ? item.food
                : null;

          const resolvedFoodId = pickString(
            foodData?._id,
            foodData?.id,
            item?.foodId,
            item?.food?.foodId,
            item?.food?.id,
            item?._id,
          );

          return {
            id: pickString(
              foodData?._id,
              foodData?.id,
              item._id,
              resolvedFoodId,
            ),
            cartItemId: pickString(item._id, resolvedFoodId),
            name: pickString(
              foodData?.title,
              foodData?.name,
              item.title,
              item.name,
              "Unknown item",
            ),
            price: toNumber(
              item.baseRevenue ??
              foodData?.baseRevenue ??
              item.price ??
              foodData?.price ??
              foodData?.finalPriceTag,
              0,
            ),
            image: pickString(foodData?.image, item.image),
            quantity: Math.max(1, Math.floor(toNumber(item.quantity, 1))),
            foodId: resolvedFoodId,
            providerId: pickString(
              item.providerId,
              foodData?.providerId,
              foodData?.providerID,
            ),
            providerProfile: pickString(
              item.providerProfile,
              foodData?.providerProfile,
            ),
            providerName: pickString(item.providerName, foodData?.providerName),
            restaurantName: pickString(
              root?.restaurantName,
              item.restaurantName,
              item.providerRestaurantName,
              foodData?.restaurantName,
              foodData?.providerRestaurantName,
              foodData?.providerName,
              item.providerName,
            ),
            restaurantAddress: pickString(
              root?.restaurantAddress,
              item.restaurantAddress,
              foodData?.restaurantAddress,
              item.address,
            ),
            distanceKm: toNumber(item.distanceKm ?? foodData?.distanceKm, NaN),
            etaMinutes: toNumber(item.etaMinutes ?? foodData?.etaMinutes, NaN),
            serviceFee: toNumber(item.serviceFee ?? foodData?.serviceFee, 0),
          };
        });
        setCartItems(formattedItems);
        const computedSubtotal = formattedItems.reduce(
          (acc: number, item: any) => acc + item.price * item.quantity,
          0,
        );
        setSubtotal(computedSubtotal);
      } else {
        setCartItems([]);
        setSubtotal(0);
        setCartMeta(null);
      }
      if (showLoading) setLoading(false);
    },
    [fetchCart],
  );

  React.useEffect(() => {
    loadCart();
  }, [loadCart]);

  React.useEffect(() => {
    if (!location) {
      fetchLocation().catch(() => {
        setResolvedStateName("");
        setLocationTaxRate(0);
      });
    }
  }, [fetchLocation, location]);

  React.useEffect(() => {
    let isMounted = true;

    const resolveStateTax = async () => {
      try {
        if (!location) return;

        const places = await Location.reverseGeocodeAsync({
          latitude: location.latitude,
          longitude: location.longitude,
        });
        const place = places?.[0];
        const candidates = buildTaxLocationCandidates(place);
        const fallbackStateName = extractStateName(
          normalizeLocationCandidate(place?.city),
          normalizeLocationCandidate(place?.district),
          normalizeLocationCandidate(place?.subregion),
          normalizeLocationCandidate(place?.region),
        );

        if (!candidates.length) {
          if (isMounted) {
            setResolvedStateName("");
            setLocationTaxRate(0);
          }
          return;
        }

        for (const candidate of candidates) {
          const taxInfo = await fetchStateTax(candidate);
          const taxRate = extractTaxRateFromPayload(taxInfo, candidate);

          if (taxInfo && taxRate > 0) {
            if (isMounted) {
              setResolvedStateName(
                extractStateName(
                  taxInfo?.name,
                  taxInfo?.state,
                  fallbackStateName,
                ),
              );
              setLocationTaxRate(taxRate);
            }
            return;
          }
        }

        if (isMounted) {
          setResolvedStateName(fallbackStateName);
          setLocationTaxRate(0);
        }
      } catch {
        if (isMounted) {
          setResolvedStateName("");
          setLocationTaxRate(0);
        }
      }
    };

    resolveStateTax();

    return () => {
      isMounted = false;
    };
  }, [fetchStateTax, location]);

  useFocusEffect(
    React.useCallback(() => {
      loadCart(false);
    }, [loadCart]),
  );

  const handleUpdateQuantity = async (
    foodId: string,
    cartItemId: string,
    delta: number,
    currentQuantity: number,
  ) => {
    if (!foodId) return;
    const newQuantity = currentQuantity + delta;

    // Optimistic Update
    setCartItems((prevItems) =>
      prevItems
        .map((item) => {
          if (item.cartItemId === cartItemId) {
            return { ...item, quantity: newQuantity };
          }
          return item;
        })
        .filter((item) => item.quantity > 0),
    );

    try {
      if (newQuantity <= 0) await removeCartItem(foodId);
      else await updateCartQuantity(foodId, newQuantity);
      await loadCart(false);
    } catch (error) {
      console.log("Error updating quantity:", error);
      await loadCart(false);
    }
  };

  if (loading && cartItems.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-[#FDFBF7] justify-center items-center">
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#FFC107" />
        <Text className="mt-4 text-gray-500 text-sm">Loading Cart...</Text>
      </SafeAreaView>
    );
  }

  if (cartItems.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-[#FDFBF7]">
        <StatusBar style="dark" />
        <EmptyState
          title="Your cart is empty!"
          message="Explore and add items to the cart to show here..."
          buttonText="Explore"
          onButtonPress={() => router.push("/(tabs)")}
        />
      </SafeAreaView>
    );
  }

  const firstItem = cartItems[0];
  const restaurantName = pickString(
    cartMeta?.restaurantName,
    firstItem?.restaurantName,
    firstItem?.providerName,
    "Restaurant",
  );
  const restaurantAddress = pickString(
    cartMeta?.restaurantAddress,
    firstItem?.restaurantAddress,
    "Address unavailable",
  );
  const restaurantProfile = pickString(
    cartMeta?.restaurantProfile,
    firstItem?.providerProfile,
    firstItem?.image,
  );

  const distanceMiles = Number.isFinite(firstItem?.distanceKm)
    ? `${(firstItem.distanceKm * 0.621371).toFixed(1)} mi`
    : pickString(cartMeta?.distance, "3.1 mi");

  const platformFee = cartItems.reduce((acc, item) => {
    return acc + (item.serviceFee || 0) * (item.quantity || 1);
  }, 0);
  const stateTaxRate = normalizeTaxRate(locationTaxRate);
  const countyTaxRate = normalizeTaxRate(cartMeta?.countyTaxRate);
  const stateTaxAmount = subtotal * stateTaxRate;
  const countyTaxAmount = subtotal * countyTaxRate;
  const total = subtotal + platformFee + stateTaxAmount + countyTaxAmount;

  return (
    <SafeAreaView className="flex-1 bg-[#FBF9F6]" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center justify-center pt-3 pb-4 border-b border-gray-100/50 bg-white">
        <View className="flex-row items-center gap-2">
          <Ionicons name="cart-outline" size={20} color="#1F2937" />
          <Text className="text-lg font-bold text-gray-900">My Cart</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 mt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 230 }}
      >
        {/* Restaurant Info Card */}
        <View className="bg-white rounded-3xl border border-gray-100/80 overflow-hidden shadow-sm mb-4">
          <View className="p-4 flex-row items-center">
            <View className="w-12 h-12 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 mr-3 justify-center items-center">
              {restaurantProfile ? (
                <Image
                  source={{ uri: restaurantProfile }}
                  className="w-12 h-12"
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="restaurant" size={20} color="#9CA3AF" />
              )}
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900">
                {restaurantName}
              </Text>
              <Text className="text-xs font-semibold text-[#E29E10] mt-0.5">
                Pickup • {distanceMiles}
              </Text>
              <View className="flex-row items-center mt-1">
                <Ionicons name="location-outline" size={12} color="#9CA3AF" />
                <Text className="text-[11px] text-gray-400 ml-1 font-medium" numberOfLines={1}>
                  {restaurantAddress}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Cart Items Card */}
        <View className="bg-white rounded-3xl border border-gray-100/80 overflow-hidden shadow-sm mb-4">
          {cartItems.map((item, index) => (
            <View
              key={item.cartItemId || item.id}
              className={`flex-row items-center p-4 ${
                index < cartItems.length - 1 ? "border-b border-gray-50" : ""
              }`}
            >
              {/* Item Image */}
              <View className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 mr-3 justify-center items-center">
                {item.image ? (
                  <Image
                    source={{ uri: item.image }}
                    className="w-16 h-16"
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="fast-food-outline" size={24} color="#9CA3AF" />
                )}
              </View>

              {/* Item Details */}
              <View className="flex-1 justify-center mr-2">
                <Text className="text-sm font-bold text-gray-900" numberOfLines={2}>
                  {item.name}
                </Text>
                <Text className="text-sm font-semibold text-[#E29E10] mt-1">
                  {formatMoney(toNumber(item.price, 0))}
                </Text>
              </View>

              {/* Quantity Selector */}
              <View className="flex-row items-center bg-gray-50 border border-gray-100/50 rounded-2xl p-1 gap-x-2">
                <TouchableOpacity
                  onPress={() =>
                    handleUpdateQuantity(
                      item.foodId,
                      item.cartItemId,
                      -1,
                      item.quantity,
                    )
                  }
                  activeOpacity={0.7}
                  className="w-8 h-8 rounded-xl bg-white border border-gray-100 items-center justify-center shadow-xs"
                >
                  <Ionicons name="remove" size={14} color="#1F2937" />
                </TouchableOpacity>

                <Text className="text-sm font-extrabold text-gray-800 min-w-[20px] text-center">
                  {item.quantity}
                </Text>

                <TouchableOpacity
                  onPress={() =>
                    handleUpdateQuantity(
                      item.foodId,
                      item.cartItemId,
                      1,
                      item.quantity,
                    )
                  }
                  activeOpacity={0.7}
                  className="w-8 h-8 rounded-xl bg-white border border-gray-100 items-center justify-center shadow-xs"
                >
                  <Ionicons name="add" size={14} color="#1F2937" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Utensils Option Card */}
        <View className="bg-white rounded-3xl border border-gray-100/80 p-4 shadow-sm flex-row items-center justify-between mb-4">
          <View className="flex-row items-center flex-1 mr-3">
            <View className="w-10 h-10 bg-[#FFF8E7] rounded-2xl items-center justify-center mr-3 border border-[#FFE8B5]">
              <Ionicons name="restaurant-outline" size={18} color="#E29E10" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-gray-800">
                Include utensils
              </Text>
              <Text className="text-xs text-gray-400 font-medium mt-0.5">
                Napkins, forks, straws, etc.
              </Text>
            </View>
          </View>
          <Switch
            value={includeUtensils}
            onValueChange={setIncludeUtensils}
            trackColor={{ false: "#E5E7EB", true: "#E29E10" }}
            thumbColor="#fff"
          />
        </View>

        {/* Price Breakdown Card */}
        <View className="bg-white rounded-3xl border border-gray-100/80 p-5 shadow-sm">
          <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 ml-0.5">
            Bill Details
          </Text>

          <View className="gap-y-2.5">
            <View className="flex-row justify-between items-center">
              <Text className="text-sm font-medium text-gray-500">Item subtotal</Text>
              {loading ? (
                <View className="bg-gray-100 h-5 w-16 rounded animate-pulse" />
              ) : (
                <Text className="text-sm font-semibold text-gray-800">{formatMoney(subtotal)}</Text>
              )}
            </View>

            <View className="flex-row justify-between items-center">
              <Text className="text-sm font-medium text-gray-500">Platform fee</Text>
              {loading ? (
                <View className="bg-gray-100 h-5 w-16 rounded animate-pulse" />
              ) : (
                <Text className="text-sm font-semibold text-gray-800">{formatMoney(platformFee)}</Text>
              )}
            </View>

            <View className="flex-row justify-between items-center">
              <Text className="text-sm font-medium text-gray-500">State tax</Text>
              {loading ? (
                <View className="bg-gray-100 h-5 w-16 rounded animate-pulse" />
              ) : (
                <Text className="text-sm font-semibold text-gray-800">{formatTaxRate(stateTaxRate)}</Text>
              )}
            </View>

            <View className="flex-row justify-between items-center">
              <Text className="text-sm font-medium text-gray-500">County tax</Text>
              {loading ? (
                <View className="bg-gray-100 h-5 w-16 rounded animate-pulse" />
              ) : (
                <Text className="text-sm font-semibold text-gray-800">{formatTaxRate(countyTaxRate)}</Text>
              )}
            </View>

            <View className="flex-row justify-between items-center pt-3 mt-1 border-t border-gray-50">
              <Text className="text-base font-bold text-gray-900">Total Amount</Text>
              {loading ? (
                <View className="bg-gray-100 h-6 w-20 rounded animate-pulse" />
              ) : (
                <Text className="text-base font-extrabold text-gray-900">{formatMoney(total)}</Text>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Floating Bottom action bar */}
      <View
        className="absolute left-4 right-4 bg-white border border-gray-100/50 rounded-3xl p-4 shadow-xl"
        style={{
          bottom: insets.bottom > 0 ? insets.bottom + 65 : 65,
          zIndex: 10,
          elevation: 10,
        }}
      >
        <View className="flex-row items-center justify-between mb-3.5 px-1">
          <TouchableOpacity
            className="flex-row items-center"
            activeOpacity={0.7}
            onPress={async () => {
              await clearCart?.();
              await loadCart(false);
            }}
          >
            <Ionicons name="trash-outline" size={14} color="#EF4444" />
            <Text className="text-[12px] font-bold text-red-500 ml-1">Clear Cart</Text>
          </TouchableOpacity>
          
          <Text className="text-base font-extrabold text-gray-900">
            Total: {formatMoney(total)}
          </Text>
        </View>

        <View className="flex-row gap-x-3">
          <TouchableOpacity
            onPress={() => router.push("/(tabs)")}
            activeOpacity={0.8}
            className="flex-1 h-12 rounded-2xl border border-gray-200 bg-white items-center justify-center flex-row"
          >
            <Ionicons name="add" size={18} color="#1F2937" />
            <Text className="text-sm font-bold text-gray-800 ml-1">
              Add More
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => router.push("/screens/cart/checkout")}
            activeOpacity={0.8}
            className="flex-1 h-12 rounded-2xl overflow-hidden"
          >
            <LinearGradient
              colors={["#F5C518", "#E29E10"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ height: '100%', width: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}
            >
              <Text className="text-sm font-bold text-white">
                Checkout
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#ffffff" style={{ marginLeft: 4 }} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
