import GradientButton from "@/components/GradientButton";
import { useStore } from "@/stores/stores";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";

const ResetPassword = () => {
  const { email, code } = useLocalSearchParams<{
    email: string;
    code: string;
  }>();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { resetPassword, isLoading } = useStore() as any;

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    try {
      console.log("Resetting password for:", email);
      const result = await resetPassword({
        email,
        otp: code,
        newPassword, // new password
        confirmPassword, // confirm password
      });

      if (result) {
        Alert.alert("Success", "Password reset successfully!", [
          { text: "OK", onPress: () => router.replace("/(auth)/login") },
        ]);
      } else {
        const storeError = (useStore.getState() as any).error;
        Alert.alert("Error", String(storeError || "Failed to reset password"));
      }
    } catch (error: any) {
      console.log("Reset Password error:", error);
      Alert.alert("Error", String(error.message || "Something went wrong"));
    }
  };

  return (
    <View className="flex-1">
      <StatusBar style="auto" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ImageBackground
          source={require("@/assets/images/Screenshot.png")}
          resizeMode="cover"
          style={{ flex: 1, width: "100%", height: "100%" }}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="flex-1 items-center justify-center py-10">
              <Image
                source={require("@/assets/images/logo.jpg")}
                contentFit="contain"
                style={{
                  height: 200,
                  width: 200,
                  backgroundColor: "#00000010",
                  paddingBottom: 5,
                  borderRadius: 100,
                }}
              />
            </View>

            <View
              className="bg-white pt-8 px-6 pb-10 rounded-t-3xl"
              style={{
                borderTopWidth: 2,
                borderLeftWidth: 2,
                borderRightWidth: 2,
                borderColor: "#F59E0B",
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
              }}
            >
              <Text className="text-2xl font-bold text-center mb-4">
                Now Reset Your Password.
              </Text>
              <Text className="text-gray-600 text-center mb-6">
                Password must have 6-8 characters.
              </Text>

              {/* New Password Input */}
              <View className="mb-4">
                <Text className="text-gray-700 mb-2">New Password</Text>
                <View className="relative">
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter new password"
                    placeholderTextColor="#9CA3AF"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 pr-12"
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5"
                  >
                    <Text className="text-gray-600">
                      {showPassword ? "👁️" : "👁️‍🗨️"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password Input */}
              <View className="mb-6">
                <Text className="text-gray-700 mb-2">Confirm Password</Text>
                <View className="relative">
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm new password"
                    placeholderTextColor="#9CA3AF"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 pr-12"
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3.5"
                  >
                    <Text className="text-gray-600">
                      {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Reset button */}
              <View className="mt-14 mb-4">
                {isLoading ? (
                  <View className="items-center py-4 bg-[#D32F1E] rounded-full">
                    <ActivityIndicator color="white" />
                  </View>
                ) : (
                  <GradientButton
                    title="Reset Password"
                    onPress={handleResetPassword}
                  />
                )}
              </View>
            </View>
          </ScrollView>
        </ImageBackground>
      </KeyboardAvoidingView>
    </View>
  );
};

export default ResetPassword;
