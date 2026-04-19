import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
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
import { useStorage, ChatMessage, ChatChannel, Member } from "@/context/StorageContext";
import { useColors } from "@/hooks/useColors";
import { genId, formatRelative } from "@/utils/helpers";
import { persistImage } from "@/utils/persistImage";

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, updateChatMessages, updateChatChannels, softDelete } = useStorage();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(
    data.members[0]?.id ?? null,
  );
  const [text, setText] = useState("");
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [showPinned, setShowPinned] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState("general");
  const [addingChannel, setAddingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const listRef = useRef<FlatList>(null);
  const channelScrollRef = useRef<ScrollView>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 0 : insets.bottom;
  const usesNativeTabs = isLiquidGlassAvailable();
  const TAB_BAR_HEIGHT = Platform.OS === "web" ? 84 : usesNativeTabs ? 0 : 60 + bottomInset;
  const tabClearance = usesNativeTabs ? bottomInset : TAB_BAR_HEIGHT;
  const inputPaddingBottom = usesNativeTabs ? bottomInset + 10 : 10;

  const selectedMember = useMemo(
    () => data.members.find((m) => m.id === selectedMemberId),
    [data.members, selectedMemberId],
  );

  const channels = useMemo(() => data.chatChannels ?? [], [data.chatChannels]);

  const activeChannel = useMemo(
    () => channels.find((c) => c.id === activeChannelId) ?? channels[0],
    [channels, activeChannelId],
  );

  const messages = useMemo(() => {
    const channelMsgs = data.chatMessages.filter(
      (m) => (m.channelId ?? "general") === activeChannelId,
    );
    return showPinned ? channelMsgs.filter((m) => m.isPinned) : channelMsgs;
  }, [data.chatMessages, activeChannelId, showPinned]);

  const pinnedCount = useMemo(
    () =>
      data.chatMessages.filter(
        (m) => m.isPinned && (m.channelId ?? "general") === activeChannelId,
      ).length,
    [data.chatMessages, activeChannelId],
  );

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: false });
      }, 50);
    }
  }, [messages.length, activeChannelId]);

  const switchChannel = (id: string) => {
    setActiveChannelId(id);
    setShowPinned(false);
    setReplyTo(null);
  };

  const createChannel = () => {
    const name = newChannelName.trim().toLowerCase().replace(/\s+/g, "-");
    if (!name) return;
    if (channels.some((c) => c.name === name)) {
      Alert.alert("Channel exists", `#${name} already exists.`);
      return;
    }
    const channel: ChatChannel = { id: genId(), name, createdAt: Date.now() };
    updateChatChannels([...channels, channel]);
    setActiveChannelId(channel.id);
    setNewChannelName("");
    setAddingChannel(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => channelScrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const deleteChannel = (id: string) => {
    if (id === "general") {
      Alert.alert("Can't delete", "The general channel can't be removed.");
      return;
    }
    Alert.alert(
      "Delete channel",
      "This will also delete all messages in this channel. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            updateChatChannels(channels.filter((c) => c.id !== id));
            updateChatMessages(data.chatMessages.filter((m) => (m.channelId ?? "general") !== id));
            setActiveChannelId("general");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ],
    );
  };

  const sendMessage = () => {
    if (!text.trim() || !selectedMemberId) return;
    const msg: ChatMessage = {
      id: genId(),
      memberId: selectedMemberId,
      channelId: activeChannelId,
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
      const uri = await persistImage(result.assets[0].uri);
      const msg: ChatMessage = {
        id: genId(),
        memberId: selectedMemberId,
        channelId: activeChannelId,
        content: "",
        imageUri: uri,
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
    const msg = data.chatMessages.find((m) => m.id === id);
    Alert.alert("Delete Message", "Move this message to recently deleted?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          if (msg) softDelete(msg.id, "message", msg);
          updateChatMessages(data.chatMessages.filter((m) => m.id !== id));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
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
      {/* ── Header ── */}
      <View
        style={[
          styles.header,
          { paddingTop: topInset + 12, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>
          Inner Chat
        </Text>
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

      {/* ── Channel Strip ── */}
      <View style={[styles.channelBar, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <ScrollView
          ref={channelScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.channelScroll}
        >
          {channels.map((ch) => {
            const isActive = ch.id === activeChannelId;
            return (
              <TouchableOpacity
                key={ch.id}
                style={[
                  styles.channelPill,
                  isActive
                    ? { backgroundColor: colors.primary }
                    : { backgroundColor: colors.secondary },
                ]}
                onPress={() => switchChannel(ch.id)}
                onLongPress={() => deleteChannel(ch.id)}
              >
                <Text
                  style={[
                    styles.channelPillText,
                    { color: isActive ? colors.primaryForeground : colors.mutedForeground },
                  ]}
                >
                  #{ch.name}
                </Text>
              </TouchableOpacity>
            );
          })}

          {addingChannel ? (
            <View style={[styles.channelInput, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.channelHash, { color: colors.mutedForeground }]}>#</Text>
              <TextInput
                autoFocus
                style={[styles.channelTextInput, { color: colors.foreground }]}
                placeholder="channel-name"
                placeholderTextColor={colors.mutedForeground}
                value={newChannelName}
                onChangeText={setNewChannelName}
                onSubmitEditing={createChannel}
                onBlur={() => {
                  if (!newChannelName.trim()) setAddingChannel(false);
                }}
                returnKeyType="done"
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={createChannel} hitSlop={8}>
                <Feather name="check" size={14} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setAddingChannel(false); setNewChannelName(""); }} hitSlop={8}>
                <Feather name="x" size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.addChannelBtn, { backgroundColor: colors.secondary }]}
              onPress={() => setAddingChannel(true)}
            >
              <Feather name="plus" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </ScrollView>
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
              { paddingBottom: tabClearance + 70 },
            ]}
            onContentSizeChange={() => {
              listRef.current?.scrollToEnd({ animated: false });
            }}
            ListEmptyComponent={
              <EmptyState
                icon="message-circle"
                title={`No messages in #${activeChannel?.name ?? "general"}`}
                subtitle="Start the conversation!"
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
                  bottom: tabClearance + 56,
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
                paddingBottom: inputPaddingBottom,
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
              placeholder={`Message #${activeChannel?.name ?? "general"}...`}
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
                  bottom: tabClearance + 66,
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
  channelBar: {
    borderBottomWidth: 1,
  },
  channelScroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  channelPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  channelPillText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  channelInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    minWidth: 130,
  },
  channelHash: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  channelTextInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },
  addChannelBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
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
