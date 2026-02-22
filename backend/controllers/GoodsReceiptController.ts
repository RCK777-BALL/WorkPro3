/*
 * SPDX-License-Identifier: MIT
 */


import GoodsReceipt, { type IGoodsReceipt } from '../models/GoodsReceipt';
import PurchaseOrder, {
  type IPurchaseOrder,
  type IPurchaseOrderLine,
} from '../models/PurchaseOrder';
import Vendor from '../models/Vendor';
import { addStock } from '../services/inventory';
import nodemailer from 'nodemailer';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import type { AuthedRequestHandler } from '../types/http';
import type { ParamsDictionary } from 'express-serve-static-core';
import { sendResponse, assertEmail, writeAuditLog, toEntityId, logger, enqueueEmailRetry } from '../utils';

interface GoodsReceiptItemPayload {
  item: string;
  quantity: number;
  uom?: string;
}

interface CreateGoodsReceiptBody {
  purchaseOrder: string;
  items: GoodsReceiptItemPayload[];
}

type CreateGoodsReceiptParams = ParamsDictionary;
type CreateGoodsReceiptResponse = HydratedDocument<IGoodsReceipt>;

const createGoodsReceiptHandler: AuthedRequestHandler<
  CreateGoodsReceiptParams,
  CreateGoodsReceiptResponse | null,
  CreateGoodsReceiptBody
> = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId)
      return sendResponse(res, null, 'Tenant ID required', 400);
    const { purchaseOrder: poId, items: rawItems } =
      (req.body as Partial<CreateGoodsReceiptBody>) ?? {};

    if (!poId) {
      sendResponse(res, null, 'Purchase order required', 400);
      return;
    }

    const items: GoodsReceiptItemPayload[] = Array.isArray(rawItems)
      ? rawItems
      : [];

    const po = await PurchaseOrder.findById(poId);
    if (!po) {
      sendResponse(res, null, 'PO not found', 404);
      return;
    }

    const purchaseOrder = po as HydratedDocument<IPurchaseOrder>;

    const mongoose = (await import('mongoose')).default;
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database connection not ready');

    for (const grItem of items) {
      const itemIdRaw = toEntityId(grItem.item as string | Types.ObjectId);
      const itemId = Array.isArray(itemIdRaw) ? itemIdRaw[0] : itemIdRaw;
      const uomIdRaw = toEntityId(grItem.uom as string | Types.ObjectId | undefined);
      const uomId = Array.isArray(uomIdRaw) ? uomIdRaw[0] : uomIdRaw;

      if (!itemId) {
        throw new Error('Invalid inventory item identifier');
      }
      await addStock(itemId, grItem.quantity, uomId);
      const poLine = purchaseOrder.lines?.find(
        (line: IPurchaseOrderLine) => line.part.toString() === grItem.item,
      );
      let qty = grItem.quantity;
      if (poLine) {
        poLine.qtyReceived += qty;
      }
    }

    if (
      purchaseOrder.lines?.every(
        (line: IPurchaseOrderLine) => line.qtyReceived >= line.qtyOrdered,
      )
    ) {
      purchaseOrder.status = 'Closed';
    }

    await purchaseOrder.save();

    const gr = (await GoodsReceipt.create({
      purchaseOrder: purchaseOrder._id,
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

    const vendor = await Vendor.findById(purchaseOrder.vendorId).lean();
    if (vendor?.email) {
      assertEmail(vendor.email);
      const transporter = nodemailer.createTransport({ jsonTransport: true });
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: vendor.email,
        subject: `Goods received for PO ${purchaseOrder._id}`,
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

export { createGoodsReceiptHandler as createGoodsReceipt };
