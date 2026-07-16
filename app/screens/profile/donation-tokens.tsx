import { useStore } from "@/stores/stores";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import { useRouter, useFocusEffect } from "expo-router";
import * as Sharing from "expo-sharing";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type DonationToken = {
  _id?: string;
  tokenId?: string;
  donationOrderId?: string;
  mealCount?: number;
  pricePerMeal?: number;
  platformFee?: number;
  stateTax?: number;
  totalPaid?: number;
  status?: string;
  claimedByUserId?: string | null;
  claimedAt?: string | null;
  claimedOrderId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type DonationSummary = {
  total: number;
  available: number;
  claimed: number;
};

const formatMoney = (value?: number) =>
  `$${Number(value || 0).toFixed(2)}`;

const formatDate = (value?: string | null, fallback = "Not available") => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString();
};

const escapeHtml = (value: unknown) => {
  const text = value === null || value === undefined ? "" : String(value);
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const buildPdfHtml = (tokens: DonationToken[], summary: DonationSummary) => {
  const rows = tokens
    .map(
      (token) => `
        <tr>
          <td><span class="token-id">${escapeHtml(token.tokenId || "N/A")}</span></td>
          <td><span class="status ${String(token.status || "").toLowerCase()}">${escapeHtml(token.status || "available")}</span></td>
          <td>${escapeHtml(token.mealCount || 0)}</td>
          <td>${escapeHtml(formatMoney(token.pricePerMeal))}</td>
          <td>${escapeHtml(formatMoney(token.platformFee))}</td>
          <td>${escapeHtml(formatMoney(token.stateTax))}</td>
          <td><strong>${escapeHtml(formatMoney(token.totalPaid))}</strong></td>
          <td>${escapeHtml(token.donationOrderId || "N/A")}</td>
          <td>${escapeHtml(formatDate(token.createdAt))}</td>
          <td>${escapeHtml(formatDate(token.claimedAt, "-"))}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          :root {
            --primary: #FBBF24;
            --primary-dark: #D97706;
            --text-main: #111827;
            --text-muted: #6B7280;
            --bg-light: #F9FAFB;
            --border: #E5E7EB;
            --success-bg: #ECFDF5;
            --success-text: #059669;
            --gray-bg: #F3F4F6;
            --gray-text: #374151;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 40px;
            color: var(--text-main);
            font-family: 'Inter', sans-serif;
            background-color: #ffffff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid var(--primary);
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
            color: var(--text-main);
          }
          .header p {
            margin: 4px 0 0;
            color: var(--text-muted);
            font-size: 14px;
          }
          .brand {
            text-align: right;
          }
          .brand-name {
            font-size: 24px;
            font-weight: 700;
            color: var(--primary-dark);
            letter-spacing: -0.5px;
          }
          .summary {
            display: flex;
            gap: 20px;
            margin-bottom: 40px;
          }
          .metric {
            flex: 1;
            background: var(--bg-light);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 20px;
            text-align: center;
          }
          .metric .label {
            color: var(--text-muted);
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
          }
          .metric .value {
            font-size: 32px;
            font-weight: 700;
            color: var(--text-main);
          }
          .metric.available .value {
            color: var(--success-text);
          }
          table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            font-size: 12px;
            border: 1px solid var(--border);
            border-radius: 12px;
            overflow: hidden;
          }
          thead {
            background: var(--bg-light);
          }
          th {
            color: var(--gray-text);
            text-align: left;
            font-weight: 600;
            padding: 12px 16px;
            border-bottom: 1px solid var(--border);
            white-space: nowrap;
          }
          td {
            padding: 12px 16px;
            border-bottom: 1px solid var(--border);
            vertical-align: middle;
          }
          tr:last-child td {
            border-bottom: none;
          }
          .token-id {
            font-family: monospace;
            background: var(--gray-bg);
            padding: 4px 8px;
            border-radius: 4px;
            color: var(--gray-text);
            font-size: 11px;
          }
          .status {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 99px;
            font-size: 11px;
            font-weight: 600;
            text-transform: capitalize;
          }
          .status.available {
            background: var(--success-bg);
            color: var(--success-text);
          }
          .status.claimed {
            background: var(--gray-bg);
            color: var(--gray-text);
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            color: var(--text-muted);
            font-size: 12px;
            border-top: 1px solid var(--border);
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>Donation Tokens Report</h1>
            <p>Generated on ${escapeHtml(formatDate(new Date().toISOString()))}</p>
          </div>
          <div class="brand">
            <div class="brand-name">Dine Five</div>
            <p style="margin:0; font-size: 12px; color: var(--text-muted);">Thank you for your generosity</p>
          </div>
        </div>

        <div class="summary">
          <div class="metric">
            <div class="label">Total Tokens</div>
            <div class="value">${escapeHtml(summary.total)}</div>
          </div>
          <div class="metric available">
            <div class="label">Available</div>
            <div class="value">${escapeHtml(summary.available)}</div>
          </div>
          <div class="metric">
            <div class="label">Claimed</div>
            <div class="value">${escapeHtml(summary.claimed)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Token ID</th>
              <th>Status</th>
              <th>Meals</th>
              <th>Price/Meal</th>
              <th>Fee</th>
              <th>Tax</th>
              <th>Total Paid</th>
              <th>Order Ref</th>
              <th>Created Date</th>
              <th>Claimed Date</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="10" style="text-align:center; padding: 20px; color: var(--text-muted);">No donation tokens found.</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          This document is a generated report of your donation tokens on the Dine Five platform.<br>
          For any inquiries, please contact support@dinefive.com.
        </div>
      </body>
    </html>
  `;
};

const getStatusStyle = (status?: string) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "claimed") {
    return {
      bg: "bg-gray-100",
      text: "text-gray-700",
      label: "Claimed",
    };
  }

  return {
    bg: "bg-green-50",
    text: "text-green-700",
    label: "Available",
  };
};

export default function DonationTokensScreen() {
  const router = useRouter();
  const { fetchDonationTokens } = useStore() as any;
  const [tokens, setTokens] = useState<DonationToken[]>([]);
  const [summary, setSummary] = useState<DonationSummary>({
    total: 0,
    available: 0,
    claimed: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadTokens = useCallback(
    async (refreshing = false) => {
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const result = await fetchDonationTokens();
        if (!result || result?.success === false) {
          throw new Error(result?.message || "Failed to load donation tokens");
        }

        const nextTokens = Array.isArray(result?.data?.tokens)
          ? result.data.tokens
          : [];
        const nextSummary = result?.data?.summary || {};

        setTokens(nextTokens);
        setSummary({
          total: Number(nextSummary.total || nextTokens.length || 0),
          available: Number(nextSummary.available || 0),
          claimed: Number(nextSummary.claimed || 0),
        });
        setCurrentPage(1); // Reset to first page on reload
      } catch (error: any) {
        console.log("Donation tokens load error:", error);
        Alert.alert("Error", error.message || "Could not load donation tokens");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [fetchDonationTokens],
  );

  useFocusEffect(
    useCallback(() => {
      loadTokens();
    }, [loadTokens]),
  );

  const handleDownload = async () => {
    if (tokens.length === 0) {
      Alert.alert("No tokens", "There are no donation tokens to download.");
      return;
    }

    const fileName = `dine-five-donation-tokens-${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`;

    setIsDownloading(true);
    try {
      const html = buildPdfHtml(tokens, summary);
      if (Platform.OS === "web") {
        await Print.printAsync({ html });
        return;
      }

      const { uri } = await Print.printToFileAsync({ html });
      const namedUri = FileSystem.cacheDirectory
        ? `${FileSystem.cacheDirectory}${fileName}`
        : uri;

      if (namedUri !== uri) {
        const existingFile = await FileSystem.getInfoAsync(namedUri);
        if (existingFile.exists) {
          await FileSystem.deleteAsync(namedUri);
        }

        await FileSystem.copyAsync({
          from: uri,
          to: namedUri,
        });
      }

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(namedUri, {
          mimeType: "application/pdf",
          UTI: "com.adobe.pdf",
          dialogTitle: "Download donation tokens PDF",
        });
        return;
      }

      Alert.alert("PDF ready", `Your PDF was created: ${namedUri}`);
    } catch (error: any) {
      console.log("Donation tokens download error:", error);
      Alert.alert("Error", error.message || "Could not download PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FDFBF7]">
      <StatusBar style="dark" />

      <View className="flex-row items-center justify-center px-4 pb-5 pt-2">
        <TouchableOpacity
          onPress={() => router.back()}
          className="absolute left-4 z-10 h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
        >
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-xl font-heading text-gray-900">Donation Tokens</Text>
        <TouchableOpacity
          onPress={handleDownload}
          disabled={tokens.length === 0 || isDownloading}
          className={`absolute right-4 z-10 h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ${
            tokens.length === 0 || isDownloading ? "opacity-50" : ""
          }`}
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color="#111827" />
          ) : (
            <Ionicons name="download-outline" size={22} color="#111827" />
          )}
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center px-6">
          <ActivityIndicator size="large" color="#111827" />
          <Text className="mt-4 text-gray-500">Loading donation tokens...</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadTokens(true)}
              tintColor="#111827"
            />
          }
        >
          <View className="mb-5 flex-row gap-3">
            <View className="flex-1 rounded-lg bg-white p-4 shadow-sm">
              <Text className="text-xs font-body-semibold uppercase text-gray-500">
                Total
              </Text>
              <Text className="mt-2 text-2xl font-heading text-gray-900">
                {summary.total}
              </Text>
            </View>
            <View className="flex-1 rounded-lg bg-white p-4 shadow-sm">
              <Text className="text-xs font-body-semibold uppercase text-gray-500">
                Available
              </Text>
              <Text className="mt-2 text-2xl font-heading text-green-700">
                {summary.available}
              </Text>
            </View>
            <View className="flex-1 rounded-lg bg-white p-4 shadow-sm">
              <Text className="text-xs font-body-semibold uppercase text-gray-500">
                Claimed
              </Text>
              <Text className="mt-2 text-2xl font-heading text-gray-900">
                {summary.claimed}
              </Text>
            </View>
          </View>

          {tokens.length === 0 ? (
            <View className="items-center rounded-lg bg-white px-6 py-10 shadow-sm">
              <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-yellow-100">
                <Ionicons name="gift-outline" size={26} color="#92400E" />
              </View>
              <Text className="text-lg font-heading text-gray-900">
                No donation tokens yet
              </Text>
              <Text className="mt-2 text-center text-gray-500">
                Your donated meal tokens will appear here.
              </Text>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/screens/cart/checkout",
                    params: { mealCount: "1", type: "donation" },
                  } as any)
                }
                className="mt-6 rounded-lg bg-yellow-400 px-6 py-3"
              >
                <Text className="font-body-bold text-gray-900">Donate a meal</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {tokens
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((token) => {
                  const statusStyle = getStatusStyle(token.status);
                  return (
                    <View
                      key={token._id || token.tokenId}
                      className="mb-3 rounded-lg bg-white p-4 shadow-sm"
                    >
                      <View className="mb-3 flex-row items-start justify-between gap-3">
                        <View className="flex-1">
                          <Text className="text-xs font-body-semibold uppercase text-gray-500">
                            Token ID
                          </Text>
                          <Text
                            selectable
                            className="mt-1 text-sm font-body-semibold text-gray-900"
                          >
                            {token.tokenId || "Not available"}
                          </Text>
                        </View>
                        <View className={`rounded-full px-3 py-1 ${statusStyle.bg}`}>
                          <Text className={`text-xs font-body-semibold ${statusStyle.text}`}>
                            {statusStyle.label}
                          </Text>
                        </View>
                      </View>

                      <View className="mb-3 flex-row justify-between">
                        <Text className="text-gray-500">Meals</Text>
                        <Text className="font-body-semibold text-gray-900">
                          {token.mealCount || 0}
                        </Text>
                      </View>
                      <View className="mb-3 flex-row justify-between">
                        <Text className="text-gray-500">Total Paid</Text>
                        <Text className="font-body-semibold text-gray-900">
                          {formatMoney(token.totalPaid)}
                        </Text>
                      </View>
                      <View className="mb-3 flex-row justify-between">
                        <Text className="text-gray-500">Price per meal</Text>
                        <Text className="font-body-semibold text-gray-900">
                          {formatMoney(token.pricePerMeal)}
                        </Text>
                      </View>
                      <View className="mb-3 flex-row justify-between">
                        <Text className="text-gray-500">Platform Fee</Text>
                        <Text className="font-body-semibold text-gray-900">
                          {formatMoney(token.platformFee)}
                        </Text>
                      </View>
                      <View className="mb-3 flex-row justify-between">
                        <Text className="text-gray-500">State Tax</Text>
                        <Text className="font-body-semibold text-gray-900">
                          {formatMoney(token.stateTax)}
                        </Text>
                      </View>
                      <View className="mb-3 border-t border-gray-100 pt-3">
                        <Text className="text-xs font-body-semibold uppercase text-gray-500">
                          Donation Order
                        </Text>
                        <Text selectable className="mt-1 text-xs text-gray-700">
                          {token.donationOrderId || "Not available"}
                        </Text>
                      </View>
                      <View className="flex-row justify-between">
                        <Text className="text-gray-500">Created</Text>
                        <Text className="max-w-[65%] text-right text-gray-900">
                          {formatDate(token.createdAt)}
                        </Text>
                      </View>
                      <View className="mt-3 flex-row justify-between">
                        <Text className="text-gray-500">Claimed At</Text>
                        <Text className="max-w-[65%] text-right text-gray-900">
                          {formatDate(token.claimedAt, "Not claimed")}
                        </Text>
                      </View>
                    </View>
                  );
                })}

              {/* Pagination Controls */}
              {tokens.length > itemsPerPage && (
                <View className="mt-4 flex-row items-center justify-between border-t border-gray-100 pt-6">
                  <TouchableOpacity
                    onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={`h-10 w-24 items-center justify-center rounded-lg bg-white shadow-sm ${
                      currentPage === 1 ? "opacity-50" : ""
                    }`}
                  >
                    <Text className="font-body-semibold text-gray-700">Previous</Text>
                  </TouchableOpacity>

                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm font-heading text-gray-900">
                      Page {currentPage}
                    </Text>
                    <Text className="text-sm text-gray-500">
                      of {Math.ceil(tokens.length / itemsPerPage)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() =>
                      setCurrentPage((p) =>
                        Math.min(Math.ceil(tokens.length / itemsPerPage), p + 1),
                      )
                    }
                    disabled={currentPage >= Math.ceil(tokens.length / itemsPerPage)}
                    className={`h-10 w-24 items-center justify-center rounded-lg bg-white shadow-sm ${
                      currentPage >= Math.ceil(tokens.length / itemsPerPage)
                        ? "opacity-50"
                        : ""
                    }`}
                  >
                    <Text className="font-body-semibold text-gray-700">Next</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
