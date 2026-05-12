import LoginComponents from "@/components/LoginComponents";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";

const Login = () => {
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
                  paddingBottom: 5,
                }}
              />
            </View>
            {/* Login form */}
            <LoginComponents />
          </ScrollView>
        </ImageBackground>
      </KeyboardAvoidingView>
    </View>
  );
};

export default Login;
