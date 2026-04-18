import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MemberAvatar } from "@/components/MemberAvatar";
import { EmptyState } from "@/components/EmptyState";
import { useStorage, ChatMessage, Member } from "@/context/StorageContext";
import { useColors } from "@/hooks/useColors";
import { genId, formatRelative } from "@/utils/helpers";

const TAB_BAR_HEIGHT = Platform.OS === "web" ? 84 : 0;

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, updateChatMessages } = useStorage();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(
    data.members[0]?.id ?? null,
  );
  const [text, setText] = useState("");
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [showPinned, setShowPinned] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 0 : insets.bottom;

  const selectedMember = useMemo(
    () => data.members.find((m) => m.id === selectedMemberId),
    [data.members, selectedMemberId],
  );

  // Chronological order (oldest first) — scroll to end to see newest
  const messages = useMemo(
    () =>
      showPinned
        ? data.chatMessages.filter((m) => m.isPinned)
        : [...data.chatMessages],
    [data.chatMessages, showPinned],
  );

  const pinnedCount = useMemo(
    () => data.chatMessages.filter((m) => m.isPinned).length,
    [data.chatMessages],
  );

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: false });
      }, 50);
    }
  }, [messages.length]);

  const sendMessage = () => {
    if (!text.trim() || !selectedMemberId) return;
    const msg: ChatMessage = {
      id: genId(),
      memberId: selectedMemberId,
      content: text.trim(),
      isPinned: false,
      replyTo: replyTo ?? undefined,
      createdAt: Date.now(),
      reactions: [],
    };
    updateChatMessages([...data.chatMessages, msg]);
    setText("");
    setReplyTo(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0] && selectedMemberId) {
      const msg: ChatMessage = {
        id: genId(),
        memberId: selectedMemberId,
        content: "",
        imageUri: result.assets[0].uri,
        isPinned: false,
        createdAt: Date.now(),
        reactions: [],
      };
      updateChatMessages([...data.chatMessages, msg]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const togglePin = (id: string) => {
    updateChatMessages(
      data.chatMessages.map((m) => (m.id === id ? { ...m, isPinned: !m.isPinned } : m)),
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const deleteMessage = (id: string) => {
    updateChatMessages(data.chatMessages.filter((m) => m.id !== id));
  };

  const getMember = (id: string): Member | undefined =>
    data.members.find((m) => m.id === id);

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const sender = getMember(item.memberId);
    const replyMsg = item.replyTo ? data.chatMessages.find((m) => m.id === item.replyTo) : null;
    const replyMember = replyMsg ? getMember(replyMsg.memberId) : null;

    return (
      <TouchableOpacity
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setReplyTo(item.id);
        }}
        activeOpacity={0.85}
      >
        <View style={styles.messageRow}>
          {sender && (
            <MemberAvatar
              name={sender.name}
              color={sender.color}
              profileImage={sender.profileImage}
              size={32}
              style={styles.msgAvatar}
            />
          )}
          <View style={styles.messageBubbleWrap}>
            <View style={styles.msgHeader}>
              <Text style={[styles.senderName, { color: sender?.color ?? colors.primary }]}>
                {sender?.name ?? "Unknown"}
              </Text>
              <Text style={[styles.msgTime, { color: colors.mutedForeground }]}>
                {formatRelative(item.createdAt)}
              </Text>
              <TouchableOpacity onPress={() => togglePin(item.id)} hitSlop={8}>
                <Feather
                  name="bookmark"
                  size={14}
                  color={item.isPinned ? colors.primary : colors.mutedForeground}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteMessage(item.id)} hitSlop={8}>
                <Feather name="trash-2" size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {replyMsg && (
              <View
                style={[
                  styles.replyPreview,
                  { backgroundColor: colors.muted, borderLeftColor: replyMember?.color ?? colors.primary },
                ]}
              >
                <Text style={[styles.replyName, { color: replyMember?.color ?? colors.primary }]}>
                  {replyMember?.name ?? "Unknown"}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.replyText, { color: colors.mutedForeground }]}
                >
                  {replyMsg.content || "📷 Image"}
                </Text>
              </View>
            )}

            {item.content ? (
              <Text style={[styles.msgContent, { color: colors.foreground }]}>
                {item.content}
              </Text>
            ) : null}

            {item.imageUri && (
              <Image
                source={{ uri: item.imageUri }}
                style={styles.msgImage}
                contentFit="cover"
              />
            )}

            {item.isPinned && (
              <View style={[styles.pinnedIndicator, { backgroundColor: colors.primary + "22" }]}>
                <Feather name="bookmark" size={10} color={colors.primary} />
                <Text style={[styles.pinnedText, { color: colors.primary }]}>Pinned</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topInset + 12, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Inner Chat</Text>
        <View style={styles.headerRight}>
          {pinnedCount > 0 && (
            <TouchableOpacity
              style={[
                styles.pinnedBtn,
                { backgroundColor: showPinned ? colors.primary : colors.secondary },
              ]}
              onPress={() => setShowPinned((v) => !v)}
            >
              <Feather
                name="bookmark"
                size={15}
                color={showPinned ? colors.primaryForeground : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.pinnedBtnText,
                  { color: showPinned ? colors.primaryForeground : colors.mutedForeground },
                ]}
              >
                {pinnedCount}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {data.members.length === 0 ? (
        <EmptyState
          icon="message-circle"
          title="No members yet"
          subtitle="Add members first to use inner chat"
        />
      ) : (
        <>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.messageList,
              { paddingBottom: TAB_BAR_HEIGHT + bottomInset + 70 },
            ]}
            onContentSizeChange={() => {
              listRef.current?.scrollToEnd({ animated: false });
            }}
            ListEmptyComponent={
              <EmptyState
                icon="message-circle"
                title="No messages yet"
                subtitle="Start the inner chat!"
              />
            }
          />

          {replyTo && (
            <View
              style={[
                styles.replyBar,
                {
                  backgroundColor: colors.secondary,
                  borderTopColor: colors.border,
                  bottom: TAB_BAR_HEIGHT + bottomInset + 56,
                },
              ]}
            >
              <Feather name="corner-up-left" size={16} color={colors.primary} />
              <Text style={[styles.replyBarText, { color: colors.mutedForeground }]} numberOfLines={1}>
                {data.chatMessages.find((m) => m.id === replyTo)?.content ?? "Image"}
              </Text>
              <TouchableOpacity onPress={() => setReplyTo(null)}>
                <Feather name="x" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          )}

          <View
            style={[
              styles.inputRow,
              {
                backgroundColor: colors.card,
                borderTopColor: colors.border,
                paddingBottom: bottomInset + 10,
                bottom: TAB_BAR_HEIGHT,
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.memberPickerBtn, { backgroundColor: colors.secondary }]}
              onPress={() => setShowMemberPicker((v) => !v)}
            >
              {selectedMember ? (
                <MemberAvatar
                  name={selectedMember.name}
                  color={selectedMember.color}
                  profileImage={selectedMember.profileImage}
                  size={32}
                />
              ) : (
                <Feather name="user" size={18} color={colors.mutedForeground} />
              )}
            </TouchableOpacity>

            <TextInput
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.secondary }]}
              placeholder="Message..."
              placeholderTextColor={colors.mutedForeground}
              value={text}
              onChangeText={setText}
              multiline
            />

            <TouchableOpacity onPress={pickImage} style={[styles.attachBtn, { backgroundColor: colors.secondary }]}>
              <Feather name="image" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sendBtn,
                { backgroundColor: text.trim() ? colors.primary : colors.muted },
              ]}
              onPress={sendMessage}
              disabled={!text.trim()}
            >
              <Feather
                name="send"
                size={18}
                color={text.trim() ? colors.primaryForeground : colors.mutedForeground}
              />
            </TouchableOpacity>
          </View>

          {showMemberPicker && (
            <View
              style={[
                styles.memberPicker,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  bottom: TAB_BAR_HEIGHT + bottomInset + 66,
                },
              ]}
            >
              {data.members
                .filter((m) => !m.isArchived)
                .map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.pickerItem,
                      selectedMemberId === m.id && { backgroundColor: colors.secondary },
                    ]}
                    onPress={() => {
                      setSelectedMemberId(m.id);
                      setShowMemberPicker(false);
                    }}
                  >
                    <MemberAvatar name={m.name} color={m.color} profileImage={m.profileImage} size={28} />
                    <Text style={[styles.pickerName, { color: colors.foreground }]}>{m.name}</Text>
                    {selectedMemberId === m.id && (
                      <Feather name="check" size={16} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  pinnedBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  pinnedBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  messageList: { paddingHorizontal: 16, paddingTop: 12 },
  messageRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
    alignItems: "flex-start",
  },
  msgAvatar: { marginTop: 2 },
  messageBubbleWrap: { flex: 1 },
  msgHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  senderName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  msgTime: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  msgContent: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  msgImage: { width: 180, height: 130, borderRadius: 10, marginTop: 4 },
  replyPreview: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 6,
  },
  replyName: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  replyText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  pinnedIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  pinnedText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  replyBar: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    zIndex: 10,
  },
  replyBarText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  inputRow: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 8,
    borderTopWidth: 1,
    zIndex: 10,
  },
  memberPickerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    maxHeight: 100,
  },
  attachBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  memberPicker: {
    position: "absolute",
    left: 12,
    right: 12,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    zIndex: 100,
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  pickerName: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
});
