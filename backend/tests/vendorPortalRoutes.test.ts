/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose, { Schema } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

vi.mock('nodemailer', () => {
  const sendMail = vi.fn().mockResolvedValue(true);
  const createTransport = vi.fn(() => ({ sendMail }));
  return {
    default: { createTransport },
    createTransport,
    __esModule: true,
  };
});

const vendorSchema = new Schema({
  name: String,
  email: String,
});
const Vendor = mongoose.model('VendorPortalVendor', vendorSchema);

const poSchema = new Schema({
  vendor: { type: Schema.Types.ObjectId, ref: 'VendorPortalVendor', required: true },
  status: { type: String, enum: ['open', 'acknowledged', 'shipped'], default: 'open' },
  trackingNumber: String,
});
const PurchaseOrder = mongoose.model('VendorPortalPO', poSchema);

const router = express.Router();

router.use((req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) return res.sendStatus(401);
  try {
    const token = auth.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    (req as any).vendorId = (payload as any).vendorId;
    next();
  } catch {
    res.sendStatus(401);
  }
});

router.get('/purchase-orders/:id', async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id).lean();
  if (!po) return res.sendStatus(404);
  if (po.vendor.toString() !== (req as any).vendorId) return res.sendStatus(403);
  res.json(po);
});

router.post('/purchase-orders/:id/acknowledge', async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id);
  if (!po) return res.sendStatus(404);
  if (po.vendor.toString() !== (req as any).vendorId) return res.sendStatus(403);
  po.status = 'acknowledged';
  await po.save();
  res.json(po.toObject());
});

router.post('/purchase-orders/:id/ship', async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id);
  if (!po) return res.sendStatus(404);
  if (po.vendor.toString() !== (req as any).vendorId) return res.sendStatus(403);
  po.status = 'shipped';
  po.trackingNumber = req.body.trackingNumber;
  await po.save();
  res.json(po.toObject());
});

router.post('/invite', async (req, res) => {
  const token = jwt.sign({ email: req.body.email }, process.env.JWT_SECRET!, { expiresIn: '1d' });
  const transport = nodemailer.createTransport({});
  await transport.sendMail({ to: req.body.email, text: token });
  res.json({ token });
});

const app = express();
app.use(express.json());
app.use('/vendor-portal', router);

let mongo: MongoMemoryServer;
let vendor: any;
let po: any;
let token: string;

beforeAll(async () => {
  process.env.JWT_SECRET = 'testsecret';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
  vendor = await Vendor.create({ name: 'Vendor', email: 'vendor@example.com' });
  po = await PurchaseOrder.create({ vendor: vendor._id });
  token = jwt.sign({ vendorId: vendor._id.toString() }, process.env.JWT_SECRET!);
});

describe('Vendor Portal Routes', () => {
  it('requires token authentication', async () => {
    await request(app)
      .get(`/vendor-portal/purchase-orders/${po._id}`)
      .expect(401);
  });

  it('allows vendors to access only their purchase orders', async () => {
    const otherVendor = await Vendor.create({ name: 'Other', email: 'other@example.com' });
    const otherToken = jwt.sign({ vendorId: otherVendor._id.toString() }, process.env.JWT_SECRET!);
    await request(app)
      .get(`/vendor-portal/purchase-orders/${po._id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);

    const res = await request(app)
      .get(`/vendor-portal/purchase-orders/${po._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body._id).toBe(po._id.toString());
  });

  it('handles acknowledgments and shipment updates with status transitions', async () => {
    let res = await request(app)
      .post(`/vendor-portal/purchase-orders/${po._id}/acknowledge`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.status).toBe('acknowledged');

    res = await request(app)
      .post(`/vendor-portal/purchase-orders/${po._id}/ship`)
      .set('Authorization', `Bearer ${token}`)
      .send({ trackingNumber: 'TRACK123' })
      .expect(200);
    expect(res.body.status).toBe('shipped');
    expect(res.body.trackingNumber).toBe('TRACK123');
  });

  it('generates invitation tokens and emails vendors', async () => {
    const res = await request(app)
      .post('/vendor-portal/invite')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'invitee@example.com' })
      .expect(200);
    const inviteToken = res.body.token;
    const transport = (nodemailer.createTransport as any).mock.results[0].value;
    expect(transport.sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'invitee@example.com', text: inviteToken }));
    const decoded: any = jwt.verify(inviteToken, process.env.JWT_SECRET!);
    expect(decoded.email).toBe('invitee@example.com');
  });
});

