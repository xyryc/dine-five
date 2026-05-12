import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { AppState, Platform } from "react-native";

import { useStore } from "@/stores/stores";

const SEEN_NOTIFICATION_IDS_KEY = "seen_notification_ids";
const POLL_INTERVAL_MS = 30000;
const MAX_STORED_IDS = 200;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const pickString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
};

const toNotificationArray = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;

  const newNotifications = Array.isArray(payload?.newNotifications)
    ? payload.newNotifications
    : [];
  const oldNotifications = Array.isArray(payload?.oldNotifications)
    ? payload.oldNotifications
    : [];

  return [...newNotifications, ...oldNotifications];
};

const getNotificationId = (item: any) =>
  pickString(
    item?._id,
    item?.id,
    item?.notificationId,
    item?.createdAt,
    item?.title,
    item?.message,
  );

const loadSeenNotificationIds = async () => {
  try {
    const raw = await AsyncStorage.getItem(SEEN_NOTIFICATION_IDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
};

const saveSeenNotificationIds = async (ids: string[]) => {
  try {
    const trimmed = ids.slice(-MAX_STORED_IDS);
    await AsyncStorage.setItem(SEEN_NOTIFICATION_IDS_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore persistence failures; notifications will still be shown for this session.
  }
};

const ensureNotificationPermissionsAsync = async () => {
  if (Platform.OS === "web") return false;

  const current = await Notifications.getPermissionsAsync();
  let finalStatus = current.status;

  if (finalStatus !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== "granted") {
    return false;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FFC107",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  return true;
};

export const useNotificationSync = () => {
  const router = useRouter();
  const { accessToken, fetchNotifications } = useStore() as any;

  useEffect(() => {
    if (!accessToken || Platform.OS === "web") return;

    let isMounted = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let isFirstSync = true;
    let seenIds = new Set<string>();

    const syncNotifications = async () => {
      if (!isMounted || AppState.currentState !== "active") return;

      const payload = await fetchNotifications?.();
      const items = toNotificationArray(payload);
      const ids = items.map(getNotificationId).filter(Boolean);

      if (isFirstSync) {
        ids.forEach((id) => seenIds.add(id));
        isFirstSync = false;
        await saveSeenNotificationIds(Array.from(seenIds));
        return;
      }

      const freshItems = items.filter((item) => {
        const id = getNotificationId(item);
        return id && !seenIds.has(id);
      });

      for (const item of freshItems) {
        const id = getNotificationId(item);
        if (!id) continue;

        seenIds.add(id);

        await Notifications.scheduleNotificationAsync({
          content: {
            title: pickString(item?.title, "New notification"),
            body: pickString(item?.message, item?.body, "You have a new update."),
            data: {
              screen: "/screens/home/notifications",
              notificationId: id,
            },
          },
          trigger: null,
        });
      }

      if (freshItems.length > 0) {
        await saveSeenNotificationIds(Array.from(seenIds));
      }
    };

    const bootstrap = async () => {
      const granted = await ensureNotificationPermissionsAsync();
      if (!granted || !isMounted) return;

      const storedIds = await loadSeenNotificationIds();
      seenIds = new Set(storedIds);

      await syncNotifications();

      intervalId = setInterval(() => {
        void syncNotifications();
      }, POLL_INTERVAL_MS);
    };

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener(() => {
        router.push("/screens/home/notifications");
      });

    void bootstrap();

    return () => {
      isMounted = false;
      responseSubscription.remove();
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [accessToken, fetchNotifications, router]);
};
