import apiClient from '../client';

export const fetchPmTasks = async () => {
  const response = await apiClient.get('/pm');
  return response.data as { items: Record<string, unknown>[]; total: number };
};

export const createPmTask = async (payload: Record<string, unknown>) => {
  const response = await apiClient.post('/pm', payload);
  return response.data;
};

export const updatePmTask = async (pmId: string, payload: Record<string, unknown>) => {
  const response = await apiClient.put(`/pm/${pmId}`, payload);
  return response.data;
};
