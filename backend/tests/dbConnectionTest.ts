import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/workpro3_test";

async function testConnection() {
  try {
    const conn = await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB Connected:", conn.connection.host);
    await mongoose.connection.close();
    console.log("✅ Connection closed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  }
}

testConnection();
