import { API_BASE_URL, fetchWithLogging } from "@/utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
const uriToBlob = (uri: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = function () {
      resolve(xhr.response);
    };
    xhr.onerror = function () {
      reject(new Error("Failed to convert URI to Blob"));
    };
    xhr.responseType = "blob";
    xhr.open("GET", uri, true);
    xhr.send(null);
  });
};
const STORAGE_KEYS = {
  USER: "auth_user",
  ACCESS_TOKEN: "auth_access_token",
  REFRESH_TOKEN: "auth_refresh_token",
};

const translateApiMessage = (code: string) => {
  const messages: { [key: string]: string } = {
    VALIDATION_ERROR: "Please check your input and try again.",
    INVALID_CREDENTIALS: "Invalid email or password.",
    USER_NOT_FOUND: "No account found with this email.",
    INTERNAL_SERVER_ERROR: "Something went wrong on our end.",
    UNKNOWN_ERROR: "An unexpected error occurred. Please try again.",
  };
  return messages[code] || messages.UNKNOWN_ERROR;
};

const isObject = (value: unknown): value is Record<string, any> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeUserPayload = (user: any): Record<string, any> | null => {
  if (!isObject(user)) return null;

  const normalized = { ...user };

  // Standardize email
  if (normalized.Email && !normalized.email) {
    normalized.email = normalized.Email;
  }
  // Standardize phone
  if (normalized.PhoneNumber && !normalized.phone) {
    normalized.phone = normalized.PhoneNumber;
  }
  if (normalized.phone && !normalized.phoneNumber) {
    normalized.phoneNumber = normalized.phone;
  }
  // Standardize bio / boi
  if (normalized.Boi && !normalized.bio) {
    normalized.bio = normalized.Boi;
  }
  if (normalized.bio && !normalized.Boi) {
    normalized.Boi = normalized.bio;
  }

  return normalized;
};

const extractUserPayload = (result: any): Record<string, any> | null => {
  if (!isObject(result)) return null;

  if (isObject(result.data?.user))
    return normalizeUserPayload(result.data.user);
  if (isObject(result.user)) return normalizeUserPayload(result.user);

  if (
    isObject(result.data) &&
    (result.data.email ||
      result.data.Email ||
      result.data.name ||
      result.data.fullName ||
      result.data.photo ||
      result.data.avatar ||
      result.data.profilePic ||
      result.data.image)
  ) {
    return normalizeUserPayload(result.data);
  }

  return null;
};

let refreshSessionPromise: Promise<any> | null = null;

const headersToRecord = (headers?: HeadersInit): Record<string, string> => {
  if (!headers) return {};
  if (headers instanceof Headers) {
    const record: Record<string, string> = {};
    headers.forEach((value, key) => {
      record[key] = value;
    });
    return record;
  }
  if (Array.isArray(headers)) {
    return headers.reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
  }
  return { ...(headers as Record<string, string>) };
};

export const useStore = create((rawSet, get) => {
  const set = (partial: any, replace?: boolean) => {
    const nextPartial =
      typeof partial === "function"
        ? (state: any) => {
            const res = partial(state);
            if (res && typeof res === "object" && "user" in res && res.user) {
              res.user = normalizeUserPayload(res.user);
            }
            return res;
          }
        : partial;

    if (
      nextPartial &&
      typeof nextPartial === "object" &&
      "user" in nextPartial &&
      nextPartial.user
    ) {
      nextPartial.user = normalizeUserPayload(nextPartial.user);
    }
    rawSet(nextPartial, replace as any);
  };

  return {
    user: null,
    accessToken: null,
    refreshToken: null,
    isLoading: false,
    error: null,
    isInitialized: false,
    resetToken: null as string | null,
    favorites: [] as string[],

    // // this is for user profile
    // userProfile: async () => {
    //   const response = await fetchWithLogging(
    //     `${API_BASE_URL}/profile/me`,
    //     {
    //       method: "GET",
    //       headers: {
    //         "Content-Type": "application/json",
    //         Authorization: `Bearer ${get().accessToken}`,
    //       },
    //     },
    //   );

    //   const result = await response.json();
    //   console.log("userProfile result:", JSON.stringify(result, null, 2));

    //   if (!response.ok) {
    //     throw new Error(result.message || "Failed to fetch user profile");
    //   }

    //   return result.data;
    // },

    // Add this function to persist auth data to AsyncStorage
    persistAuthData: async (user: any, accessToken: any, refreshToken: any) => {
      try {
        const promises = [
          AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user)),
        ];

        if (accessToken) {
          promises.push(
            AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken),
          );
        }

        if (refreshToken) {
          promises.push(
            AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
          );
        }

        await Promise.all(promises);
      } catch (error) {
        console.log("Failed to persist auth data:", error);
        throw error;
      }
    },

    // Add this function to initialize auth state from storage on app start
    initializeAuth: async () => {
      try {
        const [user, accessToken, refreshToken] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.USER),
          AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
          AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
        ]);

        //   console.log("from storage", user, accessToken, refreshToken);

        if (user) {
          const parsedUser = JSON.parse(user);
          set({
            user: parsedUser,
            accessToken: accessToken || null,
            refreshToken: refreshToken || null,
            isInitialized: true,
          });
          return { user: parsedUser, accessToken };
        } else {
          set({ isInitialized: true });
          return { user: null, accessToken: null };
        }
      } catch (error) {
        console.log("Failed to initialize auth:", error);
        set({ isInitialized: true });
        return { user: null, accessToken: null };
      }
    },

    signup: async (data: any) => {
      set({ isLoading: true, error: null });

      try {
        const response = await fetchWithLogging(
          `${API_BASE_URL}/api/v1/auth/signup`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          },
        );

        // console.log("Response status:", response.status);
        const result = await response.json();
        console.log("Signup result:", JSON.stringify(result, null, 2));

        if (!response.ok) {
          throw new Error(result.message || "Signup failed");
        }

        const userData = result.data?.user || result.user;
        const sessionData = result.data?.session || result.session;

        if (userData) {
          await (get() as any).persistAuthData(
            userData,
            sessionData?.accessToken,
            sessionData?.refreshToken,
          );

          set({
            user: userData,
            accessToken: sessionData?.accessToken,
            refreshToken: sessionData?.refreshToken,
            isLoading: false,
          });

          // Sync location coordinates to profile if available
          (get() as any).syncCurrentLocation().catch(() => {});

          return result.data || result;
        }

        set({ isLoading: false });
        return result.data || result;
      } catch (error: any) {
        console.log("signup error", error);
        set({ error: error.message, isLoading: false });
        return null;
      }
    },

    refreshSession: async () => {
      if (refreshSessionPromise) {
        return refreshSessionPromise;
      }

      refreshSessionPromise = (async () => {
        const { refreshToken, user } = get() as any;

        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        const response = await fetchWithLogging(
          `${API_BASE_URL}/api/v1/auth/refresh`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
          },
        );

        const result = await response.json();
        console.log("refreshSession result:", JSON.stringify(result, null, 2));

        if (!response.ok) {
          throw new Error(
            result.message || "Session expired. Please login again.",
          );
        }

        const session = result.data?.session || result.session || result.data;
        const nextAccessToken =
          session?.accessToken ||
          result.accessToken ||
          result.data?.accessToken;
        const nextRefreshToken =
          session?.refreshToken ||
          result.refreshToken ||
          result.data?.refreshToken ||
          refreshToken;
        const nextUser = result.data?.user || result.user || user;

        if (!nextAccessToken || !nextRefreshToken) {
          throw new Error("Invalid refresh response");
        }

        const normalizedUser = nextUser ? { ...nextUser } : user;

        if (normalizedUser) {
          await (get() as any).persistAuthData(
            normalizedUser,
            nextAccessToken,
            nextRefreshToken,
          );
        }

        set({
          user: normalizedUser,
          accessToken: nextAccessToken,
          refreshToken: nextRefreshToken,
        });

        return {
          user: normalizedUser,
          accessToken: nextAccessToken,
          refreshToken: nextRefreshToken,
        };
      })().catch(async (error) => {
        console.log("refreshSession error", error);
        await (get() as any).logout();
        throw error;
      });

      try {
        return await refreshSessionPromise;
      } finally {
        refreshSessionPromise = null;
      }
    },

    requestWithAuth: async (url: string, options: RequestInit = {}) => {
      const buildOptions = (token?: string | null): RequestInit => ({
        ...options,
        headers: {
          ...headersToRecord(options.headers),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      let { accessToken, refreshToken } = get() as any;

      if (!accessToken && refreshToken) {
        const refreshed = await (get() as any).refreshSession();
        accessToken = refreshed?.accessToken || (get() as any).accessToken;
      }

      let response = await fetchWithLogging(url, buildOptions(accessToken));

      if (response.status !== 401) {
        return response;
      }

      if (!refreshToken) {
        return response;
      }

      const refreshed = await (get() as any).refreshSession();
      if (!refreshed?.accessToken) {
        return response;
      }

      response = await fetchWithLogging(
        url,
        buildOptions(refreshed.accessToken),
      );
      return response;
    },

    login: async (data: any) => {
      set({ isLoading: true, error: null });

      try {
        const response = await fetchWithLogging(
          `${API_BASE_URL}/api/v1/auth/login`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          },
        );

        const result = await response.json();

        if (!response.ok) {
          const errorCode =
            result.error?.code || result.errorCode || "UNKNOWN_ERROR";
          let message = result.message || translateApiMessage(errorCode);

          // Specific handling for email verification error if needed by message
          if (message.includes("verify your email")) {
            // You could set a specific error code here if you want the UI to react
            set({ error: "EMAIL_NOT_VERIFIED", isLoading: false });
            throw new Error(message);
          }

          throw new Error(message);
        }

        // Extract user and session data based on the provided JSON structure
        const user = result.data?.user || result.user || result.data;
        const session = result.data?.session || result.session;

        const accessToken =
          session?.accessToken ||
          result.accessToken ||
          result.data?.accessToken;
        const refreshToken =
          session?.refreshToken ||
          result.refreshToken ||
          result.data?.refreshToken;

        if (user) {
          // If we already have a user, merge them to avoid losing fields like email/role
          const currentUser = (get() as any).user;
          const mergedUser = currentUser ? { ...currentUser, ...user } : user;

          await (get() as any).persistAuthData(
            mergedUser,
            accessToken,
            refreshToken,
          );

          set({
            user: mergedUser,
            accessToken: accessToken,
            refreshToken: refreshToken,
            isLoading: false,
          });

          // Sync location coordinates to profile if available
          (get() as any).syncCurrentLocation().catch(() => {});

          return result.data || result;
        } else {
          throw new Error("Invalid response format: User data is missing");
        }
      } catch (error: any) {
        console.log("login error", error);
        const isNetworkError =
          error?.name === "TypeError" &&
          typeof error?.message === "string" &&
          error.message.includes("Network request failed");

        if (isNetworkError) {
          const connectivityError = new Error(
            `Cannot reach backend at ${API_BASE_URL}. Check server status and phone/emulator network.`,
          );
          set({ error: connectivityError.message, isLoading: false });
          throw connectivityError;
        }

        // Ensure we don't overwrite "EMAIL_NOT_VERIFIED" if it was set above
        if ((get() as any).error !== "EMAIL_NOT_VERIFIED") {
          set({ error: error.message, isLoading: false });
        } else {
          set({ isLoading: false });
        }
        throw error;
      }
    },

    googleLogin: async (data: { idToken: string; requestedRole?: string }) => {
      set({ isLoading: true, error: null });

      try {
        const response = await fetchWithLogging(
          `${API_BASE_URL}/api/auth/google`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              idToken: data.idToken,
              requestedRole: data.requestedRole || "CUSTOMER",
            }),
          },
        );

        const result = await response.json();
        console.log("Google login result:", JSON.stringify(result, null, 2));

        if (!response.ok) {
          throw new Error(result.message || "Google login failed");
        }

        // Extract user and session data based on the provided JSON structure
        const user = result.data?.user || result.user || result.data;
        const session = result.data?.session || result.session;

        const accessToken =
          session?.accessToken ||
          result.accessToken ||
          result.data?.accessToken;
        const refreshToken =
          session?.refreshToken ||
          result.refreshToken ||
          result.data?.refreshToken;

        if (user && accessToken) {
          await (get() as any).persistAuthData(user, accessToken, refreshToken);

          set({
            user: user,
            accessToken: accessToken,
            refreshToken: refreshToken,
            isLoading: false,
          });

          // Sync location coordinates to profile if available
          (get() as any).syncCurrentLocation().catch(() => {});

          return result.data || result;
        } else {
          throw new Error("Invalid response format: User or token is missing");
        }
      } catch (error: any) {
        console.log("googleLogin error", error);
        set({ error: error.message, isLoading: false });
        throw error;
      }
    },

    verifyOTP: async (data: { email: string; code: string }) => {
      set({ isLoading: true, error: null });

      try {
        const currentUser = (get() as any).user;
        const currentAccessToken = (get() as any).accessToken;
        const currentRefreshToken = (get() as any).refreshToken;

        const response = await fetchWithLogging(
          `${API_BASE_URL}/api/v1/auth/verify-email`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: data.email,
              otp: data.code,
            }),
          },
        );

        const result = await response.json();
        console.log("verifyOTP full result:", JSON.stringify(result, null, 2));

        if (!response.ok) {
          throw new Error(result.message || "Verification failed");
        }

        // Check for user/token in different possible locations
        const userData =
          result.data?.user || result.user || result.data || null;
        const accessToken =
          result.data?.session?.accessToken ||
          result.session?.accessToken ||
          result.accessToken ||
          result.data?.accessToken ||
          result.token;
        const refreshToken =
          result.data?.session?.refreshToken ||
          result.session?.refreshToken ||
          result.refreshToken ||
          result.data?.refreshToken;

        const verifiedUser =
          userData ||
          (currentUser ? { ...currentUser, isVerified: true } : null);
        const verifiedAccessToken = accessToken || currentAccessToken;
        const verifiedRefreshToken =
          refreshToken || currentRefreshToken || null;

        if (verifiedUser && verifiedAccessToken) {
          const normalizedUser = { ...verifiedUser, isVerified: true };
          await (get() as any).persistAuthData(
            normalizedUser,
            verifiedAccessToken,
            verifiedRefreshToken,
          );

          set({
            user: normalizedUser,
            accessToken: verifiedAccessToken,
            refreshToken: verifiedRefreshToken,
            isLoading: false,
          });

          // Sync location coordinates to profile if available
          (get() as any).syncCurrentLocation().catch(() => {});
        } else {
          set({ isLoading: false });
        }

        return result;
      } catch (error: any) {
        console.log("verifyOTP error", error);
        set({ error: error.message, isLoading: false });
        return null;
      }
    },

    // 1️⃣ Verify forgot password OTP
    verifyForgotOTP: async (data: { email: string; code: string }) => {
      set({ isLoading: true, error: null });

      try {
        const response = await fetchWithLogging(
          `${API_BASE_URL}/api/v1/auth/verify-forgot-otp`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: data.email,
              otp: data.code,
            }),
          },
        );

        const result = await response.json();
        console.log(
          "verifyForgotOTP full result:",
          JSON.stringify(result, null, 2),
        );

        if (!response.ok) {
          throw new Error(result.message || "Verification failed");
        }

        // Save token as resetToken
        const resetToken = result.data?.accessToken || result.accessToken;
        if (!resetToken)
          throw new Error("Reset token not received from server");

        set({ resetToken, isLoading: false });

        return result;
      } catch (error: any) {
        console.log("verifyForgotOTP error", error);
        set({ error: error.message, isLoading: false });
        return null;
      }
    },

    // 2️⃣ Request forgot password
    forgotPassword: async (email: string) => {
      set({ isLoading: true, error: null });

      try {
        const response = await fetchWithLogging(
          `${API_BASE_URL}/api/v1/auth/forgot-password`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          },
        );

        const result = await response.json();
        console.log(
          "forgotPassword full result:",
          JSON.stringify(result, null, 2),
        );

        if (!response.ok) {
          throw new Error(result.message || "Forgot password request failed");
        }

        set({ isLoading: false });
        return result;
      } catch (error: any) {
        console.log("forgotPassword error", error);
        set({ error: error.message, isLoading: false });
        return null;
      }
    },

    // 3️⃣ Reset password
    resetPassword: async (data: {
      newPassword: string;
      confirmPassword: string;
    }) => {
      set({ isLoading: true, error: null });
      // console.log(data.newPassword + data.confirmPassword);

      try {
        const { resetToken } = get() as any;

        if (!resetToken) {
          throw new Error("Reset token missing. Please verify OTP first.");
        }

        if (!data.newPassword || !data.confirmPassword) {
          throw new Error(
            "Please provide both newPassword and confirmPassword",
          );
        }

        const response = await fetchWithLogging(
          `${API_BASE_URL}/api/v1/auth/reset-password`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resetToken}`,
            },
            body: JSON.stringify({
              newPassword: data.newPassword,
              confirmPassword: data.confirmPassword,
            }),
          },
        );

        const result = await response.json();
        console.log(
          "resetPassword full result:",
          JSON.stringify(result, null, 2),
        );

        if (!response.ok) {
          throw new Error(result.message || "Reset password failed");
        }

        // Clear resetToken after success
        set({ isLoading: false, resetToken: null });

        return result;
      } catch (error: any) {
        console.log("resetPassword error", error);
        set({ error: error.message, isLoading: false });
        return null;
      }
    },

    updateProfile: async (data: any) => {
      set({ isLoading: true, error: null });

      try {
        // Check if data is FormData or regular object
        const isFormData = data instanceof FormData;

        const response = await (get() as any).requestWithAuth(
          `${API_BASE_URL}/api/v1/profile/me`,
          {
            method: "PATCH",
            headers: {
              ...(isFormData ? {} : { "Content-Type": "application/json" }),
            },
            body: isFormData ? data : JSON.stringify(data),
          },
        );

        const result = await response.json();
        console.log("updateProfile result:", JSON.stringify(result, null, 2));

        if (!response.ok) {
          throw new Error(result.message || "Profile update failed");
        }

        // Extract updated user payload (supports { data: { user } } and flat shapes)
        const updatedData = extractUserPayload(result);

        if (updatedData) {
          const currentUser = (get() as any).user;
          const {
            accessToken: currentAccessToken,
            refreshToken: currentRefreshToken,
          } = get() as any;

          const mergedUser = { ...currentUser, ...updatedData };

          // Persist updated user
          await (get() as any).persistAuthData(
            mergedUser,
            currentAccessToken,
            currentRefreshToken,
          );

          set({
            user: mergedUser,
            isLoading: false,
          });
        } else {
          set({ isLoading: false });
        }

        return result;
      } catch (error: any) {
        console.log("updateProfile error", error);
        set({ error: error.message, isLoading: false });
        return null;
      }
    },

    syncCurrentLocation: async () => {
      try {
        const { useRestaurantStore } = await import("./useRestaurantStore");
        const loc = useRestaurantStore.getState().location;
        if (loc) {
          console.log("📍 [syncCurrentLocation] Syncing coordinates to user profile:", loc);
          await (get() as any).updateProfile({ lat: loc.latitude, lng: loc.longitude });
        }
      } catch (e) {
        console.log("Failed to sync current location:", e);
      }
    },

    fetchProfile: async () => {
      set({ isLoading: true, error: null });

      try {
        const response = await (get() as any).requestWithAuth(
          `${API_BASE_URL}/api/v1/profile/me`,
          {
            method: "GET",
            headers: {},
          },
        );

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || "Failed to fetch profile");
        }

        const latestUser = extractUserPayload(result);
        if (latestUser) {
          const currentUser = (get() as any).user;
          const mergedUser = { ...currentUser, ...latestUser };
          const {
            accessToken: currentAccessToken,
            refreshToken: currentRefreshToken,
          } = get() as any;

          await (get() as any).persistAuthData(
            mergedUser,
            currentAccessToken,
            currentRefreshToken,
          );

          set({
            user: mergedUser,
            isLoading: false,
          });
          return mergedUser;
        }

        set({ isLoading: false });
        return null;
      } catch (error: any) {
        console.log("fetchProfile error", error);
        set({ error: error.message, isLoading: false });
        return null;
      }
    },

    fetchNotifications: async () => {
      set({ isLoading: true, error: null });

      try {
        const { accessToken } = get() as any;
        if (!accessToken && !(get() as any).refreshToken)
          throw new Error("No access token found");

        const response = await (get() as any).requestWithAuth(
          `${API_BASE_URL}/api/v1/notifications`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || "Failed to fetch notifications");
        }

        set({ isLoading: false });
        return result.data;
      } catch (error: any) {
        console.log("fetchNotifications error", error);
        set({ error: error.message, isLoading: false });
        return null;
      }
    },

    deleteAccount: async () => {
      set({ isLoading: true, error: null });

      try {
        const { accessToken } = get() as any;
        if (!accessToken && !(get() as any).refreshToken)
          throw new Error("No access token found");

        const response = await (get() as any).requestWithAuth(
          `${API_BASE_URL}/api/v1/profile/me`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || "Failed to deactivate account");
        }

        // Logout automatically after account deletion
        await (get() as any).logout();

        set({ isLoading: false });
        return result;
      } catch (error: any) {
        console.log("deleteAccount error", error);
        set({ error: error.message, isLoading: false });
        return null;
      }
    },

    fetchFeed: async () => {
      set({ isLoading: true, error: null });

      try {
        const response = await (get() as any).requestWithAuth(
          `${API_BASE_URL}/api/v1/feed`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || "Failed to fetch feed");
        }

        set({ isLoading: false });
        return result.data;
      } catch (error: any) {
        console.log("fetchFeed error", error);
        set({ error: error.message, isLoading: false });
        return null;
      }
    },

    fetchHomeFeed: async (
      params: {
        page?: number;
        limit?: number;
        categoryName?: string;
        providerId?: string;
      } = {},
    ) => {
      set({ isLoading: true, error: null });

      try {
        const { accessToken } = get() as any;
        const query = new URLSearchParams();

        if (params.page) query.append("page", String(params.page));
        if (params.limit) query.append("limit", String(params.limit));
        if (params.categoryName) {
          query.append("categoryName", params.categoryName);
          query.append("category", params.categoryName);
        }
        if (params.providerId) {
          query.append("providerId", params.providerId);
          query.append("restaurantId", params.providerId);
        }

        const queryString = query.toString() ? `?${query.toString()}` : "";
        const headers = {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        };

        const endpoints = [
          `${API_BASE_URL}/api/v1/feed/home${queryString}`,
          `${API_BASE_URL}/api/v1/feed${queryString}`,
        ];

        let lastError: Error | null = null;

        for (const endpoint of endpoints) {
          try {
            const response = await (get() as any).requestWithAuth(endpoint, {
              method: "GET",
              headers,
            });

            const result = await response.json();
            if (!response.ok) {
              lastError = new Error(result.message || `Failed at ${endpoint}`);
              continue;
            }

            set({ isLoading: false });
            return result.data ?? result;
          } catch (error: any) {
            lastError = error;
          }
        }

        throw lastError || new Error("Failed to fetch home feed");
      } catch (error: any) {
        console.log("fetchHomeFeed error", error);
        set({ error: error.message, isLoading: false });
        return null;
      }
    },

    fetchCategories: async () => {
      set({ isLoading: true, error: null });
      try {
        const { accessToken } = get() as any;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (accessToken) {
          headers["Authorization"] = `Bearer ${accessToken}`;
        }

        const response = await fetchWithLogging(
          `${API_BASE_URL}/api/v1/categories`,
          {
            method: "GET",
            headers,
          },
        );

        const result = await response.json();
        set({ isLoading: false });

        if (result.success && Array.isArray(result.data)) {
          return result.data;
        }
        return Array.isArray(result) ? result : [];
      } catch (error: any) {
        console.log("fetchCategories error", error);
        set({ error: error.message, isLoading: false });
        return [];
      }
    },

    fetchCurrentOrders: async () => {
      set({ isLoading: true, error: null });

      try {
        const { accessToken } = get() as any;
        if (!accessToken && !(get() as any).refreshToken)
          throw new Error("No access token found");

        const response = await (get() as any).requestWithAuth(
          `${API_BASE_URL}/api/v1/customer/orders/current`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        const result = await response.json();
        console.log(
          "fetchCurrentOrders result:",
          JSON.stringify(result, null, 2),
        );

        if (!response.ok) {
          throw new Error(result.message || "Failed to fetch current orders");
        }

        set({ isLoading: false });
        return result.data;
      } catch (error: any) {
        console.log("fetchCurrentOrders error", error);
        set({ error: error.message, isLoading: false });
        return null;
      }
    },

    fetchPreviousOrders: async (page = 1, limit = 10) => {
      set({ isLoading: true, error: null });

      try {
        const { accessToken } = get() as any;
        if (!accessToken && !(get() as any).refreshToken)
          throw new Error("No access token found");

        const response = await (get() as any).requestWithAuth(
          `${API_BASE_URL}/api/v1/customer/orders/previous?page=${page}&limit=${limit}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        const result = await response.json();
        console.log(
          "fetchPreviousOrders result:",
          JSON.stringify(result, null, 2),
        );

        if (!response.ok) {
          throw new Error(result.message || "Failed to fetch previous orders");
        }

        set({ isLoading: false });
        return result;
      } catch (error: any) {
        console.log("fetchPreviousOrders error", error);
        set({ error: error.message, isLoading: false });
        return null;
      }
    },

    fetchFavorites: async (page = 1, limit = 10) => {
      set({ isLoading: true, error: null });

      try {
        const { accessToken } = get() as any;
        if (!accessToken && !(get() as any).refreshToken)
          throw new Error("No access token found");

        const response = await (get() as any).requestWithAuth(
          `${API_BASE_URL}/api/v1/favorites/feed?page=${page}&limit=${limit}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        const result = await response.json();
        console.log("fetchFavorites result:", JSON.stringify(result, null, 2));

        if (!response.ok) {
          throw new Error(result.message || "Failed to fetch favorites");
        }

        set({ isLoading: false });
        if (result.data && result.data.favorites) {
          const mappedFavoriteIds = result.data.favorites
            .map((f: any) =>
              String(
                f?.food?.foodId ?? f?.food?._id ?? f?.food?.id ?? "",
              ).trim(),
            )
            .filter(Boolean);
          set({
            favorites: Array.from(new Set(mappedFavoriteIds)),
          });
        }
        return result.data;
      } catch (error: any) {
        console.log("fetchFavorites error", error);
        set({ error: error.message, isLoading: false });
        return null;
      }
    },

    addFavorite: async (foodId: string) => {
      set({ isLoading: true, error: null });

      try {
        const { accessToken } = get() as any;
        if (!accessToken && !(get() as any).refreshToken)
          throw new Error("No access token found");

        console.log("Adding favorite for foodId:", foodId);
        const response = await (get() as any).requestWithAuth(
          `${API_BASE_URL}/api/v1/favorites`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ foodId }),
          },
        );

        const result = await response.json();
        console.log("addFavorite result:", result);
        if (!response.ok) {
          console.log("addFavorite error details:", result);
          const errorCode =
            result?.errorCode ||
            result?.error?.errorCode ||
            result?.error?.code;
          if (errorCode !== "ALREADY_FAVORITED") {
            throw new Error(result.message || "Failed to add favorite");
          }
        }

        const { favorites } = get() as any;
        set({
          favorites: Array.from(new Set([...favorites, String(foodId).trim()])),
          isLoading: false,
        });
        return result;
      } catch (error: any) {
        console.log("addFavorite error", error);
        set({ error: error.message, isLoading: false });
        return null;
      }
    },

    removeFavorite: async (foodId: string) => {
      set({ isLoading: true, error: null });

      try {
        const { accessToken } = get() as any;
        if (!accessToken && !(get() as any).refreshToken)
          throw new Error("No access token found");

        const response = await (get() as any).requestWithAuth(
          `${API_BASE_URL}/api/v1/favorites/${foodId}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        const result = await response.json();
        console.log("removeFavorite result:", JSON.stringify(result, null, 2));

        if (!response.ok) {
          const errorCode =
            result?.errorCode ||
            result?.error?.errorCode ||
            result?.error?.code;
          if (errorCode !== "FAVORITE_NOT_FOUND") {
            throw new Error(result.message || "Failed to remove favorite");
          }
        }

        const { favorites } = get() as any;
        const favoritesList = Array.isArray(favorites) ? favorites : [];
        set({
          favorites: favoritesList.filter(
            (id: string) => String(id).trim() !== String(foodId).trim(),
          ),
          isLoading: false,
        });
        return result;
      } catch (error: any) {
        console.log("removeFavorite error", error);
        set({ error: error.message, isLoading: false });
        return null;
      }
    },
    // fetchCatagori: async (page = 1, limit = 10) => {
    //   set({ isLoading: true, error: null });

    //   try {
    //     const { accessToken } = get() as any;
    //     if (!accessToken && !(get() as any).refreshToken) throw new Error("No access token found");

    //     const response = await fetchWithLogging(
    //       `${API_BASE_URL}/categories`,
    //       {
    //         method: "GET",
    //         headers: {
    //           "Content-Type": "application/json",
    //           Authorization: `Bearer ${accessToken}`,
    //         },
    //       },
    //     );

    //     const result = await response.json();
    //     console.log(
    //       "fetchPreviousOrders result:",
    //       JSON.stringify(result, null, 2),
    //     );

    //     if (!response.ok) {
    //       throw new Error(result.message || "Failed to fetch previous orders");
    //     }

    //     set({ isLoading: false });
    //     return result;
    //   } catch (error: any) {
    //     console.log("fetchPreviousOrders error", error);
    //     set({ error: error.message, isLoading: false });
    //     return null;
    //   }
    // },

    fetchOrderById: async (orderId: string) => {
      set({ isLoading: true, error: null });

      try {
        const { accessToken } = get() as any;
        if (!accessToken && !(get() as any).refreshToken)
          throw new Error("No access token found");

        const response = await (get() as any).requestWithAuth(
          `${API_BASE_URL}/api/v1/orders/${orderId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        const result = await response.json();
        console.log("fetchOrderById result:", JSON.stringify(result, null, 2));

        if (!response.ok) {
          throw new Error(result.message || "Failed to fetch order details");
        }

        set({ isLoading: false });
        return result.data || result;
      } catch (error: any) {
        console.log("fetchOrderById error", error);
        set({ error: error.message, isLoading: false });
        return null;
      }
    },

    cancelOrder: async (orderId: string, reason?: string) => {
      set({ isLoading: true, error: null });

      try {
        const { accessToken } = get() as any;
        if (!accessToken && !(get() as any).refreshToken)
          throw new Error("No access token found");

        const url = `${API_BASE_URL}/api/v1/orders/${orderId}/cancel`;
        console.log("Cancelling order at URL:", url);
        console.log("Payload:", JSON.stringify({ reason }));

        const response = await fetchWithLogging(url, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ reason, status: "cancelled" }),
        });

        const result = await response.json();
        console.log("Cancel Order Response:", JSON.stringify(result, null, 2));

        if (!response.ok) {
          throw new Error(result.message || "Failed to cancel order");
        }

        set({ isLoading: false });
        return result;
      } catch (error: any) {
        console.log("cancelOrder error", error);
        set({ error: error.message, isLoading: false });
        return null;
      }
    },

    fetchConversations: async (limit = 20) => {
      set({ isLoading: true, error: null });
      try {
        const { accessToken } = get() as any;
        if (!accessToken && !(get() as any).refreshToken)
          throw new Error("No access token found");

        const response = await fetchWithLogging(
          `${API_BASE_URL}/api/v1/chat/conversations?limit=${limit}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || "Failed to fetch conversations");
        }

        set({ isLoading: false });
        return result.data;
      } catch (error: any) {
        console.log("fetchConversations error", error);
        set({ error: error.message, isLoading: false });
        return null;
      }
    },

    createConversation: async (providerId: string) => {
      set({ isLoading: true, error: null });
      try {
        const { accessToken } = get() as any;
        if (!accessToken && !(get() as any).refreshToken)
          throw new Error("No access token found");

        const response = await fetchWithLogging(
          `${API_BASE_URL}/api/v1/chat/conversations`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ providerId }),
          },
        );

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || "Failed to create conversation");
        }

        set({ isLoading: false });
        return result.data;
      } catch (error: any) {
        console.log("createConversation error", error);
        set({ error: error.message, isLoading: false });
        throw error;
      }
    },

    fetchMessages: async (conversationId: string, page = 1, limit = 20) => {
      set({ isLoading: true, error: null });
      try {
        const { accessToken } = get() as any;
        if (!accessToken && !(get() as any).refreshToken)
          throw new Error("No access token found");

        const response = await fetchWithLogging(
          `${API_BASE_URL}/api/v1/chat/conversations/${conversationId}/messages?page=${page}&limit=${limit}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || "Failed to fetch messages");
        }

        set({ isLoading: false });
        return result.data;
      } catch (error: any) {
        console.log("fetchMessages error", error);
        set({ error: error.message, isLoading: false });
        return null;
      }
    },

    sendMessage: async (
      conversationId: string,
      message: string,
      attachments: any[] = [],
    ) => {
      set({ isLoading: true, error: null });
      try {
        const { accessToken } = get() as any;
        if (!accessToken && !(get() as any).refreshToken)
          throw new Error("No access token found");

        const isFormData = attachments.length > 0;
        let body: any;

        if (isFormData) {
          body = new FormData();
          body.append("message", message);
          for (let index = 0; index < attachments.length; index++) {
            const file = attachments[index];
            const fileName = file.uri.split("/").pop() || `attachment_${index}.jpg`;
            const blob = await uriToBlob(file.uri);
            body.append("attachments", blob, fileName);
          }
        } else {
          body = JSON.stringify({ message });
        }

        console.log(
          "Sending POST to:",
          `${API_BASE_URL}/api/v1/chat/conversations/${conversationId}/messages`,
        );

        const response = await fetchWithLogging(
          `${API_BASE_URL}/api/v1/chat/conversations/${conversationId}/messages`,
          {
            method: "POST",
            headers: {
              ...(isFormData ? {} : { "Content-Type": "application/json" }),
              Authorization: `Bearer ${accessToken}`,
            },
            body: body,
          },
        );

        const result = await response.json();
        if (!response.ok) {
          console.log("Response error:", result);
          throw new Error(result.message || "Failed to send message");
        }

        set({ isLoading: false });
        return result;
      } catch (error: any) {
        console.log("sendMessage error details:", error);
        set({ error: error.message, isLoading: false });
        throw error;
      }
    },

    sendMessageToProvider: async (
      providerId: string | undefined,
      message: string,
      attachments: any[] = [],
    ) => {
      set({ isLoading: true, error: null });
      try {
        const { accessToken } = get() as any;
        if (!accessToken && !(get() as any).refreshToken)
          throw new Error("No access token found");

        const isFormData = attachments.length > 0;
        let body: any;

        if (isFormData) {
          body = new FormData();
          body.append("text", message);

          for (let index = 0; index < attachments.length; index++) {
            const file = attachments[index];
            const fileName = file.uri.split("/").pop() || `image_${index}.jpg`;
            const blob = await uriToBlob(file.uri);
            body.append("image", blob, fileName);
          }
        } else {
          body = JSON.stringify({ text: message });
        }

        console.log("--- OUTGOING MESSAGE DETAILS ---");
        console.log("Text:", message);
        if (isFormData) {
          console.log("Attachments count:", attachments.length);
          attachments.forEach((a, i) => console.log(`Attachment ${i}:`, a.uri));
        }
        console.log("--------------------------------");

        const response = await fetchWithLogging(
          `${API_BASE_URL}/api/v1/chat/message/customer-to-admin`,
          {
            method: "POST",
            headers: {
              ...(isFormData ? {} : { "Content-Type": "application/json" }),
              Authorization: `Bearer ${accessToken}`,
            },
            body: body,
          },
        );

        const responseText = await response.text();
        console.log("SERVER RESPONSE RAW:", responseText);

        let result;
        try {
          result = JSON.parse(responseText);
        } catch {
          throw new Error(
            `Server returned non-JSON: ${responseText.substring(0, 50)}`,
          );
        }

        if (result.success && result.data?.imageUrl) {
          console.log("SUCCESS! Image uploaded to:", result.data.imageUrl);
        } else if (result.success) {
          console.log("Message sent successfully (No Image URL returned)");
        }

        if (!response.ok) {
          throw new Error(
            result.message ||
              result.error ||
              "Failed to send message to provider",
          );
        }

        set({ isLoading: false });
        return result;
      } catch (error: any) {
        console.log("sendMessageToProvider error details:", error);
        set({ error: error.message, isLoading: false });
        throw error;
      }
    },

    submitReview: async (
      orderId: string,
      foodId: string | null | undefined,
      rating: number,
      comment: string,
    ) => {
      set({ isLoading: true, error: null });
      try {
        const { accessToken } = get() as any;
        if (!accessToken && !(get() as any).refreshToken)
          throw new Error("No access token found");

        const url = `${API_BASE_URL}/api/v1/reviews`;
        const payload: any = { orderId, rating, comment };
        if (foodId) payload.foodId = foodId;

        const response = await fetchWithLogging(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message || result.error || "Failed to submit review",
          );
        }

        set({ isLoading: false });
        return result;
      } catch (error: any) {
        console.log("submitReview error:", error);
        set({ error: error.message, isLoading: false });
        throw error;
      }
    },

    fetchReviewByOrderId: async (identifier: string) => {
      try {
        const { accessToken } = get() as any;
        if (!accessToken && !(get() as any).refreshToken)
          throw new Error("No access token found");

        // Check if identifier is an orderId or a specific reviewId
        // For now, let's support both: filtering by orderId and direct fetch by reviewId
        const url =
          identifier.length > 20
            ? `${API_BASE_URL}/api/v1/reviews/${identifier}`
            : `${API_BASE_URL}/api/v1/reviews?orderId=${identifier}`;

        console.log("Fetching review from:", url);

        const response = await fetchWithLogging(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const responseText = await response.text();
        console.log("Fetch Review Raw:", responseText);

        const result = JSON.parse(responseText);
        if (!response.ok) {
          return null;
        }
        return result;
      } catch (error) {
        console.log("fetchReviewByOrderId error:", error);
        return null;
      }
    },

    updateReview: async (reviewId: string, rating: number, comment: string) => {
      set({ isLoading: true, error: null });
      try {
        const { accessToken } = get() as any;
        if (!accessToken && !(get() as any).refreshToken)
          throw new Error("No access token found");

        const url = `${API_BASE_URL}/api/v1/reviews/${reviewId}`;
        const body = JSON.stringify({ rating, comment });

        console.log("Updating review at:", url);
        console.log("Update Body:", body);

        const response = await fetchWithLogging(url, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: body,
        });

        const responseText = await response.text();
        console.log("Update Review Raw:", responseText);

        const result = JSON.parse(responseText);
        if (!response.ok) {
          throw new Error(result.message || "Failed to update review");
        }

        set({ isLoading: false });
        return result;
      } catch (error: any) {
        console.log("updateReview error:", error);
        set({ error: error.message, isLoading: false });
        throw error;
      }
    },

    fetchBanners: async () => {
      try {
        const { accessToken } = get() as any;

        const headers = {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        };

        const endpoints = [
          `${API_BASE_URL}/api/v1/banners/active`,
          `${API_BASE_URL}/api/v1/banners`,
          `${API_BASE_URL}/api/v1/feed/banners`,
        ];

        let allBanners: any[] = [];
        const seenIds = new Set();

        for (const endpoint of endpoints) {
          try {
            const response = await fetchWithLogging(endpoint, {
              method: "GET",
              headers,
            });

            const result = await response.json();
            if (!response.ok) {
              continue;
            }

            let banners: any[] = [];
            if (Array.isArray(result?.data)) {
              banners = result.data;
            } else if (Array.isArray(result?.banners)) {
              banners = result.banners;
            } else if (Array.isArray(result)) {
              banners = result;
            } else if (result?.data) {
              banners = [result.data];
            } else if (result?.banner) {
              banners = [result.banner];
            }

            // Aggregate and avoid duplicates if possible
            banners.forEach((banner) => {
              const id = banner?._id || banner?.id || JSON.stringify(banner);
              if (!seenIds.has(id)) {
                seenIds.add(id);
                allBanners.push(banner);
              }
            });
          } catch (err) {
            console.log(`Error fetching from ${endpoint}:`, err);
          }
        }

        return allBanners;
      } catch (error: any) {
        console.log("fetchBanners error:", error);
        return [];
      }
    },

    fetchReviewsByFoodId: async (foodId: string) => {
      try {
        const { accessToken } = get() as any;
        if (!accessToken && !(get() as any).refreshToken)
          throw new Error("No access token found");

        const response = await fetchWithLogging(
          `${API_BASE_URL}/api/v1/reviews/food/${foodId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || "Failed to fetch reviews");
        }

        return result;
      } catch (error: any) {
        console.log("fetchReviewsByFoodId error:", error);
        return { data: [], meta: { total: 0 } };
      }
    },

    addToCart: async (item: any, quantity: number) => {
      set({ isLoading: true, error: null });
      try {
        const { accessToken } = get() as any;
        if (!accessToken && !(get() as any).refreshToken)
          throw new Error("No access token found");

        // Construct payload for the API
        // Based on user request: { items: [{ foodId: "...", quantity: 1, price: 15 }] }
        // But usually cart APIs take one item at a time or a list.
        // The user log shows a response structure, implying the request might be simpler:
        // POST /api/v1/cart/add
        // Body: { foodId: "...", quantity: 1 } (typically)

        const resolvedFoodId = [
          item?.foodId,
          item?._id,
          item?.id,
          item?.food?.foodId,
          item?.food?._id,
          item?.food?.id,
          item?.menuItemId,
          item?.itemId,
        ]
          .map((value) =>
            typeof value === "string"
              ? value.trim()
              : String(value || "").trim(),
          )
          .find((value) => !!value);

        if (!resolvedFoodId) {
          throw new Error("Food ID is missing for cart item");
        }

        const safeQuantity = Math.max(1, Math.floor(Number(quantity) || 1));

        const payload = {
          foodId: resolvedFoodId,
          quantity: safeQuantity,
        };

        console.log("Adding to cart:", payload);

        const response = await (get() as any).requestWithAuth(
          `${API_BASE_URL}/api/v1/cart/add`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          },
        );

        const result = await response.json();
        console.log("addToCart result:", JSON.stringify(result, null, 2));

        if (!response.ok) {
          throw new Error(
            result?.message ||
              result?.error?.message ||
              result?.error ||
              "Failed to add item to cart",
          );
        }

        await (get() as any).fetchCartCount?.();
        set({ isLoading: false });
        return result;
      } catch (error: any) {
        console.log("addToCart error:", error);
        set({ error: error.message, isLoading: false });
        return null;
      }
    },

    fetchCart: async () => {
      set({ isLoading: true, error: null });
      try {
        const { accessToken } = get() as any;
        if (!accessToken && !(get() as any).refreshToken)
          throw new Error("No access token found");

        const response = await (get() as any).requestWithAuth(
          `${API_BASE_URL}/api/v1/cart`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        const result = await response.json();
        if (!response.ok) {
          throw new Error(
            result?.message ||
              result?.error?.message ||
              result?.error ||
              "Failed to fetch cart",
          );
        }

        const payload =
          result?.data?.cart ?? result?.data ?? result?.cart ?? result;
        set({ isLoading: false });
        return payload;
      } catch (error: any) {
        console.log("fetchCart error:", error);
        set({ error: error.message, isLoading: false });
        return null;
      }
    },

    fetchCartCount: async () => {
      try {
        const { accessToken } = get() as any;
        if (!accessToken && !(get() as any).refreshToken) return 0;

        const response = await (get() as any).requestWithAuth(
          `${API_BASE_URL}/api/v1/cart/count`,
          {
            method: "GET",
            headers: {},
          },
        );

        const result = await response.json();
        if (response.ok) {
          return result.data?.count || result.count || 0;
        }
        return 0;
      } catch {
        // console.log("fetchCartCount error", error);
        return 0;
      }
    },

    updateCartQuantity: async (foodId: string, quantity: number) => {
      set({ isLoading: true, error: null });
      try {
        const { accessToken } = get() as any;
        if (!accessToken && !(get() as any).refreshToken)
          throw new Error("No access token found");

        const response = await (get() as any).requestWithAuth(
          `${API_BASE_URL}/api/v1/cart/update`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ foodId, quantity }),
          },
        );

        const result = await response.json();
        if (!response.ok) {
          throw new Error(
            result?.message ||
              result?.error?.message ||
              result?.error ||
              "Failed to update cart",
          );
        }

        set({ isLoading: false });
        return result;
      } catch (error: any) {
        console.log("updateCartQuantity error:", error);
        set({ error: error.message, isLoading: false });
        return null;
      }
    },

    removeCartItem: async (foodId: string) => {
      set({ isLoading: true, error: null });
      try {
        const { accessToken } = get() as any;
        if (!accessToken && !(get() as any).refreshToken)
          throw new Error("No access token found");

        const response = await (get() as any).requestWithAuth(
          `${API_BASE_URL}/api/v1/cart/remove`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ foodId }),
          },
        );

        const result = await response.json();
        if (!response.ok) {
          throw new Error(
            result?.message ||
              result?.error?.message ||
              result?.error ||
              "Failed to remove item",
          );
        }

        set({ isLoading: false });
        return result;
      } catch (error: any) {
        console.log("removeCartItem error:", error);
        set({ error: error.message, isLoading: false });
        return null;
      }
    },

    clearCart: async () => {
      set({ isLoading: true, error: null });
      try {
        const { accessToken } = get() as any;
        if (!accessToken && !(get() as any).refreshToken)
          throw new Error("No access token found");

        const response = await (get() as any).requestWithAuth(
          `${API_BASE_URL}/api/v1/cart/clear`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || "Failed to clear cart");
        }

        set({ isLoading: false });
        return result;
      } catch (error: any) {
        console.log("clearCart error:", error);
        set({ error: error.message, isLoading: false });
        return null;
      }
    },

    createPaymentIntent: async (payload: {
      providerId: string;
      items: { foodId: string; quantity: number }[];
    }) => {
      set({ isLoading: true, error: null });
      try {
        const { accessToken } = get() as any;
        if (!accessToken && !(get() as any).refreshToken)
          throw new Error("No access token found");

        const response = await (get() as any).requestWithAuth(
          `${API_BASE_URL}/api/v1/stripe/create-payment-intent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          },
        );

        const result = await response.json();
        console.log(
          "createPaymentIntent result:",
          JSON.stringify(result, null, 2),
        );

        if (!response.ok) {
          throw new Error(result.message || "Failed to create payment intent");
        }

        set({ isLoading: false });
        return result;
      } catch (error: any) {
        console.log("createPaymentIntent error:", error);
        set({ error: error.message, isLoading: false });
        return null;
      }
    },

    createDonationPaymentIntent: async (mealCount: number) => {
      set({ isLoading: true, error: null });
      try {
        const { accessToken } = get() as any;
        if (!accessToken && !(get() as any).refreshToken)
          throw new Error("No access token found");

        const response = await (get() as any).requestWithAuth(
          `${API_BASE_URL}/api/v1/donation/create-payment-intent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ mealCount }),
          },
        );

        const result = await response.json();
        console.log(
          "createDonationPaymentIntent result:",
          JSON.stringify(result, null, 2),
        );

        if (!response.ok) {
          throw new Error(
            result?.message || "Failed to create donation payment intent",
          );
        }

        set({ isLoading: false });
        return result;
      } catch (error: any) {
        console.log("createDonationPaymentIntent error:", error);
        set({ error: error.message, isLoading: false });
        return null;
      }
    },

    confirmDonationPayment: async (paymentIntentId: string) => {
      set({ isLoading: true, error: null });
      try {
        const { accessToken } = get() as any;
        if (!accessToken && !(get() as any).refreshToken)
          throw new Error("No access token found");

        const response = await (get() as any).requestWithAuth(
          `${API_BASE_URL}/api/v1/donation/confirm-payment`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ paymentIntentId }),
          },
        );

        const result = await response.json();
        console.log(
          "confirmDonationPayment result:",
          JSON.stringify(result, null, 2),
        );

        if (!response.ok) {
          throw new Error(
            result?.message || "Failed to confirm donation payment",
          );
        }

        set({ isLoading: false });
        return result;
      } catch (error: any) {
        console.log("confirmDonationPayment error:", error);
        set({ error: error.message, isLoading: false });
        return null;
      }
    },

    fetchDonationTokens: async () => {
      set({ isLoading: true, error: null });
      try {
        const { accessToken } = get() as any;
        if (!accessToken && !(get() as any).refreshToken)
          throw new Error("No access token found");

        const response = await (get() as any).requestWithAuth(
          `${API_BASE_URL}/api/v1/donation/my-tokens`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        const result = await response.json();
        console.log(
          "fetchDonationTokens result:",
          JSON.stringify(result, null, 2),
        );

        if (!response.ok) {
          throw new Error(result?.message || "Failed to fetch donation tokens");
        }

        set({ isLoading: false });
        return result;
      } catch (error: any) {
        console.log("fetchDonationTokens error:", error);
        set({ error: error.message, isLoading: false });
        return null;
      }
    },

    fetchStripeConfig: async () => {
      try {
        const response = await (get() as any).requestWithAuth(
          `${API_BASE_URL}/api/v1/stripe/config`,
          {
            method: "GET",
            headers: {},
          },
        );

        const result = await response.json();
        console.log(
          "fetchStripeConfig result:",
          JSON.stringify(result, null, 2),
        );

        if (!response.ok) {
          throw new Error(result.message || "Failed to fetch Stripe config");
        }

        return result;
      } catch (error: any) {
        console.log("fetchStripeConfig error:", error);
        return null;
      }
    },

    createOrder: async (orderData: any) => {
      set({ isLoading: true, error: null });
      try {
        const { accessToken } = get() as any;
        if (!accessToken && !(get() as any).refreshToken)
          throw new Error("No access token found");

        const response = await (get() as any).requestWithAuth(
          `${API_BASE_URL}/api/v1/orders`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(orderData),
          },
        );

        const result = await response.json();
        console.log("createOrder result:", JSON.stringify(result, null, 2));

        if (!response.ok) {
          throw new Error(result.message || "Failed to place order");
        }

        set({ isLoading: false });
        return result;
      } catch (error: any) {
        console.log("createOrder error:", error);
        set({ error: error.message, isLoading: false });
        return null;
      }
    },

    logout: async () => {
      try {
        await Promise.all([
          AsyncStorage.removeItem(STORAGE_KEYS.USER),
          AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN),
          AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
        ]);

        set({
          user: null,
          accessToken: null,
          refreshToken: null,
        });

        return true;
      } catch (error) {
        console.log("Failed to logout:", error);
        return false;
      }
    },

    createSupportTicket: async (ticketData: any) => {
      set({ isLoading: true, error: null });
      try {
        const { accessToken } = get() as any;
        if (!accessToken && !(get() as any).refreshToken)
          throw new Error("No access token found");

        const response = await (get() as any).requestWithAuth(
          `${API_BASE_URL}/api/v1/support/tickets`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(ticketData),
          },
        );

        const result = await response.json();
        console.log(
          "createSupportTicket result:",
          JSON.stringify(result, null, 2),
        );

        if (!response.ok) {
          throw new Error(result.message || "Failed to create support ticket");
        }

        set({ isLoading: false });
        return result;
      } catch (error: any) {
        console.log("createSupportTicket error:", error);
        set({ error: error.message, isLoading: false });
        throw error;
      }
    },
    fetchStateTax: async (stateName: string) => {
      if (!stateName) return null;
      console.log("Fetching tax for state:", stateName);
      try {
        const response = await fetchWithLogging(
          `${API_BASE_URL}/api/v1/states/tax?state=${encodeURIComponent(stateName)}`,
        );
        const result = await response.json();
        console.log("fetchStateTax result:", JSON.stringify(result, null, 2));
        if (result.success && result.data) {
          set({ stateTaxInfo: result.data });
          return result.data;
        }
        return null;
      } catch (error) {
        console.log("fetchStateTax error:", error);
        return null;
      }
    },
    clearError: () => set({ error: null }),
  };
});
