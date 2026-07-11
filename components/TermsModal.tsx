import Feather from "@expo/vector-icons/Feather";
import React from "react";
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type ModalType = "terms" | "privacy";

interface TermsModalProps {
  visible: boolean;
  type: ModalType;
  onClose: () => void;
}

const TERMS_CONTENT = {
  terms: {
    title: "Terms & Conditions",
    lastUpdated: "Last updated: July 11, 2026",
    sections: [
      {
        heading: "1. Acceptance of Terms",
        body: "By accessing or using Dine Five, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our service. These terms apply to all users, including visitors, registered users, and restaurant partners.",
      },
      {
        heading: "2. Use of Service",
        body: "Dine Five provides a food ordering and delivery platform. You agree to use this service only for lawful purposes and in a way that does not infringe the rights of others. You must be at least 18 years old or have parental consent to use our service.",
      },
      {
        heading: "3. Account Registration",
        body: "You must provide accurate, complete, and current information when creating an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. Notify us immediately of any unauthorized use.",
      },
      {
        heading: "4. Orders and Payments",
        body: "By placing an order through Dine Five, you agree to pay all applicable fees including item prices, delivery fees, and taxes. Prices are subject to change without notice. All payments are processed securely through our payment partners.",
      },
      {
        heading: "5. Delivery Policy",
        body: "We strive to deliver orders on time, but delivery times are estimates and may vary due to traffic, weather, or restaurant preparation times. We are not liable for delays outside our reasonable control. Delivery areas are subject to change.",
      },
      {
        heading: "6. Cancellation & Refunds",
        body: "Orders may be cancelled within a limited window after placement. Refunds are processed according to our Refund Policy and may take 5–10 business days. We reserve the right to deny refund requests that do not meet our policy criteria.",
      },
      {
        heading: "7. Intellectual Property",
        body: "All content on Dine Five, including logos, text, images, and software, is the property of Dine Five or its licensors and is protected by applicable intellectual property laws. You may not reproduce or use any content without prior written consent.",
      },
      {
        heading: "8. Limitation of Liability",
        body: "Dine Five shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service. Our maximum liability shall not exceed the amount paid by you for the specific order giving rise to the claim.",
      },
      {
        heading: "9. Changes to Terms",
        body: "We reserve the right to modify these Terms at any time. We will notify users of significant changes. Continued use of the service after changes constitutes acceptance of the new Terms.",
      },
      {
        heading: "10. Contact Us",
        body: "If you have any questions about these Terms, please contact us at support@dinefive.com or through our in-app support channel.",
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    lastUpdated: "Last updated: July 11, 2026",
    sections: [
      {
        heading: "1. Information We Collect",
        body: "We collect information you provide directly (name, email, phone number, delivery address), information generated through your use of the service (order history, preferences, device data), and information from third parties (payment processors, social login providers).",
      },
      {
        heading: "2. How We Use Your Information",
        body: "We use your information to process orders and payments, deliver food to your address, send order updates and notifications, personalize your experience, improve our service, and comply with legal obligations. We never sell your personal data to third parties.",
      },
      {
        heading: "3. Location Data",
        body: "We collect your location to provide accurate delivery services and show you nearby restaurants. You can disable location access in your device settings, but this may limit certain features. We only collect location data while you use the app.",
      },
      {
        heading: "4. Data Sharing",
        body: "We share your information with restaurant partners to fulfill your orders, delivery partners to ensure delivery, payment processors to handle transactions, and analytics providers to improve our service. All partners are bound by strict data protection agreements.",
      },
      {
        heading: "5. Data Security",
        body: "We implement industry-standard security measures including encryption, secure servers, and regular audits to protect your personal information. However, no method of transmission over the internet is 100% secure. We encourage you to use strong, unique passwords.",
      },
      {
        heading: "6. Cookies & Tracking",
        body: "We use cookies and similar technologies to remember your preferences, analyze usage patterns, and provide personalized content. You can control cookie settings through your browser or device. Some features may not function properly if cookies are disabled.",
      },
      {
        heading: "7. Your Rights",
        body: "You have the right to access, correct, or delete your personal data. You may also request data portability or restrict processing of your data. To exercise these rights, contact us at privacy@dinefive.com. We will respond within 30 days.",
      },
      {
        heading: "8. Children's Privacy",
        body: "Dine Five is not directed at children under 13. We do not knowingly collect personal information from children. If we discover that a child has provided us with personal information, we will promptly delete it from our systems.",
      },
      {
        heading: "9. Data Retention",
        body: "We retain your personal data for as long as your account is active or as needed to provide services, comply with legal obligations, resolve disputes, and enforce our agreements. You may request account deletion at any time.",
      },
      {
        heading: "10. Contact & Questions",
        body: "For privacy-related concerns, contact our Data Protection Officer at privacy@dinefive.com or write to us at Dine Five, 123 Food Street, Dhaka, Bangladesh.",
      },
    ],
  },
};

const TermsModal: React.FC<TermsModalProps> = ({ visible, type, onClose }) => {
  const content = TERMS_CONTENT[type];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
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
              <Text style={styles.headerTitle}>{content.title}</Text>
              <Text style={styles.lastUpdated}>{content.lastUpdated}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Feather name="x" size={20} color="#1F2A33" />
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.introText}>
            Please read the following{" "}
            {type === "terms" ? "Terms and Conditions" : "Privacy Policy"}{" "}
            carefully before using Dine Five.
          </Text>

          {content.sections.map((section, index) => (
            <View key={index} style={styles.section}>
              <Text style={styles.sectionHeading}>{section.heading}</Text>
              <Text style={styles.sectionBody}>{section.body}</Text>
            </View>
          ))}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              © 2026 Dine Five. All rights reserved.
            </Text>
          </View>
        </ScrollView>

        {/* Accept Button */}
        <View style={styles.acceptContainer}>
          <TouchableOpacity style={styles.acceptBtn} onPress={onClose}>
            <Feather name="check-circle" size={18} color="#fff" />
            <Text style={styles.acceptBtnText}>I Understand</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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
    paddingTop: 16,
    paddingBottom: 12,
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
  introText: {
    fontSize: 14,
    color: "#555",
    lineHeight: 22,
    marginBottom: 20,
    backgroundColor: "#FFF8E1",
    padding: 14,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#FFC107",
  },
  section: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2A33",
    marginBottom: 6,
    letterSpacing: -0.1,
  },
  sectionBody: {
    fontSize: 13.5,
    color: "#4A4A4A",
    lineHeight: 21,
  },
  footer: {
    marginTop: 10,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#EDEDED",
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#BDBDBD",
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
