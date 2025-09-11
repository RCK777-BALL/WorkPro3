/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Types } from 'mongoose';
import InventoryItem from '../models/InventoryItem';

/**
 * Increase inventory for an item, converting units if needed.
 */
export const addStock = async (
  itemId: Types.ObjectId,
  quantity: number,
  fromUom?: Types.ObjectId,
) => {
  const item = await InventoryItem.findById(itemId);
  if (!item) throw new Error('Item not found');

  let baseQty = quantity;
  if (fromUom && item.uom && item.uom.toString() !== fromUom.toString()) {
    const conv = await mongoose.connection
      .db.collection('conversions')
      .findOne({ from: fromUom, to: item.uom });
    if (!conv) throw new Error('Conversion not found');
    baseQty = quantity * conv.factor;
  }
  item.quantity += baseQty;
  await item.save();
  return item;
};
