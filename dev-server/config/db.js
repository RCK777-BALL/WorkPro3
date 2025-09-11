import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  const conn = await mongoose.connect(process.env.MONGO_URI);
  return conn;
};

export default connectDB;
