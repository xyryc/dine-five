import CustomInput from "@/components/CustomInput";
import GradientButton from "@/components/GradientButton";
import { useStore } from "@/stores/stores";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  Text,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";

const VerifyOTP = () => {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState("");
  const { verifyOTP, isLoading } = useStore() as any;

  const handleVerifyOTP = async () => {
    if (!code) {
      // Code খালি থাকলে কোনো alert না দেখিয়ে শুধু return
      return;
    }

    try {
      console.log("Verifying OTP for:", email, "with code:", code);
      const result = await verifyOTP({ email, code });
      console.log("Verification result:", JSON.stringify(result, null, 2));

      const { user, accessToken } = useStore.getState() as any;
      console.log("Auth state after verification:", { user, accessToken });

      if (result?.success) {
        // OTP verified
        if (user && accessToken) {
          router.replace("/(tabs)"); // logged in → go to tabs
        } else {
          router.replace("/(auth)/login"); // not logged in → go to login
        }
      } else {
        // OTP invalid → stay on same screen or handle error silently
        console.log("Invalid OTP");
      }
    } catch (error: any) {
      console.log("Verification error:", error);
      // Optional: handle error silently or show a toast/snackbar if needed
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
                Enter Verification OTP
              </Text>
              <Text className="text-gray-600 text-center mb-2">
                We have sent a verification code to:
              </Text>
              <Text className="text-gray-900 font-bold text-center mb-6">
                {email || "your email address"}
              </Text>

              {/* OTP Input Fields */}
              <CustomInput
                label="Enter Verification Code"
                className="mt-2"
                placeholder="123456"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
              />

              {/* Verify button */}
              <View className="mt-14 mb-4">
                {isLoading ? (
                  <View className="items-center py-4 bg-yellow-400 rounded-full">
                    <ActivityIndicator color="black" />
                  </View>
                ) : (
                  <GradientButton title="Verify" onPress={handleVerifyOTP} />
                )}
              </View>
            </View>
          </ScrollView>
        </ImageBackground>
      </KeyboardAvoidingView>
    </View>
  );
};

export default VerifyOTP;
