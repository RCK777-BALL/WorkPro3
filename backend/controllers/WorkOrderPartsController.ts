import type { Response, NextFunction } from 'express';
import mongoose, { Types } from 'mongoose';

import type { AuthedRequest } from '../types/http';
import WorkOrder, { type WorkOrderDocument } from '../models/WorkOrder';
import PartStock, { type PartStockDocument } from '../models/PartStock';
import InventoryMovement from '../models/InventoryMovement';
import WorkOrderPartLineItem, { type WorkOrderPartLineItemDocument } from '../models/WorkOrderPartLineItem';
import InventoryPart from '../src/modules/inventory/models/Part';
import { sendResponse } from '../utils';

const activeLineItemFilter = { deletedAt: { $exists: false } } as const;

const toObjectId = (raw: unknown): Types.ObjectId | null => {
  if (raw == null) return null;
  if (!mongoose.isValidObjectId(raw)) return null;
  if (Types.ObjectId.isValid(raw) && typeof raw === 'object' && raw !== null && 'toHexString' in raw) {
    return raw as Types.ObjectId;
  }
  return new Types.ObjectId(String(raw));
};

const resolveUserObjectId = (req: AuthedRequest): Types.ObjectId | undefined => {
  const raw = req.user?._id ?? req.user?.id;
  const objectId = toObjectId(raw);
  return objectId ?? undefined;
};

const resolveUnitCost = async (
  tenantId: Types.ObjectId,
  partId: Types.ObjectId,
  provided?: number,
): Promise<number> => {
  if (typeof provided === 'number') return provided;
  const part = await InventoryPart.findOne({ _id: partId, tenantId }).select('unitCost cost');
  return part?.unitCost ?? part?.cost ?? 0;
};

const assertPositiveQuantity = (quantity: unknown): number | null => {
  const parsed = Number(quantity);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const parsePartRequestBody = (
  body: unknown,
): { quantity: number | null; stockId: string | null; unitCost?: number } => {
  const payload = (body ?? {}) as Record<string, unknown>;
  return {
    quantity: assertPositiveQuantity(payload.quantity),
    stockId: typeof payload.stockId === 'string' ? payload.stockId : null,
    unitCost: typeof payload.unitCost === 'number' ? payload.unitCost : undefined,
  };
};

const findWorkOrder = async (
  tenantId: Types.ObjectId,
  workOrderId: string,
): Promise<WorkOrderDocument | null> => {
  if (!Types.ObjectId.isValid(workOrderId)) return null;
  return WorkOrder.findOne({ _id: workOrderId, tenantId });
};

const getOrCreateLineItem = async (
  tenantId: Types.ObjectId,
  workOrderId: Types.ObjectId,
  partId: Types.ObjectId,
  stockId: Types.ObjectId,
  session: mongoose.ClientSession,
  unitCost?: number,
): Promise<WorkOrderPartLineItemDocument> => {
  const filter = { tenantId, workOrderId, partId, stockId, ...activeLineItemFilter };
  let lineItem = await WorkOrderPartLineItem.findOne(filter, undefined, { session });
  if (!lineItem) {
    const resolvedUnitCost = await resolveUnitCost(tenantId, partId, unitCost);
    lineItem = new WorkOrderPartLineItem({
      tenantId,
      workOrderId,
      partId,
      stockId,
      unitCost: resolvedUnitCost,
    });
    lineItem.$session(session);
  } else if (typeof unitCost === 'number') {
    lineItem.unitCost = unitCost;
  }
  return lineItem;
};

const recordMovement = async (
  tenantId: Types.ObjectId,
  workOrderId: Types.ObjectId,
  partId: Types.ObjectId,
  stock: PartStockDocument,
  type: 'reserve' | 'unreserve' | 'issue' | 'return',
  quantity: number,
  session: mongoose.ClientSession,
  createdBy?: Types.ObjectId,
) => {
  if (!stock) return;
  await InventoryMovement.create(
    [
      {
        tenantId,
        siteId: stock.siteId,
        workOrderId,
        partId,
        stockId: stock._id,
        type,
        quantity,
        onHandAfter: stock.onHand,
        reservedAfter: stock.reserved,
        createdBy,
      },
    ],
    { session },
  );
};

const refreshWorkOrderTotals = async (
  workOrder: WorkOrderDocument | null,
  session: mongoose.ClientSession,
) => {
  if (!workOrder) return;
  const items = await WorkOrderPartLineItem.find(
    { tenantId: workOrder.tenantId, workOrderId: workOrder._id, ...activeLineItemFilter },
    undefined,
    { session },
  );
  const partsCostTotal = items.reduce((sum, item) => sum + Number(item.totalCost ?? 0), 0);
  workOrder.partsCostTotal = partsCostTotal;
  workOrder.partsCost = partsCostTotal;
  const misc = workOrder.miscellaneousCost ?? workOrder.miscCost ?? 0;
  const labor = workOrder.laborCost ?? 0;
  workOrder.totalCost = labor + partsCostTotal + misc;
  workOrder.$session(session);
  await workOrder.save({ session });
};

const validateStockForTenant = async (
  tenantId: Types.ObjectId,
  stockId: string,
  session: mongoose.ClientSession,
): Promise<PartStockDocument | null> => {
  if (!Types.ObjectId.isValid(stockId)) return null;
  return PartStock.findOne({ _id: stockId, tenantId }, undefined, { session });
};

export const listWorkOrderParts = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId ? toObjectId(req.tenantId) : null;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const workOrder = await findWorkOrder(tenantId, req.params.id);
    if (!workOrder) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const items = await WorkOrderPartLineItem.find({ tenantId, workOrderId: workOrder._id, ...activeLineItemFilter });
    sendResponse(res, items);
  } catch (err) {
    next(err);
  }
};

export const reserveWorkOrderPart = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const session = await mongoose.startSession();
  try {
    const { quantity, stockId, unitCost } = parsePartRequestBody(req.body);
    const tenantId = req.tenantId ? toObjectId(req.tenantId) : null;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    if (!quantity) {
      sendResponse(res, null, 'Quantity must be positive', 400);
      return;
    }
    if (!stockId) {
      sendResponse(res, null, 'Stock ID is required', 400);
      return;
    }

    const workOrder = await findWorkOrder(tenantId, req.params.id);
    if (!workOrder) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    await session.withTransaction(async () => {
      const stock = await validateStockForTenant(tenantId, stockId, session);
      if (!stock) {
        throw new Error('Part stock not found');
      }
      if (stock.onHand < quantity) {
        throw new Error('Insufficient on-hand quantity');
      }

      const lineItem = await getOrCreateLineItem(
        tenantId,
        workOrder._id,
        stock.partId as Types.ObjectId,
        stock._id as Types.ObjectId,
        session,
        unitCost,
      );

      stock.onHand -= quantity;
      stock.reserved += quantity;
      await stock.save({ session });

      lineItem.qtyReserved = (lineItem.qtyReserved ?? 0) + quantity;
      lineItem.siteId = workOrder.siteId;
      await lineItem.save({ session });

      await recordMovement(
        tenantId,
        workOrder._id as Types.ObjectId,
        stock.partId as Types.ObjectId,
        stock,
        'reserve',
        quantity,
        session,
        resolveUserObjectId(req),
      );

      await refreshWorkOrderTotals(workOrder, session);
    });

    const items = await WorkOrderPartLineItem.find({ tenantId, workOrderId: workOrder._id, ...activeLineItemFilter });
    sendResponse(res, items);
  } catch (err: any) {
    sendResponse(res, null, err.message ?? 'Unable to reserve part', 400);
  } finally {
    await session.endSession();
  }
};

export const unreserveWorkOrderPart = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const session = await mongoose.startSession();
  try {
    const { quantity, stockId } = parsePartRequestBody(req.body);
    const tenantId = req.tenantId ? toObjectId(req.tenantId) : null;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    if (!quantity) {
      sendResponse(res, null, 'Quantity must be positive', 400);
      return;
    }
    if (!stockId) {
      sendResponse(res, null, 'Stock ID is required', 400);
      return;
    }

    const workOrder = await findWorkOrder(tenantId, req.params.id);
    if (!workOrder) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    await session.withTransaction(async () => {
      const stock = await validateStockForTenant(tenantId, stockId, session);
      if (!stock) {
        throw new Error('Part stock not found');
      }

      const lineItem = await WorkOrderPartLineItem.findOne(
        { tenantId, workOrderId: workOrder._id, stockId: stock._id, ...activeLineItemFilter },
        undefined,
        { session },
      );
      if (!lineItem) {
        throw new Error('No matching reservation found');
      }
      if (lineItem.qtyReserved < quantity) {
        throw new Error('Cannot unreserve more than reserved');
      }
      if (stock.reserved < quantity) {
        throw new Error('Reserved balance would become negative');
      }

      stock.reserved -= quantity;
      stock.onHand += quantity;
      await stock.save({ session });

      lineItem.qtyReserved -= quantity;
      await lineItem.save({ session });

      await recordMovement(
        tenantId,
        workOrder._id as Types.ObjectId,
        stock.partId as Types.ObjectId,
        stock,
        'unreserve',
        quantity,
        session,
        resolveUserObjectId(req),
      );

      await refreshWorkOrderTotals(workOrder, session);
    });

    const items = await WorkOrderPartLineItem.find({ tenantId, workOrderId: workOrder._id, ...activeLineItemFilter });
    sendResponse(res, items);
  } catch (err: any) {
    sendResponse(res, null, err.message ?? 'Unable to unreserve part', 400);
  } finally {
    await session.endSession();
  }
};

export const issueWorkOrderPart = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const session = await mongoose.startSession();
  try {
    const { quantity, stockId, unitCost } = parsePartRequestBody(req.body);
    const tenantId = req.tenantId ? toObjectId(req.tenantId) : null;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    if (!quantity) {
      sendResponse(res, null, 'Quantity must be positive', 400);
      return;
    }
    if (!stockId) {
      sendResponse(res, null, 'Stock ID is required', 400);
      return;
    }

    const workOrder = await findWorkOrder(tenantId, req.params.id);
    if (!workOrder) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    await session.withTransaction(async () => {
      const stock = await validateStockForTenant(tenantId, stockId, session);
      if (!stock) {
        throw new Error('Part stock not found');
      }

      const lineItem = await getOrCreateLineItem(
        tenantId,
        workOrder._id,
        stock.partId as Types.ObjectId,
        stock._id as Types.ObjectId,
        session,
        unitCost,
      );

      if (lineItem.qtyReserved < quantity || stock.reserved < quantity) {
        throw new Error('Insufficient reserved quantity to issue');
      }

      lineItem.qtyReserved -= quantity;
      lineItem.qtyIssued = (lineItem.qtyIssued ?? 0) + quantity;
      lineItem.siteId = workOrder.siteId;
      await lineItem.save({ session });

      stock.reserved -= quantity;
      await stock.save({ session });

      await recordMovement(
        tenantId,
        workOrder._id as Types.ObjectId,
        stock.partId as Types.ObjectId,
        stock,
        'issue',
        quantity,
        session,
        resolveUserObjectId(req),
      );

      await refreshWorkOrderTotals(workOrder, session);
    });

    const items = await WorkOrderPartLineItem.find({ tenantId, workOrderId: workOrder._id, ...activeLineItemFilter });
    sendResponse(res, items);
  } catch (err: any) {
    sendResponse(res, null, err.message ?? 'Unable to issue part', 400);
  } finally {
    await session.endSession();
  }
};

export const returnIssuedWorkOrderPart = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const session = await mongoose.startSession();
  try {
    const { quantity, stockId } = parsePartRequestBody(req.body);
    const tenantId = req.tenantId ? toObjectId(req.tenantId) : null;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    if (!quantity) {
      sendResponse(res, null, 'Quantity must be positive', 400);
      return;
    }
    if (!stockId) {
      sendResponse(res, null, 'Stock ID is required', 400);
      return;
    }

    const workOrder = await findWorkOrder(tenantId, req.params.id);
    if (!workOrder) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    await session.withTransaction(async () => {
      const stock = await validateStockForTenant(tenantId, stockId, session);
      if (!stock) {
        throw new Error('Part stock not found');
      }

      const lineItem = await WorkOrderPartLineItem.findOne(
        { tenantId, workOrderId: workOrder._id, stockId: stock._id, ...activeLineItemFilter },
        undefined,
        { session },
      );
      if (!lineItem) {
        throw new Error('No line item found for return');
      }
      if (lineItem.qtyIssued < quantity) {
        throw new Error('Cannot return more than issued');
      }

      lineItem.qtyIssued -= quantity;
      await lineItem.save({ session });

      stock.onHand += quantity;
      await stock.save({ session });

      await recordMovement(
        tenantId,
        workOrder._id as Types.ObjectId,
        stock.partId as Types.ObjectId,
        stock,
        'return',
        quantity,
        session,
        resolveUserObjectId(req),
      );

      await refreshWorkOrderTotals(workOrder, session);
    });

    const items = await WorkOrderPartLineItem.find({ tenantId, workOrderId: workOrder._id, ...activeLineItemFilter });
    sendResponse(res, items);
  } catch (err: any) {
    sendResponse(res, null, err.message ?? 'Unable to return part', 400);
  } finally {
    await session.endSession();
  }
};

export const deleteWorkOrderPartLineItem = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const session = await mongoose.startSession();
  try {
    const tenantId = req.tenantId ? toObjectId(req.tenantId) : null;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const workOrder = await findWorkOrder(tenantId, req.params.id);
    if (!workOrder) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    await session.withTransaction(async () => {
      const lineItem = await WorkOrderPartLineItem.findOne(
        { tenantId, _id: req.params.lineItemId, workOrderId: workOrder._id, ...activeLineItemFilter },
        undefined,
        { session },
      );
      if (!lineItem) {
        throw new Error('Line item not found');
      }

      if (lineItem.qtyReserved > 0 && lineItem.stockId) {
        const stock = await PartStock.findOne({ _id: lineItem.stockId, tenantId }, undefined, { session });
        if (stock) {
          stock.reserved = Math.max(0, stock.reserved - lineItem.qtyReserved);
          stock.onHand += lineItem.qtyReserved;
          await stock.save({ session });
          await recordMovement(
            tenantId,
            workOrder._id as Types.ObjectId,
            lineItem.partId as Types.ObjectId,
            stock,
            'unreserve',
            lineItem.qtyReserved,
            session,
            resolveUserObjectId(req),
          );
        }
      }

      lineItem.qtyReserved = 0;
      lineItem.deletedAt = new Date();
      await lineItem.save({ session });

      await refreshWorkOrderTotals(workOrder, session);
    });

    sendResponse(res, { ok: true });
  } catch (err: any) {
    sendResponse(res, null, err.message ?? 'Unable to delete line item', 400);
  } finally {
    await session.endSession();
  }
};
