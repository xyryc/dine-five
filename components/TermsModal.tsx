import Feather from "@expo/vector-icons/Feather";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import RenderHtml from "react-native-render-html";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { apiUrl } from "@/utils/api";

type ModalType = "terms" | "privacy";

interface TermsModalProps {
  visible: boolean;
  type: ModalType;
  onClose: () => void;
}

interface LegalDocument {
  id: string;
  DocumentName: string;
  documentKey: string;
  LastUpdated: string;
  Status: string;
  content: string;
}

const ENDPOINTS: Record<ModalType, string> = {
  terms: "/api/v1/legal/terms-and-conditions",
  privacy: "/api/v1/legal/privacy-policy",
};

const htmlTagStyles = {
  h1: { fontSize: 18, fontWeight: "700" as const, color: "#1a1a1a", marginBottom: 8, marginTop: 4 },
  h2: { fontSize: 15, fontWeight: "700" as const, color: "#1f2937", marginBottom: 6, marginTop: 16 },
  p: { fontSize: 13, color: "#4b5563", lineHeight: 20, marginBottom: 8 },
  li: { fontSize: 13, color: "#6b7280", lineHeight: 20, marginBottom: 4 },
  a: { color: "#D32F1E" },
  strong: { color: "#1f2937" },
};

const TermsModal: React.FC<TermsModalProps> = ({ visible, type, onClose }) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [document, setDocument] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;

    const fetchDocument = async () => {
      setLoading(true);
      setError(null);
      setDocument(null);

      try {
        const url = apiUrl(ENDPOINTS[type]);
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const json = await response.json();

        if (!json.success || !json.data) {
          throw new Error("Invalid response from server");
        }

        setDocument(json.data);
      } catch (err: any) {
        setError(err?.message ?? "Failed to load document");
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [visible, type]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.safeArea, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconBadge}>
              <Feather
                name={type === "terms" ? "file-text" : "shield"}
                size={18}
                color="#D32F1E"
              />
            </View>
            <View>
              <Text style={styles.headerTitle}>
                {type === "terms" ? "Terms & Conditions" : "Privacy Policy"}
              </Text>
              {document && (
                <Text style={styles.lastUpdated}>
                  Last updated:{" "}
                  {new Date(document.LastUpdated).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Feather name="x" size={20} color="#1F2A33" />
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Content */}
        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#D32F1E" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContent}>
            <Feather name="alert-circle" size={36} color="#f87171" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : document ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <RenderHtml
              contentWidth={width - 40}
              source={{ html: document.content }}
              tagsStyles={htmlTagStyles}
            />
          </ScrollView>
        ) : null}

        {/* Accept Button */}
        <View style={styles.acceptContainer}>
          <TouchableOpacity style={styles.acceptBtn} onPress={onClose}>
            <Feather name="check-circle" size={18} color="#fff" />
            <Text style={styles.acceptBtnText}>I Understand</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 10,
    backgroundColor: "#fff",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFF3F3",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2A33",
    letterSpacing: -0.3,
  },
  lastUpdated: {
    fontSize: 11,
    color: "#9E9E9E",
    marginTop: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#EDEDED",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: "#9E9E9E",
    fontSize: 13,
  },
  errorText: {
    color: "#6b7280",
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  acceptContainer: {
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#EDEDED",
  },
  acceptBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#D32F1E",
    paddingVertical: 14,
    borderRadius: 50,
  },
  acceptBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});

export default TermsModal;
