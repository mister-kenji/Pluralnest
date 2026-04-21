import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  Animated,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Line } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Image } from "expo-image";
import { MemberAvatar } from "@/components/MemberAvatar";
import { BoardLink, HeadspaceNode, Member, useStorage } from "@/context/StorageContext";
import { useColors } from "@/hooks/useColors";
import { genId } from "@/utils/helpers";
import { TYPE_META } from "@/app/headspace/index";

const NODE_W = 155;
const NODE_H = 90;
const MEMBER_W = 110;
const MEMBER_H = 86;
const PHOTO_W = 210;
const PHOTO_LABEL_H = 32;
const MAX_PHOTO_H = 270;

type Mode = "pan" | "connect";

export function HeadspaceBoard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    data,
    updateHeadspaceNodes,
    updateHeadspaceBoardNodeIds,
    updateHeadspaceBoardLinks,
    updateHeadspaceBoardMemberIds,
    updateMemberBoardPositions,
  } = useStorage();

  const boardNodeIds: string[] = data.headspaceBoardNodeIds ?? [];
  const boardLinks: BoardLink[] = data.headspaceBoardLinks ?? [];
  const boardMemberIds: string[] = data.headspaceBoardMemberIds ?? [];
  const memberBoardPositions: Record<string, { x: number; y: number }> =
    data.memberBoardPositions ?? {};

  const boardNodes = useMemo(
    () =>
      boardNodeIds
        .map((id) => data.headspaceNodes.find((n) => n.id === id))
        .filter((n): n is HeadspaceNode => !!n),
    [boardNodeIds, data.headspaceNodes],
  );

  const boardMembers = useMemo(
    () =>
      boardMemberIds
        .map((id) => data.members.find((m) => m.id === id))
        .filter((m): m is Member => !!m),
    [boardMemberIds, data.members],
  );

  const [mode, setMode] = useState<Mode>("pan");
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [localPos, setLocalPos] = useState<Record<string, { x: number; y: number }>>({});
  const [imageAspectRatios, setImageAspectRatios] = useState<Record<string, number>>({});
  const imageAspectRatiosRef = useRef<Record<string, number>>({});

  const canvasOffset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const canvasOffsetRef = useRef({ x: 0, y: 0 });
  const localPosRef = useRef<Record<string, { x: number; y: number }>>({});
  const boardLayoutRef = useRef({ width: 320, height: 500 });

  const boardNodesRef = useRef<HeadspaceNode[]>([]);
  boardNodesRef.current = boardNodes;
  const boardMembersRef = useRef<Member[]>([]);
  boardMembersRef.current = boardMembers;
  const boardMemberIdsRef = useRef<string[]>([]);
  boardMemberIdsRef.current = boardMemberIds;
  const memberBoardPositionsRef = useRef<Record<string, { x: number; y: number }>>({});
  memberBoardPositionsRef.current = memberBoardPositions;
  const modeRef = useRef<Mode>("pan");
  modeRef.current = mode;
  const connectFromRef = useRef<string | null>(null);
  connectFromRef.current = connectFrom;
  const selectedNodeIdRef = useRef<string | null>(null);
  selectedNodeIdRef.current = selectedNodeId;

  const getPos = (itemId: string): { x: number; y: number } => {
    if (localPosRef.current[itemId]) return localPosRef.current[itemId];
    if (localPos[itemId]) return localPos[itemId];
    // check member positions first
    if (memberBoardPositionsRef.current[itemId])
      return memberBoardPositionsRef.current[itemId];
    const n = data.headspaceNodes.find((x) => x.id === itemId);
    return { x: n?.x ?? 100, y: n?.y ?? 100 };
  };

  const isMemberId = (id: string) => boardMemberIdsRef.current.includes(id);

  const boardLinksRef = useRef<BoardLink[]>([]);
  boardLinksRef.current = boardLinks;
  const boardNodeIdsRef = useRef<string[]>([]);
  boardNodeIdsRef.current = boardNodeIds;
  const headspaceNodesRef = useRef<HeadspaceNode[]>([]);
  headspaceNodesRef.current = data.headspaceNodes;

  const handleNodeTapRef = useRef<(id: string) => void>(() => {});
  handleNodeTapRef.current = (itemId: string) => {
    if (modeRef.current === "connect") {
      if (!connectFromRef.current) {
        setConnectFrom(itemId);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (connectFromRef.current === itemId) {
        setConnectFrom(null);
      } else {
        const fromId = connectFromRef.current;
        const toId = itemId;
        const existing = boardLinksRef.current.find(
          (l) =>
            (l.fromId === fromId && l.toId === toId) ||
            (l.fromId === toId && l.toId === fromId),
        );
        if (existing) {
          updateHeadspaceBoardLinks(boardLinksRef.current.filter((l) => l.id !== existing.id));
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setConnectFrom(null);
        } else {
          const link: BoardLink = { id: genId(), fromId, toId };
          updateHeadspaceBoardLinks([...boardLinksRef.current, link]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setConnectFrom(toId);
        }
      }
    } else {
      setSelectedNodeId((prev) => (prev === itemId ? null : itemId));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const saveNodePosRef = useRef<(itemId: string, pos: { x: number; y: number }) => void>(
    () => {},
  );
  saveNodePosRef.current = (itemId: string, pos: { x: number; y: number }) => {
    if (boardMemberIdsRef.current.includes(itemId)) {
      updateMemberBoardPositions({ ...memberBoardPositionsRef.current, [itemId]: pos });
    } else {
      const updated = headspaceNodesRef.current.map((n) =>
        n.id === itemId ? { ...n, x: pos.x, y: pos.y } : n,
      );
      updateHeadspaceNodes(updated);
    }
  };

  const getNodeDims = (node: HeadspaceNode): { w: number; h: number } => {
    if (node.imageUri) {
      const ratio = imageAspectRatiosRef.current[node.imageUri];
      if (ratio) {
        const imgH = Math.min(PHOTO_W / ratio, MAX_PHOTO_H);
        return { w: PHOTO_W, h: Math.round(imgH) + PHOTO_LABEL_H };
      }
      return { w: PHOTO_W, h: Math.round(PHOTO_W * 0.75) + PHOTO_LABEL_H };
    }
    return { w: NODE_W, h: NODE_H };
  };
  const getNodeDimsRef = useRef(getNodeDims);
  getNodeDimsRef.current = getNodeDims;

  const dragState = useRef<{
    type: "canvas" | "node";
    nodeId?: string; // id of node OR member being dragged
    startVal: { x: number; y: number };
    moved: boolean;
  }>({ type: "canvas", startVal: { x: 0, y: 0 }, moved: false });

  const panResponder = useRef(
    PanResponder.create({
      // In connect mode let TouchableOpacity nodes handle taps; only claim
      // the responder from the start in pan mode (for drag/tap detection).
      onStartShouldSetPanResponder: () => modeRef.current === "pan",
      // In connect mode only claim for real drags (>8px) so TouchableOpacity
      // nodes can fire their onPress on normal taps.
      onMoveShouldSetPanResponder: (_, gs) =>
        modeRef.current === "pan" ||
        Math.abs(gs.dx) > 8 ||
        Math.abs(gs.dy) > 8,
      onPanResponderGrant: (evt, gs) => {
        // In connect mode we never drag nodes — always treat as canvas pan.
        // Subtract gs.dx/dy already accumulated before grant so there's no jump.
        if (modeRef.current === "connect") {
          dragState.current = {
            type: "canvas",
            startVal: {
              x: canvasOffsetRef.current.x - gs.dx,
              y: canvasOffsetRef.current.y - gs.dy,
            },
            moved: false,
          };
          return;
        }

        const { locationX, locationY } = evt.nativeEvent;
        const cx = locationX - canvasOffsetRef.current.x;
        const cy = locationY - canvasOffsetRef.current.y;

        let hitItemId: string | null = null;
        // check nodes
        for (const node of boardNodesRef.current) {
          const pos = localPosRef.current[node.id] ?? { x: node.x, y: node.y };
          const { w, h } = getNodeDimsRef.current(node);
          if (cx >= pos.x && cx <= pos.x + w && cy >= pos.y && cy <= pos.y + h) {
            hitItemId = node.id;
            break;
          }
        }
        // check member cards if no node hit
        if (!hitItemId) {
          for (const m of boardMembersRef.current) {
            const pos = localPosRef.current[m.id] ??
              memberBoardPositionsRef.current[m.id] ??
              { x: 60, y: 60 };
            if (cx >= pos.x && cx <= pos.x + MEMBER_W && cy >= pos.y && cy <= pos.y + MEMBER_H) {
              hitItemId = m.id;
              break;
            }
          }
        }

        if (hitItemId) {
          const isNode = boardNodesRef.current.some((n) => n.id === hitItemId);
          const pos = isNode
            ? (localPosRef.current[hitItemId] ??
               (() => { const n = boardNodesRef.current.find((x) => x.id === hitItemId); return { x: n?.x ?? 0, y: n?.y ?? 0 }; })())
            : (localPosRef.current[hitItemId] ??
               memberBoardPositionsRef.current[hitItemId] ??
               { x: 60, y: 60 });
          dragState.current = {
            type: "node",
            nodeId: hitItemId,
            startVal: { ...pos },
            moved: false,
          };
        } else {
          dragState.current = {
            type: "canvas",
            startVal: { ...canvasOffsetRef.current },
            moved: false,
          };
        }
      },
      onPanResponderMove: (_, gs) => {
        if (Math.abs(gs.dx) > 4 || Math.abs(gs.dy) > 4) {
          dragState.current.moved = true;
        }
        if (dragState.current.type === "node" && dragState.current.nodeId) {
          const newX = dragState.current.startVal.x + gs.dx;
          const newY = dragState.current.startVal.y + gs.dy;
          localPosRef.current[dragState.current.nodeId] = { x: newX, y: newY };
          setLocalPos((prev) => ({ ...prev, [dragState.current.nodeId!]: { x: newX, y: newY } }));
        } else {
          const newX = dragState.current.startVal.x + gs.dx;
          const newY = dragState.current.startVal.y + gs.dy;
          canvasOffsetRef.current = { x: newX, y: newY };
          canvasOffset.setValue({ x: newX, y: newY });
        }
      },
      onPanResponderRelease: () => {
        const { type, nodeId, moved } = dragState.current;
        if (!moved && type === "node" && nodeId) {
          handleNodeTapRef.current(nodeId);
        }
        if (moved && type === "node" && nodeId) {
          const pos = localPosRef.current[nodeId];
          if (pos) saveNodePosRef.current(nodeId, pos);
        }
        dragState.current.moved = false;
      },
    }),
  ).current;

  const addNodeToBoard = (nodeId: string) => {
    if (boardNodeIdsRef.current.includes(nodeId)) return;
    const bw = boardLayoutRef.current.width;
    const bh = boardLayoutRef.current.height;
    const cx = -canvasOffsetRef.current.x + bw / 2 - NODE_W / 2;
    const cy = -canvasOffsetRef.current.y + bh / 2 - NODE_H / 2;
    const jitter = () => (Math.random() - 0.5) * 120;
    const x = Math.max(20, cx + jitter());
    const y = Math.max(20, cy + jitter());
    const updated = headspaceNodesRef.current.map((n) =>
      n.id === nodeId ? { ...n, x, y } : n,
    );
    updateHeadspaceNodes(updated);
    updateHeadspaceBoardNodeIds([...boardNodeIdsRef.current, nodeId]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const addMemberToBoard = (memberId: string) => {
    if (boardMemberIdsRef.current.includes(memberId)) return;
    const bw = boardLayoutRef.current.width;
    const bh = boardLayoutRef.current.height;
    const cx = -canvasOffsetRef.current.x + bw / 2 - MEMBER_W / 2;
    const cy = -canvasOffsetRef.current.y + bh / 2 - MEMBER_H / 2;
    const jitter = () => (Math.random() - 0.5) * 120;
    const x = Math.max(20, cx + jitter());
    const y = Math.max(20, cy + jitter());
    updateMemberBoardPositions({ ...memberBoardPositionsRef.current, [memberId]: { x, y } });
    updateHeadspaceBoardMemberIds([...boardMemberIdsRef.current, memberId]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const removeNodeFromBoard = (itemId: string) => {
    if (boardMemberIdsRef.current.includes(itemId)) {
      updateHeadspaceBoardMemberIds(boardMemberIdsRef.current.filter((id) => id !== itemId));
    } else {
      updateHeadspaceBoardNodeIds(boardNodeIdsRef.current.filter((id) => id !== itemId));
    }
    updateHeadspaceBoardLinks(boardLinksRef.current.filter(
      (l) => l.fromId !== itemId && l.toId !== itemId,
    ));
    setSelectedNodeId(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const resetView = () => {
    canvasOffsetRef.current = { x: 0, y: 0 };
    Animated.spring(canvasOffset, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
      friction: 7,
    }).start();
  };

  const exitConnect = () => {
    setMode("pan");
    setConnectFrom(null);
  };

  const selectedNode = selectedNodeId
    ? data.headspaceNodes.find((n) => n.id === selectedNodeId)
    : null;
  const selectedMember = selectedNodeId && !selectedNode
    ? data.members.find((m) => m.id === selectedNodeId)
    : null;

  const nodesNotOnBoard = data.headspaceNodes.filter(
    (n) => !boardNodeIds.includes(n.id) && !n.parentId,
  );
  const membersNotOnBoard = data.members.filter(
    (m) => !m.isArchived && !boardMemberIds.includes(m.id),
  );

  const bottomInset = Platform.OS === "web" ? 0 : insets.bottom;
  const toolbarH = 56 + bottomInset;

  return (
    <View style={styles.container}>
      {/* ── Canvas ── */}
      <View
        style={styles.canvasContainer}
        {...panResponder.panHandlers}
        onLayout={(e) => {
          boardLayoutRef.current = {
            width: e.nativeEvent.layout.width,
            height: e.nativeEvent.layout.height,
          };
        }}
      >
        <Animated.View
          style={[styles.canvas, { transform: canvasOffset.getTranslateTransform() }]}
        >
          {/* SVG link lines */}
          <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
            {boardLinks.map((link) => {
              const fromIsMember = boardMemberIds.includes(link.fromId);
              const toIsMember = boardMemberIds.includes(link.toId);
              const fp = getPos(link.fromId);
              const tp = getPos(link.toId);
              const fNode = !fromIsMember ? data.headspaceNodes.find((n) => n.id === link.fromId) : undefined;
              const tNode = !toIsMember ? data.headspaceNodes.find((n) => n.id === link.toId) : undefined;
              const fDims = fromIsMember ? { w: MEMBER_W, h: MEMBER_H } : fNode ? getNodeDims(fNode) : { w: NODE_W, h: NODE_H };
              const tDims = toIsMember ? { w: MEMBER_W, h: MEMBER_H } : tNode ? getNodeDims(tNode) : { w: NODE_W, h: NODE_H };
              const fW = fDims.w;
              const fH = fDims.h;
              const tW = tDims.w;
              const tH = tDims.h;
              return (
                <Line
                  key={link.id}
                  x1={fp.x + fW / 2}
                  y1={fp.y + fH / 2}
                  x2={tp.x + tW / 2}
                  y2={tp.y + tH / 2}
                  stroke={colors.primary + "aa"}
                  strokeWidth={2}
                  strokeDasharray="8,5"
                />
              );
            })}
          </Svg>

          {/* Nodes */}
          {boardNodes.map((node) => {
            const pos = getPos(node.id);
            const meta = TYPE_META[node.type] ?? TYPE_META.description;
            const isSelected = selectedNodeId === node.id && mode === "pan";
            const isConnectSrc = connectFrom === node.id;
            const linkedMembers = (node.connectedMemberIds ?? [])
              .map((mid) => data.members.find((m) => m.id === mid))
              .filter(Boolean) as typeof data.members;

            const hasImage = !!node.imageUri;
            const { w: nw, h: nh } = getNodeDims(node);

            const borderStyle = {
              borderColor: isConnectSrc ? meta.color : isSelected ? colors.primary : colors.border,
              borderWidth: isSelected || isConnectSrc ? 2 : 1,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isSelected || isConnectSrc ? 0.25 : 0.08,
              shadowRadius: 4,
              elevation: isSelected || isConnectSrc ? 6 : 2,
            };

            if (hasImage) {
              const imgH = nh - PHOTO_LABEL_H;
              const photoNodeStyle = [
                styles.photoNode,
                { left: pos.x, top: pos.y, width: nw, backgroundColor: colors.card, ...borderStyle },
              ];
              const photoInner = (
                <>
                  <View style={[styles.photoLabelBar, { backgroundColor: meta.color + "dd" }]}>
                    <Feather name={meta.icon as any} size={10} color="#fff" />
                    <Text style={styles.photoNodeTitle} numberOfLines={1}>{node.title}</Text>
                  </View>
                  <Image
                    source={{ uri: node.imageUri }}
                    style={{ width: nw, height: imgH }}
                    contentFit="cover"
                    onLoad={(e: any) => {
                      const { width, height } = e.source ?? {};
                      if (width && height) {
                        imageAspectRatiosRef.current = { ...imageAspectRatiosRef.current, [node.imageUri!]: width / height };
                        setImageAspectRatios((prev) => ({ ...prev, [node.imageUri!]: width / height }));
                      }
                    }}
                  />
                </>
              );
              if (mode === "connect") {
                return (
                  <TouchableOpacity key={node.id} style={photoNodeStyle} activeOpacity={0.7} onPress={() => handleNodeTapRef.current(node.id)}>
                    {photoInner}
                  </TouchableOpacity>
                );
              }
              return <View key={node.id} style={photoNodeStyle}>{photoInner}</View>;
            }

            const nodeStyle = [
              styles.node,
              { left: pos.x, top: pos.y, backgroundColor: colors.card, ...borderStyle },
            ];

            const nodeInner = (
              <>
                <View style={[styles.nodeAccent, { backgroundColor: meta.color }]} />
                <View style={styles.nodeBody}>
                  <View style={styles.nodeHeader}>
                    <Feather name={meta.icon as any} size={10} color={meta.color} />
                    <Text style={[styles.nodeType, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                  <Text style={[styles.nodeTitle, { color: colors.foreground }]} numberOfLines={2}>
                    {node.title}
                  </Text>
                  {linkedMembers.length > 0 && (
                    <View style={styles.nodeAvatars}>
                      {linkedMembers.slice(0, 4).map((m) => (
                        <MemberAvatar
                          key={m.id}
                          name={m.name}
                          color={m.color}
                          profileImage={m.profileImage}
                          size={16}
                        />
                      ))}
                    </View>
                  )}
                </View>
              </>
            );

            // In connect mode use TouchableOpacity so taps are reliable
            // (avoids PanResponder coordinate math issues on transformed views)
            if (mode === "connect") {
              return (
                <TouchableOpacity
                  key={node.id}
                  style={nodeStyle}
                  activeOpacity={0.7}
                  onPress={() => handleNodeTapRef.current(node.id)}
                >
                  {nodeInner}
                </TouchableOpacity>
              );
            }

            return (
              <View key={node.id} style={nodeStyle}>
                {nodeInner}
              </View>
            );
          })}

          {/* Member cards */}
          {boardMembers.map((member) => {
            const pos = getPos(member.id);
            const isSelected = selectedNodeId === member.id && mode === "pan";
            const isConnectSrc = connectFrom === member.id;

            const memberCardStyle = [
              styles.memberCard,
              {
                left: pos.x,
                top: pos.y,
                backgroundColor: colors.card,
                borderColor: isConnectSrc
                  ? member.color
                  : isSelected
                  ? member.color
                  : colors.border,
                borderWidth: isSelected || isConnectSrc ? 2 : 1,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isSelected || isConnectSrc ? 0.25 : 0.08,
                shadowRadius: 4,
                elevation: isSelected || isConnectSrc ? 6 : 2,
              },
            ];

            const memberInner = (
              <>
                <View style={[styles.memberCardTop, { backgroundColor: member.color + "22" }]}>
                  <MemberAvatar
                    name={member.name}
                    color={member.color}
                    profileImage={member.profileImage}
                    size={40}
                  />
                </View>
                <View style={styles.memberCardBody}>
                  <Text
                    style={[styles.memberCardName, { color: colors.foreground }]}
                    numberOfLines={2}
                  >
                    {member.name}
                  </Text>
                  {isConnectSrc && (
                    <View style={[styles.memberCardBadge, { backgroundColor: member.color + "33" }]}>
                      <Text style={[styles.memberCardBadgeText, { color: member.color }]}>linking…</Text>
                    </View>
                  )}
                </View>
              </>
            );

            if (mode === "connect") {
              return (
                <TouchableOpacity
                  key={member.id}
                  style={memberCardStyle}
                  activeOpacity={0.7}
                  onPress={() => handleNodeTapRef.current(member.id)}
                >
                  {memberInner}
                </TouchableOpacity>
              );
            }
            return (
              <View key={member.id} style={memberCardStyle}>
                {memberInner}
              </View>
            );
          })}

          {/* Empty hint */}
          {boardNodes.length === 0 && boardMembers.length === 0 && (
            <View style={styles.emptyHint} pointerEvents="none">
              <Feather name="map" size={32} color={colors.muted} />
              <Text style={[styles.emptyHintText, { color: colors.mutedForeground }]}>
                Tap + to place headspace entries or member profiles on this board
              </Text>
            </View>
          )}
        </Animated.View>
      </View>

      {/* ── Selected item action bar ── */}
      {(selectedNode || selectedMember) && mode === "pan" && (
        <View
          style={[
            styles.actionBar,
            { backgroundColor: colors.card, borderTopColor: colors.border },
          ]}
        >
          {selectedNode && (
            <>
              <View style={styles.actionBarLeft}>
                <View
                  style={[
                    styles.actionBarAccent,
                    { backgroundColor: (TYPE_META[selectedNode.type] ?? TYPE_META.description).color },
                  ]}
                />
                <Text style={[styles.actionBarTitle, { color: colors.foreground }]} numberOfLines={1}>
                  {selectedNode.title}
                </Text>
              </View>
              <View style={styles.actionBarBtns}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
                  onPress={() => { setSelectedNodeId(null); router.push(`/headspace/${selectedNode.id}`); }}
                >
                  <Feather name="arrow-right" size={15} color={colors.foreground} />
                  <Text style={[styles.actionBtnText, { color: colors.foreground }]}>View</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
                  onPress={() => removeNodeFromBoard(selectedNode.id)}
                >
                  <Feather name="x" size={15} color={colors.destructive} />
                  <Text style={[styles.actionBtnText, { color: colors.destructive }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
          {selectedMember && (
            <>
              <View style={styles.actionBarLeft}>
                <MemberAvatar
                  name={selectedMember.name}
                  color={selectedMember.color}
                  profileImage={selectedMember.profileImage}
                  size={28}
                />
                <Text style={[styles.actionBarTitle, { color: colors.foreground }]} numberOfLines={1}>
                  {selectedMember.name}
                </Text>
              </View>
              <View style={styles.actionBarBtns}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
                  onPress={() => { setSelectedNodeId(null); router.push(`/member/${selectedMember.id}`); }}
                >
                  <Feather name="user" size={15} color={colors.foreground} />
                  <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
                  onPress={() => removeNodeFromBoard(selectedMember.id)}
                >
                  <Feather name="x" size={15} color={colors.destructive} />
                  <Text style={[styles.actionBtnText, { color: colors.destructive }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}

      {/* ── Connect mode hint bar ── */}
      {mode === "connect" && (
        <View
          style={[styles.connectBar, { backgroundColor: colors.primary + "22", borderTopColor: colors.primary + "55" }]}
        >
          <Feather
            name={connectFrom ? "link" : "crosshair"}
            size={14}
            color={colors.primary}
          />
          <Text style={[styles.connectBarText, { color: colors.primary }]}>
            {connectFrom
              ? "Now tap another node to link them (tap the same node to cancel)"
              : "Tap two nodes to draw a link between them"}
          </Text>
        </View>
      )}

      {/* ── Bottom toolbar ── */}
      <View
        style={[
          styles.toolbar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: bottomInset + 8,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.toolbarBtn, { backgroundColor: colors.primary }]}
          onPress={() => setShowAddSheet(true)}
        >
          <Feather name="plus" size={18} color={colors.primaryForeground} />
          <Text style={[styles.toolbarBtnText, { color: colors.primaryForeground }]}>Add</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toolbarBtn,
            {
              backgroundColor: mode === "connect" ? colors.primary : colors.secondary,
              borderColor: mode === "connect" ? colors.primary : colors.border,
              borderWidth: 1,
            },
          ]}
          onPress={() => {
            if (mode === "connect") {
              exitConnect();
            } else {
              setMode("connect");
              setSelectedNodeId(null);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }}
        >
          <Feather
            name="link"
            size={18}
            color={mode === "connect" ? colors.primaryForeground : colors.foreground}
          />
          <Text
            style={[
              styles.toolbarBtnText,
              {
                color: mode === "connect" ? colors.primaryForeground : colors.foreground,
              },
            ]}
          >
            {mode === "connect" ? "Done" : "Connect"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toolbarBtn, { backgroundColor: colors.secondary, borderColor: colors.border, borderWidth: 1 }]}
          onPress={resetView}
        >
          <Feather name="maximize" size={18} color={colors.foreground} />
          <Text style={[styles.toolbarBtnText, { color: colors.foreground }]}>Reset</Text>
        </TouchableOpacity>
      </View>

      {/* ── Add Node Sheet ── */}
      {showAddSheet && (
        <Modal visible transparent animationType="slide">
          <View style={[styles.sheetOverlay, { backgroundColor: "#0009" }]}>
            <View
              style={[
                styles.sheet,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.sheetHeader}>
                <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
                  Add to Board
                </Text>
                <TouchableOpacity onPress={() => setShowAddSheet(false)}>
                  <Feather name="x" size={22} color={colors.foreground} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                {/* Member profiles section */}
                {membersNotOnBoard.length > 0 && (
                  <>
                    <Text style={[styles.sheetSectionLabel, { color: colors.mutedForeground }]}>
                      Member Profiles
                    </Text>
                    {membersNotOnBoard.map((m) => (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.sheetItem, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                        onPress={() => { addMemberToBoard(m.id); setShowAddSheet(false); }}
                      >
                        <View style={[styles.sheetItemAccent, { backgroundColor: m.color }]} />
                        <View style={[styles.sheetItemBody, { flexDirection: "row", alignItems: "center", gap: 10 }]}>
                          <MemberAvatar name={m.name} color={m.color} profileImage={m.profileImage} size={32} />
                          <Text style={[styles.sheetItemTitle, { color: colors.foreground, flex: 1 }]} numberOfLines={1}>
                            {m.name}
                          </Text>
                        </View>
                        <Feather name="plus-circle" size={20} color={colors.primary} />
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                {/* Headspace entries section */}
                {nodesNotOnBoard.length > 0 && (
                  <>
                    <Text style={[styles.sheetSectionLabel, { color: colors.mutedForeground }]}>
                      Headspace Entries
                    </Text>
                    {nodesNotOnBoard.map((node) => {
                      const meta = TYPE_META[node.type] ?? TYPE_META.description;
                      return (
                        <TouchableOpacity
                          key={node.id}
                          style={[styles.sheetItem, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                          onPress={() => { addNodeToBoard(node.id); setShowAddSheet(false); }}
                        >
                          <View style={[styles.sheetItemAccent, { backgroundColor: meta.color }]} />
                          <View style={styles.sheetItemBody}>
                            <View style={styles.sheetItemHeader}>
                              <Feather name={meta.icon as any} size={12} color={meta.color} />
                              <Text style={[styles.sheetItemType, { color: meta.color }]}>{meta.label}</Text>
                            </View>
                            <Text style={[styles.sheetItemTitle, { color: colors.foreground }]} numberOfLines={1}>
                              {node.title}
                            </Text>
                            {node.content ? (
                              <Text style={[styles.sheetItemDesc, { color: colors.mutedForeground }]} numberOfLines={1}>
                                {node.content}
                              </Text>
                            ) : null}
                          </View>
                          <Feather name="plus-circle" size={20} color={colors.primary} />
                        </TouchableOpacity>
                      );
                    })}
                  </>
                )}

                {nodesNotOnBoard.length === 0 && membersNotOnBoard.length === 0 && (
                  <View style={styles.sheetEmpty}>
                    <Text style={[styles.sheetEmptyText, { color: colors.mutedForeground }]}>
                      Everything is already on the board.
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  canvasContainer: { flex: 1, overflow: "hidden" },
  canvas: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },

  node: {
    position: "absolute",
    width: NODE_W,
    height: NODE_H,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
  },
  nodeAccent: { width: 4 },
  nodeBody: { flex: 1, padding: 10, justifyContent: "center", gap: 4 },
  nodeHeader: { flexDirection: "row", alignItems: "center", gap: 4 },
  nodeType: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  nodeTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", lineHeight: 17 },
  nodeAvatars: { flexDirection: "row", gap: 3, marginTop: 2 },

  photoNode: {
    position: "absolute",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "column",
  },
  photoLabelBar: {
    height: PHOTO_LABEL_H,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    gap: 5,
  },
  photoNodeTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#fff", flex: 1 },

  memberCard: {
    position: "absolute",
    width: MEMBER_W,
    height: MEMBER_H,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "column",
  },
  memberCardTop: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 10,
    paddingBottom: 6,
  },
  memberCardBody: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 6,
    paddingBottom: 6,
    gap: 3,
  },
  memberCardName: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    lineHeight: 15,
  },
  memberCardBadge: {
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  memberCardBadgeText: { fontSize: 9, fontFamily: "Inter_600SemiBold" },

  sheetSectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 8,
  },

  emptyHint: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 40,
  },
  emptyHintText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },

  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  actionBarLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, minWidth: 0 },
  actionBarAccent: { width: 4, height: 32, borderRadius: 2 },
  actionBarTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  actionBarBtns: { flexDirection: "row", gap: 8 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  actionBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },

  connectBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  connectBarText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },

  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  toolbarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 22,
  },
  toolbarBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  sheetOverlay: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    maxHeight: "75%",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sheetHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
    marginTop: 4,
  },
  sheetEmpty: { paddingVertical: 24, alignItems: "center" },
  sheetEmptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  sheetItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    overflow: "hidden",
    gap: 0,
  },
  sheetItemAccent: { width: 4, alignSelf: "stretch" },
  sheetItemBody: { flex: 1, padding: 12, gap: 2 },
  sheetItemHeader: { flexDirection: "row", alignItems: "center", gap: 5 },
  sheetItemType: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  sheetItemTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sheetItemDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
