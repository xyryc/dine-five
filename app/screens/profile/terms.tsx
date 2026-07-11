import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import RenderHtml from "react-native-render-html";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiUrl } from "@/utils/api";

interface LegalDocument {
  id: string;
  DocumentName: string;
  documentKey: string;
  LastUpdated: string;
  Status: string;
  content: string;
}

export default function TermsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [document, setDocument] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const fetchTerms = async () => {
      const url = apiUrl("/api/v1/legal/terms-and-conditions");
      console.log("[Terms] Fetching URL:", url, "| attempt:", retryCount + 1);

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(url);
        console.log("[Terms] Response status:", response.status, response.statusText);

        if (!response.ok) {
          const body = await response.text().catch(() => "(could not read body)");
          console.error("[Terms] Error body:", body);
          throw new Error(`Request failed with status ${response.status}`);
        }

        const json = await response.json();
        console.log("[Terms] Response JSON:", JSON.stringify(json).slice(0, 300));

        if (!json.success || !json.data) {
          throw new Error("Invalid response from server");
        }

        console.log("[Terms] Document loaded:", json.data.DocumentName, "|", json.data.LastUpdated);
        setDocument(json.data);
      } catch (err: any) {
        console.error("[Terms] Fetch error:", err);
        setError(err?.message ?? "Failed to load Terms & Conditions");
      } finally {
        setLoading(false);
      }
    };

    fetchTerms();
  }, [retryCount]);

  const htmlTagStyles = {
    h1: {
      fontSize: 20,
      fontWeight: "700" as const,
      color: "#1a1a1a",
      marginBottom: 8,
      marginTop: 4,
    },
    h2: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: "#1f2937",
      marginBottom: 6,
      marginTop: 20,
    },
    p: {
      fontSize: 14,
      color: "#4b5563",
      lineHeight: 22,
      marginBottom: 10,
    },
    li: {
      fontSize: 14,
      color: "#6b7280",
      lineHeight: 22,
      marginBottom: 4,
    },
    a: {
      color: "#f97316",
    },
    hr: {
      marginTop: 16,
      marginBottom: 4,
    },
    strong: {
      color: "#1f2937",
    },
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FDFBF7]">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center justify-center pt-2 pb-6 relative px-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="absolute left-4 z-10 w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm"
        >
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">
          Terms &amp; Conditions
        </Text>
      </View>

      {/* Body */}
      {loading ? (
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator size="large" color="#f97316" />
          <Text className="text-gray-400 text-sm">Loading Terms &amp; Conditions...</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8 gap-4">
          <Ionicons name="alert-circle-outline" size={48} color="#f87171" />
          <Text className="text-gray-700 font-semibold text-base text-center">
            Failed to load Terms &amp; Conditions
          </Text>
          <Text className="text-gray-400 text-sm text-center">{error}</Text>
          <TouchableOpacity
            onPress={() => {
              console.log("[Terms] Retry pressed, attempt:", retryCount + 2);
              setDocument(null);
              setError(null);
              setRetryCount((c) => c + 1);
            }}
            className="bg-orange-500 px-6 py-2 rounded-full"
          >
            <Text className="text-white font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : document ? (
        <ScrollView
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 48 }}
        >
          {/* Last updated badge */}
          <View className="flex-row items-center gap-1 mb-4">
            <Ionicons name="time-outline" size={13} color="#9ca3af" />
            <Text className="text-xs text-gray-400">
              Last updated:{" "}
              {new Date(document.LastUpdated).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </View>

          <RenderHtml
            contentWidth={width - 40}
            source={{ html: document.content }}
            tagsStyles={htmlTagStyles}
          />
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}
