import { useStore } from "@/stores/stores";
import { useRestaurantStore } from "@/stores/useRestaurantStore";
import { getUserAvatarUri } from "@/utils/userAvatar";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as Location from "expo-location";

interface HomeHeaderProps {
  name?: string;
  location?: string;
}

const pickString = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
};

export const HomeHeader = ({ name, location: propLocation }: HomeHeaderProps) => {
  const router = useRouter();
  const { user, fetchProfile } = useStore() as any;
  const { location, locationLoading, fetchLocation, setLocationManually } = useRestaurantStore();

  const [addressSearch, setAddressSearch] = useState("");
  const [currentLocationLabel, setCurrentLocationLabel] = useState("");
  const [searching, setSearching] = useState(false);

  const avatarUri = getUserAvatarUri(user);
  const avatarSource = avatarUri ? { uri: avatarUri } : require("@/assets/images/user-icon.jpg");

  React.useEffect(() => {
    fetchProfile?.();
  }, [fetchProfile]);

  // Reverse geocode store location to display readable address
  useEffect(() => {
    let isMounted = true;
    const resolveLocationLabel = async () => {
      if (!location) {
        setCurrentLocationLabel("No location set");
        return;
      }
      try {
        const result = await Location.reverseGeocodeAsync({
          latitude: location.latitude,
          longitude: location.longitude,
        });

        if (!isMounted) return;

        const place = result?.[0];
        const label = pickString(
          place?.district,
          place?.subregion,
          place?.city,
          place?.region,
          place?.street,
        );

        setCurrentLocationLabel(label || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`);
      } catch {
        if (isMounted) {
          setCurrentLocationLabel(`${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`);
        }
      }
    };

    resolveLocationLabel();
    return () => {
      isMounted = false;
    };
  }, [location]);

  const handleLocationSearch = async () => {
    if (!addressSearch.trim()) return;
    setSearching(true);
    try {
      const res = await setLocationManually(addressSearch);
      if (res && res.success) {
        setAddressSearch("");
      } else {
        Alert.alert("Error", res?.error || "Could not resolve address. Please try again.");
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to search location.");
    } finally {
      setSearching(false);
    }
  };

  const handleLocateMe = async () => {
    setSearching(true);
    try {
      await fetchLocation(true);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to locate.");
    } finally {
      setSearching(false);
    }
  };

  const displayName = name || user?.name || user?.fullName || "Maria's Kitchen";
  const displayLocation = propLocation || currentLocationLabel || user?.address || "Fetching location...";

  return (
    <View className="px-5 pt-3 pb-3 bg-white">
      {/* Row 1: Profile, Name and Notifications */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-3">
          <View className="w-11 h-11 rounded-full overflow-hidden bg-[#F1F1EF] items-center justify-center border border-gray-100">
            <Image
              source={avatarSource}
              contentFit="contain"
              style={{ width: "100%", height: "100%", borderRadius: 100 }}
            />
          </View>
          <View>
            <Text className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Welcome back</Text>
            <Text numberOfLines={1} className="text-base font-black text-[#1C1C1C] max-w-[190px]">
              {displayName}
            </Text>
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

      {/* Row 2: Combined Location Label and Search Input (No Card Wrapper!) */}
      <View className="mt-1">
        <View className="flex-row items-center bg-gray-50 rounded-2xl border border-gray-100 px-3.5 py-1.5 shadow-sm">
          <Ionicons name="location-outline" size={16} color="#A3A3A3" />
          
          <TextInput
            placeholder={displayLocation}
            placeholderTextColor="#595959"
            value={addressSearch}
            onChangeText={setAddressSearch}
            onSubmitEditing={handleLocationSearch}
            className="flex-1 ml-2 text-[11px] text-[#1C1C1C] py-1 font-semibold"
          />

          {addressSearch ? (
            <TouchableOpacity onPress={() => setAddressSearch("")} className="mr-2">
              <Ionicons name="close-circle" size={15} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}

          {/* Locate Me button inside searchbar */}
          <TouchableOpacity
            onPress={handleLocateMe}
            disabled={locationLoading || searching}
            className="p-1 mr-1"
          >
            {(locationLoading || searching) ? (
              <ActivityIndicator size="small" color="#F5C518" />
            ) : (
              <Ionicons name="locate" size={16} color="#F5C518" />
            )}
          </TouchableOpacity>

          {addressSearch.trim().length > 0 && (
            <TouchableOpacity
              onPress={handleLocationSearch}
              disabled={searching}
              className="bg-gray-900 px-3 py-1.5 rounded-xl ml-1"
            >
              <Text className="text-white text-[9px] font-black uppercase">Go</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};
