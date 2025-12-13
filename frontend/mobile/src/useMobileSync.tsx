/*
 * SPDX-License-Identifier: MIT
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export interface OfflineAction {
  id: string;
  entityType: string;
  entityId?: string;
  operation: string;
  payload?: Record<string, unknown>;
  version?: number;
}

interface MobileSyncState {
  queue: OfflineAction[];
  conflicts: OfflineAction[];
  cursors: Record<string, string | null>;
  enqueue: (action: OfflineAction) => void;
  markSynced: (ids: string[]) => void;
  recordConflict: (action: OfflineAction) => void;
  resolveConflict: (actionId: string, acceptLocal: boolean) => void;
}

const StorageKey = 'mobile-sync-queue';
const CursorKey = 'mobile-sync-cursors';

const MobileSyncContext = createContext<MobileSyncState | undefined>(undefined);

export const MobileSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [queue, setQueue] = useState<OfflineAction[]>(() => {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(StorageKey) : null;
    return raw ? (JSON.parse(raw) as OfflineAction[]) : [];
  });
  const [conflicts, setConflicts] = useState<OfflineAction[]>([]);
  const [cursors, setCursors] = useState<Record<string, string | null>>(() => {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(CursorKey) : null;
    return raw ? (JSON.parse(raw) as Record<string, string | null>) : {};
  });

  const isOnline = useRef<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    window.localStorage.setItem(StorageKey, JSON.stringify(queue));
  }, [queue]);

  useEffect(() => {
    window.localStorage.setItem(CursorKey, JSON.stringify(cursors));
  }, [cursors]);

  useEffect(() => {
    const handle = () => {
      isOnline.current = navigator.onLine;
      if (navigator.onLine && queue.length > 0) {
        setQueue((prev) => [...prev]);
      }
    };
    window.addEventListener('online', handle);
    window.addEventListener('offline', handle);
    return () => {
      window.removeEventListener('online', handle);
      window.removeEventListener('offline', handle);
    };
  }, [queue.length]);

  const generateId = () =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  const enqueue = useCallback((action: OfflineAction) => {
    setQueue((prev) => [...prev, { ...action, id: action.id ?? generateId() }]);
  }, []);

  const markSynced = useCallback((ids: string[]) => {
    setQueue((prev) => prev.filter((item) => !ids.includes(item.id)));
  }, []);

  const recordConflict = useCallback((action: OfflineAction) => {
    setConflicts((prev) => [...prev, action]);
  }, []);

  const resolveConflict = useCallback(
    (actionId: string, acceptLocal: boolean) => {
      setConflicts((prev) => prev.filter((item) => item.id !== actionId));
      if (acceptLocal) {
        const conflicted = conflicts.find((item) => item.id === actionId);
        if (conflicted) {
          enqueue({ ...conflicted, version: Date.now() });
        }
      }
    },
    [conflicts, enqueue],
  );

  const value = useMemo(
    () => ({ queue, enqueue, markSynced, conflicts, recordConflict, resolveConflict, cursors }),
    [queue, enqueue, markSynced, conflicts, recordConflict, resolveConflict, cursors],
  );

  return <MobileSyncContext.Provider value={value}>{children}</MobileSyncContext.Provider>;
};

export const useMobileSync = (): MobileSyncState => {
  const ctx = useContext(MobileSyncContext);
  if (!ctx) throw new Error('useMobileSync must be used inside MobileSyncProvider');
  return ctx;
};

export const ConflictBanner: React.FC = () => {
  const { conflicts } = useMobileSync();
  if (conflicts.length === 0) return null;
  return (
    <div role="alert" data-testid="conflict-banner">
      {conflicts.length} offline change(s) could not be applied and used server values.
    </div>
  );
};

export default useMobileSync;
