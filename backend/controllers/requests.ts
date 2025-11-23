/*
 * SPDX-License-Identifier: MIT
 */

import type { Response, NextFunction } from 'express';
import { z } from 'zod';

import RequestForm from '../models/RequestForm';
import WorkRequest, { type WorkRequestStatus } from '../models/WorkRequest';
import Notification from '../models/Notifications';
import { nanoid } from 'nanoid';
import { convertWorkRequestToWorkOrder, listWorkRequests, getWorkRequestSummary } from '../src/modules/work-requests/service';
import { publicWorkRequestSchema, workRequestConversionSchema } from '../src/modules/work-requests/schemas';
import { writeAuditLog } from '../utils/audit';
import { toObjectId } from '../utils/ids';
import type { AuthedRequest, AuthedRequestHandler } from '../types/http';

const internalSubmissionSchema = publicWorkRequestSchema.extend({
  requestFormId: z.string().optional(),
});

const statusUpdateSchema = z.object({
  status: z.enum(['new', 'reviewing', 'converted', 'closed'] satisfies WorkRequestStatus[]),
});

const resolveFormId = async (input: { formSlug?: string; requestFormId?: string }) => {
  if (input.requestFormId) {
    return toObjectId(input.requestFormId);
  }
  if (input.formSlug) {
    const form = await RequestForm.findOne({ slug: input.formSlug }).lean<{ _id?: unknown }>();
    if (form?._id) return toObjectId(form._id);
  }
  return undefined;
};

export const createRequest: AuthedRequestHandler = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parse = internalSubmissionSchema.safeParse({ ...req.body });
    if (!parse.success) {
      res.status(400).json({ message: parse.error.errors.map((err) => err.message).join(', ') });
      return;
    }

    const requestForm = await resolveFormId(parse.data);
    if (!requestForm) {
      res.status(400).json({ message: 'A request form is required to capture submissions.' });
      return;
    }

    const tenantId = toObjectId(req.tenantId);
    const siteId = toObjectId(req.siteId);
    if (!tenantId) {
      res.status(400).json({ message: 'Tenant context is required.' });
      return;
    }

    const token = nanoid(10).toLowerCase();
    const created = await WorkRequest.create({
      token,
      ...parse.data,
      requestForm,
      tenantId,
      siteId,
      status: 'new',
    });

    await Notification.create({
      tenantId,
      title: 'New request submitted',
      message: `${parse.data.requesterName} submitted "${parse.data.title}" for review`,
      type: 'info',
    });

    await writeAuditLog({
      tenantId,
      siteId,
      userId: req.user?._id,
      action: 'create',
      entityType: 'request',
      entityId: created._id,
      entityLabel: created.title,
      after: created.toObject(),
    });

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

export const listRequests: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(400).json({ message: 'Tenant context missing' });
      return;
    }
    const items = await listWorkRequests({ tenantId, siteId: req.siteId });
    res.json(items);
  } catch (err) {
    next(err);
  }
};

export const summarizeRequests: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(400).json({ message: 'Tenant context missing' });
      return;
    }
    const summary = await getWorkRequestSummary({ tenantId, siteId: req.siteId });
    res.json(summary);
  } catch (err) {
    next(err);
  }
};

export const updateRequestStatus: AuthedRequestHandler = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parse = statusUpdateSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ message: parse.error.errors.map((err) => err.message).join(', ') });
      return;
    }

    const tenantId = toObjectId(req.tenantId);
    if (!tenantId) {
      res.status(400).json({ message: 'Tenant context missing' });
      return;
    }

    const before = await WorkRequest.findOne({ _id: req.params.id, tenantId });
    if (!before) {
      res.status(404).json({ message: 'Request not found' });
      return;
    }

    const beforeSnapshot = before.toObject();
    before.status = parse.data.status;
    await before.save();

    await Notification.create({
      tenantId,
      title: 'Request updated',
      message: `Status for "${before.title}" changed to ${parse.data.status}.`,
      type: 'info',
    });

    await writeAuditLog({
      tenantId,
      siteId: req.siteId,
      userId: req.user?._id,
      action: 'update',
      entityType: 'request',
      entityId: before._id,
      entityLabel: before.title,
      before: beforeSnapshot,
      after: before.toObject(),
    });

    res.json(before);
  } catch (err) {
    next(err);
  }
};

export const convertRequestToWorkOrder: AuthedRequestHandler = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parse = workRequestConversionSchema.safeParse(req.body ?? {});
    if (!parse.success) {
      res.status(400).json({ message: parse.error.errors.map((err) => err.message).join(', ') });
      return;
    }

    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(400).json({ message: 'Tenant context missing' });
      return;
    }

    const result = await convertWorkRequestToWorkOrder({ tenantId, siteId: req.siteId }, req.params.id, parse.data);

    await Notification.create({
      tenantId: toObjectId(tenantId),
      title: 'Request converted',
      message: `Work order ${result.workOrderId} created from request ${result.request.title}.`,
      type: 'info',
    });

    await writeAuditLog({
      tenantId,
      siteId: req.siteId,
      userId: req.user?._id,
      action: 'convert',
      entityType: 'request',
      entityId: req.params.id,
      entityLabel: result.request.title,
      after: result.request,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};
