import { useStore } from "@/stores/stores";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OrderDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { submitReview, fetchReviewByOrderId, updateReview, fetchOrderById } = useStore() as any;
  const [existingReviewId, setExistingReviewId] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<any>(null);
  const [orderLoading, setOrderLoading] = useState(true);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const currentState = (params.state as string) || "pending";
  const pickupAddress =
    (params.restaurantAddress as string) ||
    (params.pickupAddress as string) ||
    "Restaurant address";

  // State for Rating Modal
  const [rateModalVisible, setRateModalVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");

  useEffect(() => {
    const loadOrder = async () => {
      const orderId = (params.orderId as string) || (params._id as string);
      if (orderId) {
        const result = await fetchOrderById(orderId);
        if (result) {
          setOrderData(result);
          console.log("Order items:", result.items);
          console.log("Subtotal:", result.subtotal);
        }
      }
      setOrderLoading(false);
    };

    loadOrder();
  }, [params.orderId, params._id]);

  useEffect(() => {
    const checkExistingReview = async () => {
      const orderId = (params.orderId as string) || (params._id as string);
      const currentOrderStatus = orderData?.status || currentState || "pending";
      if (
        orderId &&
        ["picked_up", "delivered", "completed"].includes(currentOrderStatus.toLowerCase())
      ) {
        console.log("Checking for existing review for order:", orderId);
        const result = await fetchReviewByOrderId(orderId);

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

    if (orderData) {
      checkExistingReview();
    }

    if (
      params.autoRate === "true" &&
      ["picked_up", "delivered", "completed"].includes(currentState.toLowerCase())
    ) {
      setRateModalVisible(true);
    }
  }, [params.autoRate, currentState, params._id, params.orderId, orderData]);

  const currentOrderStatus = orderData?.status || currentState || "pending";

  const isCancelable = [
    "pending",
    "preparing",
    "ready",
    "ready_for_pickup",
  ].includes(currentOrderStatus.toLowerCase());

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
    if (!["picked_up", "delivered", "completed"].includes(currentOrderStatus.toLowerCase())) {
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
      const orderIdToSend = (params.orderId as string) || (params._id as string);

      if (!orderIdToSend) {
        Alert.alert("Error", "Order ID not found");
        return;
      }

      let result;
      const foodIdToSend = (params.foodId as string) || "";
      setIsSubmittingReview(true);
      if (existingReviewId) {
        result = await updateReview(existingReviewId, rating, review);
      } else {
        result = await submitReview(orderIdToSend, foodIdToSend, rating, review);
      }
      setIsSubmittingReview(false);

      if (result.success) {
        Alert.alert(
          "Success",
          existingReviewId
            ? "Your review has been updated successfully!"
            : "Thank you for your feedback! Your review has been submitted.",
        );

        if (!existingReviewId && result.data?._id) {
          setExistingReviewId(result.data._id);
        }

        setRateModalVisible(false);
      }
    } catch (error: any) {
      setIsSubmittingReview(false);
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

  const handleCall = (phoneNumber: string) => {
    if (!phoneNumber) {
      Alert.alert("Error", "Phone number is not available");
      return;
    }
    Linking.openURL(`tel:${phoneNumber}`).catch((err) => {
      Alert.alert("Error", "Could not open phone app");
    });
  };

  const formatStatus = (status: string) => {
    if (!status) return "";
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getStepIndex = (status: string) => {
    const s = (status || "").toLowerCase();
    if (["pending", "pending_split"].includes(s)) return 0;
    if (s === "preparing") return 1;
    if (["ready", "ready_for_pickup"].includes(s)) return 2;
    if (["picked_up", "delivered", "completed"].includes(s)) return 3;
    return 0;
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
      case "pending_split":
        return {
          container: "bg-amber-50 border-amber-100",
          text: "text-amber-700",
        };
      case "cancelled":
        return {
          container: "bg-rose-50 border-rose-100",
          text: "text-rose-600",
        };
      case "delivered":
      case "picked_up":
      case "completed":
        return {
          container: "bg-emerald-50 border-emerald-100",
          text: "text-emerald-700",
        };
      case "preparing":
      case "ready_for_pickup":
      case "ready":
        return {
          container: "bg-blue-50 border-blue-100",
          text: "text-blue-600",
        };
      default:
        return {
          container: "bg-slate-50 border-slate-100",
          text: "text-slate-600",
        };
    }
  };

  const getTimeline = () => {
    const activeStep = getStepIndex(currentOrderStatus);
    
    return (
      <View className="ml-4 border-l-2 border-gray-100 pl-6 py-2 relative">
        {/* Step 0: Placed */}
        <View className="relative mb-6">
          <View
            className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 ${
              activeStep >= 0 ? "bg-[#FFC107] border-[#FFC107]" : "bg-gray-100 border-gray-200"
            } z-10`}
          />
          <View>
            <Text className={`font-heading text-base ${activeStep === 0 ? "text-gray-900" : "text-gray-400"}`}>
              Order Placed
            </Text>
            <Text className="text-gray-500 text-xs mt-0.5">
              Your order has been received and confirmed
            </Text>
          </View>
        </View>

        {/* Step 1: Preparing */}
        <View className="relative mb-6">
          <View
            className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 ${
              activeStep >= 1 ? "bg-[#FFC107] border-[#FFC107]" : "bg-gray-100 border-gray-200"
            } z-10`}
          />
          <View>
            <Text className={`font-heading text-base ${activeStep === 1 ? "text-gray-900" : "text-gray-400"}`}>
              Preparing your food
            </Text>
            {activeStep === 1 && (
              <Text className="text-gray-500 text-xs mt-0.5">
                We are preparing your food with magic and care. Est: 7-10 mins.
              </Text>
            )}
          </View>
        </View>

        {/* Step 2: Ready */}
        <View className="relative mb-6">
          <View
            className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 ${
              activeStep >= 2 ? "bg-[#FFC107] border-[#FFC107]" : "bg-gray-100 border-gray-200"
            } z-10`}
          />
          <View>
            <Text className={`font-heading text-base ${activeStep === 2 ? "text-gray-900" : "text-gray-400"}`}>
              Ready for Pickup / Delivery
            </Text>
            {activeStep === 2 && (
              <View className="mt-1">
                <Text className="text-gray-500 text-xs">
                  Please collect your food or wait for delivery partner.
                </Text>
                {orderData?.logisticsType?.toLowerCase() === "pickup" && (
                  <TouchableOpacity className="mt-2.5 border border-gray-200 rounded-xl py-2 px-4 items-center bg-white shadow-sm self-start">
                    <Text className="font-body-semibold text-xs text-gray-900">I'm here at the counter</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Step 3: Completed */}
        <View className="relative">
          <View
            className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 ${
              activeStep === 3 ? "bg-[#FFC107] border-[#FFC107]" : "bg-gray-100 border-gray-200"
            } z-10`}
          />
          <View>
            <Text className={`font-heading text-base ${activeStep === 3 ? "text-gray-900" : "text-gray-400"}`}>
              Order Completed
            </Text>
            {activeStep === 3 && (
              <View className="mt-2">
                <Text className="text-gray-500 text-xs">
                  Hope you enjoyed your Dine Five meal!
                </Text>
                <TouchableOpacity
                  onPress={() => setRateModalVisible(true)}
                  className="mt-2.5 border border-yellow-400 bg-yellow-50 rounded-xl py-2 px-4 flex-row items-center justify-center shadow-sm self-start"
                >
                  <Ionicons name="star" size={14} color="#FFC107" />
                  <Text className="font-body-semibold text-[#332701] ml-1.5 text-xs">
                    {existingReviewId ? "Edit Review" : "Rate the food!"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const getHeaderTitle = () => {
    if (orderData?.isMultiVendor) {
      return "Multi-Vendor Feast";
    }
    return orderData?.providerId?.restaurantName || orderData?.restaurantName || "Restaurant Order";
  };

  const getHeaderSubtitle = () => {
    if (orderData?.isMultiVendor) {
      return `${orderData?.restaurantCount || 0} Restaurants · ${orderData?.itemCount || 0} Items`;
    }
    return orderData?.items?.length ? `${orderData.items.length} Items` : "";
  };

  const renderHeaderProfile = () => {
    if (orderData?.isMultiVendor) {
      return (
        <View className="w-12 h-12 bg-amber-50 rounded-full items-center justify-center border border-amber-100">
          <Ionicons name="fast-food" size={22} color="#D97706" />
        </View>
      );
    }
    const pic = orderData?.providerId?.restaurantPic || orderData?.restaurants?.[0]?.restaurantImage || orderData?.restaurantImage;
    return (
      <View className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-full items-center justify-center overflow-hidden">
        {pic ? (
          <Image
            source={{ uri: pic }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="restaurant" size={20} color="#FFC107" />
        )}
      </View>
    );
  };

  const getGroups = () => {
    if (orderData?.restaurantGroups && orderData.restaurantGroups.length > 0) {
      return orderData.restaurantGroups;
    }
    if (orderData) {
      return [{
        restaurantName: orderData.providerId?.restaurantName || orderData.restaurantName || "Dine Five Restaurant",
        restaurantAddress: orderData.providerId?.restaurantAddress || orderData.restaurantAddress || pickupAddress,
        restaurantImage: orderData.restaurantImage || orderData.providerId?.restaurantPic || orderData.restaurants?.[0]?.restaurantImage,
        status: orderData.status,
        items: orderData.items || [],
        subtotal: orderData.subtotal,
        total: orderData.totalPrice || orderData.displayTotal,
      }];
    }
    return [];
  };

  if (orderLoading) {
    return (
      <SafeAreaView className="flex-1 bg-[#FDFBF7] items-center justify-center">
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#FFC107" />
        <Text className="text-gray-500 mt-4 font-body-medium">Loading order details...</Text>
      </SafeAreaView>
    );
  }

  const groups = getGroups();

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
        <Text className="text-xl font-heading text-gray-900">Order Details</Text>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Restaurant Header Card & Cancel Button */}
        <View className="flex-row items-center justify-between mb-6 bg-white p-4 rounded-3xl border border-gray-50 shadow-sm">
          <View className="flex-row items-center gap-3 flex-1 mr-2">
            {renderHeaderProfile()}
            <View className="flex-1">
              <Text className="text-base font-heading text-gray-950" numberOfLines={1}>
                {getHeaderTitle()}
              </Text>
              <Text className="text-gray-400 text-xs mt-0.5">
                {getHeaderSubtitle()}
              </Text>
            </View>
          </View>

          {isCancelable && (
            <TouchableOpacity
              onPress={handleCancelPress}
              className="bg-rose-50 border border-rose-100 px-4 py-2.5 rounded-xl active:bg-rose-100"
            >
              <Text className="text-rose-600 font-body-semibold text-xs">
                Cancel
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Timeline Card */}
        <View className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-6">
          {getTimeline()}
        </View>

        {/* Items Grouped by Restaurant */}
        <Text className="text-[10px] text-gray-400 font-body-semibold uppercase tracking-wider mb-3 px-1">Items Grouped by Restaurant</Text>
        {groups.map((group: any, index: number) => {
          const phone =
            group.phoneNumber ||
            group.provider?.phoneNumber ||
            orderData?.restaurants?.find(
              (r: any) =>
                r.providerId === group.providerId ||
                r.restaurantName === group.restaurantName,
            )?.phoneNumber ||
            orderData?.phoneNumber;

          return (
            <View key={group.subOrderId || index} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 mb-4">
              <View className="flex-row items-center justify-between pb-3 border-b border-gray-50 mb-3">
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="w-9 h-9 rounded-full bg-gray-50 border border-gray-100 overflow-hidden items-center justify-center mr-2.5">
                    {group.restaurantImage ? (
                      <Image source={{ uri: group.restaurantImage }} className="w-full h-full" resizeMode="cover" />
                    ) : (
                      <Ionicons name="restaurant-outline" size={16} color="#FFC107" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-heading text-gray-900" numberOfLines={1}>
                      {group.restaurantName}
                    </Text>
                    <Text className="text-[10px] text-gray-400 font-body-medium mt-0.5" numberOfLines={1}>
                      {group.restaurantAddress}
                    </Text>
                    {phone ? (
                      <View className="flex-row items-center gap-1 mt-1">
                        <Ionicons name="call-outline" size={10} color="#9CA3AF" />
                        <Text className="text-[10px] text-gray-400 font-body-semibold">
                          {phone}
                        </Text>
                        <TouchableOpacity
                          onPress={() => handleCall(phone)}
                          className="ml-2 bg-[#FFC107] px-2 py-0.5 rounded-full flex-row items-center gap-0.5"
                          activeOpacity={0.8}
                        >
                          <Ionicons name="call" size={8} color="#1F2937" />
                          <Text className="text-[8px] font-body-bold text-gray-900">Call</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                </View>
              
              <View className={`px-2 py-0.5 rounded-full border ${getStatusBadgeStyle(group.status || currentOrderStatus).container}`}>
                <Text className={`text-[9px] font-body-semibold uppercase ${getStatusBadgeStyle(group.status || currentOrderStatus).text}`}>
                  {formatStatus(group.status || currentOrderStatus)}
                </Text>
              </View>
            </View>

            <View className="space-y-3">
              {group.items?.map((item: any, idx: number) => {
                const imageUri = item?.image || item?.food?.image || "";
                return (
                  <View key={item._id || idx} className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1 mr-3">
                      <View className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden mr-2.5">
                        {imageUri ? (
                          <Image source={{ uri: imageUri }} className="w-full h-full" resizeMode="cover" />
                        ) : (
                          <View className="w-full h-full bg-amber-50 items-center justify-center">
                            <Ionicons name="fast-food-outline" size={18} color="#FFC107" />
                          </View>
                        )}
                      </View>
                      <View className="flex-1">
                        <Text className="text-xs font-body-semibold text-gray-800" numberOfLines={1}>
                          {item.title || item.food?.title || "Item"}
                        </Text>
                        <Text className="text-[10px] text-gray-400 font-body-semibold mt-0.5">
                          x{item.quantity} · ${item.unitPrice || item.price || 5.99}
                        </Text>
                      </View>
                    </View>
                    
                    <Text className="text-xs font-body-semibold text-gray-900">
                      ${(item.lineTotal || (item.quantity * (item.unitPrice || item.price || 5.99))).toFixed(2)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}

        {/* Logistics & Payment details */}
        <View className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 mb-6">
          <Text className="text-[10px] text-gray-400 font-body-semibold uppercase tracking-wider mb-3">Order Details</Text>
          
          <View className="space-y-3">
            <View className="flex-row justify-between items-start">
              <View className="flex-row items-center gap-2.5 mr-4" style={{ width: 100 }}>
                <Ionicons name="location-outline" size={16} color="#6B7280" />
                <Text className="text-gray-500 text-xs font-body-semibold">
                  {orderData?.logisticsType?.toLowerCase() === "delivery" ? "Deliver to" : "Pickup at"}
                </Text>
              </View>
              {orderData?.logisticsType?.toLowerCase() === "delivery" ? (
                <Text className="text-gray-800 font-body-semibold text-xs flex-1 text-right" numberOfLines={2}>
                  {orderData.state || "NY"}
                </Text>
              ) : (
                <View className="flex-col flex-1 items-end gap-1">
                  {groups.map((group: any, idx: number) => (
                    <Text key={idx} className="text-gray-800 font-body-semibold text-[11px] text-right" numberOfLines={2}>
                      {group.restaurantName}: {group.restaurantAddress || "No address"}
                    </Text>
                  ))}
                </View>
              )}
            </View>

            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center gap-2.5">
                <Ionicons
                  name={orderData?.logisticsType?.toLowerCase() === "pickup" ? "walk-outline" : "bicycle-outline"}
                  size={16}
                  color="#6B7280"
                />
                <Text className="text-gray-500 text-xs font-body-semibold">Logistics</Text>
              </View>
              <Text className="text-gray-800 font-body-semibold text-xs capitalize">
                {orderData?.logisticsType || "Delivery"}
              </Text>
            </View>

            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center gap-2.5">
                <Ionicons name="card-outline" size={16} color="#6B7280" />
                <Text className="text-gray-500 text-xs font-body-semibold">Payment Method</Text>
              </View>
              <Text className="text-gray-800 font-body-semibold text-xs capitalize">
                {orderData?.paymentMethod || "Card"}
              </Text>
            </View>

            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center gap-2.5">
                <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                <Text className="text-gray-500 text-xs font-body-semibold">Placed On</Text>
              </View>
              <Text className="text-gray-800 font-body-semibold text-xs">
                {orderData?.createdAt ? formatDate(orderData.createdAt) : "N/A"}
              </Text>
            </View>
          </View>
        </View>

        {/* Bill / Invoice Details Card */}
        <View className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 mb-6">
          <Text className="text-[10px] text-gray-400 font-body-semibold uppercase tracking-wider mb-3">Bill Details</Text>
          
          <View className="space-y-2 border-b border-gray-50 pb-3 mb-3">
            <View className="flex-row justify-between items-center">
              <Text className="text-xs text-gray-500 font-body-semibold">Subtotal</Text>
              <Text className="text-xs font-body-semibold text-gray-800">${orderData?.subtotal?.toFixed(2) || "0.00"}</Text>
            </View>

            <View className="flex-row justify-between items-center">
              <Text className="text-xs text-gray-500 font-body-semibold">Platform Fee</Text>
              <Text className="text-xs font-body-semibold text-gray-800">${orderData?.platformFee?.toFixed(2) || "0.00"}</Text>
            </View>

            {orderData?.cityTax > 0 && (
              <View className="flex-row justify-between items-center">
                <Text className="text-xs text-gray-500 font-body-semibold">City Tax</Text>
                <Text className="text-xs font-body-semibold text-gray-800">${orderData.cityTax.toFixed(2)}</Text>
              </View>
            )}

            {orderData?.stateTax > 0 && (
              <View className="flex-row justify-between items-center">
                <Text className="text-xs text-gray-500 font-body-semibold">State Tax</Text>
                <Text className="text-xs font-body-semibold text-gray-800">${orderData.stateTax.toFixed(2)}</Text>
              </View>
            )}

            {orderData?.isDonation && (
              <View className="flex-row justify-between items-center">
                <Text className="text-xs text-rose-500 font-body-semibold">Donation Amount</Text>
                <Text className="text-xs font-body-semibold text-rose-600">${orderData.donationAmount.toFixed(2)}</Text>
              </View>
            )}
          </View>

          <View className="flex-row justify-between items-center">
            <Text className="text-sm font-heading text-gray-900">Total Paid</Text>
            <Text className="text-lg font-heading text-[#D97706]">
              ${(orderData?.totalPrice || orderData?.displayTotal || 0).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Help/Support Section */}
        <TouchableOpacity
          onPress={() => {
            router.push("/screens/profile/customer-support");
          }}
          className="flex-row items-center justify-center bg-amber-50/50 border border-amber-100 rounded-2xl py-3.5"
        >
          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#D97706" />
          <Text className="text-amber-800 font-body-semibold text-xs ml-2">
            Need Help? Chat with Support
          </Text>
        </TouchableOpacity>
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
            <Text className="text-xl font-heading text-gray-900 mb-2">
              Did you like the food!
            </Text>
            <Text className="text-gray-500 font-body text-center mb-6">
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
              disabled={isSubmittingReview}
              className={`w-full py-4 rounded-2xl items-center mt-4 ${isSubmittingReview ? "bg-gray-100" : "bg-[#FFC107]"}`}
            >
              <Text
                className={`font-body-bold text-lg ${isSubmittingReview ? "text-gray-400" : "text-gray-900"}`}
              >
                {isSubmittingReview ? "Submitting..." : (existingReviewId ? "Update Review" : "Submit Rating")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
