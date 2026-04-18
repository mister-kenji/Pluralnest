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

export type AvatarShape = "circle" | "square" | "diamond" | "heart";

export type Member = {
  id: string;
  name: string;
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

export type ChatMessage = {
  id: string;
  memberId: string;
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
  type: "image" | "place" | "description";
  title: string;
  content?: string;
  imageUri?: string;
  x: number;
  y: number;
  connectedMemberIds: string[];
  parentId?: string;
  children: string[];
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
};

export type ForumReply = {
  id: string;
  memberId: string;
  content: string;
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
};

type AppData = {
  members: Member[];
  frontEntries: FrontEntry[];
  journalEntries: JournalEntry[];
  journalTags: JournalTag[];
  chatMessages: ChatMessage[];
  customEmojis: CustomEmoji[];
  headspaceNodes: HeadspaceNode[];
  forumPosts: ForumPost[];
  groups: Group[];
  deletedItems: DeletedItem[];
  settings: AppSettings;
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
};

const defaultData: AppData = {
  members: [],
  frontEntries: [],
  journalEntries: [],
  journalTags: [],
  chatMessages: [],
  customEmojis: [],
  headspaceNodes: [],
  forumPosts: [],
  groups: [],
  deletedItems: [],
  settings: defaultSettings,
};

type StorageContextType = {
  data: AppData;
  isLoaded: boolean;
  updateMembers: (members: Member[]) => void;
  updateFrontEntries: (entries: FrontEntry[]) => void;
  updateJournalEntries: (entries: JournalEntry[]) => void;
  updateJournalTags: (tags: JournalTag[]) => void;
  updateChatMessages: (messages: ChatMessage[]) => void;
  updateCustomEmojis: (emojis: CustomEmoji[]) => void;
  updateHeadspaceNodes: (nodes: HeadspaceNode[]) => void;
  updateForumPosts: (posts: ForumPost[]) => void;
  updateGroups: (groups: Group[]) => void;
  updateDeletedItems: (items: DeletedItem[]) => void;
  updateSettings: (settings: AppSettings) => void;
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
          setData({
            ...defaultData,
            ...parsed,
            settings: { ...defaultSettings, ...(parsed.settings ?? {}) },
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
        const next = {
          ...defaultData,
          ...parsed,
          settings: { ...defaultSettings, ...(parsed.settings ?? {}) },
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
    updateCustomEmojis: (v) => update("customEmojis", v),
    updateHeadspaceNodes: (v) => update("headspaceNodes", v),
    updateForumPosts: (v) => update("forumPosts", v),
    updateGroups: (v) => update("groups", v),
    updateDeletedItems: (v) => update("deletedItems", v),
    updateSettings: (v) => update("settings", v),
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
