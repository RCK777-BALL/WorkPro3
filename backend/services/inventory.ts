/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Types } from 'mongoose';
import InventoryItem from '../models/InventoryItem';

/**
 * Increase inventory for an item, converting units if needed.
 */
const toObjectId = (value: Types.ObjectId | string | undefined): Types.ObjectId | undefined => {
  if (!value) return undefined;
  return value instanceof Types.ObjectId ? value : new Types.ObjectId(value);
};

export const addStock = async (
  itemId: Types.ObjectId | string,
  quantity: number,
  fromUom?: Types.ObjectId | string,
) => {
  const normalizedItemId = toObjectId(itemId);
  if (!normalizedItemId) throw new Error('Invalid inventory item identifier');

  const item = await InventoryItem.findById(normalizedItemId);
  if (!item) throw new Error('Item not found');

  let baseQty = quantity;
  const normalizedFromUom = toObjectId(fromUom);
  if (normalizedFromUom && item.uom && item.uom.toString() !== normalizedFromUom.toString()) {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not initialized');
    }
    const conv = await db
      .collection('conversions')
      .findOne({ from: normalizedFromUom, to: item.uom });
    if (!conv) throw new Error('Conversion not found');
    baseQty = quantity * conv.factor;
  }
  item.quantity += baseQty;
  await item.save();
  return item;
};
