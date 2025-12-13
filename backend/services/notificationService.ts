/*
 * SPDX-License-Identifier: MIT
 */

import nodemailer from 'nodemailer';
import twilio from 'twilio';
import type { HydratedDocument, Types } from 'mongoose';
import Notification, {
  type NotificationCategory,
  type NotificationDocument,
  type NotificationType,
} from '../models/Notifications';
import User from '../models/User';
import type { WorkOrderDocument } from '../models/WorkOrder';
import type { IInventoryItem } from '../models/InventoryItem';
import type { PMTaskDocument } from '../models/PMTask';
import { getIO } from '../socket';
import { logger, assertEmail, enqueueEmailRetry } from '../utils';

export interface NotificationChannels {
  email?: string;
  sms?: string;
  webhookUrl?: string;
  slackWebhookUrl?: string;
  teamsWebhookUrl?: string;
}

interface NotificationInput {
  tenantId: Types.ObjectId;
  userId?: Types.ObjectId;
  assetId?: Types.ObjectId;
  workOrderId?: Types.ObjectId;
  inventoryItemId?: Types.ObjectId;
  pmTaskId?: Types.ObjectId;
  title: string;
  message: string;
  category: NotificationCategory;
  type?: NotificationType;
  channels?: NotificationChannels;
  templateContext?: Record<string, string>;
}

const renderTemplate = (template: string | undefined, context?: Record<string, string>) => {
  if (!template) return undefined;
  return Object.entries(context ?? {}).reduce(
    (acc, [key, value]) => acc.replace(new RegExp(`{{${key}}}`, 'g'), value),
    template,
  );
};

const sendEmail = async (to: string, subject: string, text: string) => {
  if (!process.env.SMTP_HOST || !(process.env.SMTP_FROM || process.env.SMTP_USER)) {
    return;
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
  });

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    logger.error('Failed to send notification email', err);
    void enqueueEmailRetry(mailOptions);
  }
};

const sendSms = async (to: string, body: string) => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) return;
  try {
    const client = twilio(sid, token);
    await client.messages.create({ to, from, body });
  } catch (err) {
    logger.error('Failed to send notification SMS', err);
  }
};

const postWebhook = async (url: string, payload: unknown) => {
  const fetchFn = (global as { fetch?: (url: string, init?: unknown) => Promise<unknown> }).fetch;
  if (!fetchFn) return;
  try {
    await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    logger.error('Failed to post webhook notification', err);
  }
};

const deliver = async (
  notification: HydratedDocument<NotificationDocument>,
  channels?: NotificationChannels,
) => {
  try {
    const io = getIO();
    io.emit('notification', notification);
  } catch (err) {
    logger.debug('Socket not initialized; skipping notification emit');
  }

  if (channels?.email) {
    assertEmail(channels.email);
    await sendEmail(channels.email, notification.title, notification.message);
  }

  if (channels?.sms) {
    await sendSms(channels.sms, `${notification.title}: ${notification.message}`);
  }

  const webhookPayload = {
    title: notification.title,
    message: notification.message,
    category: notification.category,
    createdAt: notification.createdAt,
  };

  if (channels?.webhookUrl) {
    await postWebhook(channels.webhookUrl, webhookPayload);
  }
  if (channels?.slackWebhookUrl || process.env.SLACK_WEBHOOK_URL) {
    await postWebhook(channels?.slackWebhookUrl ?? process.env.SLACK_WEBHOOK_URL!, {
      text: `*[${notification.category}]* ${notification.title}\n${notification.message}`,
    });
  }
  if (channels?.teamsWebhookUrl || process.env.TEAMS_WEBHOOK_URL) {
    await postWebhook(channels?.teamsWebhookUrl ?? process.env.TEAMS_WEBHOOK_URL!, {
      text: `${notification.title}: ${notification.message}`,
    });
  }
};

export const createNotification = async (
  input: NotificationInput,
): Promise<HydratedDocument<NotificationDocument>> => {
  const message = renderTemplate(input.message, input.templateContext) ?? input.message;
  const doc = await Notification.create({
    title: input.title,
    message,
    type: input.type ?? 'info',
    category: input.category,
    tenantId: input.tenantId,
    assetId: input.assetId,
    user: input.userId,
    workOrderId: input.workOrderId,
    inventoryItemId: input.inventoryItemId,
    pmTaskId: input.pmTaskId,
  });

  if (input.userId) {
    const user = await User.findById(input.userId);
    const allowEmail = user?.notifyByEmail !== false;
    const allowSms = Boolean(user?.notifyBySms);
    if (user?.email && allowEmail) {
      await sendEmail(
        user.email,
        input.title,
        message,
      );
    }
    const maybePhone = (user as unknown as { phone?: string })?.phone;
    if (maybePhone && allowSms) {
      await sendSms(maybePhone, `${input.title}: ${message}`);
    }
  }

  await deliver(doc, input.channels);
  return doc;
};

export const notifyWorkOrderAssigned = async (
  workOrder: WorkOrderDocument,
  assignees: Types.ObjectId[],
) => {
  const message = `Work order "${workOrder.title}" assigned to you.`;
  await Promise.all(
    assignees.map((assignee) =>
      createNotification({
        tenantId: workOrder.tenantId as Types.ObjectId,
        userId: assignee,
        workOrderId: workOrder._id as Types.ObjectId,
        category: 'assigned',
        type: 'info',
        title: 'Work order assignment',
        message,
      }),
    ),
  );
};

export const notifySlaBreach = async (workOrder: WorkOrderDocument) => {
  if (!workOrder.slaDueAt || ['completed', 'cancelled'].includes(workOrder.status)) {
    return;
  }
  const now = new Date();
  if (workOrder.slaDueAt > now) return;

  const userIds = [workOrder.assignedTo, ...(workOrder.assignees ?? [])].filter(Boolean) as Types.ObjectId[];
  const payload = {
    tenantId: workOrder.tenantId as Types.ObjectId,
    workOrderId: workOrder._id as Types.ObjectId,
    category: 'overdue' as NotificationCategory,
    type: 'critical' as NotificationType,
    title: 'SLA breached',
    message: `Work order "${workOrder.title}" breached its SLA deadline.`,
  } satisfies NotificationInput;

  if (userIds.length === 0) {
    await createNotification(payload);
    return;
  }

  await Promise.all(
    userIds.map((userId) =>
      createNotification({
        ...payload,
        userId,
      }),
    ),
  );
};

export const notifyLowStock = async (item: IInventoryItem) => {
  const qty = Number(item.quantity ?? 0);
  const threshold = Number(item.reorderThreshold ?? 0);
  if (Number.isNaN(qty) || Number.isNaN(threshold) || qty > threshold) return;

  await createNotification({
    tenantId: item.tenantId as Types.ObjectId,
    inventoryItemId: item._id as Types.ObjectId,
    category: 'overdue',
    type: 'warning',
    title: 'Low stock threshold reached',
    message: `${item.name} has fallen to ${qty} (threshold ${threshold}).`,
  });
};

export const notifyPmDue = async (task: PMTaskDocument, dueDate: Date) => {
  await createNotification({
    tenantId: task.tenantId as Types.ObjectId,
    pmTaskId: task._id as Types.ObjectId,
    category: 'pm_due',
    type: 'warning',
    title: 'Preventive maintenance due',
    message: `PM task "${task.title}" is due on ${dueDate.toLocaleString()}.`,
  });
};
