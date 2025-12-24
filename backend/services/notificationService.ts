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
} from '../models/Notification';
import NotificationTemplate, { type NotificationChannel } from '../models/NotificationTemplate';
import NotificationSubscription, { type NotificationSubscriptionDocument } from '../models/NotificationSubscription';
import NotificationDeliveryLog from '../models/NotificationDeliveryLog';
import NotificationDigestQueue from '../models/NotificationDigestQueue';
import User from '../models/User';
import type { WorkOrderDocument } from '../models/WorkOrder';
import type { IInventoryItem } from '../models/InventoryItem';
import type { PMTaskDocument } from '../models/PMTask';
import { getIO } from '../socket';
import { logger, assertEmail, enqueueEmailRetry, writeAuditLog } from '../utils';
import { isNotificationEmailEnabled } from '../config/featureFlags';

export interface NotificationChannels {
  email?: string;
  sms?: string;
  webhookUrl?: string;
  slackWebhookUrl?: string;
  teamsWebhookUrl?: string;
  pushToken?: string;
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
  event?: string;
  subscriptionGroup?: string;
}

const normalizeChannel = (channel: NotificationChannel): NotificationChannel => channel;

const renderTemplate = (template: string | undefined, context?: Record<string, string>) => {
  if (!template) return undefined;
  return Object.entries(context ?? {}).reduce(
    (acc, [key, value]) => acc.replace(new RegExp(`{{${key}}}`, 'g'), value),
    template,
  );
};

export const isWithinQuietHours = (
  quietHours?: { start?: string; end?: string },
  now: Date = new Date(),
) => {
  if (!quietHours?.start || !quietHours?.end) return false;
  const [startH, startM] = quietHours.start.split(':').map((v) => parseInt(v, 10));
  const [endH, endM] = quietHours.end.split(':').map((v) => parseInt(v, 10));
  if ([startH, startM, endH, endM].some((v) => Number.isNaN(v))) return false;

  const minutes = now.getHours() * 60 + now.getMinutes();
  const startTotal = startH * 60 + startM;
  const endTotal = endH * 60 + endM;
  if (startTotal <= endTotal) {
    return minutes >= startTotal && minutes <= endTotal;
  }
  // overnight window
  return minutes >= startTotal || minutes <= endTotal;
};

const computeDigestDeliverAt = (frequency: 'hourly' | 'daily' | 'weekly', now = new Date()) => {
  const next = new Date(now.getTime());
  if (frequency === 'hourly') {
    next.setHours(next.getHours() + 1);
    return next;
  }
  if (frequency === 'weekly') {
    next.setDate(next.getDate() + 7);
    return next;
  }
  next.setDate(next.getDate() + 1);
  return next;
};

const recordDeliveryLog = async (
  input: {
    notificationId: Types.ObjectId;
    tenantId: Types.ObjectId;
    subscriptionId?: Types.ObjectId;
    channel: NotificationChannel;
    status: 'pending' | 'sent' | 'failed' | 'deferred' | 'queued';
    attempt?: number;
    errorMessage?: string;
  },
) => {
  const log = await NotificationDeliveryLog.create({
    ...input,
    attempt: input.attempt ?? 1,
  });
  void writeAuditLog({
    tenantId: input.tenantId,
    action: 'notificationDelivery',
    entityType: 'Notification',
    entityId: input.notificationId,
    after: log.toObject(),
  });
  return log;
};

const queueDigest = async (
  notification: HydratedDocument<NotificationDocument>,
  subscription: NotificationSubscriptionDocument,
  channel: NotificationChannel,
  now = new Date(),
) => {
  const deliverAt = computeDigestDeliverAt(subscription.digest?.frequency ?? 'daily', now);
  await NotificationDigestQueue.findOneAndUpdate(
    { subscriptionId: subscription._id, channel },
    {
      subscriptionId: subscription._id,
      tenantId: subscription.tenantId,
      channel,
      deliverAt,
      $push: { notificationIds: notification._id },
    },
    { upsert: true, new: true },
  );
  await recordDeliveryLog({
    notificationId: notification._id,
    tenantId: notification.tenantId,
    subscriptionId: subscription._id,
    channel,
    status: 'deferred',
  });
};

const resolveChannelsForSubscription = (
  subscription: NotificationSubscriptionDocument,
  user: { email?: string; phone?: string } | null,
  provided?: NotificationChannels,
): NotificationChannels => {
  const resolved: NotificationChannels = {};
  if (subscription.channels.includes('email')) {
    resolved.email = provided?.email ?? user?.email;
  }
  if (subscription.channels.includes('webhook')) {
    resolved.webhookUrl = provided?.webhookUrl;
  }
  if (subscription.channels.includes('push')) {
    resolved.pushToken = provided?.pushToken;
  }
  if (subscription.channels.includes('in_app')) {
    // in-app does not need additional data
  }
  if (provided?.slackWebhookUrl) resolved.slackWebhookUrl = provided.slackWebhookUrl;
  if (provided?.teamsWebhookUrl) resolved.teamsWebhookUrl = provided.teamsWebhookUrl;
  if (provided?.sms) resolved.sms = provided.sms;
  return resolved;
};

const sendEmail = async (to: string, subject: string, text: string) => {
  if (!isNotificationEmailEnabled()) {
    return;
  }
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

const resolveTemplate = async (
  tenantId: Types.ObjectId,
  event: string | undefined,
  channel: NotificationChannel,
  fallback: { title: string; message: string },
  context?: Record<string, string>,
) => {
  if (!event) return fallback;
  const template = await NotificationTemplate.findOne({ tenantId, event, channel });
  if (!template) return fallback;
  const renderedBody = renderTemplate(template.body, context) ?? fallback.message;
  const renderedSubject = renderTemplate(template.subject, context) ?? fallback.title;
  return { title: renderedSubject, message: renderedBody };
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
  options?: {
    event?: string;
    context?: Record<string, string>;
    channelsToSend?: NotificationChannel[];
    subscription?: NotificationSubscriptionDocument;
  },
) => {
  const channelsToSend = options?.channelsToSend ?? ['in_app'];
  const results: ('sent' | 'failed')[] = [];

  for (const channel of channelsToSend) {
    const normalized = normalizeChannel(channel);
    if (normalized === 'in_app') {
      try {
        const io = getIO();
        io.emit('notification', notification);
        results.push('sent');
        await recordDeliveryLog({
          notificationId: notification._id,
          tenantId: notification.tenantId,
          subscriptionId: options?.subscription?._id,
          channel: 'in_app',
          status: 'sent',
        });
      } catch (err) {
        logger.debug('Socket not initialized; skipping notification emit');
        await recordDeliveryLog({
          notificationId: notification._id,
          tenantId: notification.tenantId,
          subscriptionId: options?.subscription?._id,
          channel: 'in_app',
          status: 'failed',
          errorMessage: (err as Error)?.message,
        });
        results.push('failed');
      }
      continue;
    }

    if (normalized === 'email') {
      if (!isNotificationEmailEnabled()) {
        await recordDeliveryLog({
          notificationId: notification._id,
          tenantId: notification.tenantId,
          subscriptionId: options?.subscription?._id,
          channel: 'email',
          status: 'failed',
          errorMessage: 'Email delivery disabled',
        });
        results.push('failed');
        continue;
      }
      if (!channels?.email) {
        await recordDeliveryLog({
          notificationId: notification._id,
          tenantId: notification.tenantId,
          subscriptionId: options?.subscription?._id,
          channel: 'email',
          status: 'failed',
          errorMessage: 'Email not configured',
        });
        results.push('failed');
        continue;
      }
      assertEmail(channels.email);
      const content = await resolveTemplate(
        notification.tenantId as Types.ObjectId,
        options?.event,
        'email',
        { title: notification.title, message: notification.message },
        options?.context,
      );
      let success = false;
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          await sendEmail(channels.email, content.title, content.message);
          await recordDeliveryLog({
            notificationId: notification._id,
            tenantId: notification.tenantId,
            subscriptionId: options?.subscription?._id,
            channel: 'email',
            status: 'sent',
            attempt,
          });
          success = true;
          break;
        } catch (err) {
          await recordDeliveryLog({
            notificationId: notification._id,
            tenantId: notification.tenantId,
            subscriptionId: options?.subscription?._id,
            channel: 'email',
            status: 'failed',
            attempt,
            errorMessage: (err as Error)?.message,
          });
        }
      }
      results.push(success ? 'sent' : 'failed');
      continue;
    }

    if (normalized === 'push') {
      await recordDeliveryLog({
        notificationId: notification._id,
        tenantId: notification.tenantId,
        subscriptionId: options?.subscription?._id,
        channel: 'push',
        status: channels?.pushToken ? 'sent' : 'failed',
        errorMessage: channels?.pushToken ? undefined : 'Missing push token',
      });
      results.push(channels?.pushToken ? 'sent' : 'failed');
      continue;
    }

    if (normalized === 'webhook') {
      const webhookPayload = {
        title: notification.title,
        message: notification.message,
        category: notification.category,
        createdAt: notification.createdAt,
      };

      try {
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
        await recordDeliveryLog({
          notificationId: notification._id,
          tenantId: notification.tenantId,
          subscriptionId: options?.subscription?._id,
          channel: 'webhook',
          status: 'sent',
        });
        results.push('sent');
      } catch (err) {
        await recordDeliveryLog({
          notificationId: notification._id,
          tenantId: notification.tenantId,
          subscriptionId: options?.subscription?._id,
          channel: 'webhook',
          status: 'failed',
          errorMessage: (err as Error)?.message,
        });
        results.push('failed');
      }
    }
  }

  return results.includes('sent');
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
    deliveryState: 'pending',
  });

  const eventKey = input.event ?? input.category;
  const now = new Date();
  const user = input.userId ? await User.findById(input.userId) : null;
  const subscriptions = await NotificationSubscription.find({
    tenantId: input.tenantId,
    ...(input.userId ? { userId: input.userId } : {}),
    ...(input.subscriptionGroup ? { group: input.subscriptionGroup } : {}),
  });

  let sent = false;
  let deferred = false;

  const matchesEvent = (subscription: NotificationSubscriptionDocument) =>
    subscription.events.length === 0 ||
    subscription.events.includes(eventKey) ||
    subscription.events.includes('*') ||
    subscription.events.includes('all');

  for (const subscription of subscriptions) {
    if (!matchesEvent(subscription)) continue;
    if (isWithinQuietHours(subscription.quietHours, now)) {
      if (subscription.digest?.enabled) {
        for (const channel of subscription.channels) {
          await queueDigest(doc, subscription, channel, now);
        }
      } else {
        for (const channel of subscription.channels) {
          await recordDeliveryLog({
            notificationId: doc._id,
            tenantId: doc.tenantId,
            subscriptionId: subscription._id,
            channel,
            status: 'queued',
          });
        }
      }
      deferred = true;
      continue;
    }

    const resolvedChannels = resolveChannelsForSubscription(subscription, user, input.channels);
    const delivered = await deliver(doc, resolvedChannels, {
      event: eventKey,
      context: input.templateContext,
      channelsToSend: subscription.channels,
      subscription,
    });
    sent = sent || delivered;
  }

  if (subscriptions.length === 0) {
    const allowEmail = user?.notifyByEmail !== false;
    const allowSms = Boolean(user?.notifyBySms);
    const channels: NotificationChannels = { ...input.channels };
    if (user?.email && allowEmail) {
      channels.email = user.email;
    }
    const maybePhone = (user as unknown as { phone?: string })?.phone;
    if (maybePhone && allowSms) {
      channels.sms = maybePhone;
    }
    sent = await deliver(doc, channels, { event: eventKey, context: input.templateContext });
  }

  doc.deliveryState = sent ? 'sent' : deferred ? 'queued' : doc.deliveryState;
  await doc.save();
  return doc;
};

export const processPendingDigests = async (now = new Date()) => {
  const digests = await NotificationDigestQueue.find({ deliverAt: { $lte: now } });
  for (const digest of digests) {
    const subscription = await NotificationSubscription.findById(digest.subscriptionId);
    if (!subscription) {
      await NotificationDigestQueue.deleteOne({ _id: digest._id });
      continue;
    }

    const digestMessage = `You have ${digest.notificationIds.length} notifications waiting in your digest.`;
    const digestNotification = await Notification.create({
      title: 'Notification digest',
      message: digestMessage,
      type: 'info',
      category: 'updated' as NotificationCategory,
      tenantId: digest.tenantId,
      user: subscription.userId,
      deliveryState: 'pending',
    });

    const delivered = await deliver(digestNotification, resolveChannelsForSubscription(subscription, null, {}), {
      event: 'digest',
      channelsToSend: subscription.channels,
      subscription,
    });
    digestNotification.deliveryState = delivered ? 'sent' : digestNotification.deliveryState;
    await digestNotification.save();
    await NotificationDigestQueue.deleteOne({ _id: digest._id });
  }
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
