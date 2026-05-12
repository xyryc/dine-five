import { cardStore } from '@/utils/cardStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Alert, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AddCardScreen() {
    const router = useRouter();
    const [isDefault, setIsDefault] = useState(false);
    const [cardholderName, setCardholderName] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [expirationDate, setExpirationDate] = useState('');
    const [cvv, setCvv] = useState('');

    const handleSaveCard = () => {
        // Validate form
        if (!cardholderName.trim()) {
            Alert.alert('Error', 'Please enter cardholder name');
            return;
        }
        if (!cardNumber.trim() || cardNumber.length < 16) {
            Alert.alert('Error', 'Please enter a valid card number');
            return;
        }
        if (!expirationDate.trim()) {
            Alert.alert('Error', 'Please enter expiration date');
            return;
        }
        if (!cvv.trim() || cvv.length < 3) {
            Alert.alert('Error', 'Please enter a valid CVV');
            return;
        }

        // Add card to store
        try {
            cardStore.addCard({
                cardholderName,
                cardNumber,
                expirationDate,
                cvv,
                isDefault
            });

            Alert.alert('Success', 'Card added successfully!', [
                {
                    text: 'OK',
                    onPress: () => router.back()
                }
            ]);
        } catch (error) {
            Alert.alert('Error', 'Failed to add card');
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-[#FDFBF7]">
            <StatusBar style="dark" />

            {/* Header */}
            <View className="flex-row items-center justify-center pt-4 pb-8 relative px-6">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="absolute left-6 z-10 w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm">
                    <Ionicons name="chevron-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text className="text-2xl font-bold text-gray-900">Add a card</Text>
            </View>

            <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>

                {/* Set Default Switch */}
                <View className="flex-row justify-between items-center mb-8 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <Text className="text-lg font-semibold text-gray-900">Set as default</Text>
                    <Switch
                        trackColor={{ false: "#E5E7EB", true: "#FFC107" }}
                        thumbColor={isDefault ? "#fff" : "#f4f3f4"}
                        onValueChange={setIsDefault}
                        value={isDefault}
                    />
                </View>

                {/* Form */}
                <View className="space-y-5">
                    <View>
                        <Text className="text-sm font-medium text-gray-600 mb-2">Cardholder name</Text>
                        <TextInput
                            value={cardholderName}
                            onChangeText={setCardholderName}
                            placeholder="Enter cardholder name"
                            placeholderTextColor="#9CA3AF"
                            className="bg-white p-4 rounded-2xl border border-gray-100 text-base text-gray-900"
                        />
                    </View>
                    
                    <View>
                        <Text className="text-sm font-medium text-gray-600 mb-2">Card number</Text>
                        <TextInput
                            value={cardNumber}
                            onChangeText={setCardNumber}
                            placeholder="1234 5678 9012 3456"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="number-pad"
                            maxLength={16}
                            className="bg-white p-4 rounded-2xl border border-gray-100 text-base text-gray-900"
                        />
                    </View>
                    
                    <View className="flex-row space-x-4">
                        <View className="flex-1">
                            <Text className="text-sm font-medium text-gray-600 mb-2">Expiration date</Text>
                            <TextInput
                                value={expirationDate}
                                onChangeText={setExpirationDate}
                                placeholder="MM/YY"
                                placeholderTextColor="#9CA3AF"
                                maxLength={5}
                                className="bg-white p-4 rounded-2xl border border-gray-100 text-base text-gray-900"
                            />
                        </View>
                        
                        <View className="flex-1">
                            <Text className="text-sm font-medium text-gray-600 mb-2">CVV</Text>
                            <TextInput
                                value={cvv}
                                onChangeText={setCvv}
                                placeholder="123"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="number-pad"
                                maxLength={4}
                                className="bg-white p-4 rounded-2xl border border-gray-100 text-base text-gray-900"
                            />
                        </View>
                    </View>
                </View>

                {/* Space at bottom */}
                <View className="h-8" />

            </ScrollView>

            {/* Save Button */}
            <View className="absolute bottom-8 left-6 right-6">
                <TouchableOpacity
                    onPress={handleSaveCard}
                    className="bg-[#FFC107] w-full py-4 rounded-2xl items-center shadow-md">
                    <Text className="text-gray-900 font-bold text-lg">Save</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
