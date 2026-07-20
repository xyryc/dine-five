import { EmptyState } from "@/components/common/EmptyState";
import { DonateModal } from "@/components/home/DonateModal";
import { useStore } from "@/stores/stores";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface OrderCardProps {
  order: any;
  router: any;
  formatDate: (date: string) => string;
  formatStatus: (status: string) => string;
  getProviderName: (order: any) => string;
  getStatusBadgeStyle: (status: string) => { container: string; text: string };
  renderOrderImage: (order: any) => React.ReactNode;
  onDonateAgain?: () => void;
}

function CurrentOrderCard({
  order,
  router,
  formatDate,
  formatStatus,
  getProviderName,
  getStatusBadgeStyle,
  renderOrderImage,
}: OrderCardProps) {
  return (
    <View className="bg-white p-5 rounded-3xl mb-4 shadow-sm border border-gray-100">
      {/* Header section of card */}
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1 mr-2">
          <Text
            className="text-base font-heading text-gray-900"
            numberOfLines={1}
          >
            {getProviderName(order)}
          </Text>
          <View className="flex-row items-center mt-1">
            <Text className="text-xs text-gray-400 font-body-medium">
              #{order.orderId ? order.orderId.split("-").pop() : "N/A"}
            </Text>
            <View className="w-1 h-1 rounded-full bg-gray-300 mx-2" />
            <Text className="text-xs text-gray-400">
              {formatDate(order.createdAt)}
            </Text>
          </View>
        </View>
        <View
          className={`px-2.5 py-1 rounded-full border ${getStatusBadgeStyle(order.status).container}`}
        >
          <Text
            className={`text-[10px] font-body-semibold tracking-wide uppercase ${getStatusBadgeStyle(order.status).text}`}
          >
            {formatStatus(order.status)}
          </Text>
        </View>
      </View>

      {/* Items content section */}
      <View className="flex-row items-center py-3 border-t border-b border-gray-50 mb-4">
        {renderOrderImage(order)}
        <View className="flex-1 justify-center">
          <Text className="text-[10px] text-gray-400 font-body-semibold uppercase tracking-wider mb-1">
            {order.isMultiVendor ? "Multi-Vendor Feast" : "Order Items"}
          </Text>
          <Text
            className="text-sm font-body-semibold text-gray-700 mb-1.5"
            numberOfLines={2}
          >
            {order.items
              ?.map(
                (item: any) =>
                  `${item.quantity}x ${item.title || item.food?.title || "Item"}`,
              )
              .join(", ")}
          </Text>

          <View className="flex-row items-center gap-2">
            <View className="flex-row items-center bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
              <Ionicons
                name={
                  order.logisticsType?.toLowerCase() === "pickup"
                    ? "walk-outline"
                    : "bicycle-outline"
                }
                size={12}
                color="#6B7280"
              />
              <Text className="text-[10px] text-gray-500 font-body-medium ml-1 capitalize">
                {order.logisticsType || "Delivery"}
              </Text>
            </View>

            <View className="flex-row items-center bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
              <Ionicons name="card-outline" size={12} color="#6B7280" />
              <Text
                className="text-[10px] text-gray-500 font-body-medium ml-1 capitalize"
                numberOfLines={1}
                style={{ maxWidth: 80 }}
              >
                {order.paymentMethod?.split("-")?.[0]?.trim() || "Card"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action buttons and pricing */}
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-[10px] text-gray-400 font-body-semibold uppercase tracking-wider">
            Total Paid
          </Text>
          <Text className="text-base font-heading text-gray-900 mt-0.5">
            ${order.totalPrice?.toFixed(2)}
          </Text>
        </View>

        <View className="flex-row gap-2 flex-1 justify-end ml-4">
          <TouchableOpacity
            onPress={() => {
              const foodId =
                order.items?.[0]?.foodId ||
                order.items?.[0]?.food?._id ||
                order.items?.[0]?._id;
              router.push({
                pathname: "/screens/profile/order-details",
                params: {
                  orderId: order.orderId,
                  _id: order._id,
                  state: order.status,
                  foodId: foodId,
                },
              });
            }}
            className="bg-[#FFC107] px-4 py-2.5 rounded-xl items-center justify-center flex-row shadow-sm active:opacity-90"
          >
            <Ionicons name="eye-outline" size={14} color="#1F2937" />
            <Text className="text-gray-900 font-body-semibold text-xs ml-1">
              Details
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function PreviousOrderCard({
  order,
  router,
  formatDate,
  formatStatus,
  getProviderName,
  getStatusBadgeStyle,
  renderOrderImage,
  onDonateAgain,
}: OrderCardProps) {
  const isDonation =
    order.isDonation ||
    order.orderType === "donation" ||
    order.logisticsType === "donation";

  if (isDonation) {
    return (
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={() => {
          const foodId =
            order.items?.[0]?.foodId ||
            order.items?.[0]?.food?._id ||
            order.items?.[0]?._id;
          router.push({
            pathname: "/screens/profile/order-details",
            params: {
              orderId: order.orderId,
              _id: order._id,
              state: order.status,
              foodId: foodId,
            },
          });
        }}
        className="bg-white p-5 rounded-3xl mb-4 shadow-sm border border-rose-100"
      >
        {/* Header section of card */}
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1 mr-2">
            <View className="flex-row items-center">
              <View className="bg-rose-50 p-1 rounded-md mr-1.5">
                <Ionicons name="heart" size={14} color="#E11D48" />
              </View>
              <Text
                className="text-base font-heading text-gray-950"
                numberOfLines={1}
              >
                Meal Donation
              </Text>
            </View>
            <View className="flex-row items-center mt-1">
              <Text className="text-xs text-gray-400 font-body-medium">
                #{order.orderId ? order.orderId.split("-").pop() : "N/A"}
              </Text>
              <View className="w-1 h-1 rounded-full bg-gray-300 mx-2" />
              <Text className="text-xs text-gray-400">
                {formatDate(order.createdAt)}
              </Text>
            </View>
          </View>
          <View className="px-2.5 py-1 rounded-full border bg-emerald-50 border-emerald-100">
            <Text className="text-[10px] font-body-semibold tracking-wide uppercase text-emerald-700">
              Completed
            </Text>
          </View>
        </View>

        {/* Content section */}
        <View className="flex-row items-center py-3 border-t border-b border-gray-50 mb-4">
          <View className="relative w-16 h-16 mr-3">
            <View className="w-full h-full rounded-xl overflow-hidden bg-rose-50 border border-rose-100 items-center justify-center">
              {order.restaurantImage ? (
                <Image
                  source={{ uri: order.restaurantImage }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="gift-outline" size={24} color="#E11D48" />
              )}
            </View>
            <View className="absolute -bottom-1 -right-1 bg-rose-500 rounded-full w-5 h-5 items-center justify-center border border-white shadow-sm">
              <Ionicons name="heart" size={10} color="#FFF" />
            </View>
          </View>

          <View className="flex-1 justify-center">
            <Text className="text-[10px] text-rose-500 font-body-semibold uppercase tracking-wider mb-1">
              Community Contribution
            </Text>
            <Text
              className="text-sm font-body-semibold text-gray-700 mb-1.5"
              numberOfLines={2}
            >
              {order.items?.[0]?.description ||
                `${order.items?.[0]?.quantity || order.itemCount || 1} meal token(s) added to the community pool`}
            </Text>

            <View className="flex-row items-center gap-2">
              <View className="flex-row items-center bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                <Ionicons name="heart-outline" size={12} color="#E11D48" />
                <Text className="text-[10px] text-rose-700 font-body-medium ml-1 capitalize">
                  Donation
                </Text>
              </View>
              <View className="flex-row items-center bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                <Ionicons name="card-outline" size={12} color="#6B7280" />
                <Text className="text-[10px] text-gray-500 font-body-medium ml-1 capitalize">
                  {order.paymentMethod || "Card"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Pricing and actions */}
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-[10px] text-gray-400 font-body-semibold uppercase tracking-wider">
              Donated
            </Text>
            <Text className="text-base font-heading text-rose-600 mt-0.5">
              ${order.totalPrice?.toFixed(2)}
            </Text>
          </View>

          <View className="flex-row gap-2 flex-1 justify-end ml-4">
            <TouchableOpacity
              onPress={onDonateAgain}
              className="bg-rose-500 px-4 py-2.5 rounded-xl items-center justify-center flex-row shadow-sm active:opacity-90"
            >
              <Ionicons name="heart" size={14} color="#FFF" />
              <Text className="text-white font-body-semibold text-xs ml-1">
                Donate Again
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  const isCancelled = order.status?.toLowerCase() === "cancelled";

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={() => {
        const foodId =
          order.items?.[0]?.foodId ||
          order.items?.[0]?.food?._id ||
          order.items?.[0]?._id;
        router.push({
          pathname: "/screens/profile/order-details",
          params: {
            orderId: order.orderId,
            _id: order._id,
            state: order.status,
            foodId: foodId,
          },
        });
      }}
      className="bg-white p-5 rounded-3xl mb-4 shadow-sm border border-gray-100"
    >
      {/* Header section of card */}
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1 mr-2">
          <Text
            className="text-base font-heading text-gray-900"
            numberOfLines={1}
          >
            {getProviderName(order)}
          </Text>
          <View className="flex-row items-center mt-1">
            <Text className="text-xs text-gray-400 font-body-medium">
              #{order.orderId ? order.orderId.split("-").pop() : "N/A"}
            </Text>
            <View className="w-1 h-1 rounded-full bg-gray-300 mx-2" />
            <Text className="text-xs text-gray-400">
              {formatDate(order.createdAt)}
            </Text>
          </View>
        </View>
        <View
          className={`px-2.5 py-1 rounded-full border ${getStatusBadgeStyle(order.status).container}`}
        >
          <Text
            className={`text-[10px] font-body-semibold tracking-wide uppercase ${getStatusBadgeStyle(order.status).text}`}
          >
            {formatStatus(order.status)}
          </Text>
        </View>
      </View>

      {/* Items content section */}
      <View className="flex-row items-center py-3 border-t border-b border-gray-50 mb-3">
        {renderOrderImage(order)}
        <View className="flex-1 justify-center">
          <Text className="text-[10px] text-gray-400 font-body-semibold uppercase tracking-wider mb-1">
            {order.isMultiVendor ? "Multi-Vendor Feast" : "Order Items"}
          </Text>
          <Text
            className="text-sm font-body-semibold text-gray-700 mb-1.5"
            numberOfLines={2}
          >
            {order.items
              ?.map(
                (item: any) =>
                  `${item.quantity}x ${item.title || item.food?.title || "Item"}`,
              )
              .join(", ")}
          </Text>

          <View className="flex-row items-center gap-2">
            <View className="flex-row items-center bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
              <Ionicons
                name={
                  order.logisticsType?.toLowerCase() === "pickup"
                    ? "walk-outline"
                    : "bicycle-outline"
                }
                size={12}
                color="#6B7280"
              />
              <Text className="text-[10px] text-gray-500 font-body-medium ml-1 capitalize">
                {order.logisticsType || "Delivery"}
              </Text>
            </View>

            <View className="flex-row items-center bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
              <Ionicons name="card-outline" size={12} color="#6B7280" />
              <Text
                className="text-[10px] text-gray-500 font-body-medium ml-1 capitalize"
                numberOfLines={1}
                style={{ maxWidth: 80 }}
              >
                {order.paymentMethod?.split("-")?.[0]?.trim() || "Card"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Cancellation Reason if cancelled */}
      {isCancelled && order.cancellationReason && (
        <View className="bg-rose-50/50 border border-rose-100 rounded-xl p-2.5 mb-4 flex-row items-center">
          <Ionicons
            name="alert-circle-outline"
            size={16}
            color="#E11D48"
            className="mt-0.5"
          />
          <Text className="text-xs text-rose-700 font-body-medium ml-1.5 flex-1">
            Reason: {order.cancellationReason}
          </Text>
        </View>
      )}

      {/* Action buttons and pricing */}
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-[10px] text-gray-400 font-body-semibold uppercase tracking-wider">
            Total Paid
          </Text>
          <Text className="text-base font-heading text-gray-900 mt-0.5">
            {order.orderType === "free_meal" || order.totalPrice === 0
              ? "FREE"
              : `$${order.totalPrice?.toFixed(2)}`}
          </Text>
        </View>

        <View className="flex-row gap-2 flex-1 justify-end ml-4">
          {/* <TouchableOpacity
            onPress={() => {
              // Logic for reordering could be added here
            }}
            className="border border-gray-200 px-4 py-2.5 rounded-xl items-center justify-center flex-row bg-white active:bg-gray-50"
          >
            <Ionicons name="refresh-outline" size={14} color="#4B5563" />
            <Text className="text-gray-600 font-body-semibold text-xs ml-1">
              Reorder
            </Text>
          </TouchableOpacity> */}
          {!isCancelled &&
            ["picked_up", "delivered", "completed"].includes(
              order.status?.toLowerCase(),
            ) && (
              <TouchableOpacity
                onPress={() => {
                  const foodId =
                    order.items?.[0]?.foodId ||
                    order.items?.[0]?.food?._id ||
                    order.items?.[0]?._id;
                  router.push({
                    pathname: "/screens/profile/order-details",
                    params: {
                      orderId: order.orderId,
                      _id: order._id,
                      state: order.status,
                      autoRate: "true",
                      foodId: foodId,
                    },
                  });
                }}
                className="bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-xl items-center justify-center flex-row active:bg-amber-100"
              >
                <Ionicons name="star" size={14} color="#D97706" />
                <Text className="text-amber-800 font-body-semibold text-xs ml-1">
                  Rate
                </Text>
              </TouchableOpacity>
            )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function MyOrdersScreen() {
  const router = useRouter();
  const { fetchCurrentOrders, fetchPreviousOrders } = useStore() as any;
  const [activeTab, setActiveTab] = useState<"current" | "previous">("current");
  const [currentOrders, setCurrentOrders] = useState<any[]>([]);
  const [previousOrders, setPreviousOrders] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [donateModalVisible, setDonateModalVisible] = useState(false);

  const handleDonateConfirm = (mealCount: number) => {
    setDonateModalVisible(false);
    router.push({
      pathname: "/screens/cart/checkout",
      params: {
        mealCount: String(mealCount),
        type: "donation",
      },
    } as any);
  };

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
    }, []),
  );

  useEffect(() => {
    loadOrders();
  }, [activeTab]);

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

  const getOrderImage = (order: any) => {
    const img =
      order.restaurantImage ||
      order.restaurants?.[0]?.restaurantImage ||
      order.items?.[0]?.image ||
      order.items?.[0]?.food?.image;
    return img || null;
  };

  const renderOrderImage = (order: any) => {
    if (
      order.isMultiVendor &&
      order.restaurants &&
      order.restaurants.length > 1
    ) {
      return (
        <View className="relative w-16 h-16 mr-3">
          <View className="absolute bottom-0 left-0 w-11 h-11 rounded-xl border border-white overflow-hidden bg-gray-100 shadow-sm">
            <Image
              source={{
                uri:
                  order.restaurants[0]?.restaurantImage ||
                  order.items?.[0]?.image,
              }}
              className="w-full h-full"
              resizeMode="cover"
            />
          </View>
          <View className="absolute top-0 right-0 w-11 h-11 rounded-xl border border-white overflow-hidden bg-gray-100 shadow-md">
            <Image
              source={{
                uri:
                  order.restaurants[1]?.restaurantImage ||
                  order.items?.[1]?.image ||
                  order.restaurants[0]?.restaurantImage,
              }}
              className="w-full h-full"
              resizeMode="cover"
            />
          </View>
          {order.restaurants.length > 2 && (
            <View className="absolute -bottom-1 -right-1 bg-amber-500 rounded-full w-5 h-5 items-center justify-center border border-white shadow-sm">
              <Text className="text-[9px] font-body-semibold text-white">
                +{order.restaurants.length - 2}
              </Text>
            </View>
          )}
        </View>
      );
    }

    const imageUri = getOrderImage(order);
    return (
      <View className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 mr-3 items-center justify-center">
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="bg-amber-50 w-full h-full items-center justify-center">
            <Ionicons name="fast-food-outline" size={24} color="#FFC107" />
          </View>
        )}
      </View>
    );
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
        <Text className="text-xl font-heading text-gray-900">My Orders</Text>
      </View>

      {/* Tabs */}
      <View className="px-6 mb-6">
        <View
          className="flex-row rounded-xl p-1 h-14 items-center"
          style={{ backgroundColor: "rgba(255, 230, 156, 0.2)" }}
        >
          <TouchableOpacity
            onPress={() => setActiveTab("current")}
            style={[
              {
                flex: 1,
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 12,
              },
              activeTab === "current"
                ? {
                    backgroundColor: "#FFC107",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.15,
                    shadowRadius: 1.5,
                    elevation: 1,
                  }
                : { backgroundColor: "transparent" },
            ]}
          >
            <Text
              className={`text-base font-body-semibold ${activeTab === "current" ? "text-gray-900" : "text-gray-600"}`}
            >
              Current
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("previous")}
            style={[
              {
                flex: 1,
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 12,
              },
              activeTab === "previous"
                ? {
                    backgroundColor: "#FFC107",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.15,
                    shadowRadius: 1.5,
                    elevation: 1,
                  }
                : { backgroundColor: "transparent" },
            ]}
          >
            <Text
              className={`text-base font-body-semibold ${activeTab === "previous" ? "text-gray-900" : "text-gray-600"}`}
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
          <View className="flex-1 items-center justify-center pt-32">
            <ActivityIndicator size="large" color="#FFC107" />
            <Text className="text-gray-500 mt-4 font-body-medium">
              Loading your orders...
            </Text>
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
          ordersToShow.map((order) =>
            activeTab === "current" ? (
              <CurrentOrderCard
                key={order._id}
                order={order}
                router={router}
                formatDate={formatDate}
                formatStatus={formatStatus}
                getProviderName={getProviderName}
                getStatusBadgeStyle={getStatusBadgeStyle}
                renderOrderImage={renderOrderImage}
              />
            ) : (
              <PreviousOrderCard
                key={order._id}
                order={order}
                router={router}
                formatDate={formatDate}
                formatStatus={formatStatus}
                getProviderName={getProviderName}
                getStatusBadgeStyle={getStatusBadgeStyle}
                renderOrderImage={renderOrderImage}
                onDonateAgain={() => setDonateModalVisible(true)}
              />
            ),
          )
        )}
      </ScrollView>

      <DonateModal
        visible={donateModalVisible}
        onClose={() => setDonateModalVisible(false)}
        onConfirm={handleDonateConfirm}
      />
    </SafeAreaView>
  );
}
