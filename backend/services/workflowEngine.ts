/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';

import WorkflowRule, { type WorkflowRuleDocument, type WorkflowScope } from '../models/WorkflowRule';
import type { WorkOrderDocument } from '../models/WorkOrder';
import type { WorkRequestDocument } from '../models/WorkRequest';
import { notifyUser } from '../utils';
import { createNotification } from './notificationService';
import { applySlaPolicyToWorkOrder } from './slaPolicyService';

const resolveRuleQuery = (tenantId: Types.ObjectId, siteId: Types.ObjectId | undefined, scope: WorkflowScope) => ({
  tenantId,
  scope,
  ...(siteId ? { $or: [{ siteId }, { siteId: { $exists: false } }, { siteId: null }] } : { siteId: { $exists: false } }),
});

export const getActiveWorkflowRule = async (
  tenantId: Types.ObjectId,
  siteId: Types.ObjectId | undefined,
  scope: WorkflowScope,
): Promise<WorkflowRuleDocument | null> => {
  const rules = await WorkflowRule.find(resolveRuleQuery(tenantId, siteId, scope))
    .sort({ siteId: -1, updatedAt: -1 })
    .limit(1)
    .lean();
  return rules[0] ?? null;
};

const mapEscalations = (rule: WorkflowRuleDocument['escalations']) =>
  (rule ?? []).map((entry) => ({
    trigger: entry.trigger,
    thresholdMinutes: entry.thresholdMinutes,
    escalateTo: entry.escalateTo,
    channel: entry.channel ?? 'email',
    maxRetries: entry.maxRetries ?? 0,
    retryBackoffMinutes: entry.retryBackoffMinutes ?? 30,
    retryCount: 0,
    templateKey: entry.templateKey,
  }));

const applyApprovalSteps = (
  entity: Pick<WorkOrderDocument, 'approvalSteps' | 'approvalStatus' | 'currentApprovalStep' | 'timeline'>,
  rule: WorkflowRuleDocument,
) => {
  if (!rule.approvalSteps?.length) return;
  entity.approvalSteps = rule.approvalSteps.map((step) => ({
    ...step,
    status: 'pending',
  })) as any;
  entity.approvalStatus = 'pending';
  entity.currentApprovalStep = 1;
  if (entity.timeline) {
    entity.timeline.push({
      label: 'Approval workflow initialized',
      createdAt: new Date(),
      type: 'approval',
    });
  }
};

const applySlaTimers = (
  target: Pick<WorkOrderDocument, 'slaResponseDueAt' | 'slaResolveDueAt' | 'slaEscalations' | 'timeline'>,
  rule: WorkflowRuleDocument,
) => {
  const now = Date.now();
  if (rule.slaResponseMinutes && !target.slaResponseDueAt) {
    target.slaResponseDueAt = new Date(now + rule.slaResponseMinutes * 60 * 1000);
  }
  if (rule.slaResolveMinutes && !target.slaResolveDueAt) {
    target.slaResolveDueAt = new Date(now + rule.slaResolveMinutes * 60 * 1000);
  }
  if (rule.escalations?.length) {
    target.slaEscalations = mapEscalations(rule.escalations) as any;
  }
  if (target.timeline) {
    target.timeline.push({
      label: 'SLA timers initialized',
      createdAt: new Date(),
      type: 'sla',
    });
  }
};

export const applyWorkflowToWorkOrder = async (workOrder: WorkOrderDocument) => {
  const rule = await getActiveWorkflowRule(workOrder.tenantId as Types.ObjectId, workOrder.siteId as Types.ObjectId, 'work_order');
  if (rule) {
    applyApprovalSteps(workOrder, rule);
    applySlaTimers(workOrder, rule);
  }

  await applySlaPolicyToWorkOrder(workOrder);
};

export const applyWorkflowToRequest = async (workRequest: WorkRequestDocument) => {
  const rule = await getActiveWorkflowRule(
    workRequest.tenantId as Types.ObjectId,
    workRequest.siteId as Types.ObjectId,
    'work_request',
  );
  if (!rule) return;
  applyApprovalSteps(workRequest as any, rule);
  applySlaTimers(workRequest as any, rule);
};

export const sendEscalationNotification = async (
  message: string,
  options: {
    tenantId: Types.ObjectId;
    userIds?: Types.ObjectId[];
    workOrderId?: Types.ObjectId;
    templates?: WorkflowRuleDocument['templates'];
    category?: string;
  },
) => {
  const { tenantId, userIds = [], workOrderId, templates } = options;
  const title = templates?.emailSubject ?? 'Workflow escalation';
  const body = templates?.emailBody ?? message;
  const sms = templates?.smsBody ?? message;

  if (!userIds.length) {
    await createNotification({
      tenantId,
      workOrderId,
      category: 'overdue',
      title,
      message: body,
      channels: { sms },
    });
    return;
  }

  await Promise.all(
    userIds.map((userId) =>
      createNotification({
        tenantId,
        userId,
        workOrderId,
        category: 'overdue',
        title,
        message: body,
        channels: { sms },
      }),
    ),
  );

  await Promise.all(userIds.map((userId) => notifyUser(userId, body, { title })));
};
