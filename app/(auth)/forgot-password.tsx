import GradientButton from "@/components/GradientButton";
import { useStore } from "@/stores/stores";
import { Image } from "expo-image";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const { forgotPassword, isLoading } = useStore() as any;

  const handleSendEmail = async () => {
    if (!email) return;

    try {
      console.log("Forgot Password for:", email);
      const result = await forgotPassword(email);
      console.log("Forgot Password result:", result);

      if (result) {
        router.push({
          pathname: "/(auth)/emailverify",
          params: { email, type: "forgot" },
        });
      } else {
        const storeError = (useStore.getState() as any).error;
        Alert.alert(
          "Error",
          String(storeError || "Failed to send reset email"),
        );
      }
    } catch (error: any) {
      console.log("Forgot Password error:", error);
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
                Forgot Password?
              </Text>
              <Text className="text-gray-600 text-center mb-6">
                Don't worry! It happens. Please enter the email address
                associated with your account.
              </Text>

              {/* Email input */}
              <View className="mb-4">
                <Text className="text-gray-700 mb-2">Email Address</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor="#9CA3AF"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-700"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Continue button */}
              <View className="mt-14 mb-4">
                {isLoading ? (
                  <View className="items-center py-4 bg-[#F5C518] rounded-full">
                    <ActivityIndicator color="black" />
                  </View>
                ) : (
                  <GradientButton title="Continue" onPress={handleSendEmail} />
                )}
              </View>
            </View>
          </ScrollView>
        </ImageBackground>
      </KeyboardAvoidingView>
    </View>
  );
};

export default ForgotPassword;
