import CustomInput from "@/components/CustomInput";
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
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";

const EmailVerify = () => {
  const { email, type } = useLocalSearchParams<{
    email: string;
    type?: string;
  }>();
  const [code, setCode] = useState("");
  const { isLoading, verifyOTP, verifyForgotOTP } = useStore() as any; // adjust according to your store

  const handleEmailVerif = async () => {
    if (!code) {
      console.log("Please enter the verification code");
      return;
    }

    try {
      console.log(
        "Verifying email for:",
        email,
        "with code:",
        code,
        "type:",
        type,
      );
      // use different store methods based on type
      const result =
        type === "forgot"
          ? await verifyForgotOTP({ email, code })
          : await verifyOTP({ email, code });

      console.log("Verification result:", result);

      if (result) {
        router.replace({
          pathname: "/(auth)/reset-password",
          params: { email, code },
        });
      } else {
        const storeError = (useStore.getState() as any).error;
        Alert.alert(
          "Error",
          String(storeError || "Incorrect verification code"),
        );
      }
    } catch (error: any) {
      console.log("Verification failed:", error);
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
                Enter Verification Code
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
                  <View className="items-center py-4 bg-[#F5C518] rounded-full">
                    <ActivityIndicator color="black" />
                  </View>
                ) : (
                  <GradientButton title="Verify" onPress={handleEmailVerif} />
                )}
              </View>
            </View>
          </ScrollView>
        </ImageBackground>
      </KeyboardAvoidingView>
    </View>
  );
};

export default EmailVerify;
