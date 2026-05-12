import { useStore } from "@/stores/stores";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Mock data to simulate different states based on params
// states: 'pending', 'preparing', 'ready', 'picked_up'
export default function OrderDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { submitReview, fetchReviewByOrderId, updateReview, isLoading } = useStore() as any;
  const [existingReviewId, setExistingReviewId] = useState<string | null>(null);
  const currentState = (params.state as string) || "pending"; // default to pending for demo

  // State for Rating Modal
  const [rateModalVisible, setRateModalVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");

  useEffect(() => {
    const checkExistingReview = async () => {
      const orderId = (params.orderId as string) || (params._id as string);
      if (
        orderId &&
        ["picked_up", "delivered", "completed"].includes(currentState)
      ) {
        console.log("Checking for existing review for order:", orderId);
        const result = await fetchReviewByOrderId(orderId);

        // Handling different possible response structures
        const reviews = result?.data || result;
        const reviewData = Array.isArray(reviews) ? reviews[0] : reviews;

        if (reviewData && reviewData._id && (reviewData.orderId === orderId || reviewData.orderId?._id === orderId)) {
          console.log("Found existing review:", reviewData._id);
          setExistingReviewId(reviewData._id);
          setRating(reviewData.rating || 0);
          setReview(reviewData.comment || "");
        }
      }
    };

    checkExistingReview();

    if (
      params.autoRate === "true" &&
      ["picked_up", "delivered", "completed"].includes(currentState)
    ) {
      setRateModalVisible(true);
    }
  }, [params.autoRate, currentState, params._id, params.orderId]);


  // Order is cancelable if it's in early stages
  const isCancelable = [
    "pending",
    "preparing",
    "ready",
    "ready_for_pickup",
  ].includes(currentState.toLowerCase());

  const handleCancelPress = () => {
    if (isCancelable) {
      const targetId = (params.orderId as string) || (params._id as string);
      router.push({
        pathname: "/screens/profile/cancel-reason",
        params: { orderId: targetId },
      });
    }
  };

  const handleReviewSubmit = async () => {
    if (!["picked_up", "delivered", "completed"].includes(currentState)) {
      Alert.alert("Notice", "You can only review completed orders");
      return;
    }

    if (rating === 0) {
      Alert.alert(
        "Rating Required",
        "Please select a star rating before submitting.",
      );
      return;
    }

    try {
      // Prioritize the MongoDB _id (e.g. 69878a...)
      const orderIdToSend = (params.orderId as string) || (params._id as string);

      if (!orderIdToSend) {
        Alert.alert("Error", "Order ID not found");
        return;
      }

      let result;
      const foodIdToSend = (params.foodId as string) || "";
      if (existingReviewId) {
        result = await updateReview(existingReviewId, rating, review);
      } else {
        result = await submitReview(orderIdToSend, foodIdToSend, rating, review);
      }

      if (result.success) {
        Alert.alert(
          "Success",
          existingReviewId
            ? "Your review has been updated successfully!"
            : "Thank you for your feedback! Your review has been submitted.",
        );

        // If it was a new review, store the ID so next time they open it's in edit mode
        if (!existingReviewId && result.data?._id) {
          setExistingReviewId(result.data._id);
        }

        setRateModalVisible(false);
      }
    } catch (error: any) {
      // Detailed error handling based on server response logs
      const errorMsg = error.message || "";

      if (
        errorMsg.includes("completed orders") ||
        errorMsg.includes("NOT_COMPLETED")
      ) {
        Alert.alert(
          "Review Not Available",
          "Your order hasn't been fully processed by the system yet. Please try again once the order status is finalized.",
        );
      } else if (
        errorMsg.toLowerCase().includes("already") ||
        errorMsg.toLowerCase().includes("exists")
      ) {
        Alert.alert(
          "Already Reviewed",
          "You have already submitted a review for this order.",
        );
        setRateModalVisible(false);
      } else {
        Alert.alert(
          "Review Error",
          errorMsg || "Something went wrong. Please try again.",
        );
      }
    }
  };

  const getTimeline = () => {
    // Simplified timeline logic for demo
    const steps = [
      { title: "Order prepared", active: currentState !== "pending" }, // vaguely mapping to images
      {
        title: "Order is ready for pickup",
        active: ["ready", "ready_for_pickup", "picked_up"].includes(
          currentState,
        ),
      },
      {
        title: "Order picked up",
        active: ["picked_up", "delivered"].includes(currentState),
      },
    ];

    // Designing the specific "Preparing your order" card look from Image 2
    // Or "Ready for pickup" card from Image 3
    return (
      <View className="ml-4 border-l-2 border-gray-100 pl-6 py-2 space-y-8 relative">
        {/* This is a custom timeline implementation to match the visual exactly */}

        {/* Step 1: Preparing */}
        <View className="relative">
          {/* Dot */}
          <View
            className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 ${currentState !== "pending" ? "bg-[#FFC107] border-[#FFC107]" : "bg-gray-100 border-gray-100"} z-10`}
          />
          {currentState === "preparing" ? (
            <View>
              <Text className="font-bold text-gray-900 text-base">
                Preparing your order
              </Text>
              <Text className="text-gray-500 text-sm mt-1 w-48">
                We are preparing your food with magic and care
              </Text>
              <Text className="text-sm font-bold text-gray-400 mt-1">
                Time Req. 7mins
              </Text>
            </View>
          ) : (
            <Text
              className={`${currentState !== "pending" ? "text-gray-400" : "text-gray-200"} font-bold text-base`}
            >
              Order prepared
            </Text>
          )}
        </View>

        {/* Step 2: Ready */}
        <View className="relative">
          <View
            className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 ${["ready", "ready_for_pickup", "picked_up", "delivered"].includes(currentState) ? "bg-[#FFC107] border-[#FFC107]" : "bg-gray-100 border-gray-100"} z-10`}
          />
          {currentState === "ready" || currentState === "ready_for_pickup" ? (
            <View>
              <Text className="font-bold text-gray-900 text-base">
                Your order is Ready for pickup
              </Text>
              <Text className="text-gray-500 text-sm mt-1 w-48">
                Please head to the counter to collect your food.
              </Text>
              <TouchableOpacity className="mt-3 border border-gray-200 rounded-xl py-3 w-48 items-center bg-white shadow-sm">
                <Text className="font-bold text-gray-900">I'm here</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text
              className={`${["picked_up", "delivered"].includes(currentState) ? "text-gray-400" : "text-gray-200"} font-bold text-base`}
            >
              Order is ready for pickup
            </Text>
          )}
        </View>

        {/* Step 3: Picked Up */}
        <View className="relative">
          <View
            className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 ${["picked_up", "delivered", "completed"].includes(currentState) ? "bg-[#FFC107] border-[#FFC107]" : "bg-gray-100 border-gray-100"} z-10`}
          />
          {["picked_up", "delivered", "completed"].includes(currentState) ? (
            <View>
              <Text className="font-bold text-gray-900 text-base">
                Order picked up
              </Text>
              <TouchableOpacity
                onPress={() => setRateModalVisible(true)}
                className="mt-3 border border-yellow-400 bg-yellow-50 rounded-xl py-3 px-6 flex-row items-center justify-center w-56 shadow-sm"
              >
                <Ionicons name="star" size={20} color="#FFC107" />
                <Text className="font-bold text-[#332701] ml-2 text-base">
                  Rate the food!
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text className="text-gray-200 font-bold text-base">
              Order picked up
            </Text>
          )}
        </View>
      </View>
    );
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
        <Text className="text-xl font-bold text-gray-900">Order details</Text>
      </View>

      <ScrollView className="flex-1 px-4">
        {/* Restaurant Card & Cancel Button */}
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-row items-center gap-3">
            <View className="w-12 h-12 bg-gray-900 rounded-full items-center justify-center">
              <Ionicons name="restaurant" size={20} color="#FFC107" />
            </View>
            <View>
              <Text className="text-base font-bold text-gray-900">
                Restaurant Food
              </Text>
              <Text className="text-gray-500 text-sm">Jan 12, 2026</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleCancelPress}
            disabled={!isCancelable}
            className={`px-4 py-2 rounded-lg ${isCancelable ? "bg-[#FFE69C]" : "bg-gray-200"}`}
          >
            <Text
              className={`font-bold ${isCancelable ? "text-[#332701]" : "text-gray-500"}`}
            >
              Cancel order
            </Text>
          </TouchableOpacity>
        </View>

        {/* Estimated Time */}
        <View className="flex-row justify-between items-center mb-6">
          <View className="flex-row items-center gap-2">
            <Ionicons name="time-outline" size={20} color="#666" />
            <Text className="text-gray-500">Estimated time</Text>
          </View>
          <Text
            className={`font-bold ${currentState === "pending" ? "text-yellow-500" : "text-gray-900"}`}
          >
            {currentState === "pending" ? "Pending" : "10-20 minutes"}
          </Text>
        </View>

        {/* Timeline Card */}
        <View className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-8">
          {getTimeline()}
        </View>

        {/* Details */}
        <View className="space-y-4 mb-8">
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center gap-2">
              <Ionicons name="location-outline" size={20} color="#666" />
              <Text className="text-gray-500 text-base">Pickup at</Text>
            </View>
            <Text className="text-gray-900 font-bold text-sm underline">
              123 Main Street
            </Text>
          </View>

          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center gap-2">
              <Ionicons name="card-outline" size={20} color="#666" />
              <Text className="text-gray-500 text-base">Amount Paid</Text>
            </View>
            <Text className="text-gray-900 font-bold text-base">$32.12</Text>
          </View>
        </View>

        {/* Order Items */}
        <Text className="font-bold text-gray-900 mb-4">Your Order</Text>
        <View className="flex-row gap-4 mb-10">
          {[1, 2, 3].map((i) => (
            <View key={i} className="items-center">
              <Image
                source={{
                  uri: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=150",
                }}
                className="w-16 h-16 rounded-xl mb-1"
                resizeMode="cover"
              />
              <Text className="text-sm text-gray-500">x2</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Rate Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={rateModalVisible}
        onRequestClose={() => setRateModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View className="bg-white w-full rounded-3xl p-6 items-center">
            <Text className="text-xl font-bold text-gray-900 mb-2">
              Did you like the food!
            </Text>
            <Text className="text-gray-500 text-center mb-6">
              Please rate this food so, that we can improve it!
            </Text>

            <View className="flex-row gap-3 mb-8">
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <Ionicons
                    name={star <= rating ? "star" : "star-outline"}
                    size={32}
                    color={star <= rating ? "#FFC107" : "#9CA3AF"}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <View className="w-full mb-2">
              <View className="w-full border border-gray-100 rounded-2xl p-4 bg-gray-50/50 min-h-[100px]">
                <TextInput
                  placeholder="Write here..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  maxLength={120}
                  value={review}
                  onChangeText={setReview}
                  style={{ textAlignVertical: "top", fontSize: 16 }}
                />
              </View>
              <Text className="text-right text-gray-400 text-xs mt-2">
                {review.length} / 120
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleReviewSubmit}
              disabled={isLoading}
              className={`w-full py-4 rounded-2xl items-center mt-4 ${isLoading ? "bg-gray-100" : "bg-[#FFC107]"}`}
            >
              <Text
                className={`font-bold text-lg ${isLoading ? "text-gray-400" : "text-gray-900"}`}
              >
                {isLoading ? "Submitting..." : (existingReviewId ? "Update Review" : "Submit Rating")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
