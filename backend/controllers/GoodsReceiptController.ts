/*
 * SPDX-License-Identifier: MIT
 */

import { Request, Response, NextFunction } from 'express';

import GoodsReceipt from '../models/GoodsReceipt';
import PurchaseOrder from '../models/PurchaseOrder';
import Vendor from '../models/Vendor';
import { addStock } from '../services/inventory';
import nodemailer from 'nodemailer';
import { assertEmail } from '../utils/assert';
import { writeAuditLog } from '../utils/audit';
import logger from '../utils/logger';
import { enqueueEmailRetry } from '../utils/emailQueue';

export const createGoodsReceipt = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId)
      return res.status(400).json({ message: 'Tenant ID required' });
    const { purchaseOrder: poId, items } = req.body as any;

    const po = await PurchaseOrder.findById(poId);
    if (!po) {
      res.status(404).json({ message: 'PO not found' });
      return;
    }

    const mongoose = (await import('mongoose')).default;
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database connection not ready');

    for (const grItem of items) {
      await addStock(grItem.item, grItem.quantity, grItem.uom);
      const poItem = po.items?.find((i) => i.item.toString() === grItem.item);
      let qty = grItem.quantity;
      if (grItem.uom && poItem?.uom && grItem.uom.toString() !== poItem.uom.toString()) {
        const conv = await db
          .collection('conversions')
          .findOne({ from: grItem.uom, to: poItem.uom });
        if (conv) qty = qty * conv.factor;
      }
      if (poItem) {
        poItem.received += qty;
      }
    }

    if (po.items?.every((i) => i.received >= i.quantity)) {
      po.status = 'closed';
    }

    await po.save();

    const gr = await GoodsReceipt.create({
      purchaseOrder: po._id,
      items,
      tenantId,
    });
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const grAny = gr as any;
    await writeAuditLog({
      ...(tenantId ? { tenantId } : {}),
      userId,
      action: 'create',
      entityType: 'GoodsReceipt',
      entityId: grAny._1 as any,
      after: typeof grAny.toObject === 'function' ? grAny.toObject() : grAny,
    });

    const vendor = await Vendor.findById(po.vendor).lean();
    if (vendor?.email) {
      assertEmail(vendor.email);
      const transporter = nodemailer.createTransport({ jsonTransport: true });
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: vendor.email,
        subject: `Goods received for PO ${po._id}`,
        text: 'Items received',
      };

      try {
        await transporter.sendMail(mailOptions);
      } catch (err) {
        logger.error('Failed to send goods receipt email', err);
        void enqueueEmailRetry(mailOptions);
      }
    }

    res.status(201).json(gr);
    return;
  } catch (err) {
    next(err);
    return;
  }
};
