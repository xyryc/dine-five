import { useStore } from "@/stores/stores";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CancelOrderScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams();
  const { cancelOrder, isLoading } = useStore() as any;
  const [reason, setReason] = useState("");

  const handleSubmit = async () => {
    if (!orderId) {
      console.log("No orderId found in params");
      return;
    }

    console.log("Attempting to cancel order:", orderId);
    const result = await cancelOrder(orderId as string, reason);

    if (result) {
      Alert.alert("Success", "Order cancelled successfully");
      router.dismissAll(); // Go back to orders list or home
      router.push("/screens/profile/my-orders");
    } else {
      const { error } = useStore.getState() as any;
      Alert.alert("Error", error || "Failed to cancel order. Please try again.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FDFBF7]">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center justify-center pt-2 pb-6 relative px-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="absolute left-4 z-10 w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm"
        >
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">Cancel order</Text>
      </View>

      <ScrollView className="flex-1 px-6">
        <Text className="text-xl font-bold text-gray-900 mb-2">
          We are sorry to hear this
        </Text>
        <Text className="text-gray-500 leading-6 mb-6">
          Tell us why you choose to cancel your order, is the reason from our
          side?{"\n"}
          Write down your reason to cancel your order:
        </Text>

        <View className="bg-white p-4 rounded-2xl border border-gray-100 h-48">
          <TextInput
            placeholder="Write here..."
            multiline
            textAlignVertical="top"
            value={reason}
            onChangeText={setReason}
            maxLength={220}
            className="flex-1 text-base text-gray-900"
          />
          <Text className="text-right text-gray-400 text-sm mt-2">
            {reason.length} / 220
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View className="p-6">
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isLoading}
          className={`w-full py-4 rounded-2xl items-center shadow-sm ${isLoading ? "bg-yellow-200" : "bg-yellow-400"
            }`}
        >
          <Text className="text-gray-900 font-bold text-lg">
            {isLoading ? "Submitting..." : "Submit"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
