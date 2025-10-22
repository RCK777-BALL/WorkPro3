/*
 * SPDX-License-Identifier: MIT
 */

import { test, expect } from "@playwright/test";
import express from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import jwt from "jsonwebtoken";
import request from "supertest";

import adminRoutes from "../../../backend/routes/adminRoutes";
import User from "../../../backend/models/User";
import AdminSetting from "../../../backend/models/AdminSetting";
import ApiKey from "../../../backend/models/ApiKey";
import AuditLog from "../../../backend/models/AuditLog";

const app = express();
app.use(express.json());
app.use("/api/admin", adminRoutes);

let mongo: MongoMemoryServer;
let token: string;
let tenantId: mongoose.Types.ObjectId;

test.beforeAll(async () => {
  process.env.JWT_SECRET = "playwright-secret";
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

test.afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

test.beforeEach(async () => {
  await mongoose.connection.db?.dropDatabase();
  tenantId = new mongoose.Types.ObjectId();
  const admin = await User.create({
    name: "Admin QA",
    email: "qa@example.com",
    passwordHash: "hash",
    roles: ["admin"],
    tenantId,
  });
  token = jwt.sign({ id: admin._id.toString(), tenantId: tenantId.toString() }, process.env.JWT_SECRET!);
});

test("modal save flow persists data and emits audit", async () => {
  const updatePayload = {
    status: "Active",
    config: {
      allowCsvUpload: true,
      autoProvisionAssets: false,
      departments: [{ id: "dept-1", name: "QA", parentId: null }],
      lines: [],
      stations: [],
    },
  };

  const response = await request(app)
    .put("/api/admin/settings/site")
    .set("Authorization", `Bearer ${token}`)
    .send(updatePayload)
    .expect(200);

  expect(response.body.success).toBe(true);
  const stored = await AdminSetting.findOne({ tenantId, section: "site" }).lean();
  expect(stored?.status).toBe("Active");
  expect((stored?.config as Record<string, unknown>)?.allowCsvUpload).toBe(true);

  await new Promise((resolve) => setTimeout(resolve, 25));
  const audits = await AuditLog.find({ tenantId, module: "Admin Settings" }).lean();
  expect(audits.length).toBeGreaterThan(0);
});

test("API key issuance hashes secret and supports revocation", async () => {
  const create = await request(app)
    .post("/api/admin/integrations")
    .set("Authorization", `Bearer ${token}`)
    .send({ label: "QA Suite", scopes: ["assets:read", "assets:write"], expiresAt: undefined })
    .expect(201);

  const createdId = create.body.data.id as string;
  const rawKey = create.body.data.key as string;
  expect(rawKey).toMatch(/^wkp_/);

  const storedKey = await ApiKey.findById(createdId).lean();
  expect(storedKey?.lastFour).toBe(rawKey.slice(-4));
  expect(storedKey?.keyHash).not.toBe(rawKey);

  await request(app)
    .delete(`/api/admin/integrations/${createdId}`)
    .set("Authorization", `Bearer ${token}`)
    .expect(200);

  const revoked = await ApiKey.findById(createdId).lean();
  expect(revoked?.status).toBe("revoked");
});

test("enabling MFA stores secret metadata", async () => {
  const response = await request(app)
    .put("/api/admin/settings/auth")
    .set("Authorization", `Bearer ${token}`)
    .send({
      status: "Active",
      config: {
        mfa: {
          enabled: true,
          methods: ["totp"],
          trustedDevices: true,
          issuer: "WorkPro QA",
        },
      },
    })
    .expect(200);

  expect(response.body.success).toBe(true);
  const stored = await AdminSetting.findOne({ tenantId, section: "auth" }).lean();
  expect(stored?.metadata).toBeDefined();
  expect((stored?.metadata as Record<string, unknown>).mfaSecret).toBeTruthy();
});

test("audit endpoint surfaces configuration changes", async () => {
  await request(app)
    .put("/api/admin/settings/branding")
    .set("Authorization", `Bearer ${token}`)
    .send({ status: "In Progress", config: { primaryColor: "#222222" } })
    .expect(200);

  await new Promise((resolve) => setTimeout(resolve, 25));

  const auditResponse = await request(app)
    .get("/api/admin/audit")
    .set("Authorization", `Bearer ${token}`)
    .expect(200);

  expect(auditResponse.body.success).toBe(true);
  const entries = auditResponse.body.data as Array<{ module: string; action: string }>;
  expect(entries.some((entry) => entry.module === "Admin Settings")).toBeTruthy();
});
