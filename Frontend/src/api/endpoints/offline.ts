import apiClient from '../client';

export type OfflineAction = {
  id?: string;
  entityType: string;
  entityId?: string;
  operation: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
};

export const syncOfflineActions = async (actions: OfflineAction[]) => {
  const response = await apiClient.post('/sync/actions', { actions });
  return response.data as { results: Record<string, unknown>[] };
};
