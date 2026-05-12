import { useStore } from "@/stores/stores";
import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import CustomInput from "./CustomInput";
import GoogleLogin from "./GoogleLogin";
import GradientButton from "./GradientButton";

const LoginComponents = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isShowPassword, setIsShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const { login, isLoading } = useStore() as any;

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    try {
      const result = await login({ email, password });
      if (result) {
        router.replace("/(tabs)");
      } else {
        Alert.alert("Error", "Login failed. Please check your credentials.");
      }
    } catch (error: any) {
      console.log("Login error:", error);
      if (error.message.includes("verify your email")) {
        Alert.alert(
          "Verification Required",
          "Please verify your email address before logging in.",
          [
            {
              text: "Verify Now",
              onPress: () =>
                router.push({
                  pathname: "/(auth)/verify-otp",
                  params: { email },
                }),
            },
            { text: "Cancel", style: "cancel" },
          ],
        );
      } else {
        Alert.alert("Error", error.message || "An unexpected error occurred.");
      }
    }
  };

  return (
    <View className="pt-5 px-5 pb-10  rounded-t-2xl ">
      <View className="flex-row items-center gap-5 bg-[#FFF3CD] rounded-2xl">
        <GradientButton title="Login" className="w-1/2  " />
        <TouchableOpacity
          onPress={() => router.push("/(auth)/signup")}
          className=" flex-1"
        >
          <Text className="font-bold text-[#91958E] py-4 text-center">
            Sign Up
          </Text>
        </TouchableOpacity>
      </View>

      {/* email input field */}
      <CustomInput
        label="Email"
        className="mt-2"
        placeholder="name@example.com"
        onChangeText={(text) => setEmail(text)}
        value={email}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {/* password input field */}
      <CustomInput
        label="Password"
        className="mt-6"
        placeholder="min. 6 characters"
        onChangeText={(text) => setPassword(text)}
        value={password}
        secureTextEntry={!isShowPassword}
        icon={
          <TouchableOpacity onPress={() => setIsShowPassword(!isShowPassword)}>
            {isShowPassword ? (
              <Feather name="eye" size={24} color="black" />
            ) : (
              <Feather name="eye-off" size={24} color="black" />
            )}
          </TouchableOpacity>
        }
      />

      {/* remember me & forgot password */}
      <View className="mt-3 flex-row items-center justify-between">
        {/* remember me */}
        <View className="flex-row items-center">
          <TouchableOpacity
            className="h-6 w-6 border-2 border-black rounded-md flex-row items-center justify-center"
            onPress={() => setRememberMe(!rememberMe)}
          >
            {rememberMe && <Feather name="check" size={18} color="black" />}
          </TouchableOpacity>
          <Text className="ml-2 text-[#1F2A33] font-medium text-sm">
            Remember me
          </Text>
        </View>

        {/* forgate password */}
        <TouchableOpacity
          onPress={() => router.push("/(auth)/forgot-password")}
        >
          <Text className="text-[#D32F1E] font-medium text-sm">
            Forgot Password?
          </Text>
        </TouchableOpacity>
      </View>

      <View className="mt-7">
        {isLoading ? (
          <View className="items-center py-4 bg-yellow-400 rounded-full">
            <ActivityIndicator color="black" />
          </View>
        ) : (
          <GradientButton title="Login" onPress={handleLogin} />
        )}
      </View>

      {/* devider or */}
      <View className="mt-3.5 flex-row items-center gap-3">
        {/* divider */}
        <View className=" h-px bg-[#EDEDED] mx-2 flex-1" />
        <Text className="text-[#8E8E8E]  text-base">or</Text>
        {/* divider */}
        <View className="flex-1 h-px bg-[#EDEDED] mx-2" />
      </View>

      {/* google login */}
      <GoogleLogin />
    </View>
  );
};

export default LoginComponents;
