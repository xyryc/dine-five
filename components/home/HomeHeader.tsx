import { useStore } from "@/stores/stores";
import { getUserAvatarUri } from "@/utils/userAvatar";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface HomeHeaderProps {
  name?: string;
  location?: string;
  profileImage?: string;
}

export const HomeHeader = ({ name, location, profileImage }: HomeHeaderProps) => {
  const router = useRouter();
  const { user, fetchProfile } = useStore() as any;
  const avatarUri = profileImage || getUserAvatarUri(user);
  const avatarSource = avatarUri ? { uri: avatarUri } : require("@/assets/images/user-icon.jpg");

  React.useEffect(() => {
    fetchProfile?.();
  }, [fetchProfile]);

  return (
    <View className="flex-row items-center justify-between px-5 pt-3 pb-3">
      <View className="flex-row items-center gap-3">
        <View className="w-11 h-11 rounded-full overflow-hidden bg-[#F1F1EF] items-center justify-center">
          <Image
            source={avatarSource}
            contentFit="contain"
            style={{ width: "100%", height: "100%", borderRadius: 100 }}
          />
        </View>
        <View className="max-w-[190px]">
          <Text numberOfLines={1} className="text-[15px] font-semibold text-[#1C1C1C]">
            {name || user?.name || user?.fullName || "Maria's Kitchen"}
          </Text>
          <View className="flex-row items-center mt-0.5">
            <Ionicons name="location-outline" size={13} color="#A3A3A3" />
            <Text numberOfLines={1} className="text-[11px] text-[#9A9A9A] ml-1">
              {location || user?.address || "123 St. Gulshan, Dhaka..."}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => router.push("/screens/home/notifications")}
        className="w-10 h-10 bg-white rounded-full items-center justify-center border border-[#EDEDED] shadow-sm relative"
      >
        <Ionicons name="notifications-outline" size={18} color="#595959" />
        <View className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white" />
      </TouchableOpacity>
    </View>
  );
};
