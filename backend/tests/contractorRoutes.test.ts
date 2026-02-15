/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from "vitest";
import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import jwt from "jsonwebtoken";

import contractorRoutes, { resetContractorState } from "../routes/contractors";
import User from "../models/User";

const app = express();
app.use(express.json());
app.use("/api/contractors", contractorRoutes);

let mongo: MongoMemoryServer;
let token: string;
let user: Awaited<ReturnType<typeof User.create>>;

beforeAll(async () => {
  process.env.JWT_SECRET = "testsecret";
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  user = await User.create({
    name: "Scheduler",
    email: "scheduler@example.com",
    passwordHash: "pass123",
    roles: ["supervisor"],
    tenantId: new mongoose.Types.ObjectId(),
    employeeId: "E-10001",
  });
  token = jwt.sign({ id: user._id.toString(), roles: user.roles }, process.env.JWT_SECRET!);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  resetContractorState();
  await mongoose.connection.db?.dropDatabase();
  await User.create({
    _id: user._id,
    name: user.name,
    email: user.email,
    passwordHash: user.passwordHash,
    roles: user.roles,
    tenantId: user.tenantId,
    employeeId: user.employeeId,
  });
});

describe("Contractor Routes", () => {
  it("enforces eligibility rules and prevents expired credential assignments", async () => {
    const rosterRes = await request(app)
      .get("/api/contractors/roster")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const contractor = rosterRes.body.data.find((entry: any) => entry.id === "CTR-1001");
    expect(contractor.eligibility.eligible).toBe(false);
    expect(contractor.eligibility.blockers.some((text: string) => text.includes("Expired credential"))).toBe(true);

    const assignmentRes = await request(app)
      .post("/api/contractors/CTR-1001/assignments")
      .set("Authorization", `Bearer ${token}`)
      .send({ workOrderId: "WO-9000" })
      .expect(400);

    expect(assignmentRes.body.reason).toContain("Expired credential");
  });

  it("supports onboarding completion and approval flow tracking", async () => {
    await request(app)
      .post("/api/contractors/CTR-2001/onboarding")
      .set("Authorization", `Bearer ${token}`)
      .send({ requirementId: "site-orientation" })
      .expect(200);

    await request(app)
      .post("/api/contractors/CTR-2001/approve")
      .set("Authorization", `Bearer ${token}`)
      .send({ stage: "insurance", approver: "risk.manager@example.com" })
      .expect(200);

    const detailRes = await request(app)
      .get("/api/contractors/CTR-2001")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(detailRes.body.data.onboarding.status).toBe("completed");
    expect(detailRes.body.data.approvals.insurance).toBe(true);
    expect(detailRes.body.data.auditLogs.length).toBeGreaterThan(1);
  });

  it("handles assignment edge cases and logs history with approvals", async () => {
    const blockedRes = await request(app)
      .post("/api/contractors/CTR-3001/assignments")
      .set("Authorization", `Bearer ${token}`)
      .send({ workOrderId: "WO-9100" })
      .expect(400);

    expect(blockedRes.body.reason).toContain("safety approval pending");

    await request(app)
      .post("/api/contractors/CTR-3001/approve")
      .set("Authorization", `Bearer ${token}`)
      .send({ stage: "safety", approver: "safety.lead@example.com" })
      .expect(200);

    await request(app)
      .post("/api/contractors/CTR-3001/credentials")
      .set("Authorization", `Bearer ${token}`)
      .send({
        type: "State Electrical License",
        expiresOn: "2027-12-31",
        documentUrl: "/docs/electrical-3001-renewed.pdf",
      })
      .expect(201);

    const successRes = await request(app)
      .post("/api/contractors/CTR-3001/assignments")
      .set("Authorization", `Bearer ${token}`)
      .send({ workOrderId: "WO-9101" })
      .expect(400);

    expect(successRes.body.reason).toContain("Expired credential");

    const detailRes = await request(app)
      .get("/api/contractors/CTR-3001")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const history = detailRes.body.data.assignmentHistory as Array<{ workOrderId: string; status: string }>;
    expect(history.some((item) => item.workOrderId === "WO-9101" && item.status === "rejected")).toBe(true);
    expect(detailRes.body.data.auditLogs[0].action).toContain("assignment");
  });
});
