/*
 * SPDX-License-Identifier: MIT
 */

import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI as string);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error: unknown) {
    const err = error as Error;
    console.error(`❌ MongoDB Connection Error: ${err.message}`);
    process.exit(1);
  }
};
