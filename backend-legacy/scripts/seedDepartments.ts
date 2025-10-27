// backend/scripts/seedDepartments.ts
import mongoose from "mongoose";
import fs from "fs";
import Department from "../models/Department";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/platinum_cmms";

async function seedDepartments() {
  try {
    await mongoose.connect(MONGO_URI);
    const data = JSON.parse(fs.readFileSync("./scripts/seed_departments.json", "utf8"));

    await Department.deleteMany({});
    await Department.insertMany(data);

    console.log("✅ Departments seeded successfully!");
  } catch (err) {
    console.error("❌ Error seeding departments:", err);
  } finally {
    await mongoose.connection.close();
  }
}

seedDepartments();
