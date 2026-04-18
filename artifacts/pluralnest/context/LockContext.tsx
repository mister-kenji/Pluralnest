import React, { createContext, useCallback, useContext, useState } from "react";

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
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [lockedJournals, setLockedJournals] = useState<Set<string>>(new Set());

  const lockApp = useCallback(() => setIsAppLocked(true), []);
  const unlockApp = useCallback(() => setIsAppLocked(false), []);

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
