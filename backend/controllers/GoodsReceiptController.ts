import { Request, Response, NextFunction } from 'express';
 
import GoodsReceipt from '../models/GoodsReceipt';
import PurchaseOrder from '../models/PurchaseOrder';
import Vendor from '../models/Vendor';
import { addStock } from '../services/inventory';
import nodemailer from 'nodemailer';
import { assertEmail } from '../utils/assert';

export const createGoodsReceipt = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantId = req.tenantId;
    const { purchaseOrder: poId, items } = req.body as any;

    const po = await PurchaseOrder.findById(poId);
    if (!po) return res.status(404).json({ message: 'PO not found' });

    for (const grItem of items) {
      await addStock(grItem.item, grItem.quantity, grItem.uom);
      const poItem = po.items.find((i) => i.item.toString() === grItem.item);
      if (poItem) {
        let qty = grItem.quantity;
        if (grItem.uom && poItem.uom && grItem.uom.toString() !== poItem.uom.toString()) {
          const conv = await (await import('mongoose')).default.connection.db
            .collection('conversions')
            .findOne({ from: grItem.uom, to: poItem.uom });
          if (conv) qty = qty * conv.factor;
        }
        poItem.received += qty;
      }
    }

    if (po.items.every((i) => i.received >= i.quantity)) {
      po.status = 'closed';
    }

    await po.save();

    const gr = await GoodsReceipt.create({
      purchaseOrder: po._id,
      items,
      ...(tenantId ? { tenantId } : {}),
    });

    const vendor = await Vendor.findById(po.vendor).lean();
    if (vendor?.email) {
      assertEmail(vendor.email);
      const transporter = nodemailer.createTransport({ jsonTransport: true });
      await transporter.sendMail({
        to: vendor.email,
        subject: `Goods received for PO ${po._id}`,
        text: 'Items received',
      });
    }

    res.status(201).json(gr);
  } catch (err) {
    next(err);
  }
};
