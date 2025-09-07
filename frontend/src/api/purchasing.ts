import http from '../lib/http';

export const createPurchaseOrder = (payload: any) =>
  http.post('/purchase-orders', payload).then((res) => res.data);

export const createGoodsReceipt = (payload: any) =>
  http.post('/goods-receipts', payload).then((res) => res.data);

