import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TermsScreen() {
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
                <Text className="text-xl font-bold text-gray-900">Terms & Condition</Text>
            </View>

            <ScrollView className="flex-1 px-6 pb-12" showsVerticalScrollIndicator={false}>
                <Text className="text-xl font-bold text-gray-900 mb-2">
                    DINEFIVE — RESTAURANT TERMS & CONDITIONS
                </Text>
                <Text className="text-gray-500 font-medium mb-4">Effective Date: January 2026</Text>

                <Text className="text-gray-600 leading-6 mb-4">
                    These Restaurant Terms & Conditions (“Agreement”) govern the participation of restaurants, cafés, bakeries, and food vendors (“Restaurant,” “you”) on the DineFive platform (“DineFive,” “we,” “us”).
                </Text>
                <Text className="text-gray-600 leading-6 mb-6">
                    By registering, listing food, or accepting orders through DineFive, you agree to be legally bound by this Agreement.
                </Text>

                <Text className="text-lg font-bold text-gray-800 mb-3 border-b border-gray-100 pb-1">TABLE OF CONTENTS</Text>
                <View className="mb-8 pl-1">
                    {[
                        "1. Platform Role & Relationship",
                        "2. Restaurant Responsibilities",
                        "3. Food Safety & Liability",
                        "4. Pricing & Portion Standards",
                        "5. Alcohol Policy (Beer & Wine Only)",
                        "6. Payments & Fees",
                        "7. Cancellations & Availability",
                        "8. Customer Complaints & Refunds",
                        "9. Marketing & Branding Rights",
                        "10. Account Suspension & Termination",
                        "11. Limitation of Liability",
                        "12. Governing Law",
                        "13. Entire Agreement"
                    ].map((item, index) => (
                        <Text key={index} className="text-gray-500 mb-1.5">• {item}</Text>
                    ))}
                </View>

                {/* Section 1 */}
                <Text className="text-base font-bold text-gray-800 mb-2">1. Platform Role & Relationship</Text>
                <Text className="text-gray-600 leading-6 mb-3">
                    DineFive is a technology platform that connects customers with restaurants offering surplus, freshly prepared food.
                </Text>
                <Text className="text-gray-600 mb-2 font-semibold">DineFive does not:</Text>
                <View className="mb-6 pl-4">
                    <Text className="text-gray-500 mb-1">• Prepare food</Text>
                    <Text className="text-gray-500 mb-1">• Store food</Text>
                    <Text className="text-gray-500 mb-1">• Package food</Text>
                    <Text className="text-gray-500 mb-1">• Transport food</Text>
                    <Text className="text-gray-500 mb-1">• Inspect kitchens</Text>
                    <Text className="text-gray-500 mb-1">• Control restaurant operations</Text>
                </View>
                <Text className="text-gray-600 mb-8 italic">
                    Restaurants are independent businesses and not employees, agents, or partners of DineFive.
                </Text>

                {/* Section 2 */}
                <Text className="text-base font-bold text-gray-800 mb-2">2. Restaurant Responsibilities</Text>
                <Text className="text-gray-600 mb-2 font-semibold">Restaurants agree to:</Text>
                <View className="mb-6 pl-4">
                    <Text className="text-gray-500 mb-1.5">• Hold all required health, food service, and alcohol (Beer & Wine) licenses</Text>
                    <Text className="text-gray-500 mb-1.5">• Prepare and package food in compliance with local laws</Text>
                    <Text className="text-gray-500 mb-1.5">• Provide only fresh, same-day prepared food</Text>
                    <Text className="text-gray-500 mb-1.5">• Follow all portion and listing standards</Text>
                    <Text className="text-gray-500 mb-1.5">• Accurately describe items listed on DineFive</Text>
                    <Text className="text-gray-500 mb-1.5">• Verify customer age when selling beer or wine</Text>
                </View>
                <Text className="text-gray-600 mb-8">
                    Restaurants are solely responsible for their kitchen, staff, food quality, and safety.
                </Text>

                {/* Section 3 */}
                <Text className="text-base font-bold text-gray-800 mb-2">3. Food Safety & Liability</Text>
                <Text className="text-gray-600 mb-2 font-semibold">Restaurants are fully responsible for:</Text>
                <View className="mb-6 pl-4">
                    <Text className="text-gray-500 mb-1">• Food handling</Text>
                    <Text className="text-gray-500 mb-1">• Storage</Text>
                    <Text className="text-gray-500 mb-1">• Preparation</Text>
                    <Text className="text-gray-500 mb-1">• Allergen disclosure</Text>
                    <Text className="text-gray-500 mb-1">• Sanitation</Text>
                    <Text className="text-gray-500 mb-1">• Spoilage or contamination</Text>
                </View>
                <Text className="text-gray-600 mb-2 font-semibold">DineFive does not assume liability for:</Text>
                <View className="mb-6 pl-4">
                    <Text className="text-gray-500 mb-1">• Foodborne illness</Text>
                    <Text className="text-gray-500 mb-1">• Allergic reactions</Text>
                    <Text className="text-gray-500 mb-1">• Improper preparation</Text>
                    <Text className="text-gray-500 mb-1">• Expired or unsafe food</Text>
                    <Text className="text-gray-500 mb-1">• Health code violations</Text>
                </View>
                <Text className="text-gray-600 mb-8">
                    Customers purchase food directly from the restaurant through DineFive platform.
                </Text>

                {/* Section 4 */}
                <Text className="text-base font-bold text-gray-800 mb-2">4. Pricing & Portion Standards</Text>
                <Text className="text-gray-600 mb-2 font-semibold">All listings on DineFive must follow:</Text>
                <Text className="text-gray-800 font-bold mb-3 pl-4">
                    $5.99 per item / per meal as defined by DineFive portion and packaging standards.
                </Text>
                <Text className="text-gray-600 mb-4">
                    Restaurants may give more food but may never provide less than the minimum required portions.
                </Text>
                <Text className="text-gray-600 mb-2 font-semibold">Failure to follow portion rules may result in:</Text>
                <View className="mb-8 pl-4">
                    <Text className="text-gray-500 mb-1">• Removal of listings</Text>
                    <Text className="text-gray-500 mb-1">• Refunds charged to the restaurant</Text>
                    <Text className="text-gray-500 mb-1">• Account suspension</Text>
                </View>

                {/* Section 5 */}
                <Text className="text-base font-bold text-gray-800 mb-2">5. Alcohol Policy (Beer & Wine Only)</Text>
                <Text className="text-gray-600 mb-3">
                    Only beer and wine may be sold through DineFive where legally permitted.
                </Text>
                <Text className="text-gray-600 mb-2 font-semibold">Restaurants must:</Text>
                <View className="mb-4 pl-4">
                    <Text className="text-gray-500 mb-1">• Hold proper beer & wine licenses</Text>
                    <Text className="text-gray-500 mb-1">• Verify customer age at pickup</Text>
                    <Text className="text-gray-500 mb-1">• Follow all local beer & wine regulations</Text>
                </View>
                <Text className="text-amber-700 bg-amber-50 p-3 rounded-lg font-bold text-center mb-8 border border-amber-100">
                    ***No spirits, liquor, or other alcoholic beverages are allowed. “Only Beer & Wine”.
                </Text>

                {/* Section 6 */}
                <Text className="text-base font-bold text-gray-800 mb-2">6. Payments & Fees</Text>
                <Text className="text-gray-600 mb-3">
                    DineFive processes customer payments on behalf of restaurants.
                </Text>
                <Text className="text-gray-600 mb-2 font-semibold">Restaurants receive payouts according to:</Text>
                <View className="mb-8 pl-4">
                    <Text className="text-gray-500 mb-1">• Completed orders</Text>
                    <Text className="text-gray-500 mb-1">• Adjustments for refunds, cancellations, or disputes</Text>
                    <View className="mt-2">
                        <Text className="text-gray-600 italic">DineFive may deduct platform fees, processing costs, or refunds as applicable.</Text>
                    </View>
                </View>

                {/* Section 7 */}
                <Text className="text-base font-bold text-gray-800 mb-2">7. Cancellations & Availability</Text>
                <Text className="text-gray-600 mb-4">
                    Restaurants must only list food they can provide.
                </Text>
                <Text className="text-gray-600 mb-2 font-semibold">If a restaurant cannot fulfill an order:</Text>
                <View className="mb-4 pl-4">
                    <Text className="text-gray-500 mb-1">• The restaurant may be charged the refund amount</Text>
                    <Text className="text-gray-500 mb-1">• Repeated failures may result in suspension</Text>
                </View>
                <Text className="text-gray-600 mb-8 italic">
                    DineFive is not responsible for lost sales due to incorrect availability.
                </Text>

                {/* Section 8 */}
                <Text className="text-base font-bold text-gray-800 mb-2">8. Customer Complaints & Refunds</Text>
                <Text className="text-gray-600 mb-2 font-semibold">DineFive may issue refunds when:</Text>
                <View className="mb-4 pl-4">
                    <Text className="text-gray-500 mb-1">• Food is missing</Text>
                    <Text className="text-gray-500 mb-1">• Portions do not meet standards</Text>
                    <Text className="text-gray-500 mb-1">• Orders are not available</Text>
                    <Text className="text-gray-500 mb-1">• Food is clearly unsafe</Text>
                </View>
                <Text className="text-gray-600 mb-8">
                    Refunds may be deducted from restaurant payouts. Restaurants agree to cooperate with all dispute resolution.
                </Text>

                {/* Section 9 */}
                <Text className="text-base font-bold text-gray-800 mb-2">9. Marketing & Branding Rights</Text>
                <Text className="text-gray-600 mb-2 font-semibold">By using DineFive, restaurants grant DineFive the right to:</Text>
                <View className="mb-6 pl-4">
                    <Text className="text-gray-500 mb-1">• Display business name</Text>
                    <Text className="text-gray-500 mb-1">• Display menu items</Text>
                    <Text className="text-gray-500 mb-1">• Use logos, photos, and branding</Text>
                    <Text className="text-gray-500 mb-1">• Promote listings on DineFive platforms</Text>
                </View>
                <Text className="text-gray-600 mb-8 italic">
                    This license is royalty-free and limited to platform marketing.
                </Text>

                {/* Section 10 */}
                <Text className="text-base font-bold text-gray-800 mb-2">10. Account Suspension & Termination</Text>
                <Text className="text-gray-600 mb-2 font-semibold">DineFive may suspend or remove a restaurant for:</Text>
                <View className="mb-6 pl-4">
                    <Text className="text-gray-500 mb-1">• Unsafe food</Text>
                    <Text className="text-gray-500 mb-1">• Health violations</Text>
                    <Text className="text-gray-500 mb-1">• Fraud</Text>
                    <Text className="text-gray-500 mb-1">• Repeated customer complaints</Text>
                    <Text className="text-gray-500 mb-1">• Portion violations</Text>
                    <Text className="text-gray-500 mb-1">• Beer & Wine violations</Text>
                </View>
                <Text className="text-gray-600 mb-8">
                    Restaurants may stop using DineFive at any time.
                </Text>

                {/* Section 11 */}
                <Text className="text-base font-bold text-gray-800 mb-2">11. Limitation of Liability</Text>
                <Text className="text-gray-600 mb-2 font-semibold">To the maximum extent permitted by law, DineFive shall not be liable for:</Text>
                <View className="mb-4 pl-4">
                    <Text className="text-gray-500 mb-1">• Food quality</Text>
                    <Text className="text-gray-500 mb-1">• Food safety</Text>
                    <Text className="text-gray-500 mb-1">• Customer illness</Text>
                    <Text className="text-gray-500 mb-1">• Restaurant operations</Text>
                    <Text className="text-gray-500 mb-1">• Lost revenue</Text>
                    <Text className="text-gray-500 mb-1">• Indirect, incidental, or consequential damages</Text>
                </View>
                <Text className="text-gray-600 mb-4 font-semibold">
                    All food preparation and service are the sole responsibility of the participating restaurant.
                </Text>
                <Text className="text-gray-600 mb-10 leading-6">
                    <Text className="font-bold">Limitation of Liability.</Text> DineFive’s maximum liability related to a restaurant purchase shall not exceed the total fees paid by the customer to DineFive for that restaurant during the thirty (30) days immediately preceding the event giving rise to the claim.
                </Text>

                {/* Section 12 */}
                <Text className="text-base font-bold text-gray-800 mb-2">12. Governing Law</Text>
                <Text className="text-gray-600 mb-10 leading-6">
                    This Agreement is governed by the laws of the United States and the state where DineFive is registered, without regard to conflict-of-law rules.
                </Text>

                {/* Section 13 */}
                <Text className="text-base font-bold text-gray-800 mb-2">13. Entire Agreement</Text>
                <Text className="text-gray-600 mb-12 leading-6">
                    This document represents the full agreement between DineFive and the Restaurant. Any additional policies, standards, or updates published by DineFive become part of this Agreement.
                </Text>

                <View className="h-20" />
            </ScrollView>
        </SafeAreaView>
    );
}
