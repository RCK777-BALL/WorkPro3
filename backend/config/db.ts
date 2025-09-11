import mongoose from 'mongoose';
import logger from '../utils/logger';

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI as string);
    logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`❌ MongoDB Connection Error: ${err.message}`);
    process.exit(1);
  }
};
