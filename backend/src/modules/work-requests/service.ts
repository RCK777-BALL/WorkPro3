/*
 * SPDX-License-Identifier: MIT
 */

import path from 'path';
import { mkdirSync } from 'fs';
import { nanoid } from 'nanoid';
import { Types } from 'mongoose';
import type { Express } from 'express';

import WorkRequest, { type WorkRequestDocument, type WorkRequestStatus } from '../../../models/WorkRequest';
import RequestForm, { type RequestFormSchema } from '../../../models/RequestForm';
import RequestType, { type RequestAttachmentDefinition } from '../../../models/RequestType';
import { evaluateRoutingRules } from './routing';
import Site from '../../../models/Site';
import WorkOrder from '../../../models/WorkOrder';
import type { PublicWorkRequestInput, WorkRequestConversionInput } from './schemas';
import { writeAuditLog } from '../../../utils/audit';
import { applyWorkflowToRequest } from '../../../services/workflowEngine';

const UPLOAD_ROOT = path.join(process.cwd(), 'uploads');
const WORK_REQUEST_UPLOAD_DIR = path.join(UPLOAD_ROOT, 'work-requests');
mkdirSync(WORK_REQUEST_UPLOAD_DIR, { recursive: true });

export class WorkRequestError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export interface WorkRequestContext {
  tenantId: string;
  siteId?: string | undefined;
}

const toObjectId = (value: unknown): Types.ObjectId | undefined => {
  if (!value) return undefined;
  if (value instanceof Types.ObjectId) return value;
  if (typeof value === 'string' && Types.ObjectId.isValid(value)) {
    return new Types.ObjectId(value);
  }
  return undefined;
};

const toRelativePath = (absolutePath: string): string => {
  const relative = path.relative(UPLOAD_ROOT, absolutePath);
  return relative.replace(/\\/g, '/');
};

const buildTenantFilter = (ctx: WorkRequestContext) => {
  const tenantObjectId = toObjectId(ctx.tenantId);
  if (!tenantObjectId) {
    throw new WorkRequestError('Tenant context is required', 400);
  }
  const filter: Record<string, unknown> = { tenantId: tenantObjectId };
  const siteObjectId = toObjectId(ctx.siteId);
  if (siteObjectId) {
    filter.siteId = siteObjectId;
  }
  return filter;
};

const createUniqueToken = async (): Promise<string> => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = nanoid(10).toLowerCase();
    const exists = await WorkRequest.exists({ token });
    if (!exists) return token;
  }
  throw new WorkRequestError('Unable to assign a request token. Please retry.', 500);
};

type FormContext = {
  siteId: Types.ObjectId;
  tenantId: Types.ObjectId;
  requestFormId: Types.ObjectId;
  requestTypeId?: Types.ObjectId;
  formSchema?: RequestFormSchema;
};

const resolveFormContext = async (slug: string): Promise<FormContext> => {
  const form = await RequestForm.findOne({ slug }).lean<{
    _id: Types.ObjectId;
    siteId?: Types.ObjectId;
    requestType?: Types.ObjectId;
    schema?: RequestFormSchema;
  }>();
  if (!form) {
    throw new WorkRequestError('Request form not found', 404);
  }
  const siteId = form.siteId && toObjectId(form.siteId);
  if (!siteId) {
    throw new WorkRequestError('The request form is not assigned to an active site.', 400);
  }
  const site = await Site.findById(siteId).lean<{ tenantId?: Types.ObjectId }>();
  if (!site?.tenantId) {
    throw new WorkRequestError('Unable to determine the tenant for the selected site.', 400);
  }
  const tenantId = toObjectId(site.tenantId);
  if (!tenantId) {
    throw new WorkRequestError('Tenant configuration is invalid for this request form.', 400);
  }
  return {
    siteId,
    tenantId,
    requestFormId: form._id,
    requestTypeId: form.requestType ?? undefined,
    formSchema: form.schema as RequestFormSchema,
  };
};

const getRequestType = async (requestTypeId?: Types.ObjectId) => {
  if (!requestTypeId) return undefined;
  const requestType = await RequestType.findById(requestTypeId).lean();
  if (!requestType) {
    throw new WorkRequestError('Request type configuration not found for this form.', 400);
  }
  return requestType;
};

const ensureRequiredFields = (input: Record<string, unknown>, requiredFields: string[]) => {
  if (!requiredFields.length) return;
  const missing = requiredFields.filter((field) => {
    const value = input[field];
    if (value === undefined || value === null) return true;
    if (typeof value === 'string' && !value.trim()) return true;
    return false;
  });
  if (missing.length) {
    throw new WorkRequestError(`Missing required fields: ${missing.join(', ')}`, 400);
  }
};

const enforceAttachmentRequirements = (
  files: Express.Multer.File[],
  definitions: RequestAttachmentDefinition[],
) => {
  if (!definitions.length) return;
  const list = files ?? [];
  definitions.forEach((definition) => {
    if (definition.required && list.length === 0) {
      throw new WorkRequestError(`Attachment "${definition.label}" is required.`, 400);
    }
    if (definition.maxFiles && list.length > definition.maxFiles) {
      throw new WorkRequestError(
        `Attach no more than ${definition.maxFiles} file(s) for ${definition.label}.`,
        400,
      );
    }
    if (definition.accept?.length) {
      const invalid = list.find((file) =>
        !definition.accept!.some(
          (allowed) => file.mimetype?.includes(allowed) || file.originalname.toLowerCase().endsWith(allowed),
        ),
      );
      if (invalid) {
        throw new WorkRequestError(
          `Attachment ${invalid.originalname} does not match accepted types for ${definition.label}.`,
          400,
        );
      }
    }
  });
};

const mapAttachments = (files: Express.Multer.File[], definitions: RequestAttachmentDefinition[]) => {
  const paths = (files ?? []).map((file) => toRelativePath(file.path));
  if (!paths.length) return [] as WorkRequestDocument['attachments'];
  const keys = definitions.length ? definitions.map((definition) => definition.key) : ['upload'];
  return keys.map((key) => ({
    key,
    files: files.map((file) => file.mimetype ?? file.originalname),
    paths,
  })) as WorkRequestDocument['attachments'];
};

export interface PublicSubmissionResult {
  requestId: string;
  token: string;
  status: WorkRequestStatus;
}

export const submitPublicRequest = async (
  input: PublicWorkRequestInput,
  files: Express.Multer.File[],
): Promise<PublicSubmissionResult> => {
  const { siteId, tenantId, requestFormId, requestTypeId, formSchema } = await resolveFormContext(input.formSlug);
  const requestType = await getRequestType(requestTypeId ?? formSchema?.requestType);
  const attachmentDefinitions = requestType?.attachments ?? formSchema?.attachments ?? [];

  ensureRequiredFields(input as Record<string, unknown>, requestType?.requiredFields ?? []);
  enforceAttachmentRequirements(files, attachmentDefinitions);

  const token = await createUniqueToken();
  const photoPaths = (files ?? []).map((file) => toRelativePath(file.path));
  const priority = input.priority ?? requestType?.defaultPriority ?? 'medium';
  const attachments = mapAttachments(files, attachmentDefinitions);
  const request = await WorkRequest.create({
    token,
    title: input.title,
    description: input.description,
    requesterName: input.requesterName,
    requesterEmail: input.requesterEmail,
    requesterPhone: input.requesterPhone,
    location: input.location,
    assetTag: input.assetTag,
    priority,
    siteId,
    tenantId,
    requestForm: requestFormId,
    requestType: requestType?._id,
    category: requestType?.category,
    photos: photoPaths,
    attachments,
  });
  const routingDecision = requestType
    ? await evaluateRoutingRules({
        tenantId,
        siteId,
        requestType: requestType._id,
        assetTag: input.assetTag,
        priority,
        category: requestType.category,
      })
    : undefined;
  if (routingDecision) {
    request.routing = {
      ruleId: routingDecision.ruleId,
      destinationType: routingDecision.destination.destinationType,
      destinationId: routingDecision.destination.destinationId,
      queue: routingDecision.destination.queue,
    };
    request.status = 'reviewing';
  }
  await applyWorkflowToRequest(request);
  await request.save();
  await writeAuditLog({
    tenantId,
    siteId,
    action: 'create',
    entityType: 'WorkRequest',
    entityId: request._id,
    entityLabel: input.title,
    actor: {
      name: input.requesterName,
      ...(input.requesterEmail ? { email: input.requesterEmail } : {}),
    },
    after: {
      title: input.title,
      description: input.description,
      priority,
      location: input.location,
    },
  });
  return { requestId: request._id.toString(), token: request.token, status: request.status };
};

const humanize = (value: string) =>
  value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const describeRequestStatus = (status: WorkRequestStatus) => {
  switch (status) {
    case 'new':
      return 'Submitted and awaiting review';
    case 'reviewing':
      return 'Under review by the maintenance team';
    case 'converted':
      return 'Converted to a work order for technicians to handle';
    case 'closed':
    default:
      return 'Closed';
  }
};

export const getPublicRequestStatus = async (token: string) => {
  const request = await WorkRequest.findOne({ token }).lean<WorkRequestDocument>();
  if (!request) {
    throw new WorkRequestError('Request not found', 404);
  }

  const workOrder = request.workOrder
    ? await WorkOrder.findById(request.workOrder)
        .select('title status copilotSummary copilotSummaryUpdatedAt createdAt updatedAt')
        .lean<{
          _id: Types.ObjectId;
          title: string;
          status: string;
          copilotSummary?: string;
          copilotSummaryUpdatedAt?: Date;
          createdAt?: Date;
          updatedAt?: Date;
        } | null>()
    : null;

  const updates: Array<{ label: string; description?: string; timestamp?: Date | undefined }> = [
    {
      label: 'Request submitted',
      description: request.description ?? 'Request received by the maintenance team.',
      timestamp: request.createdAt,
    },
    {
      label: 'Current status',
      description: describeRequestStatus(request.status),
      timestamp: request.updatedAt ?? request.createdAt,
    },
  ];

  if (workOrder) {
    updates.push({
      label: 'Work order created',
      description: `Work order ${workOrder._id.toString()} opened to address this request.`,
      timestamp: workOrder.createdAt,
    });
    updates.push({
      label: 'Technician progress',
      description: `Technicians report the work order is currently ${humanize(workOrder.status)}.`,
      timestamp: workOrder.updatedAt,
    });
  }

  const technicianResponses = workOrder?.copilotSummary
    ? [
        {
          message: workOrder.copilotSummary,
          timestamp: workOrder.copilotSummaryUpdatedAt ?? workOrder.updatedAt ?? workOrder.createdAt,
        },
      ]
    : [];

  return {
    token: request.token,
    status: request.status,
    title: request.title,
    description: request.description,
    createdAt: request.createdAt,
    workOrderId: request.workOrder?.toString(),
    photos: request.photos ?? [],
    updates,
    technicianResponses,
  };
};

export const listWorkRequests = async (ctx: WorkRequestContext) => {
  const filter = buildTenantFilter(ctx);
  const items = await WorkRequest.find(filter).sort({ createdAt: -1 }).lean<WorkRequestDocument[]>();
  return items;
};

export const getWorkRequestById = async (ctx: WorkRequestContext, requestId: string) => {
  const filter = { ...buildTenantFilter(ctx), _id: toObjectId(requestId) };
  const request = await WorkRequest.findOne(filter).lean<WorkRequestDocument>();
  if (!request) {
    throw new WorkRequestError('Request not found', 404);
  }
  return request;
};

export const getWorkRequestSummary = async (ctx: WorkRequestContext) => {
  const filter = buildTenantFilter(ctx);
  const [recent, newCount, reviewingCount, convertedCount, closedCount] = await Promise.all([
    WorkRequest.find(filter).sort({ createdAt: -1 }).limit(10).lean<WorkRequestDocument[]>(),
    WorkRequest.countDocuments({ ...filter, status: 'new' as WorkRequestStatus }),
    WorkRequest.countDocuments({ ...filter, status: 'reviewing' as WorkRequestStatus }),
    WorkRequest.countDocuments({ ...filter, status: 'converted' as WorkRequestStatus }),
    WorkRequest.countDocuments({ ...filter, status: 'closed' as WorkRequestStatus }),
  ]);
  const statusCounts = {
    new: newCount,
    reviewing: reviewingCount,
    converted: convertedCount,
    closed: closedCount,
  } satisfies Record<WorkRequestStatus, number>;
  const total = newCount + reviewingCount + convertedCount + closedCount;
  return {
    total,
    open: newCount + reviewingCount,
    statusCounts,
    recent,
  };
};

export const convertWorkRequestToWorkOrder = async (
  ctx: WorkRequestContext,
  requestId: string,
  input: WorkRequestConversionInput,
) => {
  const request = await WorkRequest.findOne({ ...buildTenantFilter(ctx), _id: toObjectId(requestId) });
  if (!request) {
    throw new WorkRequestError('Request not found', 404);
  }
  if (request.workOrder) {
    throw new WorkRequestError('This request has already been converted to a work order.', 409);
  }
  const workOrder = await WorkOrder.create({
    title: request.title,
    description: request.description,
    tenantId: request.tenantId,
    priority: input.priority ?? request.priority ?? 'medium',
    status: 'requested',
    type: input.workOrderType ?? 'corrective',
    plant: ctx.siteId ? toObjectId(ctx.siteId) : undefined,
    siteId: request.siteId,
    requestId: request._id,
  });
  request.status = 'converted';
  request.workOrder = workOrder._id;
  await request.save();
  return { workOrderId: workOrder._id.toString(), request: request.toObject() };
};
