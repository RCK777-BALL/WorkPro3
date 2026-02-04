import apiClient from '../client';

export type WorkOrderSummary = {
  id: string;
  title: string;
  status: string;
  priority: string;
};

export const fetchWorkOrders = async (params?: Record<string, unknown>) => {
  const response = await apiClient.get('/work-orders', { params });
  return response.data as { items: WorkOrderSummary[]; total: number; page: number; limit: number };
};

export const fetchWorkOrderById = async (workOrderId: string) => {
  const response = await apiClient.get(`/work-orders/${workOrderId}`);
  return response.data as WorkOrderSummary & Record<string, unknown>;
};

export const createWorkOrder = async (payload: Record<string, unknown>) => {
  const response = await apiClient.post('/work-orders', payload);
  return response.data;
};

export const updateWorkOrder = async (workOrderId: string, payload: Record<string, unknown>) => {
  const response = await apiClient.put(`/work-orders/${workOrderId}`, payload);
  return response.data;
};
