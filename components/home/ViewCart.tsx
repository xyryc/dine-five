import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface ViewCartProps {
    count: number;
    total: number;
}

export const ViewCart = ({ count, total }: ViewCartProps) => {
    if (count === 0) return null;

    return (
        <View className="absolute bottom-24 left-4 right-4 z-50">
            <TouchableOpacity
                onPress={() => router.push('/(tabs)/card')}
                activeOpacity={0.9}
                className="flex-row items-center justify-between bg-[#EFEEEA] rounded-full pl-6 pr-2 py-2 shadow-xl border border-white/50"
            >
                <Text className="text-[#1F2A33] font-semibold text-base">
                    {count.toString().padStart(2, '0')} Items selected
                </Text>

                <View className="flex-row items-center gap-3">
                    <Text className="text-lg font-bold text-[#1F2A33]">
                        <Text className="text-yellow-500">$</Text> {total.toFixed(2)}
                    </Text>

                    <View className="w-12 h-12 bg-yellow-400 rounded-full items-center justify-center shadow-sm">
                        <Ionicons name="bag" size={20} color="#D32F2F" />
                    </View>
                </View>
            </TouchableOpacity>
        </View>
    );
};
