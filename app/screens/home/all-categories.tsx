import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
    FlatList,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ALL_CATEGORIES = [
    { id: 1, name: "Burger", icon: "fast-food", color: "#FFC107" },
    { id: 2, name: "Pizza", icon: "pizza", color: "#FF5722" },
    { id: 3, name: "Donut", icon: "disc", color: "#E91E63" },
    { id: 4, name: "Drinks", icon: "beer", color: "#2196F3" },
    { id: 5, name: "Tacos", icon: "fast-food-outline", color: "#4CAF50" },
];

export default function AllCategoriesScreen() {
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-[#FDFBF7]">
            <StatusBar style="dark" />

            {/* Header */}
            <View className="flex-row items-center px-4 py-4">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm"
                >
                    <Ionicons name="chevron-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900 ml-4">All Categories</Text>
            </View>

            <FlatList
                data={ALL_CATEGORIES}
                keyExtractor={(item) => item.id.toString()}
                numColumns={2}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        className="flex-1 m-2 bg-white p-6 rounded-2xl items-center justify-center shadow-sm border border-gray-50"
                        onPress={() => {
                            // Usually resets filter on home or navigates with filter
                            router.push({
                                pathname: "/(tabs)",
                                params: { category: item.name }
                            });
                        }}
                    >
                        <View
                            style={{ backgroundColor: item.color + '20' }}
                            className="w-16 h-16 rounded-full items-center justify-center mb-4"
                        >
                            <Ionicons name={item.icon as any} size={32} color={item.color} />
                        </View>
                        <Text className="text-base font-semibold text-gray-800">{item.name}</Text>
                    </TouchableOpacity>
                )}
            />
        </SafeAreaView>
    );
}
