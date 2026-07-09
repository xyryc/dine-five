import { useStore } from "@/stores/stores";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    Text,
    TouchableOpacity,
    View,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const formatFavoritedDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
        const date = new Date(dateStr);
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `Saved ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    } catch {
        return "";
    }
};

const FavoriteSkeleton = () => (
  <View className="px-5 gap-y-4 mt-4">
    {[1, 2, 3].map((key) => (
      <View key={key} className="bg-white rounded-2xl p-4 flex-row border border-gray-100/80 shadow-sm">
        {/* Image skeleton */}
        <View className="w-24 h-24 rounded-xl bg-gray-100" />
        
        {/* Info skeleton */}
        <View className="flex-1 ml-4 justify-between py-1">
          <View className="gap-y-2">
            <View className="w-3/4 h-4 bg-gray-100 rounded-md" />
            <View className="w-1/2 h-3 bg-gray-100 rounded-md" />
          </View>
          <View className="w-1/4 h-3 bg-gray-100 rounded-md animate-pulse" />
        </View>
      </View>
    ))}
  </View>
);

export default function FavoriteScreen() {
    const router = useRouter();
    const { fetchFavorites, removeFavorite, addToCart } = useStore() as any;
    const [favorites, setFavorites] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isAddingToCart, setIsAddingToCart] = useState<string | null>(null);

    const loadFavorites = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const data = await fetchFavorites();
            if (data && data.favorites) {
                setFavorites(data.favorites);
            }
        } catch (error) {
            console.error("Error fetching favorites:", error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        loadFavorites();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadFavorites(true);
        setRefreshing(false);
    };

    const handleToggleFavorite = async (foodId: string) => {
        try {
            // Optimistically update UI
            setFavorites(prev => prev.filter(item => item.food.foodId !== foodId));
            await removeFavorite(foodId);
        } catch (error) {
            console.error("Error removing favorite:", error);
            loadFavorites(true); // Revert on failure
        }
    };

    const handleAddToCart = async (food: any) => {
        if (isAddingToCart) return;
        setIsAddingToCart(food.foodId);
        try {
            const cartItem = {
                id: food.foodId,
                foodId: food.foodId,
                title: food.title,
                price: food.finalPriceTag || 5.99,
                image: food.image,
                restaurantName: "Restaurant",
            };
            const success = await addToCart(cartItem, 1);
            if (success) {
                Alert.alert("Added to Bag", `${food.title} has been added to your checkout bag.`);
            } else {
                Alert.alert("Failed", "Could not add item to bag. Please try again.");
            }
        } catch (error) {
            console.error("Error adding to cart:", error);
            Alert.alert("Error", "Something went wrong. Please try again.");
        } finally {
            setIsAddingToCart(null);
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const food = item?.food || {};
        const price = food.finalPriceTag || 0;
        const imageUrl = typeof food.image === "string" && food.image.trim() ? food.image : null;
        const favoritedLabel = formatFavoritedDate(item?.favoritedAt);

        return (
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {
                    router.push({
                        pathname: "/screens/home/product-details",
                        params: {
                            id: food.foodId,
                            name: food.title,
                            price: price.toString(),
                            image: food.image || "",
                        },
                    });
                }}
                className="bg-white mx-5 mt-4 rounded-2xl p-4 flex-row border border-gray-100 shadow-sm items-center"
            >
                {/* Food Image */}
                <View className="w-24 h-24 rounded-xl overflow-hidden bg-gray-50 mr-4">
                    {imageUrl ? (
                        <Image
                            source={{ uri: imageUrl }}
                            className="w-full h-full"
                            resizeMode="cover"
                        />
                    ) : (
                        <View className="w-full h-full items-center justify-center bg-gray-100">
                            <Ionicons name="fast-food-outline" size={24} color="#D1D5DB" />
                        </View>
                    )}
                </View>

                {/* Info Column */}
                <View className="flex-1 py-1 justify-between h-24">
                    <View>
                        <View className="flex-row justify-between items-start">
                            <Text
                                numberOfLines={1}
                                className="text-base font-extrabold text-gray-900 flex-1 mr-2"
                            >
                                {food.title || "Food Item"}
                            </Text>
                            
                            <TouchableOpacity
                                onPress={(e) => {
                                    e.stopPropagation();
                                    handleToggleFavorite(food.foodId);
                                }}
                                className="p-1 -mr-1"
                            >
                                <Ionicons name="heart" size={20} color="#EC407A" />
                            </TouchableOpacity>
                        </View>

                        {favoritedLabel ? (
                            <View className="flex-row items-center gap-1 mt-1">
                                <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
                                <Text className="text-[10px] text-gray-400 font-bold ml-1">
                                    {favoritedLabel}
                                </Text>
                            </View>
                        ) : null}
                    </View>

                    <View className="flex-row items-center justify-between mt-auto">
                        <Text className="text-base font-black text-gray-900">
                            ${price.toFixed(2)}
                        </Text>

                        {/* Add to Cart Quick CTA */}
                        <TouchableOpacity
                            onPress={(e) => {
                                e.stopPropagation();
                                handleAddToCart(food);
                            }}
                            disabled={isAddingToCart === food.foodId}
                            className="bg-[#F5C518] px-3.5 py-1.5 rounded-xl flex-row items-center gap-1 shadow-sm active:bg-yellow-500"
                        >
                            {isAddingToCart === food.foodId ? (
                                <ActivityIndicator size="small" color="#1F2937" />
                            ) : (
                                <>
                                    <Ionicons name="bag-add-outline" size={13} color="#1F2937" />
                                    <Text className="text-[#1F2937] text-[10px] font-black uppercase">Add</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-[#FBF9F6]" edges={["top"]}>
            <StatusBar style="dark" />

            {/* Header */}
            <View className="flex-row items-center justify-between px-5 pt-3 pb-4 border-b border-gray-100 bg-white">
                <TouchableOpacity
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                    className="w-10 h-10 bg-white rounded-full items-center justify-center border border-gray-100 shadow-sm"
                >
                    <Ionicons name="chevron-back" size={20} color="#1F2937" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-gray-900">Favorites</Text>
                <View className="w-10" />
            </View>

            {loading && !refreshing ? (
                <FavoriteSkeleton />
            ) : favorites.length === 0 ? (
                <View className="flex-1 items-center justify-center px-6 pb-20">
                    <View className="w-20 h-20 bg-[#FFF5F5] rounded-full items-center justify-center mb-5">
                        <Ionicons name="heart-dislike-outline" size={36} color="#EC407A" />
                    </View>
                    <Text className="text-lg font-bold text-gray-900 mb-2">No Favorites Yet</Text>
                    <Text className="text-xs text-gray-400 text-center max-w-[260px] leading-relaxed mb-6">
                        Explore foods and tap the heart icon to save your favorite dishes here.
                    </Text>
                    <TouchableOpacity
                        onPress={() => router.push("/(tabs)")}
                        className="bg-gray-900 px-6 py-3 rounded-2xl shadow-sm"
                    >
                        <Text className="text-white text-xs font-black uppercase tracking-wider">
                            Explore Menu
                        </Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={favorites}
                    keyExtractor={(item) => item.food.foodId}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingBottom: 30 }}
                    showsVerticalScrollIndicator={false}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                />
            )}
        </SafeAreaView>
    );
}
