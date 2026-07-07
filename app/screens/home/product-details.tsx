import { ViewCart } from "@/components/home/ViewCart";
import { CustomerReviews } from "@/components/product/CustomerReviews";
import { useStore } from "@/stores/stores";
import { API_BASE_URL } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRestaurantStore } from "@/stores/useRestaurantStore";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

const firstParam = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

const DEFAULT_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80";

const normalizeImageUri = (value: string | string[] | undefined): string => {
  const raw = firstParam(value)
    .trim()
    .replace(/^['"]|['"]$/g, "");
  if (!raw) return "";
  if (raw === "undefined" || raw === "null" || raw === "N/A") return "";

  if (
    raw.startsWith("https://") ||
    raw.startsWith("file://") ||
    raw.startsWith("content://") ||
    raw.startsWith("data:image")
  ) {
    return raw;
  }

  if (raw.startsWith("http://")) {
    return `https://${raw.slice("http://".length)}`;
  }

  if (raw.startsWith("//")) {
    return `https:${raw}`;
  }

  if (raw.startsWith("/")) {
    return `${API_BASE_URL}${raw}`;
  }

  // Handle backend relative paths like "uploads/..." or "public/uploads/..."
  return `${API_BASE_URL}/${raw.replace(/^\.?\//, "")}`;
};

export default function ProductDetails() {
  try {
    return <ProductDetailsInner />;
  } catch (error: any) {
    console.error("❌ ProductDetails CRASH STACK:", error.stack);
    throw error;
  }
}

function ProductDetailsInner() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const {
    addFavorite,
    removeFavorite,
    addToCart,
    favorites,
    fetchFavorites,
    fetchReviewsByFoodId,
  } = useStore() as any;
  const {
    id,
    foodId,
    name,
    price,
    image,
    description,
    restaurantName,
    restaurantProfile,
    tokenId,
  } = params;

  const { claimToken, placeFreeOrder, getAvailableTokens } =
    useRestaurantStore();
  const [currentTokenId, setCurrentTokenId] = useState<string | null>(
    firstParam(tokenId as string | string[] | undefined) || null,
  );
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isClaimingMeal, setIsClaimingMeal] = useState(false);
  const [isPlacingFreeOrder, setIsPlacingFreeOrder] = useState(false);

  const productId =
    firstParam(id as string | string[] | undefined) ||
    firstParam(foodId as string | string[] | undefined) ||
    "1";

  const [reviewsData, setReviewsData] = useState<any[]>([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [heroImageError, setHeroImageError] = useState(false);
  const [heroImageUri, setHeroImageUri] = useState<string>(
    DEFAULT_PRODUCT_IMAGE,
  );
  const [isExpanded, setIsExpanded] = useState(false);

  const isFreeMeal =
    params.isFreeAvailable === "true" || !!params.freeTokenCount;

  useEffect(() => {
    console.log("[ProductDetails] Mounted with params:", params);
    console.log("[ProductDetails] isFreeMeal detection:", isFreeMeal);
  }, [isFreeMeal, params]);

  const normalizedProductImage = normalizeImageUri(
    image as string | string[] | undefined,
  );
  const normalizedRestaurantProfile = normalizeImageUri(
    restaurantProfile as string | string[] | undefined,
  );

  useEffect(() => {
    const loadReviews = async () => {
      const targetId =
        firstParam(foodId as string | string[] | undefined) ||
        firstParam(id as string | string[] | undefined);
      if (targetId) {
        try {
          const result = await fetchReviewsByFoodId(targetId);
          if (result && result.data) {
            setReviewsData(result.data);
            setTotalReviews(result.meta?.total || result.data.length || 0);

            // Calculate average rating if not provided by backend
            if (result.data.length > 0) {
              const total = result.data.reduce(
                (sum: number, review: any) => sum + (review.rating || 0),
                0,
              );
              const avg = total / result.data.length;
              setAverageRating(parseFloat(avg.toFixed(1)));
            }
          }
        } catch (error) {
          console.log("Error loading reviews:", error);
        }
      }
    };
    loadReviews();
  }, [fetchReviewsByFoodId, foodId, id]);

  useEffect(() => {
    try {
      setHeroImageError(false);
      setHeroImageUri(
        normalizedProductImage ||
          normalizedRestaurantProfile ||
          DEFAULT_PRODUCT_IMAGE,
      );
    } catch (error: any) {
      console.error("❌ ProductDetailsInner RENDER CRASH STACK:", error.stack);
      throw error;
    }
  }, [normalizedProductImage, normalizedRestaurantProfile]);

  const product: any = {
    id: productId,
    foodId:
      firstParam(foodId as string | string[] | undefined) ||
      firstParam(id as string | string[] | undefined) ||
      "1",
    name:
      firstParam(name as string | string[] | undefined) ||
      "Pepperoni Cheese Pizza",
    price: (price as string) || "5.99",
    image:
      normalizedProductImage ||
      normalizedRestaurantProfile ||
      DEFAULT_PRODUCT_IMAGE,
    rating: averageRating || parseFloat(params.rating as string) || 0,
    reviews: totalReviews,
    calories: 300,
    time: 25,
    description:
      firstParam(description as string | string[] | undefined) ||
      "A classic favorite! Indulge in a crispy, thin crust topped with rich tomato sauce, layers of gooey mozzarella cheese, and delicious pepperoni slices. Perfectly baked with a hint of herbs for a mouth-watering experience in every bite.",
    restaurantName:
      firstParam(restaurantName as string | string[] | undefined) ||
      "The Gourmet Kitchen",
    restaurantProfile: normalizedRestaurantProfile,
  };

  const isFav =
    favorites.includes(product.id) || favorites.includes(product.foodId);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (favorites.length === 0) {
      fetchFavorites();
    }
  }, [favorites.length, fetchFavorites]);

  const handleToggleFavorite = async () => {
    console.log("Toggling favorite for foodId:", product.foodId);
    if (isFav) {
      await removeFavorite(product.foodId);
    } else {
      await addFavorite(product.foodId);
    }
  };

  const handleClaimMeal = async () => {
    if (isClaimingMeal) return;

    setIsClaimingMeal(true);
    try {
      console.log("[ProductDetails] Fetching available tokens...");
      const tokenResult = await getAvailableTokens();
      const tokens = tokenResult?.data?.tokens;
      console.log(
        "[ProductDetails] Available tokens found:",
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
      console.log("[ProductDetails] Claiming token:", tokenIdToClaim);

      const result = await claimToken(tokenIdToClaim);
      console.log("[ProductDetails] Claim result:", result);

      const newTokenId = result?.data?.token?.tokenId || tokenIdToClaim;
      setCurrentTokenId(newTokenId);
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error("[ProductDetails] Claim error:", error);
      Alert.alert("Claim Failed", error.message || "Could not claim free meal");
    } finally {
      setIsClaimingMeal(false);
    }
  };

  const handlePlaceFreeOrder = async () => {
    if (!currentTokenId) {
      Alert.alert("Error", "Missing token information for order");
      return;
    }

    setIsPlacingFreeOrder(true);
    try {
      const result = await placeFreeOrder({
        tokenId: currentTokenId,
        providerId:
          firstParam(params.providerId as string | string[] | undefined) ||
          product.id,
        foodId: product.foodId,
        quantity: quantity,
      });

      Alert.alert(
        "Success",
        result.message || "Free order placed successfully!",
        [
          {
            text: "View Orders",
            onPress: () => router.push("/screens/profile/my-orders"),
          },
          { text: "OK", onPress: () => router.back() },
        ],
      );
    } catch (error: any) {
      Alert.alert(
        "Order Failed",
        error.message || "Could not place free order",
      );
    } finally {
      setIsPlacingFreeOrder(false);
    }
  };

  const handleAddToCart = async () => {
    try {
      const result = await addToCart(product, quantity);
      if (result) {
        // Only navigate if successful
        router.push("/(tabs)/cart");
      } else {
        const latestError = (useStore.getState() as any)?.error;
        Alert.alert(
          "Failed",
          latestError || "Failed to add to cart. Please try again.",
        );
      }
    } catch (error) {
      console.log("Error adding to cart:", error);
      Alert.alert("Failed", "Something went wrong while adding to cart.");
    }
  };

  const handleShare = async () => {
    try {
      const message = `Check out this ${product.name} from ${product.restaurantName}!\n\n${product.description}\n\nPrice: $${product.price}\n\nView Image: ${product.image}`;

      await Share.share({
        message: message,
        url: product.image, // For iOS support
        title: product.name,
      });
    } catch (error: any) {
      console.log("Error sharing product:", error);
    }
  };

  try {
    return (
      <View className="flex-1 bg-[#FBF9F6]">
        <StatusBar style="light" />

        {/* Top Header Buttons Overlay (fixed at top of screen) */}
        <SafeAreaView className="absolute top-0 w-full z-50">
          <View className="flex-row justify-between px-4 pt-3">
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
                elevation: 3,
              }}
            >
              <Ionicons name="chevron-back" size={24} color="#1F2937" />
            </TouchableOpacity>

            <View className="flex-row gap-3">
              {/* <TouchableOpacity 
                onPress={handleShare}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "rgba(0, 0, 0, 0.25)",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.2)",
                }}
              >
                <Ionicons name="share-outline" size={20} color="#fff" />
              </TouchableOpacity> */}

              <TouchableOpacity
                onPress={handleToggleFavorite}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "rgba(0, 0, 0, 0.25)",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.2)",
                }}
              >
                <Ionicons
                  name={isFav ? "heart" : "heart-outline"}
                  size={20}
                  color={isFav ? "#EF4444" : "#fff"}
                />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>

        {/* Main Scrollable View */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 140 }}
          className="flex-1"
        >
          {/* Hero Product Image in flow */}
          <View className="w-full h-[44vh] bg-gray-100 relative">
            {!!heroImageUri && !heroImageError ? (
              <Image
                source={{ uri: heroImageUri }}
                className="w-full h-full"
                resizeMode="cover"
                onError={() => {
                  if (heroImageUri !== DEFAULT_PRODUCT_IMAGE) {
                    setHeroImageUri(DEFAULT_PRODUCT_IMAGE);
                    return;
                  }
                  setHeroImageError(true);
                }}
              />
            ) : (
              <View className="w-full h-full items-center justify-center bg-gray-100">
                <Ionicons name="fast-food-outline" size={48} color="#9CA3AF" />
              </View>
            )}

            {/* Subtle top dark overlay for header buttons readability */}
            <LinearGradient
              colors={["rgba(0,0,0,0.35)", "transparent"]}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                height: 112,
              }}
            />
          </View>

          {/* Details Card (no longer fixed, doesn't scroll internally) */}
          <View
            style={{
              marginTop: -30,
              backgroundColor: "#fff",
              borderTopLeftRadius: 40,
              borderTopRightRadius: 40,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.03,
              shadowRadius: 10,
              elevation: 5,
              paddingHorizontal: 20,
              paddingTop: 24,
            }}
          >
            {/* Restaurant Info Bar */}
            <View className="flex-row items-center justify-between mb-5 bg-gray-50 border border-gray-100 rounded-3xl p-3">
              <View className="flex-row items-center gap-3">
                {product.restaurantProfile ? (
                  <Image
                    source={{ uri: product.restaurantProfile }}
                    className="w-10 h-10 rounded-2xl bg-gray-100"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-10 h-10 rounded-2xl bg-yellow-100 items-center justify-center border border-yellow-200">
                    <Ionicons name="restaurant" size={18} color="#FFC107" />
                  </View>
                )}
                <View>
                  <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                    Restaurant
                  </Text>
                  <Text className="text-sm font-black text-gray-800">
                    {product.restaurantName}
                  </Text>
                </View>
              </View>
              <View className="bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-full flex-row items-center gap-1">
                <Ionicons name="star" size={12} color="#F5C518" />
                <Text className="text-[10px] font-extrabold text-amber-800">
                  Verified
                </Text>
              </View>
            </View>

            {/* Title, Pricing & Quantity Row */}
            <View className="mb-6">
              <View className="flex-row items-start justify-between">
                <Text className="text-2xl font-black text-gray-900 leading-tight flex-1 mr-3">
                  {product.name}
                </Text>
                <Text className="text-2xl font-black text-[#E29E10]">
                  {isFreeMeal ? "FREE" : `$${product.price}`}
                </Text>
              </View>
            </View>

            {/* Stats Capsule Row */}
            <View className="flex-row justify-between mb-6 p-3 bg-gray-50/50 border border-gray-100 rounded-2xl">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="star" size={14} color="#F5C518" />
                <Text className="text-xs font-black text-gray-800">
                  {product.rating}
                </Text>
                <Text className="text-[10px] font-bold text-gray-400">
                  ({product.reviews} reviews)
                </Text>
              </View>

              <View className="flex-row items-center gap-1.5">
                <Ionicons name="flame" size={15} color="#FF5A5F" />
                <Text className="text-xs font-bold text-gray-600">
                  {product.calories} kcal
                </Text>
              </View>

              <View className="flex-row items-center gap-1.5">
                <Ionicons name="time-outline" size={15} color="#2D9CDB" />
                <Text className="text-xs font-bold text-gray-600">
                  {product.time} mins
                </Text>
              </View>
            </View>

            {/* Quantity Controller Capsule */}
            <View className="flex-row items-center justify-between mb-6 bg-gray-50 border border-gray-100/80 rounded-2xl px-4 py-3">
              <Text className="text-sm font-extrabold text-gray-800">
                Quantity
              </Text>
              <View className="flex-row items-center gap-x-4">
                <TouchableOpacity
                  onPress={() =>
                    !isFreeMeal && quantity > 1 && setQuantity((q) => q - 1)
                  }
                  disabled={isFreeMeal}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    backgroundColor: isFreeMeal ? "#E5E7EB" : "#F5C518",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="remove" size={18} color="#1F2937" />
                </TouchableOpacity>
                <Text className="text-base font-black text-gray-900 min-w-[20px] text-center">
                  {quantity}
                </Text>
                <TouchableOpacity
                  onPress={() => !isFreeMeal && setQuantity((q) => q + 1)}
                  disabled={isFreeMeal}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    backgroundColor: isFreeMeal ? "#E5E7EB" : "#F5C518",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="add" size={18} color="#1F2937" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Description Block */}
            <View className="mb-6">
              <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-0.5">
                Description
              </Text>
              <TouchableOpacity
                activeOpacity={0.72}
                onPress={() => setIsExpanded(!isExpanded)}
              >
                <Text
                  className="text-gray-500 text-sm font-semibold leading-relaxed"
                  numberOfLines={isExpanded ? undefined : 3}
                >
                  {product.description}
                </Text>
                <Text className="text-[#E29E10] font-extrabold mt-1 text-xs">
                  {isExpanded ? "Show less" : "Read more"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Interactive CTA button */}
            <View className="mb-8">
              {isFreeMeal ? (
                currentTokenId ? (
                  <TouchableOpacity
                    onPress={handlePlaceFreeOrder}
                    disabled={isPlacingFreeOrder}
                    className="bg-emerald-500 w-full py-4 rounded-2xl shadow-sm items-center"
                  >
                    <Text className="text-white font-extrabold text-base">
                      {isPlacingFreeOrder
                        ? "Placing Order..."
                        : "Place Free Order"}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={handleClaimMeal}
                    disabled={isClaimingMeal}
                    style={{
                      backgroundColor: "#F5C518",
                      borderRadius: 16,
                      paddingVertical: 16,
                      alignItems: "center",
                      shadowColor: "#F5C518",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.25,
                      shadowRadius: 8,
                      elevation: 4,
                    }}
                  >
                    <Text className="text-gray-900 font-extrabold text-base">
                      {isClaimingMeal ? "Claiming..." : "Claim Free Meal Now"}
                    </Text>
                  </TouchableOpacity>
                )
              ) : (
                <TouchableOpacity
                  onPress={handleAddToCart}
                  style={{
                    backgroundColor: "#F5C518",
                    borderRadius: 16,
                    paddingVertical: 16,
                    alignItems: "center",
                    shadowColor: "#F5C518",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                >
                  <Text className="text-gray-900 font-extrabold text-base">
                    Add to Cart • $
                    {(quantity * parseFloat(product.price)).toFixed(2)}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {isFreeMeal && (
              <View className="bg-amber-50 border border-amber-100/50 rounded-2xl p-4 mb-8 flex-row gap-2">
                <Ionicons name="information-circle" size={18} color="#D97706" />
                <Text className="text-xs text-amber-800 font-semibold flex-1 leading-normal">
                  One donated meal can be claimed once every 48 hours, and each
                  token covers 1 meal only.
                </Text>
              </View>
            )}

            {/* Success Modal */}
            <Modal
              animationType="fade"
              transparent={true}
              visible={showSuccessModal}
              onRequestClose={() => setShowSuccessModal(false)}
            >
              <View className="flex-1 justify-center items-center bg-black/50 px-6">
                <View className="bg-white w-full rounded-3xl p-8 items-center shadow-xl">
                  <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-6">
                    <Ionicons
                      name="checkmark-circle"
                      size={50}
                      color="#22C55E"
                    />
                  </View>
                  <Text className="text-2xl font-bold text-gray-900 mb-2 text-center">
                    Claim Successful!
                  </Text>
                  <Text className="text-gray-500 text-center mb-8 leading-5 font-semibold">
                    You have successfully claimed this meal. You can now place 1
                    free order with this token.
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowSuccessModal(false)}
                    className="bg-green-500 w-full py-4 rounded-2xl items-center shadow-sm"
                  >
                    <Text className="text-white font-bold text-lg">
                      Continue to Order
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            {/* Customer Reviews */}
            <CustomerReviews reviews={reviewsData} />
          </View>
        </ScrollView>

        {!isFreeMeal && (
          <ViewCart
            count={quantity}
            total={quantity * parseFloat(product.price)}
          />
        )}
      </View>
    );
  } catch (error: any) {
    console.error("❌ ProductDetailsInner RENDER CRASH STACK:", error.stack);
    throw error;
  }
}
