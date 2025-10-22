/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from "vitest";
import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import jwt from "jsonwebtoken";

import adminRoutes from "../routes/adminRoutes";
import User from "../models/User";
import AdminSetting from "../models/AdminSetting";
import ApiKey from "../models/ApiKey";
import AuditLog from "../models/AuditLog";
import { ADMIN_SETTING_TEMPLATES } from "@shared/admin";
import type { AdminSettingsPayload } from "@shared/admin";

const app = express();
app.use(express.json());
app.use("/api/admin", adminRoutes);

let mongo: MongoMemoryServer;
let token: string;
let tenantId: mongoose.Types.ObjectId;

beforeAll(async () => {
  process.env.JWT_SECRET = "test-secret";
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await mongoose.connection.db?.dropDatabase();
  tenantId = new mongoose.Types.ObjectId();
  const admin = await User.create({
    name: "Admin User",
    email: "admin@example.com",
    passwordHash: "hash",
    roles: ["admin"],
    tenantId,
  });
  token = jwt.sign({ id: admin._id.toString(), tenantId: tenantId.toString() }, process.env.JWT_SECRET!);
});

describe("Admin settings routes", () => {
  it("returns all admin sections with defaults", async () => {
    const response = await request(app)
      .get("/api/admin/settings")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    const payload = response.body.data as AdminSettingsPayload;
    expect(payload.sections).toHaveLength(ADMIN_SETTING_TEMPLATES.length);
    const rolesSection = payload.sections.find((section) => section.section === "roles");
    expect(rolesSection?.config.roles).toHaveLength(4);
    expect(payload.apiKeys).toHaveLength(0);
  });

  it("updates a section and persists the configuration", async () => {
    const payload = {
      status: "Active",
      config: {
        allowCsvUpload: false,
        autoProvisionAssets: true,
        departments: [
          { id: "dept-1", name: "Assembly", parentId: null },
        ],
        lines: [],
        stations: [],
      },
    };

    const response = await request(app)
      .put("/api/admin/settings/site")
      .set("Authorization", `Bearer ${token}`)
      .send(payload)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("Active");
    expect(response.body.data.config.departments).toHaveLength(1);

    const stored = await AdminSetting.findOne({ tenantId, section: "site" }).lean();
    expect(stored?.status).toBe("Active");
    expect(stored?.config).toMatchObject({ allowCsvUpload: false, autoProvisionAssets: true });

    await new Promise((resolve) => setTimeout(resolve, 25));
    const auditCount = await AuditLog.countDocuments({ tenantId, module: "Admin Settings" });
    expect(auditCount).toBeGreaterThan(0);
  });

  it("creates and revokes API keys with scope validation", async () => {
    const createResponse = await request(app)
      .post("/api/admin/integrations")
      .set("Authorization", `Bearer ${token}`)
      .send({
        label: "Partner",
        scopes: ["assets:read", "invalid", "assets:read"],
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      })
      .expect(201);

    expect(createResponse.body.success).toBe(true);
    const created = createResponse.body.data as { id: string; key: string; lastFour: string };
    expect(created.key).toMatch(/^wkp_/);
    expect(created.lastFour).toHaveLength(4);

    const keyDocument = await ApiKey.findById(created.id).lean();
    expect(keyDocument).not.toBeNull();
    expect(keyDocument?.scopes).toEqual(["assets:read"]);
    expect(keyDocument?.status).toBe("active");
    expect(keyDocument?.keyHash).not.toBe(created.key);

    await request(app)
      .delete(`/api/admin/integrations/${created.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const revoked = await ApiKey.findById(created.id).lean();
    expect(revoked?.status).toBe("revoked");
  });

  it("returns audit log entries for admin actions", async () => {
    await request(app)
      .put("/api/admin/settings/branding")
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "In Progress", config: { primaryColor: "#111111" } })
      .expect(200);

    await new Promise((resolve) => setTimeout(resolve, 25));

    const auditResponse = await request(app)
      .get("/api/admin/audit")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(auditResponse.body.success).toBe(true);
    const entries = auditResponse.body.data as Array<{ module: string; action: string }>;
    expect(entries.some((entry) => entry.module === "Admin Settings")).toBe(true);
  });
});

