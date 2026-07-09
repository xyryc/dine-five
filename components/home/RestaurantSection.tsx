import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { type Restaurant } from "@/stores/useRestaurantStore";
import { useRouter } from "expo-router";

const formatDistance = (distanceKm?: any) => {
  const dist = Number(distanceKm);
  if (!Number.isFinite(dist)) return "";
  if (dist < 1) return `${Math.max(1, Math.round(dist * 1000))} m`;
  return `${dist.toFixed(1)} mi`;
};

const getCuisineLabel = (restaurant: any) => {
  try {
    if (Array.isArray(restaurant?.cuisine) && restaurant.cuisine.length > 0) {
      return restaurant.cuisine.filter(Boolean).join(" • ");
    }
    if (typeof restaurant?.categoryName === "string" && restaurant.categoryName) {
      return restaurant.categoryName;
    }
    return "Restaurant";
  } catch {
    return "Restaurant";
  }
};

// ---- Error Boundary for individual cards ----
type EBState = { hasError: boolean };
class CardErrorBoundary extends React.Component<{ children: React.ReactNode }, EBState> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any, info: any) {
    console.error("[CardErrorBoundary] Caught render error:", error, info);
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

// ---- Card component ----
function SectionRestaurantCardInner({
  restaurant,
  onOpen,
}: {
  restaurant: any;
  onOpen: () => void;
}) {
  if (!restaurant || typeof restaurant !== "object") return null;

  const distanceLabel = formatDistance(restaurant.distance);
  const rawRating = Number(restaurant.rating);
  const rating = Number.isFinite(rawRating) && rawRating > 0 ? rawRating.toFixed(1) : "4.2";
  const cuisineLabel = getCuisineLabel(restaurant);
  const rawDelivery = Number(restaurant.deliveryTimeMinutes);
  const deliveryMin = Number.isFinite(rawDelivery) && rawDelivery > 0
    ? rawDelivery
    : Math.max(5, Math.min(30, Math.round((Number(restaurant.distance) || 0) * 2) + 5));

  const profileUri = typeof restaurant.profile === "string" && restaurant.profile.startsWith("http")
    ? restaurant.profile
    : null;

  const name = String(restaurant.restaurantName || restaurant.providerRestaurantName || restaurant.providerName || "Restaurant");

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onOpen}
      style={{ width: 224, marginRight: 16, backgroundColor: "#fff", borderRadius: 10, padding: 6, borderWidth: 1, borderColor: "#F9FAFB" }}
    >
      <View style={{ borderRadius: 12, overflow: "hidden", backgroundColor: "#F9FAFB", marginBottom: 14, position: "relative", height: 160 }}>
        {profileUri ? (
          <Image
            source={{ uri: profileUri }}
            style={{ width: "100%", height: 160 }}
            contentFit="cover"
          />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F3F4F6" }}>
            <Ionicons name="restaurant-outline" size={32} color="#D1D5DB" />
          </View>
        )}
        <View style={{ position: "absolute", top: 8, left: 8, backgroundColor: "#F5C518", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
          <Text style={{ fontSize: 10, fontWeight: "900", color: "#111827" }}>
            {restaurant.availableFoods > 0 ? `${restaurant.availableFoods} items` : "Open"}
          </Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 4, paddingBottom: 4 }}>
        <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827" }} numberOfLines={1}>
          {name}
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, flexWrap: "wrap", gap: 4 }}>
          <Ionicons name="star" size={11} color="#F5C518" />
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#374151" }}>{rating}</Text>
          <Text style={{ fontSize: 10, color: "#D1D5DB" }}>•</Text>
          <Text style={{ fontSize: 11, color: "#6B7280", flex: 1 }} numberOfLines={1}>{cuisineLabel}</Text>
          <Text style={{ fontSize: 11, fontWeight: "500", color: "#6B7280" }}>{deliveryMin}min</Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
          <Ionicons name="location-sharp" size={10} color="#9CA3AF" />
          <Text style={{ fontSize: 10, color: "#9CA3AF", marginLeft: 2 }} numberOfLines={1}>
            {distanceLabel || "Nearby"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function SectionRestaurantCard({ restaurant, onOpen }: { restaurant: any; onOpen: () => void }) {
  return (
    <CardErrorBoundary>
      <SectionRestaurantCardInner restaurant={restaurant} onOpen={onOpen} />
    </CardErrorBoundary>
  );
}

// ---- Section wrapper ----
export function RestaurantSection({
  title,
  restaurants,
  onOpenRestaurant,
}: {
  title: string;
  restaurants: Restaurant[];
  onOpenRestaurant: (restaurant: Restaurant) => void;
}) {
  const router = useRouter();
  if (!Array.isArray(restaurants) || restaurants.length === 0) return null;

  return (
    <View style={{ marginBottom: 24 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827", flex: 1, marginRight: 8 }} numberOfLines={1}>
          {title}
        </Text>
        <TouchableOpacity onPress={() => router.push("/screens/home/all-restaurants")} style={{ flexShrink: 0 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#F5C518" }}>View all</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {restaurants.filter(Boolean).map((restaurant, index) => {
          const key = String(restaurant?.providerId || restaurant?.id || restaurant?.foodId || index);
          return (
            <SectionRestaurantCard
              key={key}
              restaurant={restaurant}
              onOpen={() => onOpenRestaurant(restaurant)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}
