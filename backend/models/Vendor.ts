/*
 * SPDX-License-Identifier: MIT
 */

import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema({
  name: String,
  contactName: String,
  phone: String,
  email: String,
  address: String,
  partsSupplied: [{ type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' }]
}, { timestamps: true });

export default mongoose.model('Vendor', vendorSchema);
