import { EmptyState } from "@/components/common/EmptyState";
import { useStore } from "@/stores/stores";
import { Product } from "@/utils/favoriteStore";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FavoriteScreen() {
    const router = useRouter();
    const { fetchFavorites, addToCart, removeFavorite, isLoading } =
        useStore() as any;
    const [favorites, setFavorites] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const loadFavorites = async () => {
        const data = await fetchFavorites();
        if (data && data.favorites) {
            setFavorites(data.favorites);
        }
    };

    useEffect(() => {
        loadFavorites();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadFavorites();
        setRefreshing(false);
    };

    const handleToggleFavorite = async (foodId: string) => {
        const result = await removeFavorite(foodId);
        if (result) {
            // Refresh list after removing favorite
            loadFavorites();
        }
    };

    const handleAddToCart = (item: any) => {
        const product: Product = {
            id: item.food.foodId,
            name: item.food.title,
            price: item.food.finalPriceTag.toString(),
            image: item.food.image,
            rating: item.food.averageRating || 4.7,
            reviews: item.food.totalReviews || 2500,
        };
        addToCart(product, 1);
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
                router.push({
                    pathname: "/(tabs)/product-details",
                    params: {
                        id: item.food.foodId,
                        name: item.food.title,
                        price: item.food.finalPriceTag.toString(),
                        image: item.food.image,
                        rating: (item.food.averageRating || 4.7).toString(),
                        reviews: (item.food.totalReviews || 2500).toString(),
                    },
                });
            }}
            className="bg-white m-4 mb-0 rounded-3xl p-3 flex-row shadow-sm border border-gray-50"
        >
            <View className="relative">
                <Image
                    source={{ uri: item.food.image }}
                    className="w-28 h-28 rounded-2xl"
                    resizeMode="cover"
                />
                <TouchableOpacity className="absolute top-2 left-2 w-8 h-8 bg-white/80 rounded-full items-center justify-center shadow-sm"></TouchableOpacity>
            </View>

            <View className="flex-1 ml-4 justify-between">
                <View>
                    <View className="flex-row justify-between items-start">
                        <Text
                            numberOfLines={1}
                            className="text-lg font-bold text-gray-900 flex-1"
                        >
                            {item.food.title}
                        </Text>
                        <Text className="text-[10px] text-yellow-600 font-medium ml-2">
                            Top Rated
                        </Text>
                    </View>

                    <View className="flex-row items-center mt-1">
                        <Ionicons name="star" size={14} color="#FFC107" />
                        <Text className="text-gray-500 text-xs ml-1">
                            {item.food.averageRating || 4.7}(
                            {item.food.totalReviews || "2.5k"})
                        </Text>
                    </View>

                    <Text className="text-xl font-bold text-gray-900 mt-2">
                        $ {item.food.finalPriceTag}
                    </Text>

                    <Text className="text-gray-400 text-[10px] mt-1">
                        America • Burger • Fries
                    </Text>
                </View>

                <TouchableOpacity
                    onPress={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(item.food.foodId);
                    }}
                    className="absolute bottom-0 right-0 w-10 h-10 bg-yellow-400 rounded-full items-center justify-center shadow-sm"
                >
                    <Ionicons name="add" size={24} color="#000" />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView className="flex-1 bg-[#FDFBF7]">
            <StatusBar style="dark" />

            {/* Header */}
            <View className="px-4 py-4 flex-row items-center justify-center relative">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="absolute left-4 w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm"
                >
                    <Ionicons name="chevron-back" size={24} color="#000" />
                </TouchableOpacity>

                <View className="flex-row items-center">
                    <Ionicons name="heart-outline" size={24} color="#1F2A33" />
                    <Text className="text-xl font-bold text-[#1F2A33] ml-2">
                        Favorite
                    </Text>
                </View>
            </View>

            {isLoading && !refreshing ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#FFC107" />
                </View>
            ) : favorites.length === 0 ? (
                <EmptyState
                    title="No favorites yet"
                    message="Your favorite items will appear here once you add them."
                    buttonText="Discover Foods"
                    onButtonPress={() => router.push("/(tabs)")}
                />
            ) : (
                <FlatList
                    data={favorites}
                    keyExtractor={(item) => item.food.foodId}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    showsVerticalScrollIndicator={false}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                />
            )}
        </SafeAreaView>
    );
}
