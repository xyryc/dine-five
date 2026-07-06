// restaurantService.ts
import { API_BASE_URL } from "@/utils/api";
import { normalizeImageUri } from "@/utils/userAvatar";
import { useStore } from "./stores";

export interface Restaurant {
  id: string;
  providerId: string;
  restaurantName: string;
  location: { lat: number; lng: number };
  distance: number; // in km from API
  distanceMeters?: number;
  cuisine: string[];
  restaurantAddress: string;
  city: string;
  state: string;
  phoneNumber: string;
  contactEmail: string;
  profile: string; // image URL
  isVerify: boolean;
  verificationStatus: string;
  availableFoods: number;
  rating?: number;
  deliveryTimeMinutes?: number;
  mealName?: string;
  mealImage?: string;
  foodId?: string;
  title?: string;
  productDescription?: string;
  price?: number;
  finalPriceTag?: number;
  baseRevenue?: number;
  serviceFee?: number;
  providerName?: string;
  providerRestaurantName?: string;
  providerImage?: string;
  restaurantImage?: string;
  originalPrice?: number;
  displayPrice?: number;
  freeTokenCount?: number;
  isFreeAvailable?: boolean;
  categoryName?: string;
}

export interface NearbyParams {
  latitude: number;
  longitude: number;
  radius?: number; // meters — converted to km for the API
  cuisine?: string;
  sortBy?: "distance" | "rating";
  page?: number;
  limit?: number;
  freeNearYou?: boolean;
  search?: string;
}

export interface NearbyResponse {
  success: boolean;
  message: string;
  data: Restaurant[];
  availableTokenCount?: number;
  pagination?: {
    total: number;
    page: number;
    limit: number;
  };
}

const BASE_URL = `${API_BASE_URL}/api/v1`;
const REQUEST_TIMEOUT_MS = 15000;

type RetryableError = Error & { retryable?: boolean };

type RequestJsonOptions = RequestInit & {
  timeoutMs?: number;
};

const getAuthHeaders = (): Record<string, string> => {
  const token = (useStore.getState() as any).accessToken;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const isValidLatitude = (value: number) =>
  Number.isFinite(value) && value >= -90 && value <= 90;
const isValidLongitude = (value: number) =>
  Number.isFinite(value) && value >= -180 && value <= 180;

const extractCoordinates = (item: any): { lat: number; lng: number } | null => {
  const directLat = toNumber(
    item?.location?.lat ??
      item?.location?.latitude ??
      item?.latitude ??
      item?.lat,
    NaN,
  );
  const directLng = toNumber(
    item?.location?.lng ??
      item?.location?.longitude ??
      item?.longitude ??
      item?.lng,
    NaN,
  );

  if (isValidLatitude(directLat) && isValidLongitude(directLng)) {
    return { lat: directLat, lng: directLng };
  }

  const coords = item?.location?.coordinates ?? item?.coordinates;
  if (Array.isArray(coords) && coords.length >= 2) {
    // GeoJSON order: [lng, lat]
    const geoLng = toNumber(coords[0], NaN);
    const geoLat = toNumber(coords[1], NaN);
    if (isValidLatitude(geoLat) && isValidLongitude(geoLng)) {
      return { lat: geoLat, lng: geoLng };
    }
  }

  return null;
};

const normalizeDistanceKm = (raw: any): number => {
  const fromMeters = toNumber(
    raw?.distanceMeters ?? raw?.distanceInMeters,
    NaN,
  );
  if (Number.isFinite(fromMeters)) return Math.max(0, fromMeters / 1000);

  const unit = String(raw?.distanceUnit ?? raw?.unit ?? "").toLowerCase();
  const value = toNumber(raw?.distance ?? raw?.distanceKm ?? raw?.dist, 0);

  if (!Number.isFinite(value)) return 0;

  if (unit.includes("meter") || unit === "m") return Math.max(0, value / 1000);
  if (unit.includes("km") || unit.includes("kilometer"))
    return Math.max(0, value);

  // Nearby API is radius-limited; very large values are usually meters.
  if (value > 30) return Math.max(0, value / 1000);
  return Math.max(0, value);
};

const normalizeRestaurant = (item: any, index: number): Restaurant => {
  const coords = extractCoordinates(item);
  const distanceKm = normalizeDistanceKm(item);

  const cuisine = Array.isArray(item?.cuisine)
    ? item.cuisine
    : Array.isArray(item?.cuisines)
      ? item.cuisines
      : typeof item?.cuisine === "string"
        ? item.cuisine
            .split(",")
            .map((value: string) => value.trim())
            .filter(Boolean)
        : [];

  const rating = toNumber(
    item?.rating ?? item?.averageRating ?? item?.avgRating,
    4.2,
  );
  const deliveryTime = toNumber(
    item?.deliveryTimeMinutes ??
      item?.deliveryTime ??
      item?.estimatedDeliveryMinutes,
    5 + Math.min(15, Math.round(distanceKm * 2)),
  );

  const id = String(
    item?.id ??
      item?._id ??
      item?.providerId ??
      item?.providerID ??
      item?.foodId ??
      `res-${index}`,
  );

  return {
    id,
    providerId: String(item?.providerId ?? item?.providerID ?? id),
    restaurantName: String(item?.restaurantName ?? item?.name ?? "Restaurant"),
    location: {
      lat: coords?.lat ?? Number.NaN,
      lng: coords?.lng ?? Number.NaN,
    },
    distance: distanceKm,
    distanceMeters: Math.round(distanceKm * 1000),
    cuisine,
    restaurantAddress: String(item?.restaurantAddress ?? item?.address ?? ""),
    city: String(item?.city ?? ""),
    state: String(item?.state ?? ""),
    phoneNumber: String(item?.phoneNumber ?? item?.phone ?? ""),
    contactEmail: String(item?.contactEmail ?? item?.email ?? ""),
    profile: normalizeImageUri(
      item?.profile ??
        item?.image ??
        item?.imageUrl ??
        item?.restaurantImage ??
        item?.providerImage ??
        "",
    ),
    isVerify: Boolean(item?.isVerify ?? item?.isVerified ?? false),
    verificationStatus: String(item?.verificationStatus ?? ""),
    availableFoods: toNumber(item?.availableFoods ?? item?.foodCount, 0),
    rating: Number.isFinite(rating) ? Math.min(5, Math.max(0, rating)) : 4.2,
    deliveryTimeMinutes: Math.max(5, Math.min(60, deliveryTime)),
    mealName: String(item?.name || item?.title || ""),
    mealImage: normalizeImageUri(item?.image || item?.imageUrl || ""),
    foodId: String(item?.foodId ?? item?.id ?? item?._id ?? id),
    title: String(item?.title ?? item?.name ?? ""),
    productDescription: String(
      item?.productDescription ?? item?.description ?? "",
    ),
    price: toNumber(item?.price ?? item?.finalPriceTag ?? item?.baseRevenue, 0),
    finalPriceTag: toNumber(
      item?.finalPriceTag ?? item?.price ?? item?.baseRevenue,
      0,
    ),
    baseRevenue: toNumber(
      item?.baseRevenue ?? item?.price ?? item?.finalPriceTag,
      0,
    ),
    serviceFee: toNumber(item?.serviceFee, 0),
    providerName: String(item?.providerName ?? item?.provider ?? ""),
    providerRestaurantName: String(
      item?.providerRestaurantName ??
        item?.restaurantName ??
        item?.provider ??
        "",
    ),
    providerImage: normalizeImageUri(
      item?.providerImage ?? item?.providerProfile ?? "",
    ),
    restaurantImage: normalizeImageUri(
      item?.restaurantImage ??
        item?.providerImage ??
        item?.providerProfile ??
        "",
    ),
    originalPrice: toNumber(
      item?.originalPrice ??
        item?.finalPriceTag ??
        item?.price ??
        item?.baseRevenue,
      0,
    ),
    displayPrice: toNumber(item?.displayPrice ?? item?.price ?? 0, 0),
    freeTokenCount: toNumber(item?.freeTokenCount, 0),
    isFreeAvailable: Boolean(item?.isFreeAvailable ?? false),
    categoryName: String(item?.categoryName ?? item?.category ?? ""),
  };
};

const normalizeNearbyResponse = (payload: any): NearbyResponse => {
  const rawData = Array.isArray(payload?.data)
    ? payload.data
    : payload?.data && typeof payload.data === "object"
      ? [payload.data]
      : Array.isArray(payload?.restaurants)
        ? payload.restaurants
        : Array.isArray(payload)
          ? payload
          : [];

  const normalized = rawData.map((item: any, index: number) =>
    normalizeRestaurant(item, index),
  );

  // The donated-foods API returns token count inside `meta`
  const tokenCount = toNumber(
    payload?.meta?.availableTokenCount ??
    payload?.availableTokenCount ??
    payload?.meta?.freeTokenCount,
    0,
  );

  const paginationRaw = payload?.pagination;

  return {
    success: Boolean(payload?.success ?? true),
    message: String(payload?.message ?? ""),
    data: normalized,
    availableTokenCount: tokenCount,
    pagination: paginationRaw
      ? {
          total: toNumber(paginationRaw.total, normalized.length),
          page: toNumber(paginationRaw.page, 1),
          limit: toNumber(paginationRaw.limit, normalized.length || 20),
        }
      : undefined,
  };
};

const parseJsonResponse = async (res: Response): Promise<any> => {
  const responseText = await res.text();
  if (!responseText) return null;

  try {
    return JSON.parse(responseText);
  } catch {
    return { message: responseText };
  }
};

const requestJson = async (
  url: string,
  options: RequestJsonOptions = {},
): Promise<any> => {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const { timeoutMs: _timeoutMs, signal: _signal, ...fetchOptions } = options;

  try {
    const res = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    const json = await parseJsonResponse(res);
    if (!res.ok) {
      throw new Error(
        json?.message ||
          json?.error?.message ||
          json?.error ||
          `Request failed with status ${res.status}`,
      );
    }

    return json;
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error(
        `Backend did not respond at ${API_BASE_URL}. Check that foodbackend-main is running and the app is using the correct API URL.`,
      );
    }

    if (
      error?.name === "TypeError" &&
      typeof error?.message === "string" &&
      error.message.includes("Network request failed")
    ) {
      throw new Error(
        `Cannot reach backend at ${API_BASE_URL}. Check server status and phone/emulator network.`,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const restaurantService = {
  /**
   * GET /provider/donated-foods/nearby
   * Used for both "Meal near you" (freeNearYou=false) and
   * "Free meal near you" (freeNearYou=true).
   * Backend expects radius in km (max 100).
   */
  getNearby: async (params: NearbyParams): Promise<NearbyResponse> => {
    const radiusMeters = Math.max(10, Math.round(params.radius ?? 1000));
    const radiusKm = Math.min(100, Number((radiusMeters / 1000).toFixed(2)));
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const sortBy = params.sortBy ?? "distance";

    const queryParams = new URLSearchParams({
      latitude: String(params.latitude),
      longitude: String(params.longitude),
      radius: String(radiusKm),
      page: String(page),
      limit: String(limit),
      sortBy,
      freeNearYou: params.freeNearYou ? "true" : "false",
    });

    if (params.cuisine) {
      queryParams.set("cuisine", params.cuisine);
    }
    if (params.search) {
      queryParams.set("search", params.search);
    }

    const url = `${BASE_URL}/provider/nearby?${queryParams.toString()}`;
    console.log("🚀 CALLING API ENDPOINT (getNearby):", url);

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      const responseText = await res.text();
      let json: any = null;
      try {
        json = responseText ? JSON.parse(responseText) : null;
      } catch {
        json = null;
      }

      if (!res.ok) {
        throw new Error(
          json?.message ||
          json?.error?.message ||
          responseText ||
          `Request failed with status ${res.status}`,
        );
      }

      return normalizeNearbyResponse(json);
    } catch (error: any) {
      console.log("❌ getNearby error:", error);
      throw error;
    }
  },

  /**
   * GET /provider/donated-foods/nearby?freeNearYou=true
   * Alias that explicitly sets freeNearYou=true using the current user location
   * from the store so callers don't have to pass coordinates.
   */
  getFreeMeals: async (params: {
    page?: number;
    limit?: number;
    latitude?: number;
    longitude?: number;
    radius?: number;
    search?: string;
  }): Promise<NearbyResponse> => {
    const FALLBACK = { latitude: 23.780704, longitude: 90.407756 };
    const lat = params.latitude ?? FALLBACK.latitude;
    const lng = params.longitude ?? FALLBACK.longitude;
    const radiusMeters = Math.max(10, Math.round(params.radius ?? 100000));
    const radiusKm = Math.min(100, Number((radiusMeters / 1000).toFixed(2)));
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    const queryParams = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      radius: String(radiusKm),
      page: String(page),
      limit: String(limit),
      sortBy: "distance",
      freeNearYou: "true",
    });

    if (params.search) {
      queryParams.set("search", params.search);
    }

    const url = `${BASE_URL}/provider/nearby?${queryParams.toString()}`;
    console.log("🚀 CALLING API ENDPOINT (getFreeMeals):", url);

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || "Failed to load free meals");
      }

      return normalizeNearbyResponse(json);
    } catch (error: any) {
      console.log("[restaurantService] getFreeMeals error:", error);
      throw error;
    }
  },

  /**
   * POST /api/v1/donation/claim/{{tokenId}}
   */
  claimFreeMeal: async (tokenId: string): Promise<any> => {
    const headers = getAuthHeaders();
    if (!headers["Authorization"]) {
      throw new Error("You are not logged in! Please log in to claim a meal.");
    }
    const url = `${API_BASE_URL}/api/v1/donation/claim/${tokenId}`;
    console.log("Claiming free meal:", url);

    return requestJson(url, {
      method: "POST",
      headers,
    });
  },

  /**
   * POST /api/v1/donation/place-free-order
   */
  placeFreeOrder: async (data: {
    tokenId: string;
    providerId: string;
    foodId: string;
    quantity: number;
  }): Promise<any> => {
    const headers = getAuthHeaders();
    if (!headers["Authorization"]) {
      throw new Error(
        "You are not logged in! Please log in to place an order.",
      );
    }
    const url = `${API_BASE_URL}/api/v1/donation/place-free-order`;
    console.log("Placing free order:", url, data);

    return requestJson(url, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });
  },

  /**
   * GET /api/v1/donation/available-count
   */
  getAvailableTokens: async (): Promise<any> => {
    const url = `${API_BASE_URL}/api/v1/donation/available-count`;
    return requestJson(url, {
      method: "GET",
      headers: getAuthHeaders(),
    });
  },
};
