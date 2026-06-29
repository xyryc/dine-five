import { EmptyState } from "@/components/common/EmptyState";
import { useStore } from "@/stores/stores";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MyOrdersScreen() {
  const router = useRouter();
  const { fetchCurrentOrders, fetchPreviousOrders } = useStore() as any;
  const [activeTab, setActiveTab] = useState<"current" | "previous">("current");
  const [currentOrders, setCurrentOrders] = useState<any[]>([]);
  const [previousOrders, setPreviousOrders] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    if (activeTab === "current") {
      const data = await fetchCurrentOrders();
      if (data) {
        console.log("Fetched Current Orders:", JSON.stringify(data, null, 2));
        setCurrentOrders(data);
      }
    } else {
      const result = await fetchPreviousOrders();
      if (result && result.data) setPreviousOrders(result.data);
    }
    setIsLoading(false);
  }, [activeTab, fetchCurrentOrders, fetchPreviousOrders]);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatStatus = (status: string) => {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const pickString = (...values: unknown[]) => {
    for (const value of values) {
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
    return "";
  };

  const getProviderName = (order: any) =>
    pickString(
      order?.providerName,
      order?.restaurantName,
      order?.provider?.fullName,
      order?.provider?.name,
      order?.provider?.restaurantName,
      order?.providerId?.restaurantName,
      order?.providerId?.businessName,
      order?.providerId?.shopName,
      order?.providerId?.fullName,
      order?.providerId?.name,
      order?.items?.[0]?.restaurantName,
      order?.items?.[0]?.providerName,
      order?.items?.[0]?.food?.restaurantName,
      order?.items?.[0]?.food?.providerName,
    ) || "Dine Five";

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "text-yellow-600";
      case "cancelled":
        return "text-red-500";
      case "delivered":
      case "picked_up":
      case "completed":
        return "text-green-600";
      case "preparing":
      case "ready_for_pickup":
        return "text-blue-600";
      default:
        return "text-[#1F2A33]";
    }
  };

  const ordersToShow = activeTab === "current" ? currentOrders : previousOrders;

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
        <Text className="text-xl font-bold text-gray-900">My Orders</Text>
      </View>

      {/* Tabs */}
      <View className="px-6 mb-6">
        <View className="flex-row bg-[#FFE69C] bg-opacity-20 rounded-xl p-1 h-14 items-center">
          <TouchableOpacity
            onPress={() => setActiveTab("current")}
            className={`flex-1 h-full items-center justify-center rounded-xl relative ${activeTab === "current" ? "bg-[#FFC107]" : "bg-transparent"}`}
          >
            <Text
              className={`text-base font-semibold ${activeTab === "current" ? "text-gray-900" : "text-gray-600"}`}
            >
              Current
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("previous")}
            className={`flex-1 h-full items-center justify-center rounded-xl ${activeTab === "previous" ? "bg-[#FFC107]" : "bg-transparent"}`}
          >
            <Text
              className={`text-base font-semibold ${activeTab === "previous" ? "text-gray-900" : "text-gray-600"}`}
            >
              Previous
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {isLoading && !refreshing && ordersToShow.length === 0 ? (
          <View className="flex-1 items-center justify-center pt-20">
            <Text className="text-gray-500">Loading orders...</Text>
          </View>
        ) : ordersToShow.length === 0 ? (
          <View className="flex-1 justify-center">
            <EmptyState
              title="No orders found"
              message={
                activeTab === "current"
                  ? "You don't have any active orders right now."
                  : "You haven't placed any orders yet."
              }
              buttonText="Order Now"
              onButtonPress={() => router.push("/(tabs)")}
            />
          </View>
        ) : (
          ordersToShow.map((order) => (
            <View
              key={order._id}
              className="bg-white p-4 rounded-2xl mb-4 shadow-sm border border-gray-100"
            >
              <View className="flex-row mb-4">
                <View
                  className="bg-gray-100 items-center justify-center rounded-xl"
                  style={{ height: 100, width: 80 }}
                >
                  <Ionicons
                    name="fast-food-outline"
                    size={32}
                    color="#9CA3AF"
                  />
                </View>
                <View className="flex-1 ml-3">
                  <View className="flex-row justify-between items-start mb-0.5">
                    <Text
                      className={`text-base font-bold flex-1 ${getStatusColor(order.status)}`}
                    >
                      {formatStatus(order.status)}
                    </Text>
                    <Text className="text-xs font-medium text-gray-400">
                      #{order.orderId ? order.orderId.split("-").pop() : "N/A"}
                    </Text>
                  </View>
                  <Text className="text-sm text-[#7A7A7A] mb-2">
                    {activeTab === "current"
                      ? "Ordered on " + formatDate(order.createdAt)
                      : "Completed on " + formatDate(order.createdAt)}
                  </Text>

                  <View className="flex-row justify-between mb-0.5">
                    <Text className="text-sm text-[#7A7A7A]">Provider</Text>
                    <Text className="text-sm font-medium text-[#1F2A33]">
                      {getProviderName(order)}
                    </Text>
                  </View>

                  <View className="flex-row justify-between mb-0.5">
                    <Text className="text-sm text-[#7A7A7A]">Items</Text>
                    <Text className="text-sm font-medium text-[#1F2A33]">
                      {order.items?.[0]?.quantity || 0} items
                    </Text>
                  </View>

                  <View className="flex-row justify-between mt-1">
                    <Text className="text-sm text-[#7A7A7A]">
                      Total price paid
                    </Text>
                    <Text className="text-sm font-bold text-[#FFC107]">
                      ${order.totalPrice}
                    </Text>
                  </View>
                </View>
              </View>

              {activeTab === "current" ? (
                <TouchableOpacity
                  onPress={() => {
                    const foodId = order.items?.[0]?.foodId || order.items?.[0]?.food?._id || order.items?.[0]?._id;
                    router.push({
                      pathname: "/screens/profile/order-details",
                      params: {
                        orderId: order.orderId,
                        _id: order._id,
                        state: order.status,
                        foodId: foodId
                      },
                    });
                  }}
                  className="bg-[#FFFFFF] py-3 rounded-xl items-center border border-[#E3E6F0]"
                >
                  <Text className="text-[#000] font-bold text-sm">
                    View Progress
                  </Text>
                </TouchableOpacity>
              ) : (
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => {
                      // Logic for reordering could be added here
                    }}
                    className="flex-1 border border-[#E3E6F0] py-3 rounded-xl items-center bg-[#FFFFFF]"
                  >
                    <Text className="text-[#000] font-bold text-sm">
                      Reorder
                    </Text>
                  </TouchableOpacity>
                  {["picked_up", "delivered", "completed"].includes(order.status?.toLowerCase()) && (
                    <TouchableOpacity
                      onPress={() => {
                        const foodId = order.items?.[0]?.foodId || order.items?.[0]?.food?._id || order.items?.[0]?._id;
                        router.push({
                          pathname: "/screens/profile/order-details",
                          params: {
                            orderId: order.orderId,
                            _id: order._id,
                            state: order.status,
                            autoRate: "true",
                            foodId: foodId
                          },
                        });
                      }}
                      className="flex-row items-center justify-center border border-yellow-400 py-3 px-4 rounded-xl bg-yellow-50"
                    >
                      <Ionicons name="star" size={16} color="#FFC107" className="mr-1" />
                      <Text className="text-[#332701] font-bold text-sm ml-1">
                        Rate
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
