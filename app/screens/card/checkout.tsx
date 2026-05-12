import { DonateModal } from "@/components/home/DonateModal";
import { useStore } from "@/stores/stores";
import { useRestaurantStore } from "@/stores/useRestaurantStore";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { StripeProvider, useStripe } from "@stripe/stripe-react-native";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
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
import { SafeAreaView } from "react-native-safe-area-context";

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
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
  const [modalVisible, setModalVisible] = useState(false);
  const [isDonateModalVisible, setIsDonateModalVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState("Mastercard - Daniel Jones");
  const [cartSubtotal, setCartSubtotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [cartRawData, setCartRawData] = useState<any>(null);
  const [stateTaxRate, setStateTaxRate] = useState(0);
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

  // Payment methods
  const CARDS = ["Mastercard - Daniel Jones", "Visa - Daniel Jones"];

  const loadCartData = useCallback(async () => {
    if (isDonationCheckout) {
      setCartRawData(null);
      setCartSubtotal(0);
      return;
    }

    const cartData = await fetchCart();
    const root = cartData?.items
      ? cartData
      : cartData?.data?.items
        ? cartData.data
        : null;

    if (root) {
      setCartRawData(root);
      const items = Array.isArray(root.items) ? root.items : [];
      const computedSubtotal = items.reduce((acc: number, item: any) => {
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
      }, 0);
      setCartSubtotal(computedSubtotal);
    }
  }, [fetchCart, isDonationCheckout]);

  useEffect(() => {
    loadCartData();
  }, [loadCartData]);

  useFocusEffect(
    useCallback(() => {
      loadCartData();
    }, [loadCartData]),
  );

  useEffect(() => {
    if (isDonationCheckout) return;

    if (!location) {
      fetchLocation().catch(() => {
        setStateTaxRate(0);
      });
    }
  }, [fetchLocation, isDonationCheckout, location]);

  useEffect(() => {
    let isMounted = true;

    const resolveStateTax = async () => {
      try {
        if (isDonationCheckout) {
          setStateTaxRate(0);
          return;
        }

        if (!location) return;

        const places = await Location.reverseGeocodeAsync({
          latitude: location.latitude,
          longitude: location.longitude,
        });

        const candidates = buildTaxLocationCandidates(places?.[0]);

        for (const candidate of candidates) {
          const taxInfo = await fetchStateTax(candidate);
          const taxRate = extractTaxRateFromPayload(taxInfo);

          if (taxInfo && taxRate > 0) {
            if (isMounted) {
              setStateTaxRate(taxRate);
            }
            return;
          }
        }

        if (isMounted) {
          setStateTaxRate(0);
        }
      } catch {
        if (isMounted) {
          setStateTaxRate(0);
        }
      }
    };

    resolveStateTax();

    return () => {
      isMounted = false;
    };
  }, [fetchStateTax, isDonationCheckout, location]);

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
  const platformFee = cartItems.reduce((acc: number, item: any) => {
    const foodData =
      item?.foodId && typeof item.foodId === "object"
        ? item.foodId
        : item?.food && typeof item.food === "object"
          ? item.food
          : null;
    const serviceFee = toNumber(item.serviceFee ?? foodData?.serviceFee, 0);
    const quantity = Math.max(1, Math.floor(toNumber(item.quantity, 1)));
    return acc + serviceFee * quantity;
  }, 0);
  const countyTaxRate = normalizeTaxRate(
    cartRawData?.countyTaxRate ?? cartRawData?.cityTaxRate,
  );
  const countyTaxAmount = cartSubtotal * countyTaxRate;
  const effectiveStateTaxRate = stateTaxRate;
  const stateTaxAmount = cartSubtotal * effectiveStateTaxRate;
  const effectiveTotal =
    cartSubtotal + platformFee + stateTaxAmount + countyTaxAmount;
  const donationMealLabel = donationMealCount === 1 ? "Meal" : "Meals";

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
        pathname: "/screens/card/order-success",
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
        paymentMethod: selectedCard,
        logisticsType: "Delivery",
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
        const deliveryAddr = "123 Main St, Apt 4B, New York, NY"; // This matches what we show in checkout

        router.push({
          pathname: "/screens/card/order-success",
          params: {
            restaurantName: foodData.restaurantName || "Restaurant",
            restaurantAddress:
              foodData.restaurantAddress || "Selected Location",
            deliveryAddress: deliveryAddr,
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

  return (
    <SafeAreaView className="flex-1 bg-[#FDFBF7]">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center justify-center pt-2 pb-6 relative px-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="absolute left-4 z-10 w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm"
        >
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">
          {isDonationCheckout ? "Donate Meals" : "Checkout"}
        </Text>
      </View>

      <ScrollView className="flex-1 px-6">
        {/* Pickup Address */}
        {!isDonationCheckout && (
          <View className="mb-6">
            <View className="flex-row items-start">
              <Ionicons
                name="location-outline"
                size={24}
                color="#666"
                style={{ marginTop: 2, marginRight: 12 }}
              />
              <View className="flex-1">
                <Text className="text-gray-500 text-sm mb-1">
                  {/* Pickup from */} Delivery from
                </Text>
                <Text className="text-gray-900 font-bold text-base">
                  123 Main St, Apt 4B, New York, NY
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Payment Method */}
        <TouchableOpacity
          onPress={() => {
            if (!isDonationCheckout) {
              setModalVisible(true);
            }
          }}
          className="mb-8"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-start">
              <Ionicons
                name="card-outline"
                size={24}
                color="#666"
                style={{ marginTop: 2, marginRight: 12 }}
              />
              <View>
                <Text className="text-gray-500 text-sm mb-1">
                  Payment Method
                </Text>
                <Text className="text-gray-900 font-bold text-base">
                  {isDonationCheckout ? "Stripe checkout" : selectedCard}
                </Text>
              </View>
            </View>
            {!isDonationCheckout && (
              <Ionicons name="chevron-forward" size={20} color="#999" />
            )}
          </View>
        </TouchableOpacity>

        {/* Summary */}
        <View className="mt-4 pt-6 border-t border-gray-100">
          {isDonationCheckout ? (
            <>
              <View className="flex-row justify-between mb-4">
                <Text className="text-gray-500 text-base">Meals</Text>
                <Text className="text-gray-900 font-bold text-base">
                  {donationMealCount}
                </Text>
              </View>
              <View className="flex-row justify-between mb-4">
                <Text className="text-gray-500 text-base">Price per meal</Text>
                <Text className="text-gray-900 font-bold text-base">
                  {formatMoney(donationPricePerMeal)}
                </Text>
              </View>
              <View className="flex-row justify-between mb-4">
                <Text className="text-gray-500 text-base">Meal subtotal</Text>
                <Text className="text-gray-900 font-bold text-base">
                  {formatMoney(donationSubtotal)}
                </Text>
              </View>
              <View className="flex-row justify-between mb-4">
                <Text className="text-gray-500 text-base">Platform Fee</Text>
                <Text className="text-gray-900 font-bold text-base">
                  {formatMoney(donationPlatformFee)}
                </Text>
              </View>
              <View className="flex-row justify-between mb-4">
                <Text className="text-gray-500 text-base">
                  State Tax
                  {donationBreakdown?.state ? ` (${donationBreakdown.state})` : ""}
                </Text>
                <Text className="text-gray-900 font-bold text-base">
                  {formatMoney(donationStateTax)}
                </Text>
              </View>
              <View className="flex-row justify-between text-lg pt-4 border-t border-gray-100">
                <Text className="text-gray-900 text-lg font-bold">Total</Text>
                <Text className="text-gray-900 text-xl font-bold">
                  {formatMoney(donationTotal)}
                </Text>
              </View>
            </>
          ) : (
            <>
              <View className="flex-row justify-between mb-4">
                <Text className="text-gray-500 text-base">Item subtotal</Text>
                <Text className="text-gray-900 font-bold text-base">
                  {formatMoney(cartSubtotal)}
                </Text>
              </View>
              <View className="flex-row justify-between mb-4">
                <Text className="text-gray-500 text-base">Platform Fee</Text>
                <Text className="text-gray-900 font-bold text-base">
                  {formatMoney(platformFee)}
                </Text>
              </View>
              <View className="flex-row justify-between mb-4">
                <Text className="text-gray-500 text-base">
                  State Tax
                </Text>
                <Text className="text-gray-900 font-bold text-base">
                  {formatTaxRate(effectiveStateTaxRate)}
                </Text>
              </View>
              <View className="flex-row justify-between mb-4">
                <Text className="text-gray-500 text-base">County Tax</Text>
                <Text className="text-gray-900 font-bold text-base">
                  {formatTaxRate(countyTaxRate)}
                </Text>
              </View>

              <View className="flex-row justify-between text-lg pt-4 border-t border-gray-100">
                <Text className="text-gray-900 text-lg font-bold">Total</Text>
                <Text className="text-gray-900 text-xl font-bold">
                  {formatMoney(effectiveTotal)}
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <View className="absolute bottom-4 left-0 right-0 bg-[#FDFBF7] px-4 py-4 border-t border-gray-100">

        <TouchableOpacity
          onPress={handlePlaceOrder}
          disabled={isLoading}
          className={`bg-yellow-400 w-full py-4 rounded-2xl shadow-md items-center justify-center ${isLoading ? "opacity-70" : ""}`}
        >
          {isLoading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text className="text-gray-900 font-bold text-lg">
              {isDonationCheckout
                ? `Donate ${donationMealCount} ${donationMealLabel} ${formatMoney(donationTotal)}`
                : `Place Order ${formatMoney(effectiveTotal)}`}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <DonateModal
        visible={isDonateModalVisible}
        onClose={() => setIsDonateModalVisible(false)}
        onConfirm={(mealCount: number) => {
          setIsDonateModalVisible(false);
          router.push({
            pathname: "/screens/card/checkout",
            params: {
              mealCount: String(mealCount),
              type: "donation",
            },
          } as any);
        }}
      />

      {/* Change Card Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 min-h-[40%]">
            <View className="items-center mb-6">
              <View className="w-12 h-1 bg-gray-300 rounded-full mb-4" />
              <Text className="text-lg font-bold text-gray-900">
                Choose Payment Method
              </Text>
            </View>

            {CARDS.map((card, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedCard(card)}
                className="flex-row items-center justify-between bg-gray-50 p-4 rounded-xl mb-3"
              >
                <Text className="text-gray-900 font-medium">{card}</Text>
                <View
                  className={`w-5 h-5 rounded-full border-2 items-center justify-center ${selectedCard === card ? "border-[#FFC107]" : "border-gray-300"}`}
                >
                  {selectedCard === card && (
                    <View className="w-2.5 h-2.5 rounded-full bg-[#FFC107]" />
                  )}
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              className="bg-yellow-400 w-full py-4 rounded-2xl shadow-md mt-6 items-center"
            >
              <Text className="text-gray-900 font-bold text-lg">Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
        <Text className="text-gray-600 mt-4">
          Loading payment configuration...
        </Text>
      </SafeAreaView>
    );
  }

  if (!publishableKey) {
    return (
      <SafeAreaView className="flex-1 bg-[#FDFBF7] items-center justify-center px-6">
        <StatusBar style="dark" />
        <Text className="text-xl font-bold text-gray-900 mb-2 text-center">
          Payment Unavailable
        </Text>
        <Text className="text-gray-600 text-center">
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
