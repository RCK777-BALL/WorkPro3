 import http from '@/lib/http';
 

export const listVendorPurchaseOrders = (token: string) =>
  http
    .get('/vendor-portal/purchase-orders', { headers: { Authorization: `Bearer ${token}` } })
    .then((res) => res.data);

export const getVendorPurchaseOrder = (id: string, token: string) =>
  http
    .get(`/vendor-portal/purchase-orders/${id}`, { headers: { Authorization: `Bearer ${token}` } })
    .then((res) => res.data);

export const updateVendorPurchaseOrder = (
  id: string,
  payload: any,
  token: string,
) =>
  http
    .put(`/vendor-portal/purchase-orders/${id}`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then((res) => res.data);

