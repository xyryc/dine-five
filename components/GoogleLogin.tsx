import { signInWithGoogle } from "@/services/socialAuth";
import { useStore } from "@/stores/stores";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function GoogleLogin() {
  const [isBusy, setIsBusy] = useState(false);
  const { googleLogin } = useStore() as any;

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
      {/* Fancy Background Elements from user's code */}
      <View style={styles.backgroundCircleOne} />
      <View style={styles.backgroundCircleTwo} />

      <View style={styles.buttonStack}>
        <Pressable
          onPress={handleGoogleSignIn}
          disabled={isBusy}
          style={({ pressed }) => [
            styles.providerButton,
            styles.googleButtonBorder,
            pressed && styles.pressed,
            isBusy && styles.disabledButton,
          ]}
        >
          <View style={styles.buttonContent}>
            {isBusy ? (
              <ActivityIndicator color="#1F1F1F" />
            ) : (
              <Ionicons name="logo-google" size={24} color="#DB4437" />
            )}
            <Text style={styles.providerButtonText}>
              {isBusy ? "Processing..." : "Continue with Google"}
            </Text>
          </View>
        </Pressable>
      </View>


    </View>
  );
}

const typeFace = Platform.select({
  ios: "Georgia",
  android: "serif",
  default: "serif",
});

const styles = StyleSheet.create({
  outerContainer: {
    width: '100%',
    marginTop: 20,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 24,
    padding: 10, // for border effect
  },
  buttonStack: {
    width: '100%',
  },
  providerButton: {
    borderRadius: 16,
    minHeight: 64,
    justifyContent: "center",
    paddingHorizontal: 46,
    paddingVertical: 18,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  googleButtonBorder: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    columnGap: 36,
  },
  providerButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  footnote: {
    marginTop: 12,
    color: "#6B7280",
    fontSize: 11,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  disabledButton: {
    opacity: 0.6,
  },
  // Background circles adapted from user design
  backgroundCircleOne: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F4A261",
    top: -30,
    right: -20,
    opacity: 0.1,
  },
  backgroundCircleTwo: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#2A9D8F",
    bottom: -40,
    left: -30,
    opacity: 0.1,
  },
});
