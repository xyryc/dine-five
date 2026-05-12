import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";

type HomeItem = {
  id: string;
  name: string;
  image?: string;
  price?: number;
  rating?: number;
  provider?: string;
  category?: string;
  etaMinutes?: number;
  reviewCount?: number;
};

type HomeSections = {
  startTheDay?: HomeItem[];
  lateNightCravings?: HomeItem[];
};

const cardImageFallback =
  "https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=500";

export const PopularItems = ({
  sections,
  searchText = "",
  activeCategory = "All",
}: {
  sections?: HomeSections;
  searchText?: string;
  activeCategory?: string;
}) => {
  const router = useRouter();

  const filterItems = (items: HomeItem[] = []) =>
    items.filter((item) => {
      const matchesSearch = (item.name || "")
        .toLowerCase()
        .includes(searchText.toLowerCase());
      const matchesCategory =
        activeCategory === "All" ||
        (item.category || "").toLowerCase().includes(activeCategory.toLowerCase());
      return matchesSearch && matchesCategory;
    });

  const startTheDay = filterItems(sections?.startTheDay || []);
  const lateNightCravings = filterItems(sections?.lateNightCravings || []);

  if (searchText && startTheDay.length === 0 && lateNightCravings.length === 0) {
    return null;
  }

  const renderCard = (item: HomeItem) => (
    <TouchableOpacity
      key={item.id}
      activeOpacity={0.9}
      onPress={() => {
        router.push({
          pathname: "/(tabs)/product-details",
          params: {
            id: item.id,
            foodId: item.id,
            name: item.name,
            price: (item.price ?? 0).toString(),
            image: item.image || "",
            rating: (item.rating ?? 0).toString(),
            reviews: (item.reviewCount ?? 0).toString(),
            restaurantName: item.provider || "",
            restaurantProfile: "",
            isFavorite: "false",
          },
        });
      }}
      className="w-[240px] mr-3 bg-white rounded-2xl p-2.5 border border-[#EEEEEE]"
    >
      <Image
        source={{ uri: item.image || cardImageFallback }}
        className="w-full h-[122px] rounded-xl"
        resizeMode="cover"
      />

      <View className="pt-2 px-1">
        <View className="flex-row items-start justify-between">
          <Text numberOfLines={1} className="text-[14px] font-semibold text-[#202020] flex-1">
            {item.name}
          </Text>
          <TouchableOpacity className="w-7 h-7 rounded-full border border-[#E8E8E8] items-center justify-center ml-2">
            <Ionicons name="heart-outline" size={15} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center mt-1.5">
          <Ionicons name="star" size={13} color="#F6B500" />
          <Text className="text-[12px] text-[#555] ml-1 font-medium">
            {(item.rating ?? 4.2).toFixed(1)}
          </Text>
          <Text className="text-[#B3B3B3] mx-1.5">•</Text>
          <Text className="text-[12px] text-[#777]">{item.category || "cake"}</Text>
          <Text className="text-[#B3B3B3] mx-1.5">•</Text>
          <Text className="text-[12px] text-[#777]">{item.etaMinutes ?? 10}min</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSection = (title: string, data: HomeItem[]) => {
    if (!data.length) return null;
    return (
      <View className="mt-5">
        <View className="flex-row items-center justify-between px-4 mb-3">
          <Text className="text-[16px] font-semibold text-[#171717]">{title}</Text>
          <TouchableOpacity>
            <Text className="text-[#C39A16] font-medium text-[12px]">View all</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {data.map(renderCard)}
        </ScrollView>
      </View>
    );
  };

  return (
    <View className="pb-6">
      {renderSection("Start the Day", startTheDay)}
      {renderSection("Late Night Cravings", lateNightCravings)}
    </View>
  );
};
