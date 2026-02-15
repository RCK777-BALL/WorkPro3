export type OfflineConflict = {
  actionId: string;
  reason: string;
  serverState?: Record<string, unknown>;
};

export const resolveConflict = (conflict: OfflineConflict, strategy: 'client' | 'server') => {
  return {
    ...conflict,
    resolution: strategy,
  };
};
