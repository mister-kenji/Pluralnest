import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus } from "react-native";

import { useStorage } from "@/context/StorageContext";
import type { SectionKey } from "@/context/StorageContext";

type LockContextType = {
  isAppLocked: boolean;
  lockApp: () => void;
  unlockApp: () => void;
  lockedJournals: Set<string>;
  lockJournal: (id: string) => void;
  unlockJournal: (id: string) => void;
  isJournalLocked: (id: string) => boolean;
  runtimeLockedSections: Set<SectionKey>;
  lockSection: (key: SectionKey) => void;
  unlockSection: (key: SectionKey) => void;
  isSectionLocked: (key: SectionKey) => boolean;
};

const LockContext = createContext<LockContextType | null>(null);

function buildLockedSections(
  lockedSections: Partial<Record<SectionKey, boolean>>,
): Set<SectionKey> {
  const s = new Set<SectionKey>();
  (Object.keys(lockedSections) as SectionKey[]).forEach((k) => {
    if (lockedSections[k]) s.add(k);
  });
  return s;
}

export function LockProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoaded } = useStorage();
  const settings = data.settings;

  const [isAppLocked, setIsAppLocked] = useState(false);
  const [lockedJournals, setLockedJournals] = useState<Set<string>>(new Set());
  const [runtimeLockedSections, setRuntimeLockedSections] = useState<Set<SectionKey>>(new Set());

  const hasInitLocked = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const lockApp = useCallback(() => setIsAppLocked(true), []);
  const unlockApp = useCallback(() => setIsAppLocked(false), []);

  // ── Startup lock ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded || hasInitLocked.current) return;
    hasInitLocked.current = true;
    const hasPin = settings.screenLockEnabled && settings.screenLockCode.length > 0;
    if (!hasPin) return;

    if (settings.lockOnStartup !== false) {
      setIsAppLocked(true);
      setRuntimeLockedSections(buildLockedSections(settings.lockedSections ?? {}));
    }
  }, [isLoaded, settings.screenLockEnabled, settings.screenLockCode, settings.lockOnStartup, settings.lockedSections]);

  // ── Auto-lock on background ───────────────────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      const wasActive = appStateRef.current === "active";
      appStateRef.current = nextState;
      const hasPin = settings.screenLockEnabled && settings.screenLockCode.length > 0;
      if (
        wasActive &&
        (nextState === "background" || nextState === "inactive") &&
        hasPin
      ) {
        setIsAppLocked(true);
        setRuntimeLockedSections(buildLockedSections(settings.lockedSections ?? {}));
      }
    });
    return () => sub.remove();
  }, [settings.screenLockEnabled, settings.screenLockCode, settings.lockedSections]);

  // ── Journal locking ───────────────────────────────────────────────────────
  const lockJournal = useCallback((id: string) => {
    setLockedJournals((prev) => new Set([...prev, id]));
  }, []);

  const unlockJournal = useCallback((id: string) => {
    setLockedJournals((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const isJournalLocked = useCallback(
    (id: string) => lockedJournals.has(id),
    [lockedJournals],
  );

  // ── Section locking ───────────────────────────────────────────────────────
  const lockSection = useCallback((key: SectionKey) => {
    setRuntimeLockedSections((prev) => new Set([...prev, key]));
  }, []);

  const unlockSection = useCallback((key: SectionKey) => {
    setRuntimeLockedSections((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const isSectionLocked = useCallback(
    (key: SectionKey) => runtimeLockedSections.has(key),
    [runtimeLockedSections],
  );

  return (
    <LockContext.Provider
      value={{
        isAppLocked,
        lockApp,
        unlockApp,
        lockedJournals,
        lockJournal,
        unlockJournal,
        isJournalLocked,
        runtimeLockedSections,
        lockSection,
        unlockSection,
        isSectionLocked,
      }}
    >
      {children}
    </LockContext.Provider>
  );
}

export function useLock() {
  const ctx = useContext(LockContext);
  if (!ctx) throw new Error("useLock must be used within LockProvider");
  return ctx;
}
