/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';

import type { WorkOrderDocument } from '../../../models/WorkOrder';
import { createNotification } from '../../../services/notificationService';

const buildRecipients = (workOrder: WorkOrderDocument, override?: Types.ObjectId[]) => {
  if (override?.length) return override;
  return [workOrder.assignedTo, ...(workOrder.assignees ?? [])].filter(Boolean) as Types.ObjectId[];
};

export const notifyWorkOrderSlaBreach = async (
  workOrder: WorkOrderDocument,
  trigger: 'response' | 'resolve',
) => {
  const recipients = buildRecipients(workOrder);
  const title = trigger === 'response' ? 'Response SLA breached' : 'Resolution SLA breached';
  const message = `Work order "${workOrder.title}" breached its ${trigger} SLA.`;
  const payload = {
    tenantId: workOrder.tenantId as Types.ObjectId,
    workOrderId: workOrder._id as Types.ObjectId,
    category: 'overdue' as const,
    type: 'critical' as const,
    title,
    message,
    event: 'sla.breached',
    templateContext: {
      workOrderTitle: workOrder.title,
      trigger,
    },
  };

  if (!recipients.length) {
    await createNotification(payload);
    return;
  }

  await Promise.all(
    recipients.map((userId) =>
      createNotification({
        ...payload,
        userId,
      }),
    ),
  );
};

export const notifyWorkOrderSlaEscalation = async (
  workOrder: WorkOrderDocument,
  rule: NonNullable<WorkOrderDocument['slaEscalations']>[number],
) => {
  const recipients = buildRecipients(workOrder, rule.escalateTo as Types.ObjectId[] | undefined);
  if (!recipients.length) return;

  const message = `Work order "${workOrder.title}" triggered an SLA escalation (${rule.trigger}).`;

  await Promise.all(
    recipients.map((userId) =>
      createNotification({
        tenantId: workOrder.tenantId as Types.ObjectId,
        userId,
        workOrderId: workOrder._id as Types.ObjectId,
        category: 'overdue',
        type: 'warning',
        title: 'SLA escalation',
        message,
        event: 'sla.escalated',
        templateContext: {
          workOrderTitle: workOrder.title,
          trigger: rule.trigger,
        },
      }),
    ),
  );
};
