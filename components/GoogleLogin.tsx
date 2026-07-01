import { signInWithGoogle } from "@/services/socialAuth";
import { useStore } from "@/stores/stores";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

export default function GoogleLogin() {
  const [isBusy, setIsBusy] = useState(false);
  const { googleLogin } = useStore() as any;
  const { height, width } = useWindowDimensions();

  // Calculate dynamic dimensions consistent with standard GradientButton
  const buttonHeight = Math.min(Math.max(height * 0.055, 42), 56);
  const fontSize = Math.min(Math.max(width * 0.042, 15), 18);

  async function handleGoogleSignIn() {
    if (isBusy) return;
    setIsBusy(true);
    try {
      const result = await signInWithGoogle();
      console.log("Full Google Sign-In Result:", JSON.stringify(result, null, 2));
      const idToken = (result as any).data?.idToken || (result as any).idToken;

      if (!idToken) {
        throw new Error("No ID token received from Google. Make sure you've configured the Google Cloud Console correctly.");
      }

      console.log("--- START GOOGLE ID TOKEN ---");
      console.log(idToken);
      console.log("--- END GOOGLE ID TOKEN ---");

      // Call our backend via the store
      const loginResult = await googleLogin({ idToken });

      if (loginResult) {
        Alert.alert("Success", "Signed in successfully!");
        router.replace("/(tabs)");
      }
    } catch (error: any) {
      console.log("Google Login Error:", error);
      Alert.alert("Login Failed", error.message || "Something went wrong.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <View style={styles.outerContainer}>
      <Pressable
      className="border border-gray-300 py-2.5 px-2 rounded-full"
        onPress={handleGoogleSignIn}
        disabled={isBusy}
        style={({ pressed }) => [
          styles.providerButton,
          { height: buttonHeight },
          pressed && styles.pressed,
          isBusy && styles.disabledButton,
        ]}
      >
        <View style={styles.buttonContent}>
          {isBusy ? (
            <ActivityIndicator color="#374151" />
          ) : (
            <Image
              source={require("@/assets/images/google.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          )}
          <Text style={[styles.providerButtonText, { fontSize }]}>
            {isBusy ? "Processing..." : "Continue with Google"}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    width: "100%",
    marginTop: 14,
  },
  providerButton: {
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    // Soft, premium shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    columnGap: 12,
  },
  logo: {
    width: 24,
    height: 24,
  },
  providerButtonText: {
    fontWeight: "600",
    color: "#374151",
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  disabledButton: {
    opacity: 0.6,
  },
});

