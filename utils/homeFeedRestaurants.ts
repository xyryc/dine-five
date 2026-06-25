import type { Restaurant } from "@/stores/restaurantService";
import { normalizeImageUri } from "@/utils/userAvatar";

const toProviderKey = (item: any): string =>
  String(
    item?.providerId?._id ??
      item?.providerId ??
      item?.providerID ??
      item?._id ??
      item?.id ??
      "",
  ).trim();

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

export const extractHomeRestaurants = (
  homeFeed: any,
  seedRestaurants: Restaurant[] = [],
): Restaurant[] => {
  const feedFoods = Array.isArray(homeFeed?.foods) ? homeFeed.foods : [];
  const feedRestaurants = Array.isArray(homeFeed?.restaurants) ? homeFeed.restaurants : 
                         Array.isArray(homeFeed?.providers) ? homeFeed.providers : [];
  
  if (!feedFoods.length && !feedRestaurants.length) return [];

  const seenProviderIds = new Set(
    seedRestaurants.map((restaurant) => String(restaurant.providerId)),
  );

  const extractedRestaurants: Restaurant[] = [];

  // Helper to process a restaurant item
  const processItem = (item: any, isDirectRestaurant = false) => {
    const providerId = toProviderKey(item);
    if (!providerId || seenProviderIds.has(providerId)) return;

    seenProviderIds.add(providerId);

    const providerFoods = feedFoods.filter(
      (food: any) => toProviderKey(food) === providerId,
    );

    const location =
      item?.location ?? item?.providerId?.location ?? item?.provider?.location;

    const latitude = toNumber(
      location?.lat ?? location?.latitude ?? item?.latitude ?? item?.lat,
      Number.NaN,
    );
    const longitude = toNumber(
      location?.lng ?? location?.longitude ?? item?.longitude ?? item?.lng,
      Number.NaN,
    );

    extractedRestaurants.push({
      id: providerId,
      providerId,
      restaurantName:
        item?.restaurantName ??
        item?.providerName ??
        item?.name ??
        item?.provider?.restaurantName ??
        item?.providerId?.restaurantName ??
        "Restaurant",
      profile: normalizeImageUri(
        item?.profile ??
          item?.image ??
          item?.providerId?.profile ??
          item?.providerProfile ??
          "",
      ),
      restaurantAddress:
        item?.restaurantAddress ?? item?.address ?? item?.providerId?.restaurantAddress ?? "",
      availableFoods: isDirectRestaurant ? (item?.foodCount ?? providerFoods.length) : providerFoods.length,
      rating: toNumber(item?.rating ?? item?.providerId?.rating ?? item?.averageRating, 4.2),
      distance: toNumber(item?.distance, 0.5),
      location: { lat: latitude, lng: longitude },
      cuisine: Array.isArray(item?.cuisine) ? item.cuisine : [item?.categoryName ?? item?.category ?? "General"],
      phoneNumber: item?.phoneNumber ?? item?.providerId?.phoneNumber ?? "",
      contactEmail: item?.contactEmail ?? item?.providerId?.contactEmail ?? "",
      city: item?.city ?? item?.providerId?.city ?? "",
      state: item?.state ?? item?.providerId?.state ?? "",
      isVerify: true,
      verificationStatus: "verified",
    });
  };

  // Process direct restaurants first
  feedRestaurants.forEach((item: any) => processItem(item, true));
  
  // Then process foods to find any missing providers
  feedFoods.forEach((item: any) => processItem(item, false));

  return extractedRestaurants;
};
