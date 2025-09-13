/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

import purchaseOrderRoutes from '../routes/PurchaseOrderRoutes';
import goodsReceiptRoutes from '../routes/GoodsReceiptRoutes';
import InventoryItem from '../models/InventoryItem';
import PurchaseOrder from '../models/PurchaseOrder';
import User from '../models/User';
import Vendor from '../models/Vendor';
import nodemailer from 'nodemailer';

vi.mock('nodemailer', () => {
  const sendMail = vi.fn().mockResolvedValue(true);
  return {
    createTransport: vi.fn(() => ({ sendMail })),
    __esModule: true,
  };
});

const app = express();
app.use(express.json());
app.use('/purchase-orders', purchaseOrderRoutes);
app.use('/goods-receipts', goodsReceiptRoutes);

let mongo: MongoMemoryServer;
let token: string;
let user: any;
let item: any;
let pieceUom: mongoose.Types.ObjectId;
let boxUom: mongoose.Types.ObjectId;

let vendor: any;

beforeAll(async () => {
  process.env.JWT_SECRET = 'testsecret';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  user = await User.create({
    name: 'Tester',
    email: 'tester@example.com',
    passwordHash: 'pass123',
    roles: ['manager'],
    tenantId: new mongoose.Types.ObjectId(),
  });
  token = jwt.sign({ id: user._id.toString(), roles: user.roles }, process.env.JWT_SECRET!);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
  pieceUom = new mongoose.Types.ObjectId();
  boxUom = new mongoose.Types.ObjectId();
  await mongoose.connection.db.collection('unitOfMeasure').insertMany([
    { _id: pieceUom, name: 'piece' },
    { _id: boxUom, name: 'box' },
  ]);
  await mongoose.connection.db.collection('conversions').insertOne({
    from: boxUom,
    to: pieceUom,
    factor: 10,
  });
  vendor = await Vendor.create({ name: 'Vendor', email: 'vendor@example.com', tenantId: user.tenantId });
  item = await InventoryItem.create({
    name: 'Part',
    quantity: 0,
    uom: pieceUom,
    tenantId: user.tenantId,
  });
});

describe('Purchase order lifecycle', () => {
  it('handles partial receipts, conversions, and emails', async () => {
    const poRes = await request(app)
      .post('/purchase-orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vendor: vendor._id.toString(),
        items: [{ item: item._id.toString(), quantity: 15, uom: pieceUom.toString() }],
        tenantId: user.tenantId.toString(),
      })
      .expect(201);

    const poId = poRes.body._id;

    await request(app)
      .post('/goods-receipts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        purchaseOrder: poId,
        items: [{ item: item._id.toString(), quantity: 5, uom: pieceUom.toString() }],
        tenantId: user.tenantId.toString(),
      })
      .expect(201);

    let updated = await InventoryItem.findById(item._id);
    expect(updated?.quantity).toBe(5);
    let po = await PurchaseOrder.findById(poId);
    expect(po?.status).toBe('open');
    expect(po?.items[0].received).toBe(5);

    await request(app)
      .post('/goods-receipts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        purchaseOrder: poId,
        items: [{ item: item._id.toString(), quantity: 1, uom: boxUom.toString() }],
        tenantId: user.tenantId.toString(),
      })
      .expect(201);

    updated = await InventoryItem.findById(item._id);
    expect(updated?.quantity).toBe(15);
    po = await PurchaseOrder.findById(poId);
    expect(po?.status).toBe('closed');
    expect(po?.items[0].received).toBe(15);

    const transport = (nodemailer.createTransport as any).mock.results[0].value;
    expect(transport.sendMail).toHaveBeenCalled();
  });
});
