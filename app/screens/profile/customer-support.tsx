import { Ionicons } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "../../../stores/stores";

export default function CustomerSupportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const scrollViewRef = useRef<ScrollView>(null);
  const {
    fetchMessages,
    fetchConversations,
    createConversation,
    createSupportTicket,
    sendMessage,
    sendMessageToProvider,
    user,
    isLoading,
  } = useStore() as any;

  const [conversationId, setConversationId] = useState<string | null>(
    (params.conversationId as string) || null,
  );
  const [providerId] = useState<string | null>(
    (params.providerId as string) || "69814b5b4d784da531fb6517",
  );

  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<
    { uri: string; type: "image" | "video" }[]
  >([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [prevMessageCount, setPrevMessageCount] = useState(0);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (messages.length > prevMessageCount) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
      setPrevMessageCount(messages.length);
    }
  }, [messages.length]);

  useEffect(() => {
    loadData();

    // Set up polling for new messages every 3 seconds for better real-time feel
    const interval = setInterval(() => {
      if (conversationId) {
        refreshMessages();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [conversationId, user]);

  const loadData = async () => {
    try {
      if (conversationId) {
        await refreshMessages();
      } else if (providerId) {
        // Try to find if there's an existing conversation or create a new one
        console.log("Creating/Fetching conversation for providerId:", providerId);
        const data = await createConversation(providerId);
        console.log("createConversation data:", JSON.stringify(data, null, 2));

        if (data) {
          const id = data.id || data._id;
          console.log("Extracted conversationId:", id);
          if (id) {
            setConversationId(id);
          }
        }

        // Create support ticket when entering
        if (user) {
          console.log("Creating support ticket for user:", user?.id || user?._id);
          createSupportTicket({
            userId: user?.id || user?._id,
            userType: "Customer",
            subject: "Cannot update menu items",
            description: "I am trying to change the price of my pizza but it failsgfgtgertertretrert.",
            priority: "Medium",
          }).catch((err: any) => console.log("Silent ticket creation error:", err));
        }
      } else {
        // Fallback: try to fetch all conversations
        const result = await fetchConversations();
        const convs = result?.conversations || result || [];

        if (convs.length > 0) {
          const targetConv = convs[0];
          setConversationId(targetConv.id || targetConv._id);
        }
      }
    } catch (error) {
      console.log("loadData error:", error);
    }
  };

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      },
    );

    return () => {
      keyboardDidShowListener.remove();
    };
  }, []);

  const refreshMessages = async () => {
    if (!conversationId) return;
    try {
      const data = await fetchMessages(conversationId);
      if (data && (data.messages || Array.isArray(data))) {
        const rawMessages = data.messages || (Array.isArray(data) ? data : []);
        const formattedMessages = rawMessages.map((m: any) => ({
          id: m.id || m._id || m.messageId || Math.random().toString(),
          text: m.content || m.text || m.message || "",
          // Improved isSupport logic: True if sender is Admin, Super Admin, Provider or not the current user
          isSupport:
            m.sender?.role === "ADMIN" ||
            m.sender?.role === "SUPER_ADMIN" ||
            m.sender?.role === "PROVIDER" ||
            m.senderId === providerId ||
            (!!m.senderId && m.senderId !== user?.id && m.senderId !== user?._id),
          time: new Date(m.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          attachments: m.attachmentUrl
            ? [{ uri: m.attachmentUrl, type: 'image' }]
            : (m.attachments || (m.imageUrl ? [{ uri: m.imageUrl, type: 'image' }] : [])),
        }));

        setMessages(formattedMessages);
      }
    } catch (e) {
      console.log("Polling error:", e);
    }
  };

  // Request permissions
  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Sorry, we need camera roll permissions to make this work!",
      );
      return false;
    }
    return true;
  };

  // Show media selection options
  const showMediaOptions = () => {
    Alert.alert("Select Media", "Choose what you want to send", [
      {
        text: "📷 Take Photo",
        onPress: takePhoto,
      },
      {
        text: "🖼️ Choose from Library",
        onPress: pickImage,
      },
      {
        text: "🎥 Record Video",
        onPress: recordVideo,
      },
      {
        text: "📹 Choose Video from Library",
        onPress: pickVideo,
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  };

  // Take photo
  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAttachments([
        ...attachments,
        { uri: result.assets[0].uri, type: "image" },
      ]);
    }
  };

  // Pick image from library
  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAttachments([
        ...attachments,
        { uri: result.assets[0].uri, type: "image" },
      ]);
    }
  };

  // Record video
  const recordVideo = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAttachments([
        ...attachments,
        { uri: result.assets[0].uri, type: "video" },
      ]);
    }
  };

  // Pick video from library
  const pickVideo = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAttachments([
        ...attachments,
        { uri: result.assets[0].uri, type: "video" },
      ]);
    }
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  // Send message with attachments
  const handleSendMessage = async () => {
    if (!message.trim() && attachments.length === 0) return;

    const currentMessage = message.trim();
    const currentAttachments = [...attachments];

    // Optimistic Update: Add message to list immediately
    const tempId = Date.now().toString();
    const optimisticMessage = {
      id: tempId,
      text: currentMessage,
      isSupport: false,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      attachments: currentAttachments,
      sending: true,
    };

    setMessages((prev) => [
      ...prev.filter((m) => m.id !== "welcome"),
      optimisticMessage,
    ]);
    setMessage("");
    setAttachments([]);

    // Scroll to bottom
    setTimeout(
      () => scrollViewRef.current?.scrollToEnd({ animated: true }),
      100,
    );

    try {
      let result;
      // We always use sendMessageToProvider because the user confirmed
      // /api/chat/message/customer-to-provider is the working endpoint in Postman
      if (providerId) {
        result = await sendMessageToProvider(
          providerId,
          currentMessage,
          currentAttachments,
        );

        // If the API returns the new conversation ID or we need to sync
        const newConvId =
          result?.data?.conversationId ||
          result?.conversationId ||
          result?.data?.id;

        if (newConvId && !conversationId) {
          setConversationId(newConvId);
        }
      } else {
        throw new Error("Missing provider ID");
      }

      if (result) {
        // Update optimistic message with real messageId from API
        const responseData = result.data;
        if (responseData) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId
                ? {
                  ...m,
                  id: responseData.messageId || responseData.id,
                  sending: false,
                }
                : m,
            ),
          );
        }

        if (!conversationId) {
          // If first message, we need to refresh to get the new conversationId
          const list = await fetchConversations();
          const convs = list?.conversations || [];
          if (convs.length > 0) {
            const target = providerId
              ? convs.find(
                (c: any) =>
                  c.providerId === providerId ||
                  c.provider?.id === providerId,
              )
              : convs[0];
            if (target) setConversationId(target.id || target._id);
          }
        } else {
          await refreshMessages();
        }
      }
    } catch (error: any) {
      console.log("Error sending message:", error);
      Alert.alert("Error", error.message || "Failed to send message properly.");
      // Remove the optimistic message if it failed
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setMessage(currentMessage);
      setAttachments(currentAttachments);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FDFBF7]">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center justify-center pt-4 pb-6 relative px-6">
        <TouchableOpacity
          onPress={() => router.back()}
          className="absolute left-6 z-10 w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm"
        >
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-gray-900">
          Customer Support
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 25}
        className="flex-1"
      >
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingVertical: 20 }}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
        >
          {/* Dynamic Chat Messages */}
          {messages.map((msg) => (
            <View key={msg.id} className="mb-4">
              <View
                className={`flex-row ${msg.isSupport ? "justify-start" : "justify-end"}`}
              >
                <View
                  className={`max-w-[80%] ${msg.isSupport ? "order-2" : "order-1"}`}
                >
                  <View
                    className={`rounded-2xl px-4 py-3 ${msg.isSupport
                      ? "bg-white rounded-tl-none shadow-sm"
                      : "bg-[#F3F4F6] rounded-tr-none"
                      }`}
                  >
                    <Text className="text-gray-700 leading-5">{msg.text}</Text>
                    {msg.sending && (
                      <ActivityIndicator
                        size="small"
                        color="#FFC107"
                        style={{ marginTop: 4 }}
                      />
                    )}

                    {/* Message Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <View className="mt-2">
                        {msg.attachments.map(
                          (attachment: any, index: number) => (
                            <View key={index} className="mb-2">
                              {attachment.type === "image" ? (
                                <Image
                                  source={{ uri: attachment.uri }}
                                  className=" h-32 w-32 rounded-xl"
                                  resizeMode="cover"
                                />
                              ) : (
                                <View className="relative">
                                  <Video
                                    source={{ uri: attachment.uri }}
                                    className="w-44 h-44 rounded-xl"
                                    useNativeControls
                                    resizeMode={ResizeMode.COVER}
                                    isLooping
                                    shouldPlay={false}
                                  />
                                </View>
                              )}
                            </View>
                          ),
                        )}
                      </View>
                    )}
                  </View>
                  <Text
                    className={`text-xs text-gray-500 mt-1 ${msg.isSupport ? "text-left" : "text-right"
                      }`}
                  >
                    {msg.time}
                  </Text>
                </View>
              </View>
            </View>
          ))}

          {/* WhatsApp-style Attachment Preview Above Send Button */}
          {attachments.length > 0 && (
            <View className="mb-4">
              <View className="bg-white rounded-2xl p-3 shadow-sm">
                <View className="flex-row flex-wrap gap-2">
                  {attachments.map((attachment, index) => (
                    <View key={index} className="relative">
                      {attachment.type === "image" ? (
                        <Image
                          source={{ uri: attachment.uri }}
                          className="w-16 h-16 rounded-lg"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="relative">
                          <Video
                            source={{ uri: attachment.uri }}
                            className="w-20 h-20 rounded-lg"
                            resizeMode={ResizeMode.COVER}
                            shouldPlay={false}
                            isMuted
                          />
                          <View className="absolute inset-0 bg-black bg-opacity-30 rounded-lg items-center justify-center">
                            <Ionicons name="play" size={12} color="white" />
                          </View>
                        </View>
                      )}
                      <TouchableOpacity
                        onPress={() => removeAttachment(index)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full items-center justify-center"
                      >
                        <Ionicons name="close" size={10} color="white" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Typing indicator placeholder (only shown if loading) */}
          {isLoading && messages.length === 0 && (
            <View className="self-start bg-white rounded-2xl rounded-tl-none px-4 py-3 shadow-sm mb-4">
              <View className="flex-row gap-1">
                <View className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                <View className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                <View className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
              </View>
            </View>
          )}

          {/* Space at bottom for input */}
          <View className="h-4" />
        </ScrollView>

        {/* Input Field */}
        <View className="px-6 pb-6 bg-white border-t border-gray-100">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={showMediaOptions}
              className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
            >
              <Ionicons name="add" size={24} color="#6B7280" />
            </TouchableOpacity>
            <View className="flex-1 bg-gray-50 rounded-full px-4 py-3">
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Type here..."
                placeholderTextColor="#9CA3AF"
                className="text-gray-900"
                multiline
              />
            </View>
            <TouchableOpacity
              onPress={handleSendMessage}
              className={`w-10 h-10 rounded-full items-center justify-center shadow-sm ${message.trim() || attachments.length > 0
                ? "bg-[#FFC107]"
                : "bg-gray-300"
                }`}
            >
              <Ionicons
                name="send"
                size={18}
                color={
                  message.trim() || attachments.length > 0 ? "#fff" : "#8E8E93"
                }
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}