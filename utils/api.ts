import Constants from "expo-constants";
import { Platform } from "react-native";

const DEFAULT_PORT = "5000";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const isLocalHost = (host?: string | null) =>
  host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";

const getExpoHost = (): string | null => {
  const hostUri =
    (Constants.expoConfig as any)?.hostUri ||
    (Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as any)?.manifest?.debuggerHost ||
    null;

  if (!hostUri || typeof hostUri !== "string") {
    return null;
  }

  return hostUri.split(":")[0] || null;
};

const normalizeBaseUrl = (baseUrl: string): string => {
  const match = baseUrl.match(/^(https?:\/\/)([^/:]+)(:\d+)?(\/.*)?$/i);
  if (!match) {
    return trimTrailingSlash(baseUrl);
  }

  const [, protocol, host, port = "", path = ""] = match;
  if (!isLocalHost(host)) {
    return trimTrailingSlash(baseUrl);
  }

  const expoHost = getExpoHost();
  const resolvedHost =
    expoHost && !isLocalHost(expoHost)
      ? expoHost
      : Platform.OS === "android"
        ? "10.0.2.2"
        : host;

  return trimTrailingSlash(`${protocol}${resolvedHost}${port}${path}`);
};

const resolveApiBaseUrl = (): string => {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) {
    return normalizeBaseUrl(configured);
  }

  const expoHost = getExpoHost();
  const fallbackHost =
    expoHost && !isLocalHost(expoHost)
      ? expoHost
      : Platform.OS === "android"
        ? "10.0.2.2"
        : "localhost";

  return `http://${fallbackHost}:${DEFAULT_PORT}`;
};

export const API_BASE_URL = resolveApiBaseUrl();

export const apiUrl = (path: string): string =>
  `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
