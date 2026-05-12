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

const SignupComponents = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isShowPassword, setIsShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);

  const { signup, isLoading } = useStore() as any;

  const handleSignup = async () => {
    if (!name || !email || !password) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    if (!agree) {
      Alert.alert("Error", "Please agree to the Terms and Conditions.");
      return;
    }

    try {
      const result = await signup({
        fullName: name,
        email,
        password,
        role: "CUSTOMER",
      });
      console.log("Signup result:", result);
      if (result) {
        router.push({
          pathname: "/(auth)/verify-otp",
          params: { email },
        });
      } else {
        Alert.alert("Error", "Signup failed. Please try again.");
      }
    } catch (error) {
      console.log("Signup error:", error);
      Alert.alert("Error", "An unexpected error occurred.");
    }
  };

  return (
    <View className="pt-5 px-5 pb-10 bg-white/90 rounded-t-2xl ">
      <View className="flex-row items-center gap-5 bg-[#FFF3CD] rounded-2xl">
        <TouchableOpacity
          className=" flex-1"
          onPress={() => router.push("/(auth)/login")}
        >
          <Text className="font-bold text-[#91958E] py-4 text-center">
            Login
          </Text>
        </TouchableOpacity>
        <GradientButton title="Sign Up" className="w-1/2 " />
      </View>

      {/* name input field */}
      <CustomInput
        label="Name"
        className="mt-2"
        placeholder="Your full name"
        onChangeText={(text) => setName(text)}
        value={name}
      />

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

      {/* terms & conditions */}
      <View className="mt-3 flex-row items-center">
        <TouchableOpacity
          className="h-6 w-6 border-2 border-black rounded-md flex-row items-center justify-center"
          onPress={() => setAgree(!agree)}
        >
          {agree && <Feather name="check" size={18} color="black" />}
        </TouchableOpacity>
        <Text className="ml-2 text-[#1F2A33] font-medium text-sm flex-1">
          I agree to our Terms and Conditions and Privacy Policy.
        </Text>
      </View>

      <View className="mt-7">
        {isLoading ? (
          <View className="items-center py-4 bg-yellow-400 rounded-full">
            <ActivityIndicator color="black" />
          </View>
        ) : (
          <GradientButton title="Sign up" onPress={handleSignup} />
        )}
      </View>

      {/* divider or */}
      <View className="mt-3.5 flex-row items-center gap-3">
        <View className=" h-px bg-[#EDEDED] mx-2 flex-1" />
        <Text className="text-[#8E8E8E]  text-base">or</Text>
        <View className="flex-1 h-px bg-[#EDEDED] mx-2" />
      </View>

      {/* google login */}
      <GoogleLogin />
    </View>
  );
};

export default SignupComponents;
