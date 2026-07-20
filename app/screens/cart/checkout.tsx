import { DonateModal } from "@/components/home/DonateModal";
import { useStore } from "@/stores/stores";
import { useRestaurantStore } from "@/stores/useRestaurantStore";
import { Ionicons } from "@expo/vector-icons";
import { StripeProvider, useStripe } from "@stripe/stripe-react-native";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";

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
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
};

const formatMoney = (value: number) => `$${value.toFixed(2)}`;

const formatTaxRate = (value: number) => `${(value * 100).toFixed(0)}%`;

const getSearchParam = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

type DonationBreakdown = {
  mealCount?: number;
  pricePerMeal?: number;
  platformFeePerMeal?: number;
  subtotal?: number;
  platformFee?: number;
  stateTax?: number;
  stateTaxRate?: number;
  total?: number;
  state?: string;
};

const normalizeTaxRate = (value: unknown): number => {
  const rate = toNumber(value, 0);
  return rate > 1 ? rate / 100 : rate;
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

const extractTaxRateFromPayload = (payload: any): number => {
  if (typeof payload === "number" || typeof payload === "string") {
    return normalizeTaxRate(payload);
  }

  const source = payload?.data ?? payload;

  return normalizeTaxRate(
    source?.stateTaxRate ??
    source?.taxRate ??
    source?.rate ??
    source?.percentage ??
    source?.tax ??
    source?.TaxRules ??
    source?.tax_rate ??
    source?.state_tax_rate ??
    source?.combinedRate ??
    source?.combined_rate ??
    source?.totalTaxRate ??
    source?.total_tax_rate,
  );
};

function CheckoutContent() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    mealCount?: string | string[];
    type?: string | string[];
  }>();
  const {
    fetchCart,
    createOrder,
    clearCart,
    createPaymentIntent,
    createDonationPaymentIntent,
    confirmDonationPayment,
    fetchStateTax,
  } = useStore() as any;
  const { location, fetchLocation } = useRestaurantStore();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [isDonateModalVisible, setIsDonateModalVisible] = useState(false);
  const [includeUtensils, setIncludeUtensils] = useState(true);
  const [cartSubtotal, setCartSubtotal] = useState(0);
  const [cartGroups, setCartGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(true);
  const [cartRawData, setCartRawData] = useState<any>(null);
  const [donationBreakdown, setDonationBreakdown] =
    useState<DonationBreakdown | null>(null);

  const rawMealCount = getSearchParam(params.mealCount);
  const donationMealCount = Math.max(1, Math.floor(toNumber(rawMealCount, 1)));
  const isDonationCheckout =
    getSearchParam(params.type) === "donation" || !!rawMealCount;
  const donationPricePerMeal = donationBreakdown?.pricePerMeal ?? 5.99;
  const donationFeePerMeal = donationBreakdown?.platformFeePerMeal ?? 0.5;
  const donationSubtotal =
    donationBreakdown?.subtotal ?? donationMealCount * donationPricePerMeal;
  const donationPlatformFee =
    donationBreakdown?.platformFee ?? donationMealCount * donationFeePerMeal;
  const donationStateTax = donationBreakdown?.stateTax ?? 0;
  const donationTotal =
    donationBreakdown?.total ??
    donationSubtotal + donationPlatformFee + donationStateTax;



  const loadCartData = useCallback(async () => {
    setIsCheckoutLoading(true);
    if (isDonationCheckout) {
      setCartRawData(null);
      setCartSubtotal(0);
      setCartGroups([]);
      setIsCheckoutLoading(false);
      return;
    }

    try {
      const cartData = await fetchCart();
      const root = cartData?.items
        ? cartData
        : cartData?.data?.items
          ? cartData.data
          : null;

      if (root) {
        setCartRawData(root);
        const items = Array.isArray(root.items) ? root.items : [];
        const computedSubtotal = toNumber(root.subtotal, items.reduce((acc: number, item: any) => {
          const foodData =
            item?.foodId && typeof item.foodId === "object"
              ? item.foodId
              : item?.food && typeof item.food === "object"
                ? item.food
                : null;
          const price = toNumber(
            item.baseRevenue ??
            foodData?.baseRevenue ??
            item.price ??
            foodData?.price ??
            foodData?.finalPriceTag,
            0,
          );
          const quantity = Math.max(1, Math.floor(toNumber(item.quantity, 1)));
          return acc + price * quantity;
        }, 0));
        setCartSubtotal(computedSubtotal);

        // Format groups
        const rawGroups = Array.isArray(root?.restaurantGroups) ? root.restaurantGroups : [];
        const formattedGroups = rawGroups.map((group: any) => {
          const subtotalVal = toNumber(group.subtotal, 0);
          const stateTaxVal = toNumber(group.stateTax ?? group.stateTaxAmount, 0);
          const cityTaxVal = toNumber(group.cityTax, 0);
          const totalVal = toNumber(group.total, subtotalVal + stateTaxVal + cityTaxVal);

          const groupItems = Array.isArray(group.items) ? group.items : [];
          const formattedItems = groupItems.map((item: any) => {
            const foodData = item?.foodId && typeof item.foodId === "object" ? item.foodId : {};
            return {
              id: foodData?._id || foodData?.id || item._id,
              name: pickString(foodData?.title, foodData?.name, item.title, item.name, "Unknown item"),
              image: pickString(foodData?.image, item.image),
              price: toNumber(item.price || foodData?.price || foodData?.finalPriceTag, 0),
              quantity: Math.max(1, Math.floor(toNumber(item.quantity, 1))),
            };
          });

          return {
            providerId: group.providerId,
            restaurantName: pickString(group.restaurantName, "Restaurant"),
            restaurantAddress: pickString(group.restaurantAddress, "Address unavailable"),
            restaurantProfile: pickString(group.restaurantProfile, group.restaurantImage, ""),
            subtotal: subtotalVal,
            stateTax: stateTaxVal,
            cityTax: cityTaxVal,
            total: totalVal,
            items: formattedItems,
          };
        });
        setCartGroups(formattedGroups);
      } else {
        setCartGroups([]);
      }
    } catch (err) {
      console.log("loadCartData error:", err);
    } finally {
      setIsCheckoutLoading(false);
    }
  }, [fetchCart, isDonationCheckout]);

  useFocusEffect(
    useCallback(() => {
      loadCartData();
    }, [loadCartData]),
  );

  // Removed local geocoding tax rules loading block

  const resolveProviderId = (item: any) => {
    const foodData =
      item?.foodId && typeof item.foodId === "object"
        ? item.foodId
        : item?.food && typeof item.food === "object"
          ? item.food
          : null;

    const provider =
      foodData?.provider ||
      foodData?.providerId ||
      foodData?.providerID ||
      item?.provider ||
      item?.providerId;

    if (typeof provider === "string") return provider;
    return provider?._id || provider?.id || null;
  };

  const cartItems = Array.isArray(cartRawData?.items) ? cartRawData.items : [];
  const platformFee = toNumber(cartRawData?.platformFee, 0);
  const cityTax = toNumber(cartRawData?.cityTax, 0);
  const stateTaxAmount = toNumber(cartRawData?.stateTaxAmount ?? cartRawData?.stateTax, 0);
  const countyTaxAmount = toNumber(cartRawData?.countyTaxAmount, 0);
  const effectiveTotal = toNumber(cartRawData?.total, cartSubtotal + platformFee + cityTax + stateTaxAmount + countyTaxAmount);
  const donationMealLabel = donationMealCount === 1 ? "Meal" : "Meals";
  const pickupAddress =
    cartRawData?.restaurantAddress ||
    cartRawData?.items?.[0]?.foodId?.restaurantAddress ||
    cartRawData?.items?.[0]?.food?.restaurantAddress ||
    "Restaurant address";

  const handleDonationPayment = async () => {
    if (!Number.isFinite(donationMealCount) || donationMealCount < 1) {
      Alert.alert("Invalid donation", "Please select at least 1 meal.");
      return;
    }

    setIsLoading(true);
    try {
      const paymentIntentResult =
        await createDonationPaymentIntent(donationMealCount);
      const paymentIntentData = paymentIntentResult?.data ?? {};
      const clientSecret = paymentIntentData?.clientSecret;
      const paymentIntentId = paymentIntentData?.paymentIntentId;
      const latestBreakdown = paymentIntentData?.breakdown ?? null;

      if (latestBreakdown) {
        setDonationBreakdown(latestBreakdown);
      }

      if (
        !paymentIntentResult ||
        paymentIntentResult?.success === false ||
        !clientSecret ||
        !paymentIntentId
      ) {
        Alert.alert(
          "Error",
          paymentIntentResult?.message ||
          "Failed to create donation payment intent",
        );
        return;
      }

      const initResult = await initPaymentSheet({
        merchantDisplayName: "Dine Five",
        paymentIntentClientSecret: clientSecret,
        allowsDelayedPaymentMethods: true,
      });

      if (initResult.error) {
        Alert.alert(
          "Payment Error",
          initResult.error.message || "Unable to initialize payment sheet",
        );
        return;
      }

      const paymentResult = await presentPaymentSheet();
      if (paymentResult.error) {
        const isCancelled = paymentResult.error.code === "Canceled";
        Alert.alert(
          isCancelled ? "Payment Cancelled" : "Payment Failed",
          paymentResult.error.message ||
          (isCancelled
            ? "Payment was cancelled."
            : "Unable to complete payment."),
        );
        return;
      }

      const confirmResult = await confirmDonationPayment(paymentIntentId);

      if (!confirmResult || confirmResult?.success === false) {
        Alert.alert(
          "Donation Confirmation Failed",
          confirmResult?.message ||
          "Payment completed, but meal tokens could not be created. Please contact support.",
        );
        return;
      }

      const tokensCreated = Math.max(
        1,
        Math.floor(toNumber(confirmResult?.data?.tokensCreated, donationMealCount)),
      );
      const paidTotal = toNumber(latestBreakdown?.total, donationTotal);

      router.push({
        pathname: "/screens/cart/order-success",
        params: {
          type: "donation",
          mealCount: String(tokensCreated),
          tokensCreated: String(tokensCreated),
          orderId: confirmResult?.data?.orderId || "",
          amount: paidTotal.toFixed(2),
        },
      });
    } catch (error: any) {
      console.log("Donation payment error:", error);
      Alert.alert("Error", error.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (isDonationCheckout) {
      await handleDonationPayment();
      return;
    }

    if (!cartRawData || !cartRawData.items || cartRawData.items.length === 0) {
      Alert.alert("Error", "Your cart is empty");
      return;
    }

    setIsLoading(true);
    try {
      const firstItem = cartRawData.items[0];
      const providerId =
        cartRawData.providerId ||
        cartRawData.providerID ||
        resolveProviderId(firstItem);

      if (!providerId) {
        Alert.alert("Error", "Provider not found for cart items");
        return;
      }

      const itemsForPaymentIntent = cartRawData.items
        .map((item: any) => {
          const foodData =
            item?.foodId && typeof item.foodId === "object"
              ? item.foodId
              : item?.food && typeof item.food === "object"
                ? item.food
                : null;

          return {
            foodId:
              foodData?._id || foodData?.id || item.foodId || item.food?.foodId,
            quantity: item.quantity,
          };
        })
        .filter((item: any) => item.foodId);

      if (itemsForPaymentIntent.length === 0) {
        Alert.alert("Error", "Could not prepare payment items");
        return;
      }

      const paymentIntentResult = await createPaymentIntent({
        providerId,
        items: itemsForPaymentIntent,
      });
      const clientSecret = paymentIntentResult?.data?.clientSecret;

      if (
        !paymentIntentResult ||
        paymentIntentResult?.success === false ||
        !clientSecret
      ) {
        Alert.alert(
          "Error",
          paymentIntentResult?.message || "Failed to create payment intent",
        );
        return;
      }

      const initResult = await initPaymentSheet({
        merchantDisplayName: "Dine Five",
        paymentIntentClientSecret: clientSecret,
        allowsDelayedPaymentMethods: true,
      });

      if (initResult.error) {
        Alert.alert(
          "Payment Error",
          initResult.error.message || "Unable to initialize payment sheet",
        );
        return;
      }

      const paymentResult = await presentPaymentSheet();
      if (paymentResult.error) {
        const isCancelled = paymentResult.error.code === "Canceled";
        Alert.alert(
          isCancelled ? "Payment Cancelled" : "Payment Failed",
          paymentResult.error.message ||
          (isCancelled
            ? "Payment was cancelled."
            : "Unable to complete payment."),
        );
        return;
      }

      const formattedItems = cartRawData.items
        .map((item: any) => {
          const foodData =
            item?.foodId && typeof item.foodId === "object"
              ? item.foodId
              : item?.food && typeof item.food === "object"
                ? item.food
                : null;

          return {
            foodId:
              foodData?._id || foodData?.id || item.foodId || item.food?.foodId,
            quantity: item.quantity,
            price: item.price,
          };
        })
        .filter((item: any) => !!item.foodId);

      const orderData = {
        providerId: providerId,
        items: formattedItems,
        totalPrice: effectiveTotal,
        paymentMethod: "Stripe",
        logisticsType: "Pickup",
      };

      console.log("Submitting Order Data:", JSON.stringify(orderData, null, 2));

      const result = await createOrder(orderData);

      if (result && result.success) {
        await clearCart();
        // Get restaurant details from the first item in cart
        const firstItem = cartRawData.items[0];
        const foodData =
          firstItem?.foodId && typeof firstItem.foodId === "object"
            ? firstItem.foodId
            : firstItem?.food || {};
        const restaurantAddress =
          foodData.restaurantAddress || pickupAddress;

        router.push({
          pathname: "/screens/cart/order-success",
          params: {
            restaurantName: foodData.restaurantName || "Restaurant",
            restaurantAddress,
            pickupAddress: restaurantAddress,
            amount: effectiveTotal.toFixed(2),
          },
        });
      } else {
        Alert.alert("Error", result?.message || "Failed to place order");
      }
    } catch (error: any) {
      console.log("Order placement error:", error);
      Alert.alert("Error", error.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const totalTaxes = stateTaxAmount + cityTax + countyTaxAmount;

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FA]" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 bg-white">
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          className="w-10 h-10 rounded-full bg-[#F8F9FA] items-center justify-center border border-gray-100/50"
        >
          <Ionicons name="chevron-back" size={20} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-lg font-heading text-gray-900 tracking-tight">
          {isDonationCheckout ? "Donate Meals" : "Checkout"}
        </Text>
        <View className="w-10" />
      </View>

      {/* Stepper Progress bar */}
      <View className="bg-white px-6 pb-4 pt-1 border-b border-gray-100 flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <View className="w-5 h-5 bg-emerald-500 rounded-full items-center justify-center">
            <Ionicons name="checkmark" size={12} color="#FFF" />
          </View>
          <Text className="text-xs font-body-semibold text-gray-800">Cart</Text>
        </View>
        <View className="flex-1 h-[2px] bg-emerald-500 mx-2" />
        <View className="flex-row items-center gap-1.5">
          <View className="w-5 h-5 bg-[#E29E10] rounded-full items-center justify-center">
            <Text className="text-[10px] font-heading text-white">2</Text>
          </View>
          <Text className="text-xs font-body-semibold text-gray-800">Details</Text>
        </View>
        <View className="flex-1 h-[2px] bg-gray-200 mx-2" />
        <View className="flex-row items-center gap-1.5">
          <View className="w-5 h-5 bg-gray-200 rounded-full items-center justify-center">
            <Text className="text-[10px] font-heading text-gray-400">3</Text>
          </View>
          <Text className="text-xs font-body-semibold text-gray-400">Payment</Text>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 160 }}
        className="flex-1"
      >
        {/* Donation Header Banner */}
        {isDonationCheckout && (
          <View className="mb-6 rounded-3xl overflow-hidden shadow-sm">
            <LinearGradient
              colors={["#10B981", "#059669"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View className="p-5 flex-row items-center justify-between">
                <View className="flex-1 mr-4">
                  <Text className="text-white font-heading-semibold text-lg mb-1">
                    Help Fight Hunger
                  </Text>
                  <Text className="text-emerald-100 text-xs font-body-semibold leading-relaxed">
                    Your donation goes directly toward preparing and serving fresh, warm meals to local community members in need.
                  </Text>
                </View>
                <View className="w-12 h-12 bg-white/20 rounded-2xl items-center justify-center">
                  <Ionicons name="heart" size={24} color="#FFF" />
                </View>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Pickup Locations Summary */}
        {!isDonationCheckout && (
          <View className="mb-6">
            <Text className="text-xs font-body-semibold text-gray-400 uppercase tracking-widest mb-3 ml-1">
              Pickup Locations
            </Text>

            {isCheckoutLoading ? (
              <View className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm gap-y-3">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-xl bg-gray-100 animate-pulse" />
                  <View className="flex-1 gap-y-1.5">
                    <View className="bg-gray-100 h-4 w-32 rounded animate-pulse" />
                    <View className="bg-gray-100 h-3 w-48 rounded animate-pulse" />
                  </View>
                </View>
              </View>
            ) : cartGroups.length > 0 ? (
              <View className="bg-white rounded-3xl border border-gray-100/80 p-5 shadow-sm gap-y-3">
                {cartGroups.map((group, idx) => (
                  <View key={group.providerId || idx} className={`flex-row items-center gap-3 ${idx < cartGroups.length - 1 ? 'border-b border-gray-100/50 pb-3' : ''}`}>
                    {group.restaurantProfile ? (
                      <Image
                        source={{ uri: group.restaurantProfile }}
                        className="w-10 h-10 rounded-xl"
                        contentFit="cover"
                      />
                    ) : (
                      <View className="w-10 h-10 bg-yellow-50 border border-yellow-100 rounded-xl items-center justify-center">
                        <Ionicons name="restaurant" size={16} color="#E29E10" />
                      </View>
                    )}
                    <View className="flex-1">
                      <Text className="text-sm font-body-semibold text-gray-900 leading-tight">
                        {group.restaurantName}
                      </Text>
                      <Text numberOfLines={1} className="text-xs text-gray-400 font-body-semibold mt-0.5">
                        {group.restaurantAddress}
                      </Text>
                    </View>
                    <View className="bg-amber-50 border border-amber-100 px-2 py-1 rounded-full">
                      <Text className="text-[9px] font-body-semibold text-amber-800 uppercase">Pickup</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 bg-[#E0F2F1] rounded-2xl items-center justify-center border border-[#B2DFDB]">
                    <Ionicons name="location-outline" size={18} color="#26A69A" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-gray-400 font-body-semibold uppercase tracking-wider">Pickup Address</Text>
                    <Text className="text-base font-heading text-gray-800 mt-0.5">{pickupAddress}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Secure Checkout Banner */}
        <View className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm mb-6 flex-row items-center gap-4">
          <View className="w-12 h-12 bg-emerald-50 rounded-2xl items-center justify-center border border-emerald-100">
            <Ionicons name="lock-closed" size={22} color="#10B981" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-body-semibold text-gray-900">Secure Stripe Checkout</Text>
            <Text className="text-xs text-gray-400 font-body-semibold mt-0.5">Encrypted transactions. We accept Visa, Mastercard, AMEX, and Google Pay.</Text>
          </View>
        </View>

        {/* Summary Card / Bill Breakdown */}
        <View className="mb-6">
          <Text className="text-xs font-body-semibold text-gray-400 uppercase tracking-widest mb-3 ml-1">
            Receipt Details
          </Text>

          <View className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm overflow-hidden">
            {isDonationCheckout ? (
              <View className="gap-y-3.5">
                <View className="flex-row justify-between items-center">
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="gift-outline" size={16} color="#9CA3AF" />
                    <Text className="text-sm font-body-medium text-gray-600">Donated Meals</Text>
                  </View>
                  <Text className="text-sm font-body-semibold text-gray-800">{donationMealCount}</Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="pricetag-outline" size={16} color="#9CA3AF" />
                    <Text className="text-sm font-body-medium text-gray-600">Price Per Meal</Text>
                  </View>
                  <Text className="text-sm font-body-semibold text-gray-800">{formatMoney(donationPricePerMeal)}</Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-sm font-body-medium text-gray-500 pl-6">Meal Subtotal</Text>
                  <Text className="text-sm font-body-semibold text-gray-700">{formatMoney(donationSubtotal)}</Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="server-outline" size={16} color="#9CA3AF" />
                    <Text className="text-sm font-body-medium text-gray-600">Platform Service Fee</Text>
                  </View>
                  <Text className="text-sm font-body-semibold text-gray-800">{formatMoney(donationPlatformFee)}</Text>
                </View>
                {donationStateTax > 0 && (
                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center gap-2">
                      <Ionicons name="receipt-outline" size={16} color="#9CA3AF" />
                      <Text className="text-sm font-body-medium text-gray-600">
                        State Tax{donationBreakdown?.state ? ` (${donationBreakdown.state})` : ""}
                      </Text>
                    </View>
                    <Text className="text-sm font-body-semibold text-gray-800">{formatMoney(donationStateTax)}</Text>
                  </View>
                )}
                
                {/* Dashed Separator with Notch Cutouts */}
                <View className="flex-row items-center my-4 relative">
                  <View className="absolute -left-[32px] w-[14px] h-[14px] rounded-full bg-[#F8F9FA] z-10" />
                  <View className="absolute -right-[32px] w-[14px] h-[14px] rounded-full bg-[#F8F9FA] z-10" />
                  <View className="flex-1 h-[1px] border-t border-dashed border-gray-200" />
                </View>

                <View className="flex-row justify-between items-center">
                  <Text className="text-base font-heading text-gray-900">Total Donation</Text>
                  <Text className="text-xl font-heading text-[#E29E10]">{formatMoney(donationTotal)}</Text>
                </View>
              </View>
            ) : (
              <View className="gap-y-3.5">
                <View className="flex-row justify-between items-center">
                  <Text className="text-sm font-body-medium text-gray-600">Subtotal</Text>
                  {isCheckoutLoading ? (
                    <View className="bg-gray-100 h-5 w-16 rounded animate-pulse" />
                  ) : (
                    <Text className="text-sm font-body-semibold text-gray-800">{formatMoney(cartSubtotal)}</Text>
                  )}
                </View>

                {(platformFee + totalTaxes) > 0 && (
                  <View className="flex-row justify-between items-center">
                    <Text className="text-sm font-body-medium text-gray-600">Fees & Taxes</Text>
                    {isCheckoutLoading ? (
                      <View className="bg-gray-100 h-5 w-16 rounded animate-pulse" />
                    ) : (
                      <Text className="text-sm font-body-semibold text-gray-800">{formatMoney(platformFee + totalTaxes)}</Text>
                    )}
                  </View>
                )}

                {/* Dashed Separator with Notch Cutouts */}
                <View className="flex-row items-center my-4 relative">
                  <View className="absolute -left-[32px] w-[14px] h-[14px] rounded-full bg-[#F8F9FA] z-10" />
                  <View className="absolute -right-[32px] w-[14px] h-[14px] rounded-full bg-[#F8F9FA] z-10" />
                  <View className="flex-1 h-[1px] border-t border-dashed border-gray-200" />
                </View>

                <View className="flex-row justify-between items-center">
                  <Text className="text-base font-heading text-gray-900">Total Amount</Text>
                  {isCheckoutLoading ? (
                    <View className="bg-gray-100 h-6 w-20 rounded animate-pulse" />
                  ) : (
                    <Text className="text-xl font-heading text-[#E29E10]">{formatMoney(effectiveTotal)}</Text>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Safety & Info Note */}
        <View className="bg-gray-50 border border-gray-100/60 rounded-3xl p-4 flex-row gap-3">
          <Ionicons name="shield-checkmark" size={18} color="#9CA3AF" />
          <Text className="text-[11px] text-gray-500 font-body-semibold flex-1 leading-normal">
            Dine Five secures all payments using industry-standard SSL encryption. Your credit card information is processed securely through Stripe and is never stored on our servers.
          </Text>
        </View>
      </ScrollView>

      {/* Floating Footer Bar */}
      <View 
        className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 pt-4 flex-row items-center justify-between"
        style={{
          paddingBottom: Math.max(insets.bottom, 16),
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
          elevation: 10,
        }}
      >
        <View>
          <Text className="text-xs font-body-semibold text-gray-400 uppercase tracking-wider">Total Payable</Text>
          <Text className="text-xl font-heading text-gray-900 mt-0.5">
            {isCheckoutLoading ? "..." : isDonationCheckout ? formatMoney(donationTotal) : formatMoney(effectiveTotal)}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handlePlaceOrder}
          disabled={isLoading || isCheckoutLoading}
          activeOpacity={0.8}
          className="h-14 rounded-full overflow-hidden flex-1 ml-6 shadow-md"
          style={{ opacity: (isLoading || isCheckoutLoading) ? 0.6 : 1 }}
        >
          <LinearGradient
            colors={["#F5C518", "#E29E10"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: "100%", height: "100%" }}
          >
            <View className="w-full h-full flex-row items-center justify-center rounded-full gap-2">
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Ionicons name="card" size={18} color="#fff" />
                  <Text className="text-white font-body-bold text-base">
                    {isCheckoutLoading ? (
                      "Loading..."
                    ) : isDonationCheckout ? (
                      "Donate Now"
                    ) : (
                      "Place Order"
                    )}
                  </Text>
                </>
              )}
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <DonateModal
        visible={isDonateModalVisible}
        onClose={() => setIsDonateModalVisible(false)}
        onConfirm={(mealCount: number) => {
          setIsDonateModalVisible(false);
          router.push({
            pathname: "/screens/cart/checkout",
            params: {
              mealCount: String(mealCount),
              type: "donation",
            },
          } as any);
        }}
      />
    </SafeAreaView>
  );
}

export default function CheckoutScreen() {
  const { fetchStripeConfig } = useStore() as any;
  const [publishableKey, setPublishableKey] = useState("");
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadStripeConfig = async () => {
      try {
        const result = await fetchStripeConfig();
        const key = result?.data?.publishableKey;
        if (isMounted && key) {
          setPublishableKey(key);
        }
      } catch (error) {
        console.log("Stripe config error:", error);
      } finally {
        if (isMounted) {
          setIsLoadingConfig(false);
        }
      }
    };

    loadStripeConfig();

    return () => {
      isMounted = false;
    };
  }, [fetchStripeConfig]);

  if (isLoadingConfig) {
    return (
      <SafeAreaView className="flex-1 bg-[#FDFBF7] items-center justify-center">
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#000" />
        <Text className="text-gray-600 font-body mt-4">
          Loading payment configuration...
        </Text>
      </SafeAreaView>
    );
  }

  if (!publishableKey) {
    return (
      <SafeAreaView className="flex-1 bg-[#FDFBF7] items-center justify-center px-6">
        <StatusBar style="dark" />
        <Text className="text-xl font-heading text-gray-900 mb-2 text-center">
          Payment Unavailable
        </Text>
        <Text className="text-gray-600 font-body text-center">
          Could not initialize Stripe. Please try again in a moment.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <StripeProvider publishableKey={publishableKey}>
      <CheckoutContent />
    </StripeProvider>
  );
}
