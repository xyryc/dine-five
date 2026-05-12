import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Text, View } from "react-native";
import { normalizeImageUri } from "@/utils/userAvatar";

interface Review {
  _id: string;
  customerId: {
    fullName: string;
    profilePic?: string;
  };
  rating: number;
  comment: string;
  createdAt: string;
}

interface CustomerReviewsProps {
  reviews?: Review[];
}

const pickString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
};

const joinName = (...values: unknown[]) => {
  const parts = values
    .filter((value) => typeof value === "string")
    .map((value) => String(value).trim())
    .filter(Boolean);

  return parts.join(" ").trim();
};

const getReviewKey = (review: any, index: number) =>
  pickString(
    review?._id,
    review?.id,
    review?.createdAt,
    review?.customerId?._id,
    review?.orderId?._id,
    review?.orderId?.customerId?._id,
    review?.comment,
  ) || `review-${index}`;

const getReviewerName = (review: any) =>
  pickString(
    review?.fullName,
    review?.name,
    review?.customerId?.fullName,
    review?.customerId?.name,
    joinName(review?.customerId?.firstName, review?.customerId?.lastName),
    review?.customer?.fullName,
    review?.customer?.name,
    joinName(review?.customer?.firstName, review?.customer?.lastName),
    review?.author?.fullName,
    review?.author?.name,
    joinName(review?.author?.firstName, review?.author?.lastName),
    review?.customerName,
    review?.userName,
    review?.user?.fullName,
    review?.user?.name,
    joinName(review?.user?.firstName, review?.user?.lastName),
    review?.orderId?.customerId?.fullName,
    review?.orderId?.customerId?.name,
    joinName(
      review?.orderId?.customerId?.firstName,
      review?.orderId?.customerId?.lastName,
    ),
    review?.orderId?.userId?.fullName,
    review?.orderId?.userId?.name,
    joinName(
      review?.orderId?.userId?.firstName,
      review?.orderId?.userId?.lastName,
    ),
  ) || "Anonymous User";

const getReviewerImage = (review: any) =>
  normalizeImageUri(
    pickString(
      review?.customerId?.profilePic,
      review?.customerId?.avatar,
      review?.customerId?.image,
      review?.customer?.profilePic,
      review?.customer?.avatar,
      review?.customer?.image,
      review?.author?.profilePic,
      review?.author?.avatar,
      review?.user?.profilePic,
      review?.user?.avatar,
      review?.orderId?.customerId?.profilePic,
      review?.orderId?.customerId?.avatar,
      review?.orderId?.customerId?.image,
      review?.orderId?.userId?.profilePic,
      review?.orderId?.userId?.avatar,
      review?.orderId?.userId?.image,
    ),
  ) || "https://i.ibb.co.com/WvT5LftP/iconprofile.jpg";

const getReviewComment = (review: any) => {
  const directComment = pickString(
    review?.comment,
    review?.review,
    review?.message,
    review?.text,
    review?.description,
    review?.details,
    review?.content,
  );

  if (directComment) return directComment;

  if (
    typeof review?.comment === "number" ||
    typeof review?.comment === "boolean"
  ) {
    return String(review.comment);
  }

  if (
    typeof review?.review === "number" ||
    typeof review?.review === "boolean"
  ) {
    return String(review.review);
  }

  return "No comment provided.";
};

const getReviewDate = (review: any) => {
  const rawDate = pickString(review?.createdAt, review?.updatedAt);
  if (!rawDate) return "Recently";

  const parsedDate = new Date(rawDate);
  if (Number.isNaN(parsedDate.getTime())) return "Recently";

  return parsedDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getReviewRating = (review: any) => {
  const parsed = Number(review?.rating);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(5, parsed));
};

export const CustomerReviews = ({ reviews = [] }: CustomerReviewsProps) => {
  if (reviews.length === 0) {
    return (
      <View className="mb-4 items-center py-4">
        <Text className="text-gray-400 text-sm italic">
          No reviews yet for this item.
        </Text>
      </View>
    );
  }

  return (
    <View className="mb-4">
      <Text className="text-lg font-bold text-[#1F2A33] mb-4">
        Customer Reviews
      </Text>
      {reviews.map((review, index) => (
        <View
          key={getReviewKey(review, index)}
          className="flex-row items-start mb-6"
        >
          <Image
            source={{
              uri: getReviewerImage(review),
            }}
            style={{ height: 50, width: 50, borderRadius: 100 }}
            contentFit="cover"
          />
          <View className="flex-1 ml-4">
            <Text className="text-sm font-semibold text-[#1F2A33] mb-1">
              {getReviewerName(review)}
            </Text>

            <View className="flex-row items-center mb-2">
              <View className="flex-row items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name="star"
                    size={14}
                    color={
                      star <= getReviewRating(review) ? "#FFC107" : "#E5E7EB"
                    }
                    style={{ marginRight: 2 }}
                  />
                ))}
              </View>
              <Text className="text-xs text-gray-400 ml-2">
                {getReviewDate(review)}
              </Text>
            </View>

            <Text className="text-[#7A7A7A] text-sm leading-5">
              {getReviewComment(review)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};
