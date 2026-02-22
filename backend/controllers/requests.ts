/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';
import { z } from 'zod';

import RequestForm from '../models/RequestForm';
import WorkRequest, { type WorkRequestStatus } from '../models/WorkRequest';
import Notification from '../models/Notification';
import { nanoid } from 'nanoid';
import { convertWorkRequestToWorkOrder, listWorkRequests, getWorkRequestSummary } from '../src/modules/work-requests/service';
import {
  publicWorkRequestSchema,
  workRequestConversionSchema,
  type PublicWorkRequestInput,
} from '../src/modules/work-requests/schemas';
import type { AuthedRequest, AuthedRequestHandler } from '../types/http';
import { writeAuditLog, toObjectId, type EntityIdLike } from '../utils';

const internalSubmissionSchema = publicWorkRequestSchema.extend({
  requestFormId: z.string().optional(),
});

const workRequestStatuses = [
  'new',
  'reviewing',
  'converted',
  'closed',
  'rejected',
] as const satisfies readonly [WorkRequestStatus, ...WorkRequestStatus[]];

const statusUpdateSchema = z.object({
  status: z.enum(workRequestStatuses),
});

const resolveFormId = async (input: { formSlug?: string | undefined; requestFormId?: string | undefined }) => {
  if (input.requestFormId) {
    return toObjectId(input.requestFormId);
  }
  if (input.formSlug) {
    const form = await RequestForm.findOne({ slug: input.formSlug }).lean<{ _id?: EntityIdLike }>();
    if (form?._id) return toObjectId(form._id);
  }
  return undefined;
};

const resolveUserId = (req: AuthedRequest): EntityIdLike => {
  const candidate = req.user?._id ?? req.user?.id;
  if (typeof candidate === 'string') return candidate;
  if (candidate == null) return undefined;
  return toObjectId(String(candidate));
};

const resolveUserObjectId = (req: AuthedRequest): Types.ObjectId | undefined => {
  const candidate = resolveUserId(req);
  return toObjectId(candidate);
};

export const createRequest: AuthedRequestHandler = async (req, res, next) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const parse = internalSubmissionSchema.safeParse({ ...body });
    if (!parse.success) {
      res.status(400).json({ message: parse.error.errors.map((err) => err.message).join(', ') });
      return;
    }

    const submission: PublicWorkRequestInput & { requestFormId?: string } = parse.data;

    const requestForm = await resolveFormId(submission);
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
      userId: resolveUserId(req),
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

export const updateRequestStatus: AuthedRequestHandler = async (req, res, next) => {
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
      userId: resolveUserId(req),
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

export const convertRequestToWorkOrder: AuthedRequestHandler = async (req, res, next) => {
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
    const raw = req.params.id;
    const id = Array.isArray(raw) ? raw[0] : raw;

    const result = await convertWorkRequestToWorkOrder(
      { tenantId, siteId: req.siteId },
      id,
      parse.data,
      resolveUserObjectId(req),
    );

    await Notification.create({
      tenantId: toObjectId(tenantId),
      title: 'Request converted',
      message: `Work order ${result.workOrderId} created from request ${result.request.title}.`,
      type: 'info',
    });

    await writeAuditLog({
      tenantId,
      siteId: req.siteId,
      userId: resolveUserId(req),
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
