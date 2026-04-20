import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
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
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { ReactionBar, toggleReaction } from "@/components/ReactionBar";
import { useStorage, ForumReply, ForumPost } from "@/context/StorageContext";
import { useColors } from "@/hooks/useColors";
import { genId, formatRelative } from "@/utils/helpers";

export default function ForumDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, updateForumPosts, softDelete } = useStorage();
  const [replyText, setReplyText] = useState("");
  const [replierMemberId, setReplierMemberId] = useState(
    data.members.find((m) => !m.isArchived)?.id ?? data.members[0]?.id ?? "",
  );
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const post = useMemo(() => data.forumPosts.find((p) => p.id === id), [data.forumPosts, id]);
  const author = post ? data.members.find((m) => m.id === post.memberId) : null;
  const replier = data.members.find((m) => m.id === replierMemberId);

  if (!post) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState icon="message-square" title="Post not found" />
      </View>
    );
  }

  const vote = (optionId: string) => {
    updateForumPosts(
      (data.forumPosts ?? []).map((p) =>
        p.id === id
          ? {
              ...p,
              pollOptions: p.pollOptions?.map((o) =>
                o.id === optionId
                  ? o.votes.includes(replierMemberId)
                    ? { ...o, votes: o.votes.filter((v) => v !== replierMemberId) }
                    : { ...o, votes: [...o.votes, replierMemberId] }
                  : o,
              ),
            }
          : p,
      ),
    );
  };

  const sendReply = () => {
    if (!replyText.trim() || !replierMemberId) return;
    const reply: ForumReply = {
      id: genId(),
      memberId: replierMemberId,
      content: replyText.trim(),
      createdAt: Date.now(),
      reactions: [],
    };
    updateForumPosts(
      (data.forumPosts ?? []).map((p) =>
        p.id === id ? { ...p, replies: [...p.replies, reply], updatedAt: Date.now() } : p,
      ),
    );
    setReplyText("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const togglePostReaction = (emoji: string) => {
    updateForumPosts(
      (data.forumPosts ?? []).map((p) =>
        p.id !== id ? p : {
          ...p,
          reactions: toggleReaction(p.reactions ?? [], emoji, replierMemberId),
        },
      ),
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleReplyReaction = (replyId: string, emoji: string) => {
    updateForumPosts(
      (data.forumPosts ?? []).map((p) =>
        p.id !== id ? p : {
          ...p,
          replies: p.replies.map((r) =>
            r.id !== replyId ? r : {
              ...r,
              reactions: toggleReaction(r.reactions ?? [], emoji, replierMemberId),
            },
          ),
        },
      ),
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const deletePost = () => setShowDeleteConfirm(true);

  const confirmDeletePost = () => {
    setShowDeleteConfirm(false);
    softDelete(post.id, "forum", post);
    updateForumPosts(data.forumPosts.filter((p) => p.id !== id));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    router.back();
  };

  const totalVotes = post.pollOptions?.reduce((acc, o) => acc + o.votes.length, 0) ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ConfirmSheet
        visible={showDeleteConfirm}
        title="Delete Post"
        message="Move this post to recently deleted? This can be undone within 30 days."
        confirmLabel="Delete"
        onConfirm={confirmDeletePost}
        onCancel={() => setShowDeleteConfirm(false)}
      />
      <View
        style={[
          styles.topBar,
          { paddingTop: topInset + 12, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: colors.foreground }]} numberOfLines={1}>
          {post.title}
        </Text>
        <TouchableOpacity onPress={deletePost} hitSlop={8}>
          <Feather name="trash-2" size={20} color={colors.destructive} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={post.replies}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={() => (
          <View style={styles.postContent}>
            {author && (
              <View style={styles.authorRow}>
                <MemberAvatar name={author.name} color={author.color} profileImage={author.profileImage} size={32} />
                <View>
                  <Text style={[styles.authorName, { color: author.color }]}>{author.name}</Text>
                  <Text style={[styles.postDate, { color: colors.mutedForeground }]}>
                    {formatRelative(post.createdAt)}
                  </Text>
                </View>
              </View>
            )}
            <Text style={[styles.postTitle, { color: colors.foreground }]}>{post.title}</Text>
            {post.content ? (
              <Text style={[styles.postBody, { color: colors.foreground }]}>{post.content}</Text>
            ) : null}

            {post.type === "poll" && post.pollOptions && (
              <View style={[styles.pollSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.pollLabel, { color: colors.mutedForeground }]}>Poll · {totalVotes} votes</Text>
                {post.pollOptions.map((opt) => {
                  const pct = totalVotes > 0 ? opt.votes.length / totalVotes : 0;
                  const voted = opt.votes.includes(replierMemberId);
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.pollOption, { borderColor: voted ? colors.primary : colors.border }]}
                      onPress={() => vote(opt.id)}
                    >
                      <View
                        style={[
                          styles.pollBar,
                          { backgroundColor: colors.primary + "22", width: `${pct * 100}%` as any },
                        ]}
                      />
                      <Text style={[styles.pollOptionText, { color: colors.foreground }]}>{opt.text}</Text>
                      <Text style={[styles.pollPct, { color: colors.mutedForeground }]}>
                        {Math.round(pct * 100)}%
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <ReactionBar
              reactions={post.reactions ?? []}
              currentMemberId={replierMemberId}
              onToggle={togglePostReaction}
            />

            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.repliesLabel, { color: colors.mutedForeground }]}>
              {post.replies.length} Replies
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={[styles.noReplies, { color: colors.mutedForeground }]}>
            No replies yet. Be the first!
          </Text>
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        renderItem={({ item: reply }) => {
          const replyAuthor = data.members.find((m) => m.id === reply.memberId);
          return (
            <View style={[styles.replyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {replyAuthor && (
                <View style={styles.replyHeader}>
                  <MemberAvatar name={replyAuthor.name} color={replyAuthor.color} profileImage={replyAuthor.profileImage} size={28} />
                  <Text style={[styles.replyAuthor, { color: replyAuthor.color }]}>{replyAuthor.name}</Text>
                  <Text style={[styles.replyDate, { color: colors.mutedForeground }]}>
                    {formatRelative(reply.createdAt)}
                  </Text>
                </View>
              )}
              <Text style={[styles.replyContent, { color: colors.foreground }]}>{reply.content}</Text>
              <ReactionBar
                reactions={reply.reactions ?? []}
                currentMemberId={replierMemberId}
                onToggle={(emoji) => toggleReplyReaction(reply.id, emoji)}
              />
            </View>
          );
        }}
      />

      <View
        style={[
          styles.inputRow,
          { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 8 },
        ]}
      >
        <TouchableOpacity
          style={[styles.memberBtn, { backgroundColor: colors.secondary }]}
          onPress={() => setShowMemberPicker((v) => !v)}
        >
          {replier ? (
            <MemberAvatar name={replier.name} color={replier.color} size={30} />
          ) : (
            <Feather name="user" size={16} color={colors.mutedForeground} />
          )}
        </TouchableOpacity>
        <TextInput
          style={[styles.input, { color: colors.foreground, backgroundColor: colors.secondary }]}
          value={replyText}
          onChangeText={setReplyText}
          placeholder="Add a reply..."
          placeholderTextColor={colors.mutedForeground}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: replyText.trim() ? colors.primary : colors.muted }]}
          onPress={sendReply}
          disabled={!replyText.trim()}
        >
          <Feather name="send" size={16} color={replyText.trim() ? colors.primaryForeground : colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {showMemberPicker && (
        <View
          style={[styles.memberPicker, { backgroundColor: colors.card, borderColor: colors.border, bottom: (Platform.OS === "web" ? 34 : insets.bottom) + 65 }]}
        >
          {data.members.filter((m) => !m.isArchived).map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[styles.pickerItem, replierMemberId === m.id && { backgroundColor: colors.secondary }]}
              onPress={() => { setReplierMemberId(m.id); setShowMemberPicker(false); }}
            >
              <MemberAvatar name={m.name} color={m.color} profileImage={m.profileImage} size={26} />
              <Text style={[styles.pickerName, { color: colors.foreground }]}>{m.name}</Text>
              {replierMemberId === m.id && <Feather name="check" size={14} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  topTitle: { flex: 1, fontSize: 16, fontFamily: "Inter_600SemiBold" },
  postContent: { paddingTop: 16, gap: 10 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  authorName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  postDate: { fontSize: 12, fontFamily: "Inter_400Regular" },
  postTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  postBody: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  pollSection: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 8 },
  pollLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 4 },
  pollOption: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", overflow: "hidden", position: "relative" },
  pollBar: { position: "absolute", top: 0, left: 0, bottom: 0, borderRadius: 10 },
  pollOptionText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", zIndex: 1 },
  pollPct: { fontSize: 13, fontFamily: "Inter_500Medium", zIndex: 1 },
  divider: { height: 1, marginVertical: 8 },
  repliesLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  noReplies: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 20 },
  replyCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8, gap: 6 },
  replyHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  replyAuthor: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  replyDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  replyContent: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 12, paddingTop: 10, gap: 8, borderTopWidth: 1 },
  memberBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 8, fontSize: 14, fontFamily: "Inter_400Regular", maxHeight: 100 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  memberPicker: { position: "absolute", left: 12, right: 12, borderRadius: 14, borderWidth: 1, overflow: "hidden", zIndex: 100 },
  pickerItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  pickerName: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
});
