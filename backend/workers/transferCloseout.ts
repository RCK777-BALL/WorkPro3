/*
 * SPDX-License-Identifier: MIT
 */

import TransferOrder from '../models/TransferOrder';

const closeOutTransfers = async (): Promise<number> => {
  const candidates = await TransferOrder.find({ status: 'in-transit' });
  let closedCount = 0;

  for (const order of candidates) {
    const allReceived = order.items.length > 0 && order.items.every((item) => item.status === 'received');
    if (!allReceived) {
      continue;
    }
    order.status = 'closed';
    await order.save();
    closedCount += 1;
  }

  return closedCount;
};

export default closeOutTransfers;
