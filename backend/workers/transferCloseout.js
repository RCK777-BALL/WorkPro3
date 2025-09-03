import TransferOrder from '../models/TransferOrder';
/**
 * Close transfer orders that are fully received.
 */
export default async function closeOutTransfers() {
    const orders = await TransferOrder.find({ status: 'in-transit' });
    for (const order of orders) {
        const allReceived = order.items.every(i => i.status === 'received');
        if (allReceived) {
            order.status = 'closed';
            await order.save();
        }
    }
}
