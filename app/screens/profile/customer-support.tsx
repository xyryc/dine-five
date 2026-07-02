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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "../../../stores/stores";

export default function CustomerSupportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const {
    fetchMessages,
    fetchConversations,
    createConversation,
    createSupportTicket,
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
  }, [messages.length, prevMessageCount]);

  useEffect(() => {
    loadData();

    // Set up polling for new messages every 3 seconds for better real-time feel
    const interval = setInterval(() => {
      if (conversationId) {
        refreshMessages();
      }
    }, 3000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <SafeAreaView className="flex-1 bg-[#FBF9F6]" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-3 pb-3 border-b border-gray-100 bg-white">
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          className="w-10 h-10 bg-white rounded-full items-center justify-center border border-gray-100 shadow-sm"
        >
          <Ionicons name="chevron-back" size={20} color="#1F2937" />
        </TouchableOpacity>
        
        <View className="items-center">
          <Text className="text-base font-bold text-gray-900">
            Support Chat
          </Text>
          <View className="flex-row items-center mt-0.5">
            <View className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
            <Text className="text-[11px] font-semibold text-gray-400">
              Agent Online
            </Text>
          </View>
        </View>

        <View className="w-10" />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 50 : 0}
        className="flex-1"
      >
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-4"
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
                <View className="max-w-[78%]">
                  <View
                    className={`rounded-2xl px-4 py-3 border ${
                      msg.isSupport
                        ? "bg-white border-gray-100 rounded-tl-none shadow-xs"
                        : "bg-[#FFF8E7] border-[#FFE8B5] rounded-tr-none shadow-xs"
                    }`}
                  >
                    <View className="flex-row items-center gap-x-2">
                      <Text className="text-[15px] font-medium text-gray-800 leading-5 flex-shrink">
                        {msg.text}
                      </Text>

                      {msg.sending && (
                        <ActivityIndicator
                          size="small"
                          color="#E29E10"
                          style={{ transform: [{ scale: 0.8 }] }}
                        />
                      )}
                    </View>

                    {/* Message Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <View className="mt-2.5 flex-row flex-wrap gap-2">
                        {msg.attachments.map((attachment: any, index: number) => (
                          <View key={index} className="rounded-xl overflow-hidden border border-gray-100 shadow-xs">
                            {attachment.type === "image" ? (
                              <Image
                                source={{ uri: attachment.uri }}
                                className="h-36 w-36"
                                resizeMode="cover"
                              />
                            ) : (
                              <View className="relative">
                                <Video
                                  source={{ uri: attachment.uri }}
                                  className="w-36 h-36"
                                  useNativeControls
                                  resizeMode={ResizeMode.COVER}
                                  isLooping
                                  shouldPlay={false}
                                />
                              </View>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                  <Text
                    className={`text-[10px] font-bold text-gray-400 mt-1.5 ml-1 ${
                      msg.isSupport ? "text-left" : "text-right"
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
              <View className="bg-white rounded-3xl p-4 border border-gray-100 shadow-md">
                <View className="flex-row flex-wrap gap-3">
                  {attachments.map((attachment, index) => (
                    <View key={index} className="relative">
                      {attachment.type === "image" ? (
                        <Image
                          source={{ uri: attachment.uri }}
                          className="w-16 h-16 rounded-xl border border-gray-100"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="relative">
                          <Video
                            source={{ uri: attachment.uri }}
                            className="w-16 h-16 rounded-xl"
                            resizeMode={ResizeMode.COVER}
                            shouldPlay={false}
                            isMuted
                          />
                          <View className="absolute inset-0 bg-black/30 rounded-xl items-center justify-center">
                            <Ionicons name="play" size={12} color="white" />
                          </View>
                        </View>
                      )}
                      <TouchableOpacity
                        onPress={() => removeAttachment(index)}
                        activeOpacity={0.8}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full items-center justify-center border border-white shadow-xs"
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
            <View className="self-start bg-white rounded-2xl rounded-tl-none px-4 py-3 border border-gray-100 shadow-xs mb-4">
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
        <View 
          className="p-4 bg-white border-t border-gray-100"
          style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }}
        >
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={showMediaOptions}
              activeOpacity={0.7}
              className="w-11 h-11 bg-gray-50 rounded-full items-center justify-center border border-gray-100"
            >
              <Ionicons name="add" size={24} color="#E29E10" />
            </TouchableOpacity>
            
            <View className="flex-1 bg-gray-50 rounded-3xl px-4 py-2.5 border border-gray-100 max-h-24">
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Type your message..."
                placeholderTextColor="#9CA3AF"
                className="text-gray-900 text-[15px] font-medium p-0"
                multiline
              />
            </View>

            <TouchableOpacity
              onPress={handleSendMessage}
              activeOpacity={0.8}
              disabled={!message.trim() && attachments.length === 0}
              className={`w-11 h-11 rounded-full items-center justify-center shadow-md ${
                message.trim() || attachments.length > 0
                  ? "bg-[#E29E10]"
                  : "bg-gray-200"
              }`}
            >
              <Ionicons
                name="send"
                size={18}
                color="#ffffff"
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}