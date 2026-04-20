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
import { BoardLink, HeadspaceNode, useStorage } from "@/context/StorageContext";
import { useColors } from "@/hooks/useColors";
import { genId } from "@/utils/helpers";
import { TYPE_META } from "@/app/headspace/index";

const NODE_W = 155;
const NODE_H = 90;

type Mode = "pan" | "connect";

export function HeadspaceBoard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    data,
    updateHeadspaceNodes,
    updateHeadspaceBoardNodeIds,
    updateHeadspaceBoardLinks,
  } = useStorage();

  const boardNodeIds: string[] = data.headspaceBoardNodeIds ?? [];
  const boardLinks: BoardLink[] = data.headspaceBoardLinks ?? [];

  const boardNodes = useMemo(
    () =>
      boardNodeIds
        .map((id) => data.headspaceNodes.find((n) => n.id === id))
        .filter((n): n is HeadspaceNode => !!n),
    [boardNodeIds, data.headspaceNodes],
  );

  const [mode, setMode] = useState<Mode>("pan");
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [localPos, setLocalPos] = useState<Record<string, { x: number; y: number }>>({});

  const canvasOffset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const canvasOffsetRef = useRef({ x: 0, y: 0 });
  const localPosRef = useRef<Record<string, { x: number; y: number }>>({});
  const boardLayoutRef = useRef({ width: 320, height: 500 });

  const boardNodesRef = useRef<HeadspaceNode[]>([]);
  boardNodesRef.current = boardNodes;
  const modeRef = useRef<Mode>("pan");
  modeRef.current = mode;
  const connectFromRef = useRef<string | null>(null);
  connectFromRef.current = connectFrom;
  const selectedNodeIdRef = useRef<string | null>(null);
  selectedNodeIdRef.current = selectedNodeId;

  const getPos = (nodeId: string): { x: number; y: number } => {
    if (localPosRef.current[nodeId]) return localPosRef.current[nodeId];
    if (localPos[nodeId]) return localPos[nodeId];
    const n = data.headspaceNodes.find((x) => x.id === nodeId);
    return { x: n?.x ?? 100, y: n?.y ?? 100 };
  };

  const boardLinksRef = useRef<BoardLink[]>([]);
  boardLinksRef.current = boardLinks;
  const boardNodeIdsRef = useRef<string[]>([]);
  boardNodeIdsRef.current = boardNodeIds;
  const headspaceNodesRef = useRef<HeadspaceNode[]>([]);
  headspaceNodesRef.current = data.headspaceNodes;

  const handleNodeTapRef = useRef<(id: string) => void>(() => {});
  handleNodeTapRef.current = (nodeId: string) => {
    if (modeRef.current === "connect") {
      if (!connectFromRef.current) {
        setConnectFrom(nodeId);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (connectFromRef.current === nodeId) {
        setConnectFrom(null);
      } else {
        const fromId = connectFromRef.current;
        const toId = nodeId;
        const existing = boardLinksRef.current.find(
          (l) =>
            (l.fromNodeId === fromId && l.toNodeId === toId) ||
            (l.fromNodeId === toId && l.toNodeId === fromId),
        );
        if (existing) {
          // Toggle off: remove the link and clear selection
          updateHeadspaceBoardLinks(boardLinksRef.current.filter((l) => l.id !== existing.id));
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setConnectFrom(null);
        } else {
          // New link created: keep the second node selected as the next source
          // so the user gets clear feedback the link landed and can chain another
          const link: BoardLink = { id: genId(), fromNodeId: fromId, toNodeId: toId };
          updateHeadspaceBoardLinks([...boardLinksRef.current, link]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setConnectFrom(toId);
        }
      }
    } else {
      setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const saveNodePosRef = useRef<(nodeId: string, pos: { x: number; y: number }) => void>(
    () => {},
  );
  saveNodePosRef.current = (nodeId: string, pos: { x: number; y: number }) => {
    const updated = headspaceNodesRef.current.map((n) =>
      n.id === nodeId ? { ...n, x: pos.x, y: pos.y } : n,
    );
    updateHeadspaceNodes(updated);
  };

  const dragState = useRef<{
    type: "canvas" | "node";
    nodeId?: string;
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

        let hitNodeId: string | null = null;
        for (const node of boardNodesRef.current) {
          const pos = localPosRef.current[node.id] ?? { x: node.x, y: node.y };
          if (cx >= pos.x && cx <= pos.x + NODE_W && cy >= pos.y && cy <= pos.y + NODE_H) {
            hitNodeId = node.id;
            break;
          }
        }

        if (hitNodeId) {
          const n = boardNodesRef.current.find((x) => x.id === hitNodeId);
          const pos = localPosRef.current[hitNodeId] ?? { x: n?.x ?? 0, y: n?.y ?? 0 };
          dragState.current = {
            type: "node",
            nodeId: hitNodeId,
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

  const removeNodeFromBoard = (nodeId: string) => {
    updateHeadspaceBoardNodeIds(boardNodeIdsRef.current.filter((id) => id !== nodeId));
    updateHeadspaceBoardLinks(boardLinksRef.current.filter(
      (l) => l.fromNodeId !== nodeId && l.toNodeId !== nodeId,
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

  const nodesNotOnBoard = data.headspaceNodes.filter(
    (n) => !boardNodeIds.includes(n.id) && !n.parentId,
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
              const fromNode = boardNodes.find((n) => n.id === link.fromNodeId);
              const toNode = boardNodes.find((n) => n.id === link.toNodeId);
              if (!fromNode || !toNode) return null;
              const fp = getPos(fromNode.id);
              const tp = getPos(toNode.id);
              return (
                <Line
                  key={link.id}
                  x1={fp.x + NODE_W / 2}
                  y1={fp.y + NODE_H / 2}
                  x2={tp.x + NODE_W / 2}
                  y2={tp.y + NODE_H / 2}
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

            const nodeStyle = [
              styles.node,
              {
                left: pos.x,
                top: pos.y,
                backgroundColor: colors.card,
                borderColor: isConnectSrc
                  ? meta.color
                  : isSelected
                  ? colors.primary
                  : colors.border,
                borderWidth: isSelected || isConnectSrc ? 2 : 1,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isSelected || isConnectSrc ? 0.25 : 0.08,
                shadowRadius: 4,
                elevation: isSelected || isConnectSrc ? 6 : 2,
              },
            ];

            const hasImage = !!node.imageUri;

            const nodeInner = (
              <>
                <View style={[styles.nodeAccent, { backgroundColor: meta.color }]} />
                <View style={[styles.nodeBody, hasImage && styles.nodeBodyNarrow]}>
                  <View style={styles.nodeHeader}>
                    <Feather name={meta.icon as any} size={10} color={meta.color} />
                    <Text style={[styles.nodeType, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                  <Text style={[styles.nodeTitle, { color: colors.foreground }]} numberOfLines={2}>
                    {node.title}
                  </Text>
                  {linkedMembers.length > 0 && !hasImage && (
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
                {hasImage && (
                  <Image
                    source={{ uri: node.imageUri }}
                    style={styles.nodeImageCol}
                    contentFit="cover"
                  />
                )}
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

          {/* Empty hint */}
          {boardNodes.length === 0 && (
            <View style={styles.emptyHint} pointerEvents="none">
              <Feather name="map" size={32} color={colors.muted} />
              <Text style={[styles.emptyHintText, { color: colors.mutedForeground }]}>
                Tap + to place headspace entries on this board
              </Text>
            </View>
          )}
        </Animated.View>
      </View>

      {/* ── Selected node action bar ── */}
      {selectedNode && mode === "pan" && (
        <View
          style={[
            styles.actionBar,
            { backgroundColor: colors.card, borderTopColor: colors.border },
          ]}
        >
          <View style={styles.actionBarLeft}>
            <View
              style={[
                styles.actionBarAccent,
                {
                  backgroundColor:
                    (TYPE_META[selectedNode.type] ?? TYPE_META.description).color,
                },
              ]}
            />
            <Text style={[styles.actionBarTitle, { color: colors.foreground }]} numberOfLines={1}>
              {selectedNode.title}
            </Text>
          </View>
          <View style={styles.actionBarBtns}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
              onPress={() => {
                setSelectedNodeId(null);
                router.push(`/headspace/${selectedNode.id}`);
              }}
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

              {nodesNotOnBoard.length === 0 ? (
                <View style={styles.sheetEmpty}>
                  <Text style={[styles.sheetEmptyText, { color: colors.mutedForeground }]}>
                    All your headspace entries are already on the board.
                  </Text>
                </View>
              ) : (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                >
                  <Text style={[styles.sheetHint, { color: colors.mutedForeground }]}>
                    Tap an entry to pin it to the board
                  </Text>
                  {nodesNotOnBoard.map((node) => {
                    const meta = TYPE_META[node.type] ?? TYPE_META.description;
                    return (
                      <TouchableOpacity
                        key={node.id}
                        style={[
                          styles.sheetItem,
                          { backgroundColor: colors.secondary, borderColor: colors.border },
                        ]}
                        onPress={() => {
                          addNodeToBoard(node.id);
                          setShowAddSheet(false);
                        }}
                      >
                        <View
                          style={[styles.sheetItemAccent, { backgroundColor: meta.color }]}
                        />
                        <View style={styles.sheetItemBody}>
                          <View style={styles.sheetItemHeader}>
                            <Feather name={meta.icon as any} size={12} color={meta.color} />
                            <Text style={[styles.sheetItemType, { color: meta.color }]}>
                              {meta.label}
                            </Text>
                          </View>
                          <Text
                            style={[styles.sheetItemTitle, { color: colors.foreground }]}
                            numberOfLines={1}
                          >
                            {node.title}
                          </Text>
                          {node.content ? (
                            <Text
                              style={[
                                styles.sheetItemDesc,
                                { color: colors.mutedForeground },
                              ]}
                              numberOfLines={1}
                            >
                              {node.content}
                            </Text>
                          ) : null}
                        </View>
                        <Feather name="plus-circle" size={20} color={colors.primary} />
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
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
  nodeBodyNarrow: { paddingRight: 6 },
  nodeImageCol: { width: 62, alignSelf: "stretch" },
  nodeHeader: { flexDirection: "row", alignItems: "center", gap: 4 },
  nodeType: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  nodeTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", lineHeight: 17 },
  nodeAvatars: { flexDirection: "row", gap: 3, marginTop: 2 },

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
