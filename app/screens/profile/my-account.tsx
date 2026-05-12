import { useStore } from "@/stores/stores";
import { getUserAvatarUri, normalizeImageUri } from "@/utils/userAvatar";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MyAccountScreen() {
  const router = useRouter();
  const { user, updateProfile, fetchProfile } = useStore() as any;
  const [isEditing, setIsEditing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const avatarUri = selectedImage
    ? normalizeImageUri(selectedImage) || selectedImage
    : getUserAvatarUri(user);

  React.useEffect(() => {
    fetchProfile?.();
  }, [fetchProfile]);

  React.useEffect(() => {
    setAvatarLoadFailed(false);
  }, [avatarUri]);

  const COUNTRY_CODES = [
    { code: "+1", country: "United States", flag: "🇺🇸" },
    { code: "+880", country: "Bangladesh", flag: "🇧🇩" },
    { code: "+44", country: "United Kingdom", flag: "🇬🇧" },
    { code: "+91", country: "India", flag: "🇮🇳" },
    { code: "+971", country: "UAE", flag: "🇦🇪" },
    { code: "+966", country: "Saudi Arabia", flag: "🇸🇦" },
    { code: "+61", country: "Australia", flag: "🇦🇺" },
    { code: "+1", country: "Canada", flag: "🇨🇦" },
    { code: "+49", country: "Germany", flag: "🇩🇪" },
    { code: "+33", country: "France", flag: "🇫🇷" },
  ];

  // Filter state initialized with user data
  const [formData, setFormData] = useState({
    name: user?.name || user?.fullName || "Theresa Webb",
    email: user?.email || "michael.mitc@example.com",
    phone: user?.phone || "555-0128",
    phonePrefix: "+1",
    dob: "12-10-1996",
    address: "King kong",
  });

  // Keep form synced with store user data
  React.useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: user?.name || user?.fullName || prev.name,
        email: user.email || prev.email,
        phone: user.phone || prev.phone,
        dob: user.dob || prev.dob,
        address: user.address || prev.address,
      }));
    }
  }, [user]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      let cleanPhone = (formData.phone || "").replace(/\D/g, "");
      // Prevent double prefixing if the cleaned phone already starts with the prefix (without the +)
      const prefixNoPlus = formData.phonePrefix.replace("+", "");
      let fullPhone = cleanPhone.startsWith(prefixNoPlus) 
        ? `+${cleanPhone}` 
        : `${formData.phonePrefix}${cleanPhone}`;

      console.log("Saving profile data for:", formData.name, "with phone:", fullPhone);

      let dataToUpdate: any;
      if (selectedImage) {
        const form = new FormData();
        form.append("name", formData.name);
        form.append("phone", fullPhone);
        form.append("dob", formData.dob);
        form.append("address", formData.address);

        const filename = selectedImage.split("/").pop() || "profile.jpg";
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image`;

        form.append("profilePic", {
          uri: selectedImage,
          name: filename,
          type,
        } as any);
        dataToUpdate = form;
      } else {
        dataToUpdate = {
          name: formData.name,
          phone: fullPhone,
          dob: formData.dob,
          address: formData.address,
        };
      }

      const result = await updateProfile(dataToUpdate);

      if (result) {
        await fetchProfile?.();
        Alert.alert("Success", "Profile updated successfully");
        setIsEditing(false);
        setSelectedImage(null); // Clear selection after success
      } else {
        const storeError = (useStore.getState() as any).error;
        Alert.alert("Error", storeError || "Failed to update profile");
      }
    } catch (error: any) {
      console.log("Save error:", error);
      Alert.alert("Error", error.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FDFBF7]">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-center pt-2 pb-6 relative px-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute left-4 z-10 w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm"
          >
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">My Account</Text>

          <TouchableOpacity
            onPress={() => {
              if (isEditing) {
                handleSave();
              } else {
                setIsEditing(true);
              }
            }}
            className="absolute right-4"
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFC107" />
            ) : (
              <Text className="text-[#FFC107] font-bold text-lg">
                {isEditing ? "Save" : "Edit"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-6">
          {/* User Avatar */}
          <View className="items-center mb-8">
            <View className="relative">
              <View className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden">
                {avatarUri && !avatarLoadFailed ? (
                  <Image
                    key={avatarUri}
                    source={{ uri: avatarUri }}
                    style={{ width: 96, height: 96, borderRadius: 999 }}
                    contentFit="cover"
                    onError={() => setAvatarLoadFailed(true)}
                  />
                ) : (
                  <View className="w-full h-full items-center justify-center">
                    <Ionicons name="person" size={34} color="#9CA3AF" />
                  </View>
                )}
              </View>
              {isEditing && (
                <TouchableOpacity
                  onPress={pickImage}
                  className="absolute bottom-0 right-0 bg-gray-900 w-8 h-8 rounded-full items-center justify-center border-2 border-white"
                >
                  <Ionicons name="camera" size={14} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
            <Text className="text-2xl font-bold text-gray-900 text-center mt-4">
              {formData.name}
            </Text>
            <Text className="text-gray-500 text-sm text-center mt-1">
              {formData.email}
            </Text>
          </View>

          {/* Form Fields */}
          <View className="space-y-5">
            {/* Name Field */}
            {isEditing ? (
              <View>
                <Text className="text-gray-500 text-sm mb-1 ml-1">Name</Text>
                <TextInput
                  value={formData.name}
                  onChangeText={(t) => handleChange("name", t)}
                  className="bg-white p-4 rounded-xl border border-gray-100 text-base font-normal text-gray-900"
                />
              </View>
            ) : (
              <View className="bg-white p-4 rounded-xl border border-gray-100">
                <Text className="text-base font-normal text-gray-900">
                  {formData.name}
                </Text>
              </View>
            )}

            {/* Phone Field */}
            <View className="mt-4">
              {isEditing && (
                <Text className="text-gray-500 text-sm mb-1 ml-1">
                  Phone Number
                </Text>
              )}
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => isEditing && setShowCountryPicker(true)}
                  disabled={!isEditing}
                  className="bg-white p-4 rounded-xl border border-gray-100 flex-row items-center justify-center gap-2"
                >
                  <Text className="text-base font-normal text-gray-900">
                    {formData.phonePrefix}
                  </Text>
                  {isEditing && (
                    <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
                  )}
                </TouchableOpacity>
                <View className="flex-1 bg-white p-4 rounded-xl border border-gray-100 justify-center">
                  {isEditing ? (
                    <TextInput
                      value={formData.phone}
                      onChangeText={(t) => handleChange("phone", t)}
                      keyboardType="phone-pad"
                      className="text-base font-normal text-gray-900 p-0"
                    />
                  ) : (
                    <Text className="text-base font-normal text-gray-900">
                      {formData.phone}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* DOB Field */}
            <View className="mt-4">
              {isEditing && (
                <Text className="text-gray-500 text-sm mb-1 ml-1">
                  Date of Birth
                </Text>
              )}
              <View className="bg-white p-4 rounded-xl border border-gray-100">
                {isEditing ? (
                  <TextInput
                    value={formData.dob}
                    onChangeText={(t) => handleChange("dob", t)}
                    placeholder="DD-MM-YYYY"
                    className="text-base font-normal text-gray-900 p-0"
                  />
                ) : (
                  <Text className="text-base font-normal text-gray-900">
                    {formData.dob}
                  </Text>
                )}
              </View>
            </View>

            {/* Address Field */}
            <View className="mt-4">
              {isEditing && (
                <Text className="text-gray-500 text-sm mb-1 ml-1">Address</Text>
              )}
              <View className="bg-white p-4 rounded-xl border border-gray-100 flex-row justify-between items-center">
                {isEditing ? (
                  <TextInput
                    value={formData.address}
                    onChangeText={(t) => handleChange("address", t)}
                    className="flex-1 text-base font-normal text-gray-900 p-0"
                  />
                ) : (
                  <Text className="text-base font-normal text-gray-900">
                    Address - {formData.address}
                  </Text>
                )}
                {!isEditing && (
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Country Code Picker Modal */}
      <Modal
        visible={showCountryPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl h-[60%] px-6 pt-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-gray-900">
                Select Country
              </Text>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={COUNTRY_CODES}
              keyExtractor={(item) => item.country + item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    handleChange("phonePrefix", item.code);
                    setShowCountryPicker(false);
                  }}
                  className="flex-row items-center py-4 border-b border-gray-50"
                >
                  <Text className="text-2xl mr-4">{item.flag}</Text>
                  <Text className="flex-1 text-base text-gray-900">
                    {item.country}
                  </Text>
                  <Text className="text-base font-semibold text-[#FFC107]">
                    {item.code}
                  </Text>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
