import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PrivacyScreen() {
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-[#FDFBF7]">
            <StatusBar style="dark" />

            {/* Header */}
            <View className="flex-row items-center justify-center pt-2 pb-6 relative px-4">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="absolute left-4 z-10 w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm">
                    <Ionicons name="chevron-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900">Privacy Policy</Text>
            </View>

            <ScrollView className="flex-1 px-6">
                <Text className="text-lg font-bold text-gray-800 mb-4">Privacy Policy</Text>
                <Text className="text-gray-600 mb-6">Welcome to Services App !</Text>
                <Text className="text-gray-500 leading-6 mb-6">
                    Accessing or using our services, you agree to be bound by these Terms of Service. If you do not agree with any part of the terms, you must not use our services.
                </Text>

                <Text className="text-base font-bold text-gray-800 mb-2">2. User Responsibilities As a user, you agree to:</Text>
                <View className="space-y-1 mb-6">
                    <Text className="text-gray-500 leading-6">• Use the service only for lawful purposes.</Text>
                    <Text className="text-gray-500 leading-6">• Provide accurate and complete information when required.</Text>
                    <Text className="text-gray-500 leading-6">• Maintain the confidentiality of your account password.</Text>
                </View>

                <Text className="text-base font-bold text-gray-800 mb-2">3. Intellectual Property</Text>
                <Text className="text-gray-500 leading-6 mb-6">
                    All content, trademarks, and data on this service, including but not limited to text, graphics, logos, and images, are the property of [Your Company Name]
                </Text>

                <Text className="text-base font-bold text-gray-800 mb-2">4. Disclaimers</Text>
                <Text className="text-gray-500 leading-6 mb-6">
                    The service is provided on an "as is" and "as available" basis. [Your Company Name] makes no warranties, expressed or implied, regarding the operation.
                </Text>

                <Text className="text-base font-bold text-gray-800 mb-2">5. Disclaimers</Text>
                <Text className="text-gray-500 leading-6 mb-6">
                    The service is provided on an "as is" and "as available" basis. [Your Company Name] makes no warranties, expressed or implied, regarding the operation.
                </Text>

                <Text className="text-base font-bold text-gray-800 mb-2">6. Disclaimers</Text>
                <Text className="text-gray-500 leading-6 mb-12">
                    The service is provided on an "as is" and "as available" basis. [Your Company Name] makes no warranties, expressed or implied, regarding the operation.
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}
