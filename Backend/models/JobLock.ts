/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface JobLockDocument extends Document {
  name: string;
  ownerId: string;
  expiresAt: Date;
  acquiredAt: Date;
  updatedAt: Date;
}

const jobLockSchema = new Schema<JobLockDocument>(
  {
    name: { type: String, required: true, unique: true, index: true },
    ownerId: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    acquiredAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { timestamps: false }
);

jobLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const JobLock: Model<JobLockDocument> =
  mongoose.models.JobLock || mongoose.model<JobLockDocument>('JobLock', jobLockSchema);

export default JobLock;
