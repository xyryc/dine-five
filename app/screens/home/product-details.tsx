import { ViewCart } from "@/components/home/ViewCart";
import { CustomerReviews } from "@/components/product/CustomerReviews";
import { useStore } from "@/stores/stores";
import { API_BASE_URL } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { Alert, Image, Modal, ScrollView, Share, Text, TouchableOpacity, View } from "react-native";
import { useRestaurantStore } from "@/stores/useRestaurantStore";
import { SafeAreaView } from "react-native-safe-area-context";

const firstParam = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] ?? "" : value ?? "";

const DEFAULT_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80";

const normalizeImageUri = (value: string | string[] | undefined): string => {
  const raw = firstParam(value).trim().replace(/^['"]|['"]$/g, "");
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
  const router = useRouter();
  const params = useLocalSearchParams();
  const { addFavorite, removeFavorite, addToCart, favorites, fetchFavorites, fetchReviewsByFoodId } =
    useStore() as any;
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
    providerId,
  } = params;
  
  const { claimToken, placeFreeOrder, getAvailableTokens } = useRestaurantStore();
  const [currentTokenId, setCurrentTokenId] = useState<string | null>(firstParam(tokenId as string | string[] | undefined) || null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isClaimingMeal, setIsClaimingMeal] = useState(false);
  const [isPlacingFreeOrder, setIsPlacingFreeOrder] = useState(false);

  const productId = firstParam(id as string | string[] | undefined) || firstParam(foodId as string | string[] | undefined) || "1";

  const [reviewsData, setReviewsData] = useState<any[]>([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [heroImageError, setHeroImageError] = useState(false);
  const [heroImageUri, setHeroImageUri] = useState<string>(DEFAULT_PRODUCT_IMAGE);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const isFreeMeal = params.isFreeAvailable === "true" || !!params.freeTokenCount;

  useEffect(() => {
    console.log("[ProductDetails] Mounted with params:", params);
    console.log("[ProductDetails] isFreeMeal detection:", isFreeMeal);
  }, []);

  const normalizedProductImage = normalizeImageUri(image as string | string[] | undefined);
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
              const total = result.data.reduce((sum: number, review: any) => sum + (review.rating || 0), 0);
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
    setHeroImageError(false);
    setHeroImageUri(
      normalizedProductImage ||
      normalizedRestaurantProfile ||
      DEFAULT_PRODUCT_IMAGE,
    );
  }, [normalizedProductImage, normalizedRestaurantProfile]);

  const product: any = {
    id: productId,
    foodId:
      firstParam(foodId as string | string[] | undefined) ||
      firstParam(id as string | string[] | undefined) ||
      "1",
    name: firstParam(name as string | string[] | undefined) || "Pepperoni Cheese Pizza",
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
    restaurantName: firstParam(restaurantName as string | string[] | undefined) || "The Gourmet Kitchen",
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
      console.log("[ProductDetails] Available tokens found:", tokens?.length || 0);
      
      if (!tokens || tokens.length === 0) {
        Alert.alert("No Tokens", "Sorry, there are no free meal tokens available right now.");
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
        providerId: firstParam(params.providerId as string | string[] | undefined) || product.id,
        foodId: product.foodId,
        quantity: quantity,
      });

      Alert.alert("Success", result.message || "Free order placed successfully!", [
        { text: "View Orders", onPress: () => router.push("/screens/profile/my-orders") },
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert("Order Failed", error.message || "Could not place free order");
    } finally {
      setIsPlacingFreeOrder(false);
    }
  };

  const handleAddToCart = async () => {
    try {
      const result = await addToCart(product, quantity);
      if (result) {
        // Only navigate if successful
        router.push("/(tabs)/card");
      } else {
        const latestError = (useStore.getState() as any)?.error;
        Alert.alert("Failed", latestError || "Failed to add to cart. Please try again.");
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

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="light" />

      {/* Fixed Background Image */}
      <View className="absolute top-0 w-full h-[45vh] bg-gray-200">
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
          <View className="w-full h-full items-center justify-center bg-gray-200">
            <Ionicons name="image-outline" size={46} color="#9CA3AF" />
          </View>
        )}
        <View className="absolute w-full h-full bg-black/10" />
      </View>

      {/* Fixed Header Actions */}
      <SafeAreaView className="absolute top-0 w-full z-50">
        <View className="flex-row justify-between px-4 pt-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm"
          >
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <View className="flex-row gap-3">
            <TouchableOpacity 
              onPress={handleShare}
              className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full items-center justify-center border border-white/30"
            >
              <Ionicons name="share-outline" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleToggleFavorite}
              className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full items-center justify-center border border-white/30"
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

      {/* Scrollable Content */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {/* Spacer to push content down below visible image area */}
        <View className="h-[40vh]" />

        {/* White Content Container */}
        <View className="flex-1 bg-white rounded-t-3xl px-6 pt-8 pb-32 min-h-screen">
          {/* Stats Row */}
          {/* <View className="flex-row justify-between mb-6 border border-[#E3E6F0] rounded-lg p-3 bg-white shadow-sm">
            <View className="flex-row items-center gap-1">
              <Ionicons name="star" size={14} color="#FFC107" />
              <Text className="text-sm font-bold text-[#1F2A33]">
                {product.rating}
              </Text>
              <Text className="text-sm font-normal text-[#7A7A7A]">
                ({product.reviews} Reviews)
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Ionicons name="flame" size={16} color="#F97316" />
              <Text className="text-sm font-normal text-[#7A7A7A]">
                {product.calories}kcal
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Ionicons name="time" size={16} color="#24B5D4" />
              <Text className="text-sm font-normal text-[#7A7A7A]">
                {product.time}mins
              </Text>
            </View>
          </View> */}

          {/* Restaurant Info */}
          {/* <View className="flex-row items-center gap-3 mb-4">
            {product.restaurantProfile ? (
              <Image
                source={{ uri: product.restaurantProfile }}
                className="w-10 h-10 rounded-full bg-gray-100"
              />
            ) : (
              <View className="w-10 h-10 rounded-full bg-yellow-100 items-center justify-center">
                <Ionicons name="restaurant" size={18} color="#FFC107" />
              </View>
            )}
            <Text className="text-sm font-medium text-gray-700">
              {product.restaurantName}
            </Text>
          </View> */}

          {/* Title & Quantity */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-medium text-[#363A33] w-[60%]">
              {product.name}
            </Text>
            <View className="flex-row items-center  rounded-full px-2 py-1">
              <TouchableOpacity
                onPress={() => !isFreeMeal && quantity > 1 && setQuantity((q) => q - 1)}
                className="w-10 h-10 items-center justify-center bg-[#FFF3CD] rounded-full"
              >
                <Text className="text-lg font-bold text-[#332701]">-</Text>
              </TouchableOpacity>
              <Text className="mx-4 text-lg font-medium text-[#1F2A33]">
                {quantity}
              </Text>
              <TouchableOpacity
                onPress={() => !isFreeMeal && setQuantity((q) => q + 1)}
                className="w-10 h-10  items-center justify-center bg-[#FFF3CD] rounded-full"
              >
                <Text className="text-lg font-bold text-[#332701]">+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Description */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsExpanded(!isExpanded)}
            className="mb-8"
          >
            <Text
              className="text-[#7A7A7A] text-sm font-normal leading-6"
              numberOfLines={isExpanded ? undefined : 3}
            >
              {product.description}
            </Text>
            <Text className="text-[#363A33] font-bold mt-1">
              {isExpanded ? "Show less" : "Read more..."}
            </Text>
          </TouchableOpacity>

          {/* Price & Add Button */}
          <View className="flex-row items-center justify-between mb-8">
            <Text className="text-2xl font-semibold text-[#363A33]">
              {isFreeMeal ? "FREE" : `$${product.price}`}
            </Text>
            {isFreeMeal ? (
              currentTokenId ? (
                <TouchableOpacity
                  onPress={handlePlaceFreeOrder}
                  disabled={isPlacingFreeOrder}
                  className="bg-green-500 px-8 py-4 rounded-2xl shadow-md min-w-[160px] items-center"
                >
                  <Text className="text-white font-bold text-base">
                    {isPlacingFreeOrder ? "Processing..." : "Place Free Order"}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleClaimMeal}
                  disabled={isClaimingMeal}
                  className="bg-[#FFC107] px-8 py-4 rounded-2xl shadow-md min-w-[160px] items-center"
                >
                  <Text className="text-gray-900 font-bold text-base">
                    {isClaimingMeal ? "Claiming..." : "Claim Now"}
                  </Text>
                </TouchableOpacity>
              )
            ) : (
              <TouchableOpacity
                onPress={handleAddToCart}
                className="bg-yellow-400 px-8 py-4 rounded-2xl shadow-md min-w-[160px] items-center"
              >
                <Text className="text-[#1F2A33] font-medium text-base">
                  Add to cart
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {isFreeMeal && (
            <Text className="text-sm text-[#7A7A7A] mb-8">
              One donated meal can be claimed once every 48 hours, and each token covers 1 meal only.
            </Text>
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
                  <Ionicons name="checkmark-circle" size={50} color="#22C55E" />
                </View>
                <Text className="text-2xl font-bold text-gray-900 mb-2 text-center">Claim Successful!</Text>
                <Text className="text-gray-500 text-center mb-8 leading-5">
                  You have successfully claimed this meal. You can now place 1 free order with this token.
                </Text>
                <TouchableOpacity
                  onPress={() => setShowSuccessModal(false)}
                  className="bg-green-500 w-full py-4 rounded-2xl items-center shadow-sm"
                >
                  <Text className="text-white font-bold text-lg">Continue to Order</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Customer Reviews */}
          <CustomerReviews reviews={reviewsData} />
        </View>
      </ScrollView>

      {!isFreeMeal && (
        <ViewCart count={quantity} total={quantity * parseFloat(product.price)} />
      )}
    </View>
  );
}
