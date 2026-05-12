import { Image } from 'expo-image';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface EmptyStateProps {
    title: string;
    message: string;
    buttonText?: string;
    onButtonPress?: () => void;
}

export const EmptyState = ({ title, message, buttonText, onButtonPress }: EmptyStateProps) => {
    return (
        <View className="flex-1 items-center justify-center px-10 py-10">
            <Image
                source={require('@/assets/images/empty-box.svg')}
                style={{ width: 180, height: 180, marginBottom: 24 }}
                contentFit="contain"
            />
            <Text className="text-2xl font-bold text-gray-900 mb-2 text-center">{title}</Text>
            <Text className="text-gray-500 text-center mb-8 leading-6 text-base">{message}</Text>

            {buttonText && (
                <TouchableOpacity
                    onPress={onButtonPress}
                    className="bg-yellow-400 px-12 py-3.5 rounded-2xl shadow-sm">
                    <Text className="text-gray-900 font-bold text-base">{buttonText}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};
