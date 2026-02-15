/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { requireAuth } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';
import { auditLogMiddleware, recordAudit } from '../middleware/auditLogMiddleware';
import InspectionTemplate from '../models/InspectionTemplate';
import InspectionRecord from '../models/InspectionRecord';
import Asset from '../models/Asset';
import { sendResponse } from '../utils/sendResponse';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);
router.use(auditLogMiddleware);

const checklistItemSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  type: z.enum(['boolean', 'text', 'number', 'choice']),
  required: z.boolean().optional(),
  helpText: z.string().optional(),
  options: z.array(z.string()).optional(),
});

const checklistSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  items: z.array(checklistItemSchema),
});

const templateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  siteId: z.string().optional(),
  categories: z.array(z.string()).default([]),
  retentionDays: z.number().int().positive().optional(),
  sections: z.array(checklistSectionSchema),
});

router.get('/templates', async (req, res, next) => {
  try {
    const { siteId } = req.query;
    const query: Record<string, unknown> = { tenantId: req.tenantId };
    if (siteId) query.siteId = siteId;
    const templates = await InspectionTemplate.find(query).sort({ updatedAt: -1 });
    sendResponse(res, templates);
  } catch (err) {
    next(err);
  }
});

router.post('/templates', async (req, res, next) => {
  try {
    const parsed = templateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendResponse(res, null, parsed.error.flatten(), 400);
      return;
    }

    const lastVersion = await InspectionTemplate.findOne({
      tenantId: req.tenantId,
      name: parsed.data.name,
      siteId: parsed.data.siteId,
    })
      .sort({ version: -1 })
      .lean();

    const template = await InspectionTemplate.create({
      ...parsed.data,
      version: (lastVersion?.version ?? 0) + 1,
      tenantId: req.tenantId,
      createdBy: req.user?._id,
    });

    recordAudit(req, res, {
      action: 'create',
      entityType: 'inspectionTemplate',
      entityId: template._id.toString(),
      entityLabel: template.name,
      after: template.toObject(),
    });

    sendResponse(res, template, null, 201);
  } catch (err) {
    next(err);
  }
});

router.put('/templates/:templateId', async (req, res, next) => {
  try {
    const parsed = templateSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      sendResponse(res, null, parsed.error.flatten(), 400);
      return;
    }

    const template = await InspectionTemplate.findOne({
      _id: req.params.templateId,
      tenantId: req.tenantId,
    });

    if (!template) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    const before = template.toObject();
    template.set(parsed.data);
    template.version += 1;
    await template.save();

    recordAudit(req, res, {
      action: 'update',
      entityType: 'inspectionTemplate',
      entityId: template._id.toString(),
      entityLabel: template.name,
      before,
      after: template.toObject(),
    });

    sendResponse(res, template);
  } catch (err) {
    next(err);
  }
});

const recordSchema = z.object({
  templateId: z.string(),
  assetId: z.string().optional(),
  siteId: z.string().optional(),
  status: z.enum(['draft', 'in-progress', 'completed', 'archived']).optional(),
  summary: z.string().optional(),
  responses: z
    .array(
      z.object({
        itemId: z.string(),
        response: z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()]),
        passed: z.boolean().optional(),
        notes: z.string().optional(),
      }),
    )
    .optional(),
});

router.post('/records', async (req, res, next) => {
  try {
    const parsed = recordSchema.safeParse(req.body);
    if (!parsed.success) {
      sendResponse(res, null, parsed.error.flatten(), 400);
      return;
    }

    const template = await InspectionTemplate.findOne({
      _id: parsed.data.templateId,
      tenantId: req.tenantId,
    });

    if (!template) {
      sendResponse(res, null, 'Template not found', 404);
      return;
    }

    const siteId = parsed.data.siteId ? new Types.ObjectId(parsed.data.siteId) : template.siteId;
    const assetId = parsed.data.assetId ? new Types.ObjectId(parsed.data.assetId) : undefined;

    const record = await InspectionRecord.create({
      tenantId: req.tenantId,
      siteId,
      assetId,
      templateId: template._id,
      templateName: template.name,
      status: parsed.data.status ?? 'in-progress',
      summary: parsed.data.summary,
      sections: template.sections,
      responses: parsed.data.responses ?? [],
      completedBy: undefined,
    });

    recordAudit(req, res, {
      action: 'create',
      entityType: 'inspectionRecord',
      entityId: record._id.toString(),
      entityLabel: template.name,
      after: record.toObject(),
    });

    sendResponse(res, record, null, 201);
  } catch (err) {
    next(err);
  }
});

router.get('/records', async (req, res, next) => {
  try {
    const { assetId, status } = req.query;
    const query: Record<string, unknown> = { tenantId: req.tenantId };
    if (assetId) query.assetId = assetId;
    if (status) query.status = status;
    const records = await InspectionRecord.find(query).sort({ updatedAt: -1 });
    sendResponse(res, records);
  } catch (err) {
    next(err);
  }
});

router.post('/records/:recordId/complete', async (req, res, next) => {
  try {
    const parsed = recordSchema.pick({ responses: true, summary: true }).extend({
      completedBy: z.string().optional(),
    });
    const body = parsed.safeParse(req.body);
    if (!body.success) {
      sendResponse(res, null, body.error.flatten(), 400);
      return;
    }
    if (body.data.completedBy && !Types.ObjectId.isValid(body.data.completedBy)) {
      sendResponse(res, null, 'Invalid completedBy id', 400);
      return;
    }

    const record = await InspectionRecord.findOne({
      _id: req.params.recordId,
      tenantId: req.tenantId,
    });

    if (!record) {
      sendResponse(res, null, 'Inspection not found', 404);
      return;
    }

    const before = record.toObject();
    record.status = 'completed';
    record.responses = (body.data.responses ?? record.responses) as typeof record.responses;
    record.summary = body.data.summary ?? record.summary;
    const fallbackCompletedBy = req.user?._id ? String(req.user._id) : undefined;
    const completedBy = body.data.completedBy ?? fallbackCompletedBy;
    record.completedBy = completedBy && Types.ObjectId.isValid(completedBy)
      ? new Types.ObjectId(completedBy)
      : undefined;
    record.completedAt = new Date();
    await record.save();

    if (record.assetId) {
      await Asset.findOneAndUpdate(
        { _id: record.assetId, tenantId: req.tenantId },
        {
          lastInspection: {
            recordId: record._id,
            templateName: record.templateName,
            status: record.status,
            completedAt: record.completedAt,
            summary: record.summary,
          },
        },
      );
    }

    recordAudit(req, res, {
      action: 'complete',
      entityType: 'inspectionRecord',
      entityId: record._id.toString(),
      entityLabel: record.templateName,
      before,
      after: record.toObject(),
    });

    sendResponse(res, record);
  } catch (err) {
    next(err);
  }
});

router.get('/assets/:assetId/records', async (req, res, next) => {
  try {
    const records = await InspectionRecord.find({
      tenantId: req.tenantId,
      assetId: req.params.assetId,
    }).sort({ completedAt: -1 });
    sendResponse(res, records);
  } catch (err) {
    next(err);
  }
});

export default router;
