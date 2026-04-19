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

type LockContextType = {
  isAppLocked: boolean;
  lockApp: () => void;
  unlockApp: () => void;
  lockedJournals: Set<string>;
  lockJournal: (id: string) => void;
  unlockJournal: (id: string) => void;
  isJournalLocked: (id: string) => boolean;
};

const LockContext = createContext<LockContextType | null>(null);

export function LockProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoaded } = useStorage();
  const settings = data.settings;

  const [isAppLocked, setIsAppLocked] = useState(false);
  const [lockedJournals, setLockedJournals] = useState<Set<string>>(new Set());

  const hasInitLocked = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const lockApp = useCallback(() => setIsAppLocked(true), []);
  const unlockApp = useCallback(() => setIsAppLocked(false), []);

  // ── Startup lock ──────────────────────────────────────────────────────────
  // Once AsyncStorage finishes loading, if screen lock is configured, lock immediately.
  useEffect(() => {
    if (!isLoaded || hasInitLocked.current) return;
    hasInitLocked.current = true;
    if (settings.screenLockEnabled && settings.screenLockCode.length > 0) {
      setIsAppLocked(true);
    }
  }, [isLoaded, settings.screenLockEnabled, settings.screenLockCode]);

  // ── Auto-lock on background ───────────────────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      const wasActive = appStateRef.current === "active";
      appStateRef.current = nextState;
      if (
        wasActive &&
        (nextState === "background" || nextState === "inactive") &&
        settings.screenLockEnabled &&
        settings.screenLockCode.length > 0
      ) {
        setIsAppLocked(true);
      }
    });
    return () => sub.remove();
  }, [settings.screenLockEnabled, settings.screenLockCode]);

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
