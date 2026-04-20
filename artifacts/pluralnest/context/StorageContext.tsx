import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export type MemberRole = string;

export type GlobalField = {
  id: string;
  label: string;
  showByDefault: boolean;
};

export type CustomField = {
  fieldId: string;
  value: string;
};

export type Relationship = {
  memberId: string;
  type: string;
};

export type AvatarShape = "circle" | "square" | "diamond" | "heart" | "hexagon" | "shield" | "star" | "triangle" | "flower";

export type Member = {
  id: string;
  name: string;
  alias?: string;
  pronouns: string;
  role: string;
  color: string;
  avatarShape: AvatarShape;
  profileImage?: string;
  bannerImage?: string;
  bannerColor?: string;
  description: string;
  customFields: CustomField[];
  relationships: Relationship[];
  tags: string[];
  isArchived: boolean;
  createdAt: number;
  updatedAt: number;
};

export type FrontStatus = "main" | "co-front" | "co-conscious";

export type FrontEntry = {
  id: string;
  memberId: string;
  status: FrontStatus;
  customStatus?: string;
  startTime: number;
  endTime?: number;
  note?: string;
  mood?: number; // 1–5 (1 = rough, 5 = great)
};

export type JournalTag = {
  id: string;
  label: string;
  color: string;
};

export type JournalEntry = {
  id: string;
  memberId: string;
  title: string;
  content: string;
  coverImage?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  isLocked: boolean;
  lockCode?: string;
};

export type ChatChannel = {
  id: string;
  name: string;
  createdAt: number;
};

export type ChatMessage = {
  id: string;
  memberId: string;
  channelId?: string; // undefined = "general" (backwards compat)
  content: string;
  imageUri?: string;
  isPinned: boolean;
  replyTo?: string;
  createdAt: number;
  reactions: { emoji: string; memberIds: string[] }[];
};

export type CustomEmoji = {
  id: string;
  name: string;
  uri: string;
};

export type HeadspaceNode = {
  id: string;
  type: "image" | "place" | "description" | "text";
  title: string;
  content?: string;
  imageUri?: string;
  x: number;
  y: number;
  connectedMemberIds: string[];
  parentId?: string;
  children: string[];
};

export type BoardLink = {
  id: string;
  fromId: string;
  toId: string;
};

export type ForumPost = {
  id: string;
  memberId: string;
  title: string;
  content: string;
  type: "discussion" | "poll";
  pollOptions?: { id: string; text: string; votes: string[] }[];
  replies: ForumReply[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  reactions: { emoji: string; memberIds: string[] }[];
};

export type ForumReply = {
  id: string;
  memberId: string;
  content: string;
  createdAt: number;
  reactions: { emoji: string; memberIds: string[] }[];
};

export type Asset = {
  id: string;
  name: string;
  uri: string;
  createdAt: number;
};

export type Group = {
  id: string;
  name: string;
  color: string;
  memberIds: string[];
  subGroupIds: string[];
  parentGroupId?: string;
  showMembersInRoot: boolean;
  description: string;
  createdAt: number;
};

export type DeletedItem = {
  id: string;
  type: "member" | "journal" | "forum" | "message" | "group";
  data: unknown;
  deletedAt: number;
};

export type EmergencyContact = {
  id: string;
  name: string;
  relationship: string;
  phone?: string;
  notes?: string;
};

export type EmergencyInfo = {
  content: string;
  contacts: EmergencyContact[];
};

export type SystemProfile = {
  description: string;
  profileImage?: string;
  bannerImage?: string;
};

export type AppSettings = {
  accentColor: string;
  screenLockEnabled: boolean;
  screenLockCode: string;
  panicCloseEnabled: boolean;
  encryptionEnabled: boolean;
  easyMode: boolean;
  featuresEnabled: {
    chat: boolean;
    journals: boolean;
    headspace: boolean;
    forums: boolean;
    frontingLog: boolean;
    groups: boolean;
    search: boolean;
  };
  customGlobalFields: { id: string; label: string; showByDefault: boolean }[];
  systemName: string;
  hasCompletedOnboarding: boolean;
};

const DEFAULT_CHANNEL: ChatChannel = { id: "general", name: "general", createdAt: 0 };

type AppData = {
  members: Member[];
  frontEntries: FrontEntry[];
  journalEntries: JournalEntry[];
  journalTags: JournalTag[];
  chatMessages: ChatMessage[];
  chatChannels: ChatChannel[];
  customEmojis: CustomEmoji[];
  headspaceNodes: HeadspaceNode[];
  headspaceBoardNodeIds: string[];
  headspaceBoardLinks: BoardLink[];
  headspaceBoardMemberIds: string[];
  memberBoardPositions: Record<string, { x: number; y: number }>;
  forumPosts: ForumPost[];
  groups: Group[];
  deletedItems: DeletedItem[];
  assets: Asset[];
  settings: AppSettings;
  systemProfile: SystemProfile;
  emergencyInfo: EmergencyInfo;
};

const defaultSettings: AppSettings = {
  accentColor: "#aaaaaa",
  screenLockEnabled: false,
  screenLockCode: "",
  panicCloseEnabled: false,
  encryptionEnabled: true,
  easyMode: false,
  featuresEnabled: {
    chat: true,
    journals: true,
    headspace: true,
    forums: true,
    frontingLog: true,
    groups: true,
    search: true,
  },
  customGlobalFields: [],
  systemName: "My System",
  hasCompletedOnboarding: false,
};

const defaultData: AppData = {
  members: [],
  frontEntries: [],
  journalEntries: [],
  journalTags: [],
  chatMessages: [],
  chatChannels: [DEFAULT_CHANNEL],
  customEmojis: [],
  headspaceNodes: [],
  headspaceBoardNodeIds: [],
  headspaceBoardLinks: [],
  headspaceBoardMemberIds: [],
  memberBoardPositions: {},
  forumPosts: [],
  groups: [],
  deletedItems: [],
  assets: [],
  settings: defaultSettings,
  systemProfile: { description: "" },
  emergencyInfo: { content: "", contacts: [] },
};

type StorageContextType = {
  data: AppData;
  isLoaded: boolean;
  updateMembers: (members: Member[]) => void;
  updateFrontEntries: (entries: FrontEntry[]) => void;
  updateJournalEntries: (entries: JournalEntry[]) => void;
  updateJournalTags: (tags: JournalTag[]) => void;
  updateChatMessages: (messages: ChatMessage[]) => void;
  updateChatChannels: (channels: ChatChannel[]) => void;
  updateCustomEmojis: (emojis: CustomEmoji[]) => void;
  updateHeadspaceNodes: (nodes: HeadspaceNode[]) => void;
  updateHeadspaceBoardNodeIds: (ids: string[]) => void;
  updateHeadspaceBoardLinks: (links: BoardLink[]) => void;
  updateHeadspaceBoardMemberIds: (ids: string[]) => void;
  updateMemberBoardPositions: (pos: Record<string, { x: number; y: number }>) => void;
  updateForumPosts: (posts: ForumPost[]) => void;
  updateGroups: (groups: Group[]) => void;
  updateDeletedItems: (items: DeletedItem[]) => void;
  updateAssets: (assets: Asset[]) => void;
  updateSettings: (settings: AppSettings) => void;
  updateSystemProfile: (profile: SystemProfile) => void;
  updateEmergencyInfo: (info: EmergencyInfo) => void;
  softDelete: (id: string, type: DeletedItem["type"], data: unknown) => void;
  restoreDeleted: (id: string) => DeletedItem | undefined;
  purgeOldDeleted: () => void;
  exportData: () => string;
  importData: (json: string) => boolean;
};

const StorageContext = createContext<StorageContextType | null>(null);

const STORAGE_KEY = "@pluralnest_data";

export function StorageProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(defaultData);
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Partial<AppData>;
          const savedSettings = parsed.settings ?? {};
          const hasExistingData =
            (parsed.members?.length ?? 0) > 0 ||
            (savedSettings as Partial<AppSettings>).systemName !== undefined;
          const parsedChannels = parsed.chatChannels ?? [];
          const hasGeneral = parsedChannels.some((c) => c.id === "general");
          const migratedChannels = hasGeneral
            ? parsedChannels
            : [DEFAULT_CHANNEL, ...parsedChannels];
          const savedFeaturesEnabled = (savedSettings as Partial<AppSettings>).featuresEnabled ?? {};
          setData({
            ...defaultData,
            ...parsed,
            forumPosts: (parsed.forumPosts ?? []).map((p: any) => ({
              ...p,
              reactions: p.reactions ?? [],
              replies: (p.replies ?? []).map((r: any) => ({
                ...r,
                reactions: r.reactions ?? [],
              })),
            })),
            chatMessages: (parsed.chatMessages ?? []).map((m: any) => ({
              ...m,
              reactions: m.reactions ?? [],
            })),
            groups: parsed.groups ?? [],
            assets: parsed.assets ?? [],
            deletedItems: parsed.deletedItems ?? [],
            headspaceNodes: parsed.headspaceNodes ?? [],
            headspaceBoardNodeIds: parsed.headspaceBoardNodeIds ?? [],
            headspaceBoardLinks: (parsed.headspaceBoardLinks ?? []).map((l: any) => ({
              id: l.id,
              fromId: l.fromId ?? l.fromNodeId ?? "",
              toId: l.toId ?? l.toNodeId ?? "",
            })),
            headspaceBoardMemberIds: (parsed as any).headspaceBoardMemberIds ?? [],
            memberBoardPositions: (parsed as any).memberBoardPositions ?? {},
            chatChannels: migratedChannels,
            settings: {
              ...defaultSettings,
              ...savedSettings,
              featuresEnabled: {
                ...defaultSettings.featuresEnabled,
                ...savedFeaturesEnabled,
              },
              hasCompletedOnboarding:
                (savedSettings as Partial<AppSettings>).hasCompletedOnboarding ??
                hasExistingData,
            },
          });
        } catch {
          // corrupt data, use defaults
        }
      }
      setIsLoaded(true);
    });
  }, []);

  const save = useCallback((newData: AppData) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newData)).catch(() => {});
    }, 300);
  }, []);

  const update = useCallback(
    <K extends keyof AppData>(key: K, value: AppData[K]) => {
      setData((prev) => {
        const next = { ...prev, [key]: value };
        save(next);
        return next;
      });
    },
    [save],
  );

  const softDelete = useCallback(
    (id: string, type: DeletedItem["type"], itemData: unknown) => {
      const item: DeletedItem = { id, type, data: itemData, deletedAt: Date.now() };
      setData((prev) => {
        const next = { ...prev, deletedItems: [...prev.deletedItems, item] };
        save(next);
        return next;
      });
    },
    [save],
  );

  const restoreDeleted = useCallback(
    (id: string): DeletedItem | undefined => {
      let found: DeletedItem | undefined;
      setData((prev) => {
        found = prev.deletedItems.find((d) => d.id === id);
        if (!found) return prev;
        const next = { ...prev, deletedItems: prev.deletedItems.filter((d) => d.id !== id) };
        save(next);
        return next;
      });
      return found;
    },
    [save],
  );

  const purgeOldDeleted = useCallback(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    setData((prev) => {
      const next = {
        ...prev,
        deletedItems: prev.deletedItems.filter((d) => d.deletedAt > cutoff),
      };
      save(next);
      return next;
    });
  }, [save]);

  const exportData = useCallback(() => JSON.stringify(data, null, 2), [data]);

  const importData = useCallback(
    (json: string): boolean => {
      try {
        const parsed = JSON.parse(json) as Partial<AppData>;
        const savedSettings = parsed.settings ?? {};
        const savedFeatures = (savedSettings as Partial<AppSettings>).featuresEnabled ?? {};
        const next: AppData = {
          ...defaultData,
          ...parsed,
          forumPosts: (parsed.forumPosts ?? []).map((p: any) => ({
            ...p,
            reactions: p.reactions ?? [],
            replies: (p.replies ?? []).map((r: any) => ({
              ...r,
              reactions: r.reactions ?? [],
            })),
          })),
          chatMessages: (parsed.chatMessages ?? []).map((m: any) => ({
            ...m,
            reactions: m.reactions ?? [],
          })),
          groups: parsed.groups ?? [],
          assets: parsed.assets ?? [],
          deletedItems: parsed.deletedItems ?? [],
          headspaceNodes: parsed.headspaceNodes ?? [],
          headspaceBoardNodeIds: parsed.headspaceBoardNodeIds ?? [],
          headspaceBoardLinks: (parsed.headspaceBoardLinks ?? []).map((l: any) => ({
            id: l.id,
            fromId: l.fromId ?? l.fromNodeId ?? "",
            toId: l.toId ?? l.toNodeId ?? "",
          })),
          headspaceBoardMemberIds: (parsed as any).headspaceBoardMemberIds ?? [],
          memberBoardPositions: (parsed as any).memberBoardPositions ?? {},
          settings: {
            ...defaultSettings,
            ...savedSettings,
            featuresEnabled: {
              ...defaultSettings.featuresEnabled,
              ...savedFeatures,
            },
          },
        };
        setData(next);
        save(next);
        return true;
      } catch {
        return false;
      }
    },
    [save],
  );

  const ctx: StorageContextType = {
    data,
    isLoaded,
    updateMembers: (v) => update("members", v),
    updateFrontEntries: (v) => update("frontEntries", v),
    updateJournalEntries: (v) => update("journalEntries", v),
    updateJournalTags: (v) => update("journalTags", v),
    updateChatMessages: (v) => update("chatMessages", v),
    updateChatChannels: (v) => update("chatChannels", v),
    updateCustomEmojis: (v) => update("customEmojis", v),
    updateHeadspaceNodes: (v) => update("headspaceNodes", v),
    updateHeadspaceBoardNodeIds: (v) => update("headspaceBoardNodeIds", v),
    updateHeadspaceBoardLinks: (v) => update("headspaceBoardLinks", v),
    updateHeadspaceBoardMemberIds: (v) => update("headspaceBoardMemberIds", v),
    updateMemberBoardPositions: (v) => update("memberBoardPositions", v),
    updateForumPosts: (v) => update("forumPosts", v),
    updateGroups: (v) => update("groups", v),
    updateDeletedItems: (v) => update("deletedItems", v),
    updateAssets: (v) => update("assets", v),
    updateSettings: (v) => update("settings", v),
    updateSystemProfile: (v) => update("systemProfile", v),
    updateEmergencyInfo: (v) => update("emergencyInfo", v),
    softDelete,
    restoreDeleted,
    purgeOldDeleted,
    exportData,
    importData,
  };

  return <StorageContext.Provider value={ctx}>{children}</StorageContext.Provider>;
}

export function useStorage() {
  const ctx = useContext(StorageContext);
  if (!ctx) throw new Error("useStorage must be used within StorageProvider");
  return ctx;
}
