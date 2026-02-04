import apiClient from '../client';

export type AssetSummary = {
  id: string;
  name: string;
  status?: string;
  location?: string;
};

export const fetchAssets = async (params?: Record<string, unknown>) => {
  const response = await apiClient.get('/assets', { params });
  return response.data as { items: AssetSummary[]; total: number; page: number; limit: number };
};

export const fetchAssetById = async (assetId: string) => {
  const response = await apiClient.get(`/assets/${assetId}`);
  return response.data as AssetSummary & Record<string, unknown>;
};

export const createAsset = async (payload: Record<string, unknown>) => {
  const response = await apiClient.post('/assets', payload);
  return response.data;
};

export const updateAsset = async (assetId: string, payload: Record<string, unknown>) => {
  const response = await apiClient.put(`/assets/${assetId}`, payload);
  return response.data;
};
