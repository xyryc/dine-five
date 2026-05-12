import { cardStore, Card } from "@/utils/cardStore";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { 
  Alert, 
  Modal, 
  ScrollView, 
  Switch, 
  Text, 
  TouchableOpacity, 
  View 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PaymentScreen() {
  const router = useRouter();
  const [cards, setCards] = useState(cardStore.getAllCards());
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showModal, setShowModal] = useState(false);

  const refreshCards = () => {
    setCards(cardStore.getAllCards());
  };

  useEffect(() => {
    refreshCards();
  }, []);

  const handleCardPress = (card: Card) => {
    setSelectedCard(card);
    setShowModal(true);
  };

  const handleToggleDefault = (value: boolean) => {
    if (selectedCard) {
      if (value) {
        cardStore.setDefaultCard(selectedCard.id);
      } else {
        // In this implementation, turning off default just keeps it as is 
        // until another card is picked
        cardStore.setDefaultCard(selectedCard.id);
      }
      refreshCards();
      setSelectedCard({ ...selectedCard, isDefault: value });
    }
  };

  const handleDelete = () => {
    if (selectedCard) {
      Alert.alert("Delete Card", "Are you sure you want to remove this card?", [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => {
            cardStore.removeCard(selectedCard.id);
            setShowModal(false);
            refreshCards();
          }
        },
      ]);
    }
  };

  const defaultCard = cards.find((card: any) => card.isDefault);
  const otherCards = cards.filter((card: any) => !card.isDefault);

  const CardRow = ({ card, isDefault }: { card: Card; isDefault?: boolean }) => (
    <TouchableOpacity 
      onPress={() => handleCardPress(card)}
      activeOpacity={0.6}
      className="bg-white p-5 rounded-2xl mb-4 flex-row justify-between items-center border border-gray-100 shadow-sm"
    >
      <View className="flex-row items-center">
        <View className={`w-10 h-10 ${isDefault ? 'bg-yellow-50' : 'bg-gray-50'} rounded-lg items-center justify-center mr-3`}>
          <Ionicons name="card" size={20} color={isDefault ? "#FFC107" : "#9CA3AF"} />
        </View>
        <View>
          <Text className="text-base font-bold text-gray-900">
            {card.cardholderName}
          </Text>
          <Text className="text-gray-500 text-xs mt-0.5">{card.cardNumber}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </TouchableOpacity>
  );

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
        <Text className="text-xl font-bold text-gray-900">Payment</Text>

        <TouchableOpacity
          onPress={() => router.push("/screens/profile/add-card")}
          className="absolute right-4 w-10 h-10 bg-[#FFC107] rounded-full items-center justify-center shadow-sm"
        >
          <Ionicons name="add" size={24} color="#332701" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        {defaultCard && (
          <View className="mb-6">
            <Text className="text-gray-500 text-[10px] uppercase font-bold mb-3 ml-1 tracking-widest">Default Method</Text>
            <CardRow card={defaultCard} isDefault={true} />
          </View>
        )}

        {otherCards.length > 0 && (
          <View>
            <Text className="text-gray-500 text-[10px] uppercase font-bold mb-3 ml-1 tracking-widest">Other Methods</Text>
            {otherCards.map((card: any) => (
              <CardRow key={card.id} card={card} />
            ))}
          </View>
        )}

        {cards.length === 0 && (
          <View className="items-center justify-center py-20">
            <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-4">
               <Ionicons name="card-outline" size={32} color="#D1D5DB" />
            </View>
            <Text className="text-gray-400 text-center font-semibold">No cards added yet</Text>
          </View>
        )}
      </ScrollView>

      {/* Card Details Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-[40px] px-8 pt-8 pb-10 shadow-2xl">
            <View className="w-12 h-1.5 bg-gray-100 rounded-full self-center mb-8" />
            
            <View className="flex-row justify-between items-center mb-8">
              <Text className="text-2xl font-bold text-gray-900">Card Details</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} className="bg-gray-50 p-1 rounded-full">
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {selectedCard && (
              <View>
                {/* Visual Card Component */}
                <View className="bg-[#1A1A1A] p-7 rounded-[32px] mb-8 shadow-2xl">
                  <View className="flex-row justify-between items-start mb-12">
                     <View className="flex-row items-center">
                        <View className="w-8 h-8 bg-red-500 rounded-full opacity-80 mr-[-12] border border-white/20" />
                        <View className="w-8 h-8 bg-yellow-500 rounded-full opacity-80 border border-white/20" />
                     </View>
                    <Text className="text-white/60 font-bold italic tracking-tighter text-base">DineFive</Text>
                  </View>
                  
                  <Text className="text-white text-2xl font-medium tracking-[4px] mb-8">
                    {selectedCard.cardNumber}
                  </Text>
                  
                  <View className="flex-row justify-between items-end">
                    <View>
                      <Text className="text-white/40 text-[9px] uppercase font-bold tracking-widest mb-1">Card Holder</Text>
                      <Text className="text-white font-bold text-sm">{selectedCard.cardholderName}</Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-white/40 text-[9px] uppercase font-bold tracking-widest mb-1">Expires</Text>
                      <Text className="text-white font-bold text-sm">{selectedCard.expirationDate}</Text>
                    </View>
                  </View>
                </View>

                {/* Settings Section */}
                <View className="bg-gray-50 rounded-3xl p-5 mb-8 flex-row justify-between items-center">
                  <View className="flex-row items-center">
                    <View className={`p-2 rounded-xl ${selectedCard.isDefault ? 'bg-yellow-100' : 'bg-gray-100'}`}>
                      <Ionicons name="star" size={18} color={selectedCard.isDefault ? "#FFC107" : "#9CA3AF"} />
                    </View>
                    <View className="ml-4">
                       <Text className="text-gray-900 font-bold text-base">Default Payment</Text>
                       <Text className="text-gray-400 text-xs">Use this card for quick checkout</Text>
                    </View>
                  </View>
                  <Switch
                    trackColor={{ false: "#E5E7EB", true: "#FFC107" }}
                    thumbColor="white"
                    onValueChange={handleToggleDefault}
                    value={selectedCard.isDefault}
                  />
                </View>

                {/* Delete Trigger */}
                <TouchableOpacity 
                  onPress={handleDelete}
                  activeOpacity={0.6}
                  className="bg-red-50 py-5 rounded-3xl flex-row items-center justify-center border border-red-100"
                >
                  <Ionicons name="trash" size={18} color="#EF4444" style={{marginRight: 10}} />
                  <Text className="text-red-500 font-bold text-base">Remove Payment Method</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
