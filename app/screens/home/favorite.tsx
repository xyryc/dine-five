import { EmptyState } from "@/components/common/EmptyState";
import { favoriteStore, Product } from "@/utils/favoriteStore";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FavoriteScreen() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<Product[]>(
    favoriteStore.getFavorites(),
  );

  useEffect(() => {
    const unsub = favoriteStore.subscribe(() => {
      setFavorites([...favoriteStore.getFavorites()]);
    });
    return unsub;
  }, []);

  const renderItem = ({ item }: { item: Product }) => (
    <View className="flex-row items-center bg-white p-3 rounded-2xl mb-4 shadow-sm border border-gray-100">
      <Image
        source={{ uri: item.image }}
        style={{ width: 96, height: 96, borderRadius: 12 }}
        contentFit="cover"
      />
      <View className="flex-1 ml-3">
        <View className="flex-row justify-between items-start">
          <Text className="text-lg font-bold text-gray-900 mb-1">
            {item.name}
          </Text>
          <View className="flex-row items-center">
            <Ionicons name="star" size={14} color="#FFC107" />
            <Text className="text-sm font-bold text-gray-600 ml-1">
              4.7 (2.5k)
            </Text>
          </View>
        </View>

        <Text className="text-lg font-bold text-gray-900 mb-1">
          $ {item.price}
        </Text>

        <Text className="text-sm text-gray-500 mb-2">
          America • Burger • Fries
        </Text>

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View className="flex-row items-center">
              <Ionicons name="time-outline" size={14} color="#9CA3AF" />
              <Text className="text-sm text-gray-500 ml-1">15-30 min</Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="bicycle-outline" size={14} color="#9CA3AF" />
              <Text className="text-sm text-gray-500 ml-1">8.0km</Text>
            </View>
          </View>

          <TouchableOpacity className="w-8 h-8 bg-[#FFE69C] rounded-full items-center justify-center">
            <Ionicons name="add" size={20} color="#332701" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#FDFBF7]">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-4 py-4 flex-row items-center justify-center relative mb-2">
        <TouchableOpacity
          onPress={() => router.back()}
          className="absolute left-4 top-4 p-2"
        >
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <View className="flex-row items-center gap-2">
          <Ionicons name="heart-outline" size={24} color="#333" />
          <Text className="text-xl font-bold text-gray-900">Favorite</Text>
        </View>
      </View>

      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ flexGrow: 1, padding: 16 }}
        ListEmptyComponent={
          <EmptyState
            title="Nothing found here!"
            message="Explore and add items to the favorites to show here..."
            buttonText="Explore"
            onButtonPress={() => router.push("/(tabs)")}
          />
        }
      />
    </SafeAreaView>
  );
}
