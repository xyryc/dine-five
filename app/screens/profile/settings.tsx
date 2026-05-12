import { useStore } from "@/stores/stores";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const MENU_ITEMS = [
  {
    id: "support",
    title: "Customer Support",
    icon: "chatbubble-outline",
    route: "/screens/profile/customer-support",
  },
  {
    id: "privacy",
    title: "Privacy Policy",
    icon: "lock-closed-outline",
    route: "/screens/profile/privacy",
  },
  {
    id: "terms",
    title: "Terms & Conditions",
    icon: "document-text-outline",
    route: "/screens/profile/terms",
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { logout, deleteAccount } = useStore() as any;

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log out",
          style: "destructive",
          onPress: async () => {
            const success = await logout();
            if (success) {
              router.replace("/(auth)/login");
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const result = await deleteAccount();
            if (result && result.success) {
              Alert.alert("Success", result.message || "Account deactivated");
              router.replace("/(auth)/login");
            } else {
              const error = (useStore.getState() as any).error;
              Alert.alert("Error", error || "Failed to delete account");
            }
          },
        },
      ],
      { cancelable: true },
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
        <Text className="text-xl font-bold text-gray-900">Settings</Text>
      </View>

      <ScrollView className="flex-1 px-6">
        {/* Menu List */}
        <View className="space-y-4 mb-10">
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => router.push(item.route as any)}
              className="flex-row items-center justify-between py-2"
            >
              <View className="flex-row items-center gap-4">
                {/* Only icon or icon+text? Image shows icon + text */}
                <Ionicons name={item.icon as any} size={22} color="#4B5563" />
                <Text className="text-base font-medium text-gray-600">
                  {item.title}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Danger Actions */}
        <Text className="text-gray-400 text-sm mb-4">Danger Actions</Text>

        <TouchableOpacity
          onPress={handleDeleteAccount}
          className="bg-red-600 rounded-2xl py-4 flex-row items-center justify-center gap-2 mb-4 shadow-sm"
        >
          <Ionicons name="trash-outline" size={20} color="#fff" />
          <Text className="text-white font-bold text-base">Delete Account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleLogout}
          className="bg-[#FFC107] rounded-2xl py-4 flex-row items-center justify-center gap-2 shadow-sm"
        >
          <Ionicons name="log-out-outline" size={20} color="#000" />
          <Text className="text-gray-900 font-bold text-base">Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

