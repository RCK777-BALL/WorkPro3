/*
 * SPDX-License-Identifier: MIT
 */

import { Request, Response, NextFunction } from 'express';
import { sendResponse } from '../utils/sendResponse';

import GoodsReceipt, { type IGoodsReceipt } from '../models/GoodsReceipt';
import PurchaseOrder, { type IPurchaseOrderItem } from '../models/PurchaseOrder';
import Vendor from '../models/Vendor';
import { addStock } from '../services/inventory';
import nodemailer from 'nodemailer';
import { assertEmail } from '../utils/assert';
import { writeAuditLog } from '../utils/audit';
import { toEntityId } from '../utils/ids';
import logger from '../utils/logger';
import { enqueueEmailRetry } from '../utils/emailQueue';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';

interface GoodsReceiptItemPayload {
  item: string;
  quantity: number;
  uom?: string;
}

interface CreateGoodsReceiptBody {
  purchaseOrder: string;
  items: GoodsReceiptItemPayload[];
}

const createGoodsReceipt = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId)
      return sendResponse(res, null, 'Tenant ID required', 400);
    const { purchaseOrder: poId, items } = req.body as CreateGoodsReceiptBody;

    const po = await PurchaseOrder.findById(poId);
    if (!po) {
      sendResponse(res, null, 'PO not found', 404);
      return;
    }

    const mongoose = (await import('mongoose')).default;
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database connection not ready');

    for (const grItem of items) {
      const itemId = toEntityId(grItem.item as string | Types.ObjectId);
      const uomId = toEntityId(grItem.uom as string | Types.ObjectId | undefined);
      if (!itemId) {
        throw new Error('Invalid inventory item identifier');
      }
      await addStock(itemId, grItem.quantity, uomId);
      const poItem = po.items?.find(
        (item: IPurchaseOrderItem) => item.item.toString() === grItem.item,
      );
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

    if (po.items?.every((item: IPurchaseOrderItem) => item.received >= item.quantity)) {
      po.status = 'closed';
    }

    await po.save();

    const gr = (await GoodsReceipt.create({
      purchaseOrder: po._id,
      items,
      tenantId,
    })) as HydratedDocument<IGoodsReceipt>;
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const grAny = gr as HydratedDocument<IGoodsReceipt> & {
      id?: string;
      toObject?: () => unknown;
    };
    const rawEntityId = (grAny?._id ?? grAny?.id) as
      | HydratedDocument<IGoodsReceipt>['_id']
      | string
      | undefined;
    const normalizedEntityId =
      toEntityId(rawEntityId as Types.ObjectId | string | undefined) ??
      (typeof rawEntityId === 'string'
        ? rawEntityId
        : (gr._id as unknown as Types.ObjectId | undefined)?.toString?.());

    if (tenantId) {
      await writeAuditLog({
        tenantId,
        ...(userId ? { userId } : {}),
        action: 'create',
        entityType: 'GoodsReceipt',
        ...(normalizedEntityId ? { entityId: normalizedEntityId } : {}),
        after: typeof grAny.toObject === 'function' ? grAny.toObject() : grAny,
      });
    }

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

    sendResponse(res, gr, null, 201);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export { createGoodsReceipt };
