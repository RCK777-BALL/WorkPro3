"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.purchaseOrderUpdateSchema = exports.purchaseOrderSchema = exports.purchaseOrderLineSchema = void 0;
const zod_1 = require("zod");
exports.purchaseOrderLineSchema = zod_1.z.object({
    partId: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    quantity: zod_1.z.number().int().positive(),
    unitCost: zod_1.z.number().nonnegative(),
    tax: zod_1.z.number().nonnegative().optional(),
    fees: zod_1.z.number().nonnegative().optional(),
});
exports.purchaseOrderSchema = zod_1.z.object({
    vendorId: zod_1.z.string(),
    status: zod_1.z.enum(['draft', 'sent', 'partially_received', 'closed', 'canceled']).default('draft'),
    lines: zod_1.z.array(exports.purchaseOrderLineSchema).min(1),
    notes: zod_1.z.string().optional(),
    expectedDate: zod_1.z.string().optional(),
});
exports.purchaseOrderUpdateSchema = exports.purchaseOrderSchema.partial();
