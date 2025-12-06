/*
 * SPDX-License-Identifier: MIT
 */

import { isValidObjectId, Types } from 'mongoose';

import WorkOrder, { type WorkOrderDocument } from '../../../models/WorkOrder';
import type { AuthedRequest } from '../../../types/http';
import WorkOrderTemplateModel, { type WorkOrderTemplate } from './templateModel';
import type { ApprovalStepUpdate, StatusTransition, WorkOrderContext, WorkOrderTemplateInput } from './types';
import { resolveUserId } from './middleware';
import { notifyUser } from '../../../utils';

const ensureTimeline = (
  workOrder: WorkOrderDocument,
): NonNullable<WorkOrderDocument['timeline']> => {
  if (!workOrder.timeline) {
    workOrder.timeline = [] as unknown as typeof workOrder.timeline;
  }
  return workOrder.timeline!;
};

export const getWorkOrderById = async (context: WorkOrderContext, workOrderId: string) => {
  if (!isValidObjectId(workOrderId)) throw new Error('Invalid work order id');
  return WorkOrder.findOne({ _id: workOrderId, tenantId: context.tenantId });
};

export const updateWorkOrderStatus = async (
  context: WorkOrderContext,
  workOrderId: string,
  payload: StatusTransition,
) => {
  const workOrder = await getWorkOrderById(context, workOrderId);
  if (!workOrder) throw new Error('Work order not found');

  workOrder.status = payload.status as WorkOrderDocument['status'];
  const timeline = ensureTimeline(workOrder);
  timeline.push({
    label: `Status changed to ${payload.status}`,
    notes: payload.note,
    createdAt: new Date(),
    type: 'status',
  });

  await workOrder.save();
  return workOrder;
};

const findActiveApproval = (workOrder: WorkOrderDocument) =>
  (workOrder.approvalSteps ?? []).find((step) => step.step === workOrder.currentApprovalStep);

export const advanceApproval = async (
  context: WorkOrderContext,
  workOrderId: string,
  update: ApprovalStepUpdate,
  user?: AuthedRequest['user'],
) => {
  const workOrder = await getWorkOrderById(context, workOrderId);
  if (!workOrder) throw new Error('Work order not found');

  if (!workOrder.approvalSteps?.length) {
    workOrder.approvalStatus = update.approved ? 'approved' : 'rejected';
    return workOrder.save();
  }

  const active = findActiveApproval(workOrder);
  if (!active) throw new Error('No pending approval step');

  active.status = update.approved ? 'approved' : 'rejected';
  active.approvedAt = update.approverId ? new Date() : active.approvedAt ?? new Date();
  active.note = update.note ?? active.note;
  active.approver = update.approverId ?? resolveUserId(user);

  const maxStep = Math.max(...workOrder.approvalSteps.map((step) => step.step));
    if (update.approved && workOrder.currentApprovalStep && workOrder.currentApprovalStep < maxStep) {
      workOrder.currentApprovalStep += 1;
      const nextStep = findActiveApproval(workOrder);
      if (nextStep?.approver) {
        notifyUser(nextStep.approver, `Approval required for ${workOrder.title}`, {
          title: 'Work order approval needed',
        }).catch(() => undefined);
      }
    } else {
      workOrder.approvalStatus = update.approved ? 'approved' : 'rejected';
    }

    const timeline = ensureTimeline(workOrder);
    timeline.push({
      label: `Approval ${update.approved ? 'approved' : 'rejected'}`,
      notes: update.note,
      createdAt: new Date(),
      type: 'approval',
    createdBy: update.approverId ?? resolveUserId(user),
  });

  await workOrder.save();
  return workOrder;
};

export const acknowledgeSla = async (
  context: WorkOrderContext,
  workOrderId: string,
  kind: 'response' | 'resolve',
  at?: Date,
) => {
  const workOrder = await getWorkOrderById(context, workOrderId);
  if (!workOrder) throw new Error('Work order not found');
  const timestamp = at ?? new Date();
  if (kind === 'response') {
    workOrder.slaRespondedAt = timestamp;
  } else {
    workOrder.slaResolvedAt = timestamp;
  }

  const timeline = ensureTimeline(workOrder);
  timeline.push({
    label: kind === 'response' ? 'Response acknowledged' : 'Resolution recorded',
    createdAt: timestamp,
    type: 'sla',
  });

  await workOrder.save();
  return workOrder;
};

export const createTemplate = async (input: WorkOrderTemplateInput) => {
  return WorkOrderTemplateModel.create(input);
};

export const listTemplates = async (context: WorkOrderContext) => {
  return WorkOrderTemplateModel.find({ tenantId: context.tenantId, ...(context.siteId ? { siteId: context.siteId } : {}) })
    .sort({ createdAt: -1 })
    .lean();
};

export const getTemplate = async (context: WorkOrderContext, templateId: string) => {
  if (!isValidObjectId(templateId)) throw new Error('Invalid template id');
  return WorkOrderTemplateModel.findOne({ _id: templateId, tenantId: context.tenantId });
};

export const updateTemplate = async (
  context: WorkOrderContext,
  templateId: string,
  payload: Partial<WorkOrderTemplate>,
) => {
  const template = await getTemplate(context, templateId);
  if (!template) throw new Error('Template not found');
  if (payload.name) template.name = payload.name;
  if (payload.description !== undefined) template.description = payload.description;
  template.defaults = { ...(template.defaults ?? {}), ...(payload.defaults ?? {}) };
  await template.save();
  return template;
};

export const deleteTemplate = async (context: WorkOrderContext, templateId: string) => {
  const template = await getTemplate(context, templateId);
  if (!template) throw new Error('Template not found');
  await template.deleteOne();
};

const shouldEscalate = (workOrder: WorkOrderDocument) => {
  const now = Date.now();
  return (workOrder.slaEscalations ?? []).filter((rule) => {
    const thresholdMs = (rule.thresholdMinutes ?? 0) * 60 * 1000;
    if (rule.trigger === 'response' && workOrder.slaResponseDueAt && !workOrder.slaRespondedAt) {
      return now >= new Date(workOrder.slaResponseDueAt).getTime() + thresholdMs && !rule.escalatedAt;
    }
    if (rule.trigger === 'resolve' && workOrder.slaResolveDueAt && !workOrder.slaResolvedAt) {
      return now >= new Date(workOrder.slaResolveDueAt).getTime() + thresholdMs && !rule.escalatedAt;
    }
    return false;
  });
};

export const escalateIfNeeded = async (workOrder: WorkOrderDocument) => {
  const rules = shouldEscalate(workOrder);
  if (!rules.length) return false;

  rules.forEach((rule) => {
    rule.escalatedAt = new Date();
    (rule.escalateTo ?? []).forEach((userId) => {
      notifyUser(userId, `${workOrder.title} breached the ${rule.trigger} threshold`, {
        title: 'SLA escalation',
      }).catch(() => undefined);
    });
  });

  await workOrder.save();
  return true;
};
