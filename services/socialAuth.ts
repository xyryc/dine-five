import { Platform } from "react-native";

type GoogleModule = typeof import("@react-native-google-signin/google-signin");

let googleModulePromise: Promise<GoogleModule> | null = null;
let isConfigured = false;

const getGoogleModule = async () => {
    if (Platform.OS === "web") {
        throw new Error("Google Sign-In is not available on web. Use a native build.");
    }

    try {
        if (!googleModulePromise) {
            googleModulePromise = import("@react-native-google-signin/google-signin");
        }
        return await googleModulePromise;
    } catch (error: any) {
        if (String(error?.message || error).includes("RNGoogleSignin")) {
            throw new Error(
                "Google Sign-In native module not found. Run a dev build (e.g. `npx expo run:android`) and reopen the app."
            );
        }
        throw error;
    }
};

const ensureConfigured = async () => {
    const mod = await getGoogleModule();
    if (!isConfigured) {
        mod.GoogleSignin.configure({
            webClientId:
                "59195371153-artd13lbk3gff9nigp1gq2mp3j94qq14.apps.googleusercontent.com",
            offlineAccess: true,
        });
        isConfigured = true;
    }
    return mod;
};

export const signInWithGoogle = async () => {
    const { GoogleSignin, statusCodes } = await ensureConfigured();
    try {
        await GoogleSignin.hasPlayServices();
        const userInfo = await GoogleSignin.signIn();
        // userInfo.idToken is what we need for the backend
        return userInfo;
    } catch (error: any) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) {
            console.log("User cancelled the login flow");
        } else if (error.code === statusCodes.IN_PROGRESS) {
            console.log("Signing in progress");
        } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
            console.log("Play services not available or outdated");
        } else {
            console.error("Google login error:", error);
        }
        throw error;
    }
};

export const signOutCurrentUser = async () => {
    try {
        const { GoogleSignin } = await ensureConfigured();
        await GoogleSignin.signOut();
    } catch (error) {
        console.error("Google sign out error:", error);
        throw error;
    }
};

// Mock versions of other services mentioned in user's original code
export const signInWithFacebook = async () => { throw new Error("Facebook login not implemented"); };
export const signInWithTwitter = async () => { throw new Error("Twitter login not implemented"); };
export const observeAuthState = (callback: (user: any) => void) => {
    // This is usually handled by Firebase, but since we are just doing Google Sign In + Backend, 
    // we might not need a persistent listener here if the store handles it.
    return () => { };
};
