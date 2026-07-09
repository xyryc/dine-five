import * as Location from "expo-location";
import { create } from "zustand";
import type { NearbyParams, Restaurant } from "./restaurantService";
import { restaurantService } from "./restaurantService";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type { NearbyParams, Restaurant } from "./restaurantService";

const FALLBACK_LOCATION = { latitude: 23.780704, longitude: 90.407756 };

const isNear = (a: number, b: number, tolerance = 0.02) =>
  Math.abs(a - b) <= tolerance;

type FeedMode = "all" | "free";

interface RestaurantState {
  location: { latitude: number; longitude: number } | null;
  locationLoading: boolean;
  locationPermissionGranted: boolean | null;
  restaurants: Restaurant[];
  homeRestaurants: Restaurant[];
  restaurantsLoading: boolean;
  restaurantsError: string | null;
  total: number;
  activeFeedMode: FeedMode;
  restaurantRequestSeq: number;
  selectedRestaurant: Restaurant | null;
  cuisineFilter: string | undefined;
  radiusMeters: number;
  availableTokenCount: number;
  fetchLocation: (forceGPS?: boolean) => Promise<void>;
  setLocationManually: (address: string) => Promise<any>;
  fetchNearbyRestaurants: (params: NearbyParams) => Promise<void>;
  fetchFreeMeals: (params: { page?: number; limit?: number; search?: string }) => Promise<void>;
  setActiveFeedMode: (mode: FeedMode) => void;
  setHomeRestaurants: (restaurants: Restaurant[]) => void;
  setSelectedRestaurant: (restaurant: Restaurant | null) => void;
  setCuisineFilter: (cuisine: string | undefined) => void;
  setRadiusMeters: (radius: number) => void;
  claimToken: (tokenId: string) => Promise<any>;
  placeFreeOrder: (data: {
    tokenId: string;
    providerId: string;
    foodId: string;
    quantity: number;
  }) => Promise<any>;
  getAvailableTokens: () => Promise<any>;
}

export const useRestaurantStore = create<RestaurantState>((set, get) => ({
  location: null,
  locationLoading: true,
  locationPermissionGranted: null,
  restaurants: [],
  homeRestaurants: [],
  restaurantsLoading: false,
  restaurantsError: null,
  total: 0,
  activeFeedMode: "all",
  restaurantRequestSeq: 0,
  selectedRestaurant: null,
  cuisineFilter: undefined,
  radiusMeters: 5000,
  availableTokenCount: 0,

  setLocationManually: async (address: string) => {
    try {
      const results = await Location.geocodeAsync(address);
      if (results && results.length > 0) {
        const newLoc = {
          latitude: results[0].latitude,
          longitude: results[0].longitude,
        };
        set({
          location: newLoc,
          locationPermissionGranted: true,
          locationLoading: false,
        });
        await AsyncStorage.setItem("DINE_FIVE_USER_LOCATION", JSON.stringify(newLoc));
        return { success: true, location: newLoc };
      }
      return { success: false, error: "Address not found" };
    } catch (error: any) {
      return { success: false, error: error.message || "Failed to resolve address" };
    }
  },

  fetchLocation: async (forceGPS = false) => {
    set({ locationLoading: true });
    try {
      // Try to load cached location first if not forced
      if (!forceGPS) {
        const savedLoc = await AsyncStorage.getItem("DINE_FIVE_USER_LOCATION");
        if (savedLoc) {
          const parsed = JSON.parse(savedLoc);
          if (parsed && typeof parsed.latitude === "number" && typeof parsed.longitude === "number") {
            set({
              location: parsed,
              locationPermissionGranted: true,
              locationLoading: false,
            });
            console.log("Loaded cached location from AsyncStorage:", parsed);
            return;
          }
        }
      }

      // Fallback to GPS
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        set({ location: null, locationPermissionGranted: false, locationLoading: false });
        return;
      }

      set({ locationPermissionGranted: true });

      const lastKnown = await Location.getLastKnownPositionAsync({});
      if (lastKnown) {
        const coords = {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
        };
        set({
          location: coords,
          locationLoading: false,
        });
        await AsyncStorage.setItem("DINE_FIVE_USER_LOCATION", JSON.stringify(coords));
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };
      set({
        location: coords,
      });
      await AsyncStorage.setItem("DINE_FIVE_USER_LOCATION", JSON.stringify(coords));
    } catch (err) {
      console.log("Error in fetchLocation:", err);
      if (!get().location) {
        set({ location: null });
      }
    } finally {
      set({ locationLoading: false });
    }
  },

  fetchNearbyRestaurants: async (params: NearbyParams) => {
    const requestSeq = get().restaurantRequestSeq + 1;

    const currentMode = get().activeFeedMode;
    // Only switch to 'all' if we are not already in 'free' mode
    // or if this is an explicit request to show 'all'
    const nextMode = currentMode === "free" ? "free" : "all";

    set({
      restaurantsLoading: true,
      restaurantsError: null,
      activeFeedMode: nextMode,
      restaurantRequestSeq: requestSeq,
      availableTokenCount: nextMode === "all" ? 0 : get().availableTokenCount,
    });

    try {
      const response = await restaurantService.getNearby(params);
      let restaurants = response.data ?? [];
      let total = response.pagination?.total ?? restaurants.length;

      const currentState = get();
      if (
        currentState.restaurantRequestSeq !== requestSeq ||
        currentState.activeFeedMode !== nextMode
      ) {
        return;
      }

      set({
        restaurants,
        total,
      });
    } catch (err: any) {
      const currentState = get();
      if (
        currentState.restaurantRequestSeq === requestSeq &&
        currentState.activeFeedMode === nextMode
      ) {
        set({ restaurantsError: err.message ?? "Failed to load restaurants" });
      }
    } finally {
      const currentState = get();
      if (
        currentState.restaurantRequestSeq === requestSeq &&
        currentState.activeFeedMode === nextMode
      ) {
        set({ restaurantsLoading: false });
      }
    }
  },

  fetchFreeMeals: async (params: { page?: number; limit?: number; search?: string }) => {
    const requestSeq = get().restaurantRequestSeq + 1;

    set({
      restaurantsLoading: true,
      restaurantsError: null,
      activeFeedMode: "free",
      restaurantRequestSeq: requestSeq,
    });

    try {
      // Pass user location so the service can hit provider/nearby with freeNearYou=true
      const { location, radiusMeters } = get();
      const response = await restaurantService.getFreeMeals({
        ...params,
        latitude: location?.latitude ?? FALLBACK_LOCATION.latitude,
        longitude: location?.longitude ?? FALLBACK_LOCATION.longitude,
        radius: radiusMeters,
      });
      const restaurants = response.data ?? [];
      const total = response.pagination?.total ?? restaurants.length;

      const currentState = get();
      if (
        currentState.restaurantRequestSeq !== requestSeq ||
        currentState.activeFeedMode !== "free"
      ) {
        return;
      }

      set({
        restaurants,
        total,
        availableTokenCount: response.availableTokenCount ?? 0,
      });
    } catch (err: any) {
      const currentState = get();
      if (
        currentState.restaurantRequestSeq === requestSeq &&
        currentState.activeFeedMode === "free"
      ) {
        set({ restaurantsError: err.message ?? "Failed to load free meals" });
      }
    } finally {
      const currentState = get();
      if (
        currentState.restaurantRequestSeq === requestSeq &&
        currentState.activeFeedMode === "free"
      ) {
        set({ restaurantsLoading: false });
      }
    }
  },

  setActiveFeedMode: (mode) => set({ activeFeedMode: mode }),

  setHomeRestaurants: (restaurants) => {
    const normalized = restaurants.map((restaurant, index) => {
      if ((restaurant as any).id) return restaurant;

      return {
        ...restaurant,
        id:
          (restaurant as any).id ??
          (restaurant as any)._id ??
          restaurant.providerId ??
          `home-${index}`,
      } as Restaurant;
    });

    set({ homeRestaurants: normalized });
  },

  setSelectedRestaurant: (restaurant) => set({ selectedRestaurant: restaurant }),
  setCuisineFilter: (cuisine) => set({ cuisineFilter: cuisine }),
  setRadiusMeters: (radius) =>
    set({ radiusMeters: Math.max(10, Math.round(radius)) }),

  claimToken: async (tokenId) => {
    console.log("[useRestaurantStore] claimToken calling for tokenId:", tokenId);
    set({ restaurantsLoading: true, restaurantsError: null });
    try {
      const result = await restaurantService.claimFreeMeal(tokenId);
      console.log("[useRestaurantStore] claimToken success:", result);
      return result;
    } catch (err: any) {
      console.error("[useRestaurantStore] claimToken error:", err);
      const message = err.message === "You are not logged in! Please log in to claim a meal." 
        ? err.message 
        : (err.message ?? "Failed to claim free meal");
      set({
        restaurantsError: message,
      });
      throw new Error(message);
    } finally {
      set({ restaurantsLoading: false });
    }
  },

  placeFreeOrder: async (data) => {
    set({ restaurantsLoading: true, restaurantsError: null });
    try {
      const result = await restaurantService.placeFreeOrder(data);
      return result;
    } catch (err: any) {
      const message = err.message === "You are not logged in! Please log in to place an order."
        ? err.message
        : (err.message ?? "Failed to place free order");
      set({
        restaurantsError: message,
      });
      throw new Error(message);
    } finally {
      set({ restaurantsLoading: false });
    }
  },

  getAvailableTokens: async () => {
    console.log("[useRestaurantStore] getAvailableTokens calling...");
    try {
      const result = await restaurantService.getAvailableTokens();
      console.log("[useRestaurantStore] getAvailableTokens result:", result);
      if (result.success && result.data?.availableCount !== undefined) {
        set({ availableTokenCount: result.data.availableCount });
      }
      return result;
    } catch (err: any) {
      console.error("[useRestaurantStore] getAvailableTokens error:", err);
      throw err;
    }
  },
}));
