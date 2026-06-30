import FontAwesome from "@expo/vector-icons/FontAwesome";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Tab definitions ────────────────────────────────────────────────────────
const TAB_CONFIG = [
  { name: "index",    type: "ionicons" as const,    icon: "home-outline" as any,     activeIcon: "home" as any },
  { name: "location", type: "ionicons" as const,    icon: "location-outline" as any, activeIcon: "location" as any },
  { name: "card",     type: "ionicons" as const,    icon: "cart-outline" as any,     activeIcon: "cart" as any },
  { name: "profile",  type: "fontawesome" as const, icon: "user-o" as any,           activeIcon: "user" as any },
] as const;

const BAR_HEIGHT = 64;
const PILL_SIZE  = 44;

// ─── Custom animated tab bar ─────────────────────────────────────────────────
function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);
  const translateX   = useRef(new Animated.Value(0)).current;
  const initialised  = useRef(false);

  // Only the 4 named tabs (filter out href:null screens)
  const visibleRoutes = state.routes.filter((r) =>
    TAB_CONFIG.some((t) => t.name === r.name)
  );

  const activeRoute = state.routes[state.index];
  const activeIdx   = visibleRoutes.findIndex((r) => r.key === activeRoute.key);
  const tabWidth    = barWidth > 0 ? barWidth / visibleRoutes.length : 0;

  // Centre of the active tab minus half pill so pill centres under icon
  const targetX = tabWidth > 0
    ? activeIdx * tabWidth + tabWidth / 2 - PILL_SIZE / 2
    : 0;

  useEffect(() => {
    if (tabWidth === 0) return;

    if (!initialised.current) {
      // Snap to position on very first render — no animation
      translateX.setValue(targetX);
      initialised.current = true;
      return;
    }

    // Spring slide left or right to the new tab
    Animated.spring(translateX, {
      toValue: targetX,
      useNativeDriver: true,
      damping: 18,
      stiffness: 200,
      mass: 0.65,
    }).start();
  }, [activeIdx, tabWidth]);

  return (
    <View
      style={[
        styles.outerContainer,
        { bottom: insets.bottom > 0 ? insets.bottom + 8 : 16 },
      ]}
    >
      <View style={styles.bar}>
        {/* ── Liquid glass layers ── */}
        <BlurView
          intensity={85}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
        {/* White brightness overlay */}
        <View style={[StyleSheet.absoluteFill, styles.whiteOverlay]} />
        {/* Top-edge shimmer highlight */}
        <View style={[StyleSheet.absoluteFill, styles.topHighlight]} />

        {/* ── Sliding yellow pill ── */}
        <Animated.View
          pointerEvents="none"
          style={[styles.pill, { transform: [{ translateX }] }]}
        >
          {/* Inner glow fill */}
          <View style={styles.pillInner} />
        </Animated.View>

        {/* ── Icon row ── */}
        <View
          style={styles.tabsRow}
          onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        >
          {visibleRoutes.map((route, idx) => {
            const config   = TAB_CONFIG.find((t) => t.name === route.name);
            if (!config) return null;
            const isFocused = activeIdx === idx;

            const IconComponent = config.type === "fontawesome" ? FontAwesome : Ionicons;
            const iconSize = config.type === "fontawesome" ? 21 : 22; // adjust FontAwesome user-o alignment slightly

            return (
              <Pressable
                key={route.key}
                onPress={() => {
                  const event = navigation.emit({
                    type: "tabPress",
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!isFocused && !event.defaultPrevented) {
                    // @ts-ignore — navigating by name is valid in bottom-tabs
                    navigation.navigate(route.name);
                  }
                }}
                onLongPress={() =>
                  navigation.emit({ type: "tabLongPress", target: route.key })
                }
                style={styles.tab}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={
                  descriptors[route.key].options.title ?? config.name
                }
              >
                <IconComponent
                  name={isFocused ? config.activeIcon : config.icon}
                  size={iconSize}
                  color={isFocused ? "#E8A020" : "#ABABAB"}
                />
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ─── Layout ──────────────────────────────────────────────────────────────────
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index"           options={{ title: "Home" }} />
      <Tabs.Screen name="location"        options={{ title: "Location" }} />
      <Tabs.Screen name="card"            options={{ title: "Cart" }} />
      <Tabs.Screen name="profile"         options={{ title: "Profile" }} />
      <Tabs.Screen name="hotel-details"   options={{ href: null }} />
      <Tabs.Screen name="product-details" options={{ href: null }} />
    </Tabs>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Full-width centering shell
  outerContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },

  // The floating glass pill bar
  bar: {
    width: "76%",
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    overflow: "hidden",
    // Amber-tinted border
    borderWidth: 1,
    borderColor: "rgba(220, 175, 90, 0.30)",
    // Shadow / glow
    shadowColor: "#C8A85A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.20,
    shadowRadius: 20,
    elevation: 12,
  },

  // Glass brightness layer
  whiteOverlay: {
    backgroundColor: "rgba(255, 255, 255, 0.40)",
  },

  // Top shimmer edge — mimics light hitting glass
  topHighlight: {
    borderTopWidth: 1.5,
    borderTopColor: "rgba(255, 255, 255, 0.82)",
    borderColor: "transparent",
  },

  // Animated sliding yellow highlight pill
  pill: {
    position: "absolute",
    top: (BAR_HEIGHT - PILL_SIZE) / 2,
    width: PILL_SIZE,
    height: PILL_SIZE,
    borderRadius: PILL_SIZE / 2,
  },
  pillInner: {
    flex: 1,
    borderRadius: PILL_SIZE / 2,
    backgroundColor: "rgba(255, 200, 40, 0.32)",
    borderWidth: 1.2,
    borderColor: "rgba(232, 160, 32, 0.55)",
    // Soft inner glow on iOS
    shadowColor: "#E8A020",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },

  // Icon row fills the bar
  tabsRow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
  },

  // Each tab cell
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
});
