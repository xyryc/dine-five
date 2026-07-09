import { useStore } from "@/stores/stores";
import { getUserAvatarUri } from "@/utils/userAvatar";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { ScrollView, Text, TouchableOpacity, View, Alert, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DonateModal } from "@/components/home/DonateModal";

export default function ProfileScreen() {
  const { user, fetchProfile, logout } = useStore() as any;
  const router = useRouter();

  const avatarUri = getUserAvatarUri(user);
  const avatarSource = avatarUri ? { uri: avatarUri } : require("@/assets/images/user-icon.jpg");

  const [modalVisible, setModalVisible] = React.useState(false);

  const handleConfirm = (mealCount: number) => {
    setModalVisible(false);
    router.push({
      pathname: "/screens/cart/checkout",
      params: {
        mealCount: String(mealCount),
        type: "donation",
      },
    } as any);
  };

  useEffect(() => {
    fetchProfile?.();
  }, [fetchProfile]);

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to log out of your account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await logout?.();
          },
        },
      ]
    );
  };

  const menuSections = [
    {
      title: "Account & Activity",
      items: [
        {
          id: "account",
          title: "My Account",
          icon: "person-outline",
          color: "#E29E10",
          bgColor: "#FFF8E7",
          route: "/screens/profile/my-account",
        },
        {
          id: "orders",
          title: "My Orders",
          icon: "receipt-outline",
          color: "#FF7043",
          bgColor: "#FEEBE6",
          route: "/screens/profile/my-orders",
        },
        {
          id: "favorite",
          title: "Favorites List",
          icon: "heart-outline",
          color: "#EC407A",
          bgColor: "#FCE4EC",
          route: "/screens/profile/favorite",
        },
      ],
    },
    {
      title: "Payments & Donations",
      items: [
        {
          id: "donate",
          title: "Donation Tokens",
          icon: "gift-outline",
          color: "#26A69A",
          bgColor: "#E0F2F1",
          route: "/screens/profile/donation-tokens",
        },
        {
          id: "donate-action",
          title: "Donate a Meal",
          icon: "heart-outline",
          color: "#EC407A",
          bgColor: "#FCE4EC",
          action: () => setModalVisible(true),
        },
        {
          id: "cart",
          title: "View Cart",
          icon: "cart-outline",
          color: "#FFC107",
          bgColor: "#FFFDE7",
          route: "/(tabs)/cart",
        },
      ],
    },
    {
      title: "Preferences",
      items: [
        {
          id: "settings",
          title: "Settings",
          icon: "settings-outline",
          color: "#78909C",
          bgColor: "#ECEFF1",
          route: "/screens/profile/settings",
        },
      ],
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-[#FBF9F6]" edges={["top"]}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160 }}
      >
        {/* Banner and Profile Card Section */}
        <View className="relative mb-32">
          {/* Banner Cover with Gradient */}
          <View className="relative h-44 overflow-hidden">
            <LinearGradient
              colors={["#F5C518", "#E29E10"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* Subtle light reflections */}
            <View className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
            <View className="absolute -bottom-20 -left-10 w-60 h-60 bg-white/5 rounded-full" />
          </View>

          {/* Profile Card Container (centered absolute overlap) */}
          <View 
            className="absolute left-6 right-6 bg-white p-6 rounded-3xl shadow-xl flex-col items-center gap-3 border border-gray-100"
            style={{
              top: 70,
              zIndex: 10,
              elevation: 10,
            }}
          >
            <View 
              className="w-24 h-24 rounded-full overflow-hidden border-4 border-white bg-white"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 6,
                elevation: 4,
              }}
            >
              <Image
                source={avatarSource}
                style={{ height: "100%", width: "100%", borderRadius: 999 }}
                contentFit="cover"
              />
            </View>
            <View className="items-center">
              <Text numberOfLines={1} className="text-xl font-extrabold text-gray-900 leading-6 text-center">
                {user?.name || user?.fullName || "User"}
              </Text>
              <Text numberOfLines={1} className="text-sm font-medium text-gray-400 mt-1 leading-4 text-center">
                {user?.email || "No email provided"}
              </Text>
            </View>
          </View>
        </View>

        {/* Menu Sections */}
        <View className="px-6 gap-y-6">
          {menuSections.map((section) => (
            <View key={section.title} className="gap-y-2">
              <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">
                {section.title}
              </Text>
              <View className="bg-white rounded-2xl overflow-hidden border border-gray-50 shadow-sm">
                {section.items.map((item, index) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => {
                      if (item.action) {
                        item.action();
                      } else if (item.route) {
                        router.push(item.route as any);
                      }
                    }}
                    activeOpacity={0.7}
                    className={`flex-row items-center justify-between p-4 ${
                      index < section.items.length - 1 ? "border-b border-gray-50" : ""
                    }`}
                  >
                    <View className="flex-row items-center gap-4">
                      <View 
                        className="w-9 h-9 rounded-xl items-center justify-center"
                        style={{ backgroundColor: item.bgColor }}
                      >
                        <Ionicons name={item.icon as any} size={18} color={item.color} />
                      </View>
                      <Text className="text-[15px] font-semibold text-gray-800">
                        {item.title}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#CCCCCC" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {/* Logout Section */}
          <View className="pt-4">
            <TouchableOpacity
              onPress={handleLogout}
              activeOpacity={0.8}
              className="flex-row items-center justify-center gap-2 bg-[#FFF5F5] border border-[#FED7D7] py-4 rounded-2xl shadow-sm"
            >
              <Ionicons name="log-out-outline" size={20} color="#E53E3E" />
              <Text className="text-[#E53E3E] font-bold text-base">
                Log Out
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <DonateModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onConfirm={handleConfirm}
      />
    </SafeAreaView>
  );
}
