import apiClient from '../client';

export const fetchPurchaseOrders = async (params?: Record<string, unknown>) => {
  const response = await apiClient.get('/purchase-orders', { params });
  return response.data as { items: Record<string, unknown>[]; total: number; page: number; limit: number };
};

export const createPurchaseOrder = async (payload: Record<string, unknown>) => {
  const response = await apiClient.post('/purchase-orders', payload);
  return response.data;
};

export const receivePurchaseOrder = async (purchaseOrderId: string, payload: Record<string, unknown>) => {
  const response = await apiClient.post(`/purchase-orders/${purchaseOrderId}/receive`, payload);
  return response.data;
};
