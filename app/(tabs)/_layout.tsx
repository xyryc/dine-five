import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          bottom: insets.bottom > 0 ? insets.bottom + 4 : 12,
          width: "72%",
          marginHorizontal: "14%",
          backgroundColor: "rgba(248, 247, 241, 0.92)",
          borderRadius: 100,
          height: 62,
          paddingBottom: 8,
          paddingTop: 8,
          borderTopWidth: 0,
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: 4,
          },
          shadowOpacity: 0.09,
          shadowRadius: 12,
          elevation: 5,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: "#1F2937",
        tabBarInactiveTintColor: "#7A7A7A",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center justify-center">
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={21}
                color={color}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="location"
        options={{
          title: "Location",
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center justify-center -mt-6 w-12 h-12 rounded-full bg-yellow-400 border border-[#E2B220] shadow-md">
              <Ionicons
                name={focused ? "location" : "location"}
                size={22}
                color="#fff"
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="card"
        options={{
          title: "Card",
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center justify-center">
              <Ionicons
                name={focused ? "cart" : "cart-outline"}
                size={21}
                color={color}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center justify-center">
              <Ionicons
                name={focused ? "person" : "person-outline"}
                size={21}
                color={color}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="hotel-details"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      <Tabs.Screen
        name="product-details"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
    </Tabs>
  );
}
