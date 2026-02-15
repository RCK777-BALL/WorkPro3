"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workOrderQuerySchema = exports.workOrderUpdateSchema = exports.workOrderCreateSchema = exports.workOrderBaseSchema = exports.workOrderPrioritySchema = exports.workOrderStatusSchema = void 0;
const zod_1 = require("zod");
exports.workOrderStatusSchema = zod_1.z.enum([
    'draft',
    'open',
    'in_progress',
    'on_hold',
    'completed',
    'canceled',
]);
exports.workOrderPrioritySchema = zod_1.z.enum(['low', 'medium', 'high', 'critical']);
exports.workOrderBaseSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    assetId: zod_1.z.string().optional(),
    priority: exports.workOrderPrioritySchema.default('medium'),
    status: exports.workOrderStatusSchema.default('open'),
    type: zod_1.z.enum(['corrective', 'preventive', 'inspection', 'calibration', 'safety']).default('corrective'),
    checklists: zod_1.z
        .array(zod_1.z.object({
        text: zod_1.z.string().min(1),
        done: zod_1.z.boolean().default(false),
    }))
        .optional(),
    laborTimeMin: zod_1.z.number().int().nonnegative().optional(),
    partsUsed: zod_1.z
        .array(zod_1.z.object({
        partId: zod_1.z.string(),
        quantity: zod_1.z.number().int().positive(),
    }))
        .optional(),
    attachments: zod_1.z.array(zod_1.z.string()).optional(),
    dueDate: zod_1.z.string().optional(),
});
exports.workOrderCreateSchema = exports.workOrderBaseSchema;
exports.workOrderUpdateSchema = exports.workOrderBaseSchema.partial();
exports.workOrderQuerySchema = zod_1.z.object({
    status: exports.workOrderStatusSchema.optional(),
    priority: exports.workOrderPrioritySchema.optional(),
    assetId: zod_1.z.string().optional(),
    search: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(200).default(25),
});
