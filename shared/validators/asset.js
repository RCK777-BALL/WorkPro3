"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assetQuerySchema = exports.assetUpdateSchema = exports.assetCreateSchema = exports.assetBaseSchema = void 0;
const zod_1 = require("zod");
exports.assetBaseSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    type: zod_1.z.enum(['Electrical', 'Mechanical', 'Tooling', 'Interface', 'Welding']).optional(),
    qrCode: zod_1.z.string().optional(),
    location: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
    departmentId: zod_1.z.string().optional(),
    lineId: zod_1.z.string().optional(),
    stationId: zod_1.z.string().optional(),
    status: zod_1.z.enum(['Active', 'Offline', 'In Repair']).optional(),
    serialNumber: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    modelName: zod_1.z.string().optional(),
    manufacturer: zod_1.z.string().optional(),
    purchaseDate: zod_1.z.string().optional(),
    warrantyStart: zod_1.z.string().optional(),
    warrantyEnd: zod_1.z.string().optional(),
    purchaseCost: zod_1.z.number().nonnegative().optional(),
    expectedLifeMonths: zod_1.z.number().int().positive().optional(),
    replacementDate: zod_1.z.string().optional(),
    installationDate: zod_1.z.string().optional(),
    criticality: zod_1.z.enum(['high', 'medium', 'low']).optional(),
    documents: zod_1.z.array(zod_1.z.string()).optional(),
    customFields: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.assetCreateSchema = exports.assetBaseSchema.extend({
    name: zod_1.z.string().min(1),
});
exports.assetUpdateSchema = exports.assetBaseSchema.partial();
exports.assetQuerySchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    status: zod_1.z.string().optional(),
    type: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(200).default(25),
});
