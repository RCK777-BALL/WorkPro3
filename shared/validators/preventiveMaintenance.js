"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.preventiveMaintenanceUpdateSchema = exports.preventiveMaintenanceSchema = exports.pmScheduleSchema = void 0;
const zod_1 = require("zod");
exports.pmScheduleSchema = zod_1.z.object({
    cadenceType: zod_1.z.enum(['time', 'meter']),
    cadenceValue: zod_1.z.number().positive(),
    meterUnit: zod_1.z.string().optional(),
    startDate: zod_1.z.string().optional(),
});
exports.preventiveMaintenanceSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    assetIds: zod_1.z.array(zod_1.z.string()).min(1),
    checklistTemplateId: zod_1.z.string().optional(),
    schedule: exports.pmScheduleSchema,
    nextRunAt: zod_1.z.string().optional(),
    active: zod_1.z.boolean().default(true),
});
exports.preventiveMaintenanceUpdateSchema = exports.preventiveMaintenanceSchema.partial();
