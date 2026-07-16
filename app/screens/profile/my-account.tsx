import { useStore } from "@/stores/stores";
import { getUserAvatarUri, normalizeImageUri } from "@/utils/userAvatar";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PhoneInput, {
  ICountry,
  getCountryByPhoneNumber,
  getNationalPhoneNumber,
  getCountryByCca2,
  isValidPhoneNumber,
} from "rn-international-phone-number";

const uriToBlob = (uri: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = function () {
      resolve(xhr.response);
    };
    xhr.onerror = function () {
      reject(new Error("Failed to convert URI to Blob"));
    };
    xhr.responseType = "blob";
    xhr.open("GET", uri, true);
    xhr.send(null);
  });
};

export default function MyAccountScreen() {
  const router = useRouter();
  const { user, updateProfile, fetchProfile } = useStore() as any;
  const [isEditing, setIsEditing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    phone?: string;
    city?: string;
    state?: string;
    address?: string;
  }>({});

  const avatarUri = selectedImage
    ? normalizeImageUri(selectedImage) || selectedImage
    : getUserAvatarUri(user);
  const avatarSource = (avatarUri && !avatarLoadFailed)
    ? { uri: avatarUri }
    : require("@/assets/images/user-icon.jpg");

  // Initial phone and country parsing
  const getInitialPhoneData = () => {
    let parsedCountry: ICountry | null = null;
    let parsedPhone = "";
    if (user?.phone) {
      const phoneToParse = user.phone.startsWith("+") ? user.phone : "+" + user.phone;
      parsedCountry = getCountryByPhoneNumber(phoneToParse) || null;
      if (parsedCountry) {
        parsedPhone = getNationalPhoneNumber(phoneToParse);
      } else {
        parsedPhone = user.phone;
      }
    } else {
      parsedPhone = "";
    }
    return {
      phone: parsedPhone,
      country: parsedCountry || getCountryByCca2("US") || null,
    };
  };

  const initialData = getInitialPhoneData();
  const [selectedCountry, setSelectedCountry] = useState<ICountry | null>(initialData.country);

  const [formData, setFormData] = useState({
    name: user?.name || user?.fullName || "",
    email: user?.email || "",
    phone: initialData.phone,
    bio: user?.bio || user?.Boi || "",
    city: user?.city || "",
    state: user?.state || "",
    address: user?.address || "",
  });

  useEffect(() => {
    fetchProfile?.();
  }, [fetchProfile]);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [avatarUri]);

  // Validation checks for all form fields
  useEffect(() => {
    if (!isEditing) {
      setErrors({});
      return;
    }

    const newErrors: typeof errors = {};

    // Name Validation
    if (!formData.name.trim()) {
      newErrors.name = "Full name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    // Phone Validation
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (selectedCountry && !isValidPhoneNumber(formData.phone, selectedCountry)) {
      newErrors.phone = "Invalid phone number format";
    }

    // City Validation
    if (formData.city.trim() && formData.city.trim().length < 2) {
      newErrors.city = "City must be at least 2 characters";
    }

    // State Validation
    if (formData.state.trim() && formData.state.trim().length < 2) {
      newErrors.state = "State must be at least 2 characters";
    }

    // Address Validation
    if (formData.address.trim() && formData.address.trim().length < 5) {
      newErrors.address = "Address must be at least 5 characters";
    }

    setErrors(newErrors);
  }, [formData.name, formData.phone, formData.city, formData.state, formData.address, selectedCountry, isEditing]);

  // Sync profile details when user updates
  useEffect(() => {
    if (user && !isEditing) {
      let parsedCountry: ICountry | null = null;
      let parsedPhone = user.phone || "";
      if (user.phone) {
        const phoneToParse = user.phone.startsWith("+") ? user.phone : "+" + user.phone;
        parsedCountry = getCountryByPhoneNumber(phoneToParse) || null;
        if (parsedCountry) {
          parsedPhone = getNationalPhoneNumber(phoneToParse);
        }
      }
      setSelectedCountry(parsedCountry || getCountryByCca2("US") || null);
      setFormData((prev) => ({
        ...prev,
        name: user?.name || user?.fullName || prev.name,
        email: user.email || prev.email,
        phone: parsedPhone,
        bio: user.bio || user.Boi || prev.bio,
        city: user.city || prev.city,
        state: user.state || prev.state,
        address: user.address || prev.address,
      }));
    }
  }, [user, isEditing]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedImage(null);
    if (user) {
      let parsedCountry: ICountry | null = null;
      let parsedPhone = user.phone || "";
      if (user.phone) {
        const phoneToParse = user.phone.startsWith("+") ? user.phone : "+" + user.phone;
        parsedCountry = getCountryByPhoneNumber(phoneToParse) || null;
        if (parsedCountry) {
          parsedPhone = getNationalPhoneNumber(phoneToParse);
        }
      }
      setSelectedCountry(parsedCountry || getCountryByCca2("US") || null);
      setFormData({
        name: user.name || user.fullName || "",
        email: user.email || "",
        phone: parsedPhone,
        bio: user.bio || user.Boi || "",
        city: user.city || "",
        state: user.state || "",
        address: user.address || "",
      });
    }
  };

  const handleSave = async () => {
    // Run final validation
    const finalErrors: typeof errors = {};
    if (!formData.name.trim()) {
      finalErrors.name = "Full name is required";
    } else if (formData.name.trim().length < 2) {
      finalErrors.name = "Name must be at least 2 characters";
    }

    if (!formData.phone.trim()) {
      finalErrors.phone = "Phone number is required";
    } else if (selectedCountry && !isValidPhoneNumber(formData.phone, selectedCountry)) {
      finalErrors.phone = "Invalid phone number format";
    }

    if (formData.city.trim() && formData.city.trim().length < 2) {
      finalErrors.city = "City must be at least 2 characters";
    }

    if (formData.state.trim() && formData.state.trim().length < 2) {
      finalErrors.state = "State must be at least 2 characters";
    }

    if (formData.address.trim() && formData.address.trim().length < 5) {
      finalErrors.address = "Address must be at least 5 characters";
    }

    if (Object.keys(finalErrors).length > 0) {
      setErrors(finalErrors);
      return;
    }

    setIsLoading(true);
    try {
      const callingCode = selectedCountry
        ? selectedCountry.idd.root
        : "";
      const callingCodeDigits = callingCode.replace(/\D/g, "");
      let nationalPhone = (formData.phone || "").replace(/\D/g, "");
      if (callingCodeDigits && nationalPhone.startsWith(callingCodeDigits) && nationalPhone.length > callingCodeDigits.length) {
        nationalPhone = nationalPhone.substring(callingCodeDigits.length);
      }
      const fullPhone = callingCode ? `${callingCode}${nationalPhone}` : nationalPhone;

      console.log("Saving profile data for:", formData.name, "with phone:", fullPhone);

      // Clean payload: omit empty fields to prevent backend validation errors on empty strings
      const payload: any = {
        name: formData.name,
        phone: fullPhone,
      };

      if (formData.bio.trim()) payload.bio = formData.bio;
      if (formData.city.trim()) payload.city = formData.city;
      if (formData.state.trim()) payload.state = formData.state;
      if (formData.address.trim()) payload.address = formData.address;

      let dataToUpdate: any;
      if (selectedImage) {
        const form = new FormData();
        form.append("name", payload.name);
        form.append("phone", payload.phone);
        if (payload.bio) form.append("bio", payload.bio);
        if (payload.city) form.append("city", payload.city);
        if (payload.state) form.append("state", payload.state);
        if (payload.address) form.append("address", payload.address);

        const filename = selectedImage.split("/").pop() || "profile.jpg";
        const blob = await uriToBlob(selectedImage);
        form.append("profilePic", blob, filename);
        dataToUpdate = form;
      } else {
        dataToUpdate = payload;
      }

      const result = await updateProfile(dataToUpdate);

      if (result) {
        await fetchProfile?.();
        Alert.alert("Success", "Profile updated successfully");
        setIsEditing(false);
        setSelectedImage(null);
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
    <SafeAreaView className="flex-1 bg-[#FBF9F6]" edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 pt-3 pb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            className="w-10 h-10 bg-white rounded-full items-center justify-center border border-gray-100 shadow-sm"
          >
            <Ionicons name="chevron-back" size={20} color="#1F2937" />
          </TouchableOpacity>
          <Text className="text-lg font-heading text-gray-900">Profile Details</Text>
          {isEditing ? (
            <TouchableOpacity
              onPress={handleCancel}
              activeOpacity={0.7}
              className="px-3 py-1.5 rounded-full bg-gray-100"
            >
              <Text className="text-gray-600 font-body-semibold text-sm">Cancel</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => setIsEditing(true)}
              activeOpacity={0.7}
              className="px-4 py-1.5 rounded-full bg-[#FFF8E7] border border-[#FFE8B5]"
            >
              <Text className="text-[#E29E10] font-body-semibold text-sm">Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: isEditing ? 120 : 60 }}
          className="flex-1 px-6"
        >
          {/* Profile Card Section */}
          <View className="items-center mt-4 mb-6 bg-white p-6 rounded-3xl border border-gray-100/50 shadow-sm relative">
            <View className="relative">
              <View
                className="w-28 h-28 rounded-full overflow-hidden border-4 border-white bg-white"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <Image
                  key={avatarUri || "default"}
                  source={avatarSource}
                  style={{ width: "100%", height: "100%", borderRadius: 999 }}
                  contentFit="cover"
                  onError={() => setAvatarLoadFailed(true)}
                />
              </View>
              {isEditing && (
                <TouchableOpacity
                  onPress={pickImage}
                  activeOpacity={0.8}
                  className="absolute bottom-0 right-0 bg-gray-900 w-9 h-9 rounded-full items-center justify-center border-2 border-white shadow-md"
                >
                  <Ionicons name="camera" size={16} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
            <Text className="text-xl font-heading text-gray-900 mt-4 text-center">
              {formData.name || "User"}
            </Text>
            <Text className="text-gray-400 text-sm font-body-medium mt-1 text-center">
              {formData.email}
            </Text>
          </View>

          {/* Form Fields Card */}
          <View className="bg-white p-6 rounded-3xl border border-gray-100/50 shadow-sm gap-y-5">
            {/* Full Name */}
            <View className="gap-y-1.5">
              <Text className="text-[11px] font-body-semibold text-gray-400 uppercase tracking-widest ml-1">
                Full Name
              </Text>
              <View
                className={`flex-row items-center px-4 rounded-2xl border ${
                  isEditing
                    ? "bg-white border-gray-200"
                    : "bg-gray-50 border-transparent"
                }`}
                style={{ height: 56 }}
              >
                <Ionicons name="person-outline" size={18} color="#9CA3AF" style={{ marginRight: 10 }} />
                  {isEditing ? (
                  <TextInput
                    value={formData.name}
                    onChangeText={(t) => handleChange("name", t)}
                    placeholder="Enter name"
                    className="flex-1 text-base font-body-semibold text-gray-900 p-0"
                    placeholderTextColor="#9CA3AF"
                  />
                ) : (
                  <Text className="flex-1 text-base font-body-semibold text-gray-800">
                    {formData.name || "Not set"}
                  </Text>
                )}
              </View>
              {isEditing && errors.name && (
                <Text className="text-red-500 text-xs mt-1 ml-1 font-body-semibold">
                  {errors.name}
                </Text>
              )}
            </View>

            {/* Email Address (Read-only always to protect account consistency) */}
            <View className="gap-y-1.5">
              <Text className="text-[11px] font-body-semibold text-gray-400 uppercase tracking-widest ml-1">
                Email Address
              </Text>
              <View
                className="flex-row items-center px-4 rounded-2xl border bg-gray-50 border-transparent"
                style={{ height: 56 }}
              >
                <Ionicons name="mail-outline" size={18} color="#9CA3AF" style={{ marginRight: 10 }} />
                <Text className="flex-1 text-base font-body-semibold text-gray-400">
                  {formData.email}
                </Text>
              </View>
            </View>

            {/* Phone Number */}
            <View className="gap-y-1.5">
              <Text className="text-[11px] font-body-semibold text-gray-400 uppercase tracking-widest ml-1">
                Phone Number
              </Text>
              <View
                className={`flex-row items-center rounded-2xl ${
                  isEditing ? "bg-white" : "bg-gray-50"
                }`}
                style={{ height: 56 }}
              >
                <PhoneInput
                  value={formData.phone}
                  onChangePhoneNumber={(t) => handleChange("phone", t)}
                  country={selectedCountry}
                  onChangeCountry={setSelectedCountry}
                  disabled={!isEditing}
                  modalDisabled={!isEditing}
                  placeholder="Phone number"
                  theme="light"
                  phoneInputStyles={{
                    container: {
                      backgroundColor: 'transparent',
                      borderWidth: 1,
                      borderColor: isEditing ? '#E5E7EB' : 'transparent',
                      borderRadius: 16,
                      height: 56,
                      width: '100%',
                    },
                    flagContainer: {
                      backgroundColor: 'transparent',
                      borderTopLeftRadius: 16,
                      borderBottomLeftRadius: 16,
                    },
                    input: {
                      fontSize: 16,
                      fontWeight: '600',
                      color: isEditing ? '#111827' : '#1F2937',
                    },
                    callingCode: {
                      fontSize: 16,
                      fontWeight: '600',
                      color: '#111827',
                    },
                    divider: {
                      backgroundColor: isEditing ? '#E5E7EB' : 'transparent',
                    },
                  }}
                />
              </View>
              {isEditing && errors.phone && (
                <Text className="text-red-500 text-xs mt-1 ml-1 font-body-semibold">
                  {errors.phone}
                </Text>
              )}
            </View>

            {/* Bio */}
            <View className="gap-y-1.5">
              <Text className="text-[11px] font-body-semibold text-gray-400 uppercase tracking-widest ml-1">
                Bio / About Me
              </Text>
              <View
                className={`flex-row items-start px-4 py-3.5 rounded-2xl border ${
                  isEditing
                    ? "bg-white border-gray-200"
                    : "bg-gray-50 border-transparent"
                }`}
                style={{ minHeight: 90 }}
              >
                <Ionicons name="document-text-outline" size={18} color="#9CA3AF" style={{ marginRight: 10, marginTop: 2 }} />
                {isEditing ? (
                  <TextInput
                    value={formData.bio}
                    onChangeText={(t) => handleChange("bio", t)}
                    placeholder="Tell us about yourself..."
                    multiline
                    numberOfLines={3}
                    className="flex-1 text-base font-body-semibold text-gray-900 leading-5 p-0"
                    placeholderTextColor="#9CA3AF"
                    style={{ textAlignVertical: 'top' }}
                  />
                ) : (
                  <Text className="flex-1 text-base font-body-semibold text-gray-800 leading-5">
                    {formData.bio || "No bio added yet"}
                  </Text>
                )}
              </View>
            </View>

            {/* City & State (Row Layout) */}
            <View className="flex-row gap-x-4">
              <View className="flex-1 gap-y-1.5">
                <Text className="text-[11px] font-body-semibold text-gray-400 uppercase tracking-widest ml-1">
                  City
                </Text>
                <View
                  className={`flex-row items-center px-4 rounded-2xl border ${
                    isEditing
                      ? "bg-white border-gray-200"
                      : "bg-gray-50 border-transparent"
                  }`}
                  style={{ height: 56 }}
                >
                  <Ionicons name="location-outline" size={18} color="#9CA3AF" style={{ marginRight: 6 }} />
                  {isEditing ? (
                    <TextInput
                      value={formData.city}
                      onChangeText={(t) => handleChange("city", t)}
                      placeholder="City"
                      className="flex-1 text-base font-body-semibold text-gray-900 p-0"
                      placeholderTextColor="#9CA3AF"
                    />
                  ) : (
                    <Text className="flex-1 text-base font-body-semibold text-gray-800">
                      {formData.city || "Not set"}
                    </Text>
                  )}
                </View>
                {isEditing && errors.city && (
                  <Text className="text-red-500 text-xs mt-1 ml-1 font-body-semibold">
                    {errors.city}
                  </Text>
                )}
              </View>

              <View className="flex-1 gap-y-1.5">
                <Text className="text-[11px] font-body-semibold text-gray-400 uppercase tracking-widest ml-1">
                  State
                </Text>
                <View
                  className={`flex-row items-center px-4 rounded-2xl border ${
                    isEditing
                      ? "bg-white border-gray-200"
                      : "bg-gray-50 border-transparent"
                  }`}
                  style={{ height: 56 }}
                >
                  {isEditing ? (
                    <TextInput
                      value={formData.state}
                      onChangeText={(t) => handleChange("state", t)}
                      placeholder="State"
                      className="flex-1 text-base font-body-semibold text-gray-900 p-0"
                      placeholderTextColor="#9CA3AF"
                    />
                  ) : (
                    <Text className="flex-1 text-base font-body-semibold text-gray-800">
                      {formData.state || "Not set"}
                    </Text>
                  )}
                </View>
                {isEditing && errors.state && (
                  <Text className="text-red-500 text-xs mt-1 ml-1 font-body-semibold">
                    {errors.state}
                  </Text>
                )}
              </View>
            </View>

            {/* Address */}
            <View className="gap-y-1.5">
              <Text className="text-[11px] font-body-semibold text-gray-400 uppercase tracking-widest ml-1">
                Street Address
              </Text>
              <View
                className={`flex-row items-center px-4 rounded-2xl border ${
                  isEditing
                    ? "bg-white border-gray-200"
                    : "bg-gray-50 border-transparent"
                }`}
                style={{ height: 56 }}
              >
                <Ionicons name="map-outline" size={18} color="#9CA3AF" style={{ marginRight: 10 }} />
                {isEditing ? (
                  <TextInput
                    value={formData.address}
                    onChangeText={(t) => handleChange("address", t)}
                    placeholder="Enter street address"
                    className="flex-1 text-base font-body-semibold text-gray-900 p-0"
                    placeholderTextColor="#9CA3AF"
                  />
                ) : (
                  <Text className="flex-1 text-base font-body-semibold text-gray-800">
                    {formData.address || "No address added yet"}
                  </Text>
                )}
              </View>
              {isEditing && errors.address && (
                <Text className="text-red-500 text-xs mt-1 ml-1 font-body-semibold">
                  {errors.address}
                </Text>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Floating/Bottom Action Buttons when editing */}
        {isEditing && (
          <View
            className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-6 flex-row gap-x-4"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 10,
            }}
          >
            <TouchableOpacity
              onPress={handleCancel}
              disabled={isLoading}
              activeOpacity={0.8}
              className="flex-1 py-4 bg-gray-50 rounded-2xl items-center justify-center border border-gray-100"
              style={{ height: 56 }}
            >
              <Text className="text-gray-600 font-body-semibold text-base">
                {isLoading ? "Saving Profile..." : "Discard"}
              </Text>
            </TouchableOpacity>

            {isLoading ? (
              <View
                className="bg-[#FFF8E7] rounded-2xl items-center justify-center border border-[#FFE8B5]"
                style={{ height: 56, width: 56 }}
              >
                <ActivityIndicator size="small" color="#E29E10" />
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleSave}
                activeOpacity={0.8}
                className="flex-2 rounded-2xl overflow-hidden"
                style={{ height: 56 }}
              >
                <LinearGradient
                  colors={["#F5C518", "#E29E10"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    height: '100%',
                    width: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text className="text-white font-body-bold text-base px-10">Save Changes</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
