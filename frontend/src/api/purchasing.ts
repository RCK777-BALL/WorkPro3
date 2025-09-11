 import http from '@/lib/http';
 

export const createPurchaseOrder = (payload: Record<string, unknown>) =>
  http.post('/purchase-orders', payload).then((res) => res.data);

export const createGoodsReceipt = (payload: Record<string, unknown>) =>
  http.post('/goods-receipts', payload).then((res) => res.data);

