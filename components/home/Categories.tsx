import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

const DEFAULT_CATEGORIES = ["All", "Burger", "Pizza", "Donut", "Drinks", "Tacos"];

export const Categories = ({
  categories,
  activeCategory,
  onCategoryChange,
}: {
  categories?: string[];
  activeCategory: string;
  onCategoryChange: (cat: string) => void;
}) => {
  const router = useRouter();
  const categoryList =
    categories && categories.length > 0
      ? ["All", ...Array.from(new Set(categories.filter(Boolean).map((item) => item.trim()))).filter((item) => item !== "All")]
      : DEFAULT_CATEGORIES;

  return (
    <View className="mt-2">
      <View className="flex-row items-center justify-between px-4">
        {/* <Text className="text-[16px] font-semibold text-[#171717]">
          Top Categories
        </Text> */}
        {/* <TouchableOpacity
          onPress={() => router.push("/screens/home/all-categories")}
        >
          <Text className="text-[#C39A16] font-medium text-[12px]">View all</Text>
        </TouchableOpacity> */}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, marginTop: 12, paddingBottom: 4 }}
      >
        {categoryList.map((cat, index) => {
          const isActive = activeCategory === cat;
          return (
            <TouchableOpacity
              key={index}
              onPress={() => onCategoryChange(cat)}
              className={`mr-2.5 px-5 py-2 rounded-full border ${isActive ? "bg-yellow-400 border-yellow-400" : "bg-white border-gray-200"}`}
            >
              <Text
                className={`${isActive ? "text-[#2A2200] font-semibold text-[13px]" : "text-[#7B7B7B] text-[13px]"}`}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};
