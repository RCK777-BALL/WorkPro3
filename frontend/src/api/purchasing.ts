import api from '../lib/api';

export const createPurchaseOrder = (payload: any) =>
  api.post('/purchase-orders', payload).then((res) => res.data);

export const createGoodsReceipt = (payload: any) =>
  api.post('/goods-receipts', payload).then((res) => res.data);

