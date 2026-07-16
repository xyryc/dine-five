import GradientButton from "@/components/GradientButton";
import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

type DonateConfirmHandler = (mealCount: any) => void;

interface DonateModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: DonateConfirmHandler;
}

export const DonateModal = ({ visible, onClose, onConfirm }: DonateModalProps) => {
  const [selectedMealCount, setSelectedMealCount] = useState("1");
  const [customMealCount, setCustomMealCount] = useState("");

  const mealCounts = ["1", "3", "5", "10", "20", "Custom"];

  const handleMealCountPress = (mealCount: string) => {
    if (mealCount === "Custom" && selectedMealCount === "Custom") {
      setSelectedMealCount("1");
    } else {
      setSelectedMealCount(mealCount);
    }
  };

  const handleConfirm = () => {
    const finalMealCount =
      selectedMealCount === "Custom" ? customMealCount : selectedMealCount;
    const parsedMealCount = Math.floor(Number(finalMealCount));

    if (!Number.isFinite(parsedMealCount) || parsedMealCount < 1) {
      Alert.alert("Invalid meal count", "Please enter at least 1 meal.");
      return;
    }

    onConfirm(parsedMealCount);
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.modalContainer}>
          {/* Backdrop */}
          <Pressable
            style={styles.backdrop}
            onPress={onClose}
          />

          {/* Content */}
          <View style={styles.modalContent}>
            {/* Title */}
            <Text className="text-xl font-heading text-[#1F2937] mb-2">
              Donate a meal
            </Text>

            {/* Description */}
            <Text className="text-base font-body text-gray-500 leading-5 mb-5">
              Your donation helps provide meals to people in need. Select how many meals you want to donate.
            </Text>

            {/* Meal Count Selection */}
            <View style={styles.amountContainer}>
              {mealCounts.map((mealCount) => (
                <TouchableOpacity
                  key={mealCount}
                  onPress={() => handleMealCountPress(mealCount)}
                  style={[
                    styles.amountButton,
                    { width: mealCount === "Custom" ? 70 : 42 },
                    selectedMealCount === mealCount && styles.amountButtonSelected
                  ]}
                >
                  <Text className="font-body-semibold" style={[
                    { fontSize: 15, color: selectedMealCount === mealCount ? '#1F2937' : '#6B7280' },
                  ]}>
                    {mealCount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom Meal Count Input */}
            {selectedMealCount === "Custom" && (
              <View className="mb-5">
                <TextInput
                  value={customMealCount}
                  onChangeText={setCustomMealCount}
                  placeholder="e.g. 12"
                  keyboardType="numeric"
                  style={styles.customInput}
                  placeholderTextColor="#9CA3AF"
                  autoFocus={true}
                />
              </View>
            )}

            {/* Confirm Button */}
            <View className="">
              <GradientButton
                title="Continue to Payment"
                onPress={handleConfirm}
                className="w-full"
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 16,
    marginBottom: 20,
  },
  amountContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    padding: 3,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    gap: 4,
  },
  amountButton: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  amountButtonSelected: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  amountText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  amountTextSelected: {
    color: '#1F2937',
  },
  customInput: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },
});
