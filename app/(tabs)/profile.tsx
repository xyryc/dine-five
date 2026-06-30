import { useStore } from "@/stores/stores";
import { getUserAvatarUri } from "@/utils/userAvatar";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const MENU_ITEMS = [
  {
    id: "account",
    title: "My Account",
    icon: "person-outline",
    route: "/screens/profile/my-account",
  },
  {
    id: "orders",
    title: "My Orders",
    icon: "reader-outline", // list icon lookalike
    route: "/screens/profile/my-orders",
  },
  {
    id: "cart",
    title: "Cart",
    icon: "cart-outline",
    route: "/(tabs)/cart",
  },
  {
    id: "payment",
    title: "Payment",
    icon: "card-outline",
    route: "/screens/profile/payment",
  },
  {
    id: "favorite",
    title: "Favorite",
    icon: "heart-outline",
    route: "/screens/profile/favorite",
  },
  {
    id: "donate",
    title: "Donate a meal",
    icon: "basket-outline",
    route: "/screens/profile/donation-tokens",
  },

  {
    id: "settings",
    title: "Settings",
    icon: "settings-outline",
    route: "/screens/profile/settings",
  },

];

export default function ProfileScreen() {
  const { user, fetchProfile } = useStore() as any;
  const router = useRouter();
  const avatarUri = getUserAvatarUri(user);

  useEffect(() => {
    fetchProfile?.();
  }, [fetchProfile]);

  const handleItemPress = (item: typeof MENU_ITEMS[0]) => {
    router.push(item.route as any);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />

      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Profile Header */}
        <View className=" mb-10 mt-4 flex-row items-center gap-4">
          <View className="w-20 h-20 rounded-full mb-4 overflow-hidden shadow-sm">
            <Image
              source={{ uri: avatarUri }}
              style={{ height: 80, width: 80, borderRadius: 100 }}
              contentFit="cover"
            />
          </View>
          <View>
            <Text className="text-2xl font-bold text-gray-900 ">
              {user?.name || user?.fullName || "User"}
            </Text>
            <Text className="text-gray-500 text-base  mt-1">
              {user?.email || "No email provided"}
            </Text>
          </View>
        </View>

        {/* Genearl Section */}
        <Text className="text-[#70756B] text-sm font-normal mb-4">General</Text>

        {/* Menu List */}
        <View className="space-y-6">
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => handleItemPress(item)}
              className="flex-row items-center justify-between py-2"
            >
              <View className="flex-row items-center gap-4">
                <View className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm">
                  <Ionicons name={item.icon as any} size={20} color="#000" />
                </View>
                <Text className="text-sm font-normal text-[#1F2A33]">
                  {item.title}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
