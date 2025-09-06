import api from '../lib/api';

export const listVendorPurchaseOrders = (token: string) =>
  api
    .get('/purchase-orders', { headers: { Authorization: `Bearer ${token}` } })
    .then((res) => res.data);

export const getVendorPurchaseOrder = (id: string, token: string) =>
  api
    .get(`/purchase-orders/${id}`, { headers: { Authorization: `Bearer ${token}` } })
    .then((res) => res.data);

export const updateVendorPurchaseOrder = (
  id: string,
  payload: any,
  token: string,
) =>
  api
    .put(`/purchase-orders/${id}`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then((res) => res.data);

