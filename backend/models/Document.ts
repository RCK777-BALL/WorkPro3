/*
 * SPDX-License-Identifier: MIT
 */

import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  title: String,
  asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
  type: { type: String, enum: ['manual', 'procedure', 'log', 'certificate'] },
  fileUrl: String,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('Document', documentSchema);
