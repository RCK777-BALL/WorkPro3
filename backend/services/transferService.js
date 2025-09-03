import TransferOrder from '../models/TransferOrder';
import InventoryItem from '../models/InventoryItem';
/**
 * Receive a transfer order and adjust inventory levels.
 * Only admins or managers may perform this action.
 */
export async function receiveTransfer(orderId, role) {
    if (role !== 'admin' && role !== 'manager') {
        throw new Error('Forbidden');
    }
    const order = await TransferOrder.findById(orderId);
    if (!order)
        throw new Error('Transfer not found');
    for (const item of order.items) {
        if (item.status === 'received')
            continue;
        const src = await InventoryItem.findById(item.fromItem);
        const dest = await InventoryItem.findById(item.toItem);
        if (!src || !dest)
            throw new Error('Inventory item not found');
        if (src.quantity < item.quantity)
            throw new Error('Insufficient stock');
        src.quantity -= item.quantity;
        dest.quantity += item.quantity;
        await src.save();
        await dest.save();
        item.status = 'received';
    }
    await order.save();
    return order;
}
