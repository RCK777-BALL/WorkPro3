/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, Document, Types, Model } from 'mongoose';

export interface DocumentDoc extends Document {
  title?: string;
  asset?: Types.ObjectId;
  type?: 'manual' | 'procedure' | 'log' | 'certificate';
  name?: string;
  url: string;
  uploadedBy?: Types.ObjectId;
  mimeType?: string;
  size?: number;
  lastModified?: Date;
}

const documentSchema = new Schema<DocumentDoc>({
  title: String,
  asset: { type: Schema.Types.ObjectId, ref: 'Asset' },
  type: { type: String, enum: ['manual', 'procedure', 'log', 'certificate'] },
  name: String,
  url: String,
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  mimeType: String,
  size: Number,
  lastModified: Date,
}, { timestamps: true });

const DocumentModel: Model<DocumentDoc> = mongoose.model<DocumentDoc>('Document', documentSchema);

export default DocumentModel;
