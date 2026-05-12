import { API_BASE_URL } from "@/utils/api";

export const DEFAULT_USER_AVATAR =
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500";

const pickString = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
};

export const normalizeImageUri = (value: unknown): string => {
  if (typeof value !== "string") return "";
  const raw = value.trim().replace(/^['"]|['"]$/g, "");
  if (!raw || raw === "undefined" || raw === "null" || raw === "N/A") return "";

  if (
    raw.startsWith("https://") ||
    raw.startsWith("http://") ||
    raw.startsWith("file://") ||
    raw.startsWith("content://") ||
    raw.startsWith("data:image")
  ) {
    return raw;
  }

  if (raw.startsWith("//")) {
    return `https:${raw}`;
  }

  if (raw.startsWith("/")) {
    return `${API_BASE_URL}${raw}`;
  }

  return `${API_BASE_URL}/${raw.replace(/^\.?\//, "")}`;
};

export const getUserAvatarUri = (
  user: any,
  fallback = DEFAULT_USER_AVATAR,
): string => {
  const candidate = pickString(
    user?.profilePic,
    user?.avatar,
    user?.photo,
    user?.image,
    user?.profileImage,
    user?.imageUrl,
    user?.userImage,
    user?.picture,
    typeof user?.profile === "string" ? user.profile : "",
    user?.profile?.photo,
    user?.profile?.image,
    user?.profile?.profilePic,
    user?.profile?.avatar,
    user?.profile?.url,
    user?.profile?.secure_url,
  );

  return normalizeImageUri(candidate) || fallback;
};

