import type { Restaurant } from "@/stores/restaurantService";

type RouterLike = {
  push: (href: any) => void;
};

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const getRestaurantImage = (restaurant: Restaurant): string =>
  (restaurant.profile as string) ||
  (restaurant as any).image ||
  (restaurant as any).imageUrl ||
  "https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=500";

export const formatRestaurantDistance = (distanceKm: number): string => {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return "0 m";
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(1)} km`;
};

export const buildRestaurantSearchHaystack = (restaurant: Restaurant): string => {
  const searchParts = [
    restaurant.restaurantName,
    restaurant.restaurantAddress,
    restaurant.city,
    restaurant.state,
    restaurant.contactEmail,
    restaurant.phoneNumber,
    (restaurant as any).providerName,
    (restaurant as any).name,
    Array.isArray(restaurant.cuisine) ? restaurant.cuisine.join(" ") : "",
  ];

  return normalizeText(searchParts.filter(Boolean).join(" "));
};

export const normalizeRestaurantSearchQuery = (query: string): string =>
  normalizeText(query);

export const buildRestaurantDetailHref = (restaurant: Restaurant) => {
  const isFreeMealItem =
    Boolean(restaurant.foodId) &&
    (Boolean(restaurant.isFreeAvailable) ||
      Boolean(restaurant.freeTokenCount) ||
      restaurant.displayPrice === 0);

  if (isFreeMealItem) {
    return {
      pathname: "/(tabs)/product-details",
      params: {
        id: restaurant.foodId || restaurant.id,
        foodId: restaurant.foodId || restaurant.id,
        name: restaurant.mealName || restaurant.title || restaurant.restaurantName || "Free Meal",
        price: String(
          restaurant.displayPrice ??
            restaurant.finalPriceTag ??
            restaurant.price ??
            restaurant.baseRevenue ??
            0,
        ),
        image: restaurant.mealImage || restaurant.profile || "",
        description: restaurant.productDescription || "",
        restaurantName: restaurant.restaurantName || restaurant.providerRestaurantName || "",
        restaurantProfile:
          restaurant.restaurantImage || restaurant.providerImage || restaurant.profile || "",
        rating: String(
          toNumber((restaurant as any).rating ?? (restaurant as any).averageRating, 0),
        ),
        reviews: "0",
        isFavorite: "false",
        isFreeAvailable: "true",
        freeTokenCount: String(restaurant.freeTokenCount || 1),
        providerId: restaurant.providerId || restaurant.id,
      },
    } as const;
  }

  const ratingValue = toNumber(
    (restaurant as any).rating ?? (restaurant as any).averageRating,
    4.2,
  );
  const rating = Number.isFinite(ratingValue) ? ratingValue.toFixed(1) : "4.2";
  const tags = Array.isArray(restaurant.cuisine)
    ? restaurant.cuisine.filter(Boolean).join(" | ")
    : "";

  return {
    pathname: "/(tabs)/hotel-details",
    params: {
      id: restaurant.providerId,
      providerId: restaurant.providerId,
      name: restaurant.restaurantName || "Restaurant",
      image: getRestaurantImage(restaurant),
      rating,
      address: restaurant.restaurantAddress || "",
      distance: formatRestaurantDistance(restaurant.distance),
      tags,
    },
  } as const;
};

export const navigateToRestaurantDetail = (
  router: RouterLike,
  restaurant: Restaurant,
) => {
  router.push(buildRestaurantDetailHref(restaurant) as any);
};
