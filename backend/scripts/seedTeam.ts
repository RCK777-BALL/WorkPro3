/*
 * SPDX-License-Identifier: MIT
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import logger from "../utils/logger";

import User from "../models/User";
import Tenant from "../models/Tenant";
import TeamMember from "../models/TeamMember";
import Department from "../models/Department";

// Load environment variables
const envPath = path.resolve(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

if (!process.env.MONGO_URI) {
  logger.error("❌ MONGO_URI not defined in .env");
  process.exit(1);
}

const seedTeam = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    logger.info("✅ Connected to MongoDB");

    const tenantName = process.env.TENANT_NAME || "Default Tenant";
    const adminEmail = "admin@example.com";
    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || "admin123";

    // Create or find tenant
    let tenant = await Tenant.findOne({ name: tenantName });
    if (!tenant) {
      tenant = new Tenant({
        name: tenantName,
        createdAt: new Date(),
        status: "active",
      });
      await tenant.save();
      logger.info(`✅ Tenant created: ${tenant.name}`);
    } else {
      logger.info(`ℹ️ Using existing tenant: ${tenant.name}`);
    }

    // Upsert admin user
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await User.findOneAndUpdate(
      { email: adminEmail },
      {
        email: adminEmail,
        passwordHash: hashedPassword,
        roles: ["admin"],
        tenantId: tenant._id,
      },
      { upsert: true, returnDocument: 'after' }
    );
    logger.info(`✅ Admin seeded: ${adminEmail} / ${adminPassword}`);

    // Ensure a department exists
    const departmentName = "Sample Department";
    let department = await Department.findOne({ name: departmentName });
    if (!department) {
      department = await Department.create({ name: departmentName, lines: [] });
      logger.info(`✅ Department created: ${department.name}`);
    }

    // Team hierarchy
    const departmentLeader = await TeamMember.findOneAndUpdate(
      { email: "deptleader@example.com" },
      {
        name: "Department Leader",
        email: "deptleader@example.com",
        role: "admin",
        department: department._id,
        employeeId: "DL001",
        tenantId: tenant._id,
      },
      { upsert: true, returnDocument: 'after' }
    );

    const areaLeader = await TeamMember.findOneAndUpdate(
      { email: "arealeader@example.com" },
      {
        name: "Area Leader",
        email: "arealeader@example.com",
        role: "manager",
        department: department._id,
        managerId: departmentLeader._id,
        employeeId: "AL001",
        tenantId: tenant._id,
      },
      { upsert: true, returnDocument: 'after' }
    );

    const teamLeader = await TeamMember.findOneAndUpdate(
      { email: "teamleader@example.com" },
      {
        name: "Team Leader",
        email: "teamleader@example.com",
        role: "technician",
        department: department._id,
        managerId: areaLeader._id,
        employeeId: "TL001",
        tenantId: tenant._id,
      },
      { upsert: true, returnDocument: 'after' }
    );

    await TeamMember.findOneAndUpdate(
      { email: "member1@example.com" },
      {
        name: "Team Member One",
        email: "member1@example.com",
        role: "viewer",
        department: department._id,
        managerId: teamLeader._id,
        employeeId: "TM001",
        tenantId: tenant._id,
      },
      { upsert: true, returnDocument: 'after' }
    );

    await TeamMember.findOneAndUpdate(
      { email: "member2@example.com" },
      {
        name: "Team Member Two",
        email: "member2@example.com",
        role: "viewer",
        department: department._id,
        managerId: teamLeader._id,
        employeeId: "TM002",
        tenantId: tenant._id,
      },
      { upsert: true, returnDocument: 'after' }
    );

    logger.info("✅ Team hierarchy seeded successfully");
    process.exit(0);
  } catch (err) {
    logger.error("❌ Error seeding team:", err);
    process.exit(1);
  }
};

seedTeam();
