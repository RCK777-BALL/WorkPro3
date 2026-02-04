import apiClient from '../client';

export const fetchSummary = async () => {
  const response = await apiClient.get('/summary');
  return response.data as Record<string, unknown>;
};
