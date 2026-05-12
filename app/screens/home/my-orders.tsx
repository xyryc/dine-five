import { EmptyState } from '@/components/common/EmptyState';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MyOrdersScreen() {
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-[#FDFBF7]">
            <StatusBar style="dark" />

            {/* Header */}
            <View className="flex-row items-center justify-center pt-2 pb-6 relative px-4">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="absolute left-4 z-10 p-2">
                    <Ionicons name="chevron-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900">My Orders</Text>
            </View>

            {/* Empty State */}
            <EmptyState
                title="There are no orders!"
                message="Place order to show here. Previous orders will be shown here as well."
                buttonText="Explore"
                onButtonPress={() => router.push('/(tabs)')}
            />
        </SafeAreaView>
    );
}
