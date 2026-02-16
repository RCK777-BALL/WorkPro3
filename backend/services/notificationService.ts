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
import NotificationPreference from '../models/NotificationPreference';
import User from '../models/User';
import type { WorkOrderDocument } from '../models/WorkOrder';
import type { IInventoryItem } from '../models/InventoryItem';
import type { PMTaskDocument } from '../models/PMTask';
import { getIO } from '../socket';
import { logger, assertEmail, enqueueEmailRetry, writeAuditLog } from '../utils';
import { isNotificationEmailEnabled } from '../config/featureFlags';

export interface NotificationChannels {
  email?: string;
  outlookEmail?: string;
  sms?: string;
  webhookUrl?: string;
  slackWebhookUrl?: string;
  teamsWebhookUrl?: string;
  pushToken?: string;
}

export const notificationRetryBackoffMinutes = [5, 30, 120];
export const notificationMaxAttempts = notificationRetryBackoffMinutes.length + 1;

export const getNextNotificationRetryAt = (attempt: number, from: Date = new Date()) => {
  const index = Math.max(0, Math.min(attempt - 1, notificationRetryBackoffMinutes.length - 1));
  return new Date(from.getTime() + notificationRetryBackoffMinutes[index] * 60 * 1000);
};

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
    event?: string;
    target?: string;
    nextAttemptAt?: Date;
    metadata?: Record<string, unknown>;
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
  event?: string,
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
    { upsert: true, returnDocument: 'after' },
  );
  await recordDeliveryLog({
    notificationId: notification._id,
    tenantId: notification.tenantId,
    subscriptionId: subscription._id,
    channel,
    status: 'deferred',
    event,
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
  if (subscription.channels.includes('outlook')) {
    resolved.outlookEmail = provided?.outlookEmail ?? provided?.email ?? user?.email;
  }
  if (subscription.channels.includes('webhook')) {
    resolved.webhookUrl = provided?.webhookUrl;
  }
  if (subscription.channels.includes('teams')) {
    resolved.teamsWebhookUrl = provided?.teamsWebhookUrl ?? process.env.TEAMS_WEBHOOK_URL;
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

const sendEmail = async (
  to: string,
  subject: string,
  text: string,
  provider: 'smtp' | 'outlook' = 'smtp',
) => {
  if (!isNotificationEmailEnabled()) {
    return;
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER;

  const outlookHost = process.env.OUTLOOK_SMTP_HOST || 'smtp.office365.com';
  const outlookPort = parseInt(process.env.OUTLOOK_SMTP_PORT || '587', 10);
  const outlookUser = process.env.OUTLOOK_SMTP_USER || process.env.SMTP_USER;
  const outlookPass = process.env.OUTLOOK_SMTP_PASS || process.env.SMTP_PASS;
  const outlookFrom = process.env.OUTLOOK_SMTP_FROM || process.env.SMTP_FROM || process.env.SMTP_USER;

  const selected =
    provider === 'outlook'
      ? { host: outlookHost, port: outlookPort, user: outlookUser, pass: outlookPass, from: outlookFrom }
      : { host: smtpHost, port: smtpPort, user: smtpUser, pass: smtpPass, from: smtpFrom };

  if (!selected.host || !selected.from) {
    return;
  }

  const transporter = nodemailer.createTransport({
    host: selected.host,
    port: selected.port,
    secure: selected.port === 465,
    auth:
      selected.user && selected.pass
        ? {
            user: selected.user,
            pass: selected.pass,
          }
        : undefined,
  });

  const mailOptions = {
    from: selected.from,
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

const buildWebhookTargets = (channels?: NotificationChannels) =>
  [channels?.webhookUrl, channels?.slackWebhookUrl, channels?.teamsWebhookUrl, process.env.SLACK_WEBHOOK_URL, process.env.TEAMS_WEBHOOK_URL].filter(
    (value): value is string => Boolean(value),
  );

export const deliverNotificationChannel = async (input: {
  notification: HydratedDocument<NotificationDocument>;
  channel: NotificationChannel;
  target?: string;
  event?: string;
  context?: Record<string, string>;
  subscription?: NotificationSubscriptionDocument;
  attempt?: number;
  metadata?: Record<string, unknown>;
}) => {
  const {
    notification,
    channel,
    target,
    event,
    context,
    subscription,
    attempt = 1,
    metadata,
  } = input;
  const normalized = normalizeChannel(channel);

  if (normalized === 'in_app') {
    try {
      const io = getIO();
      io.emit('notification', notification);
      await recordDeliveryLog({
        notificationId: notification._id,
        tenantId: notification.tenantId,
        subscriptionId: subscription?._id,
        channel: 'in_app',
        status: 'sent',
        attempt,
        event,
        target,
      });
      return 'sent';
    } catch (err) {
      logger.debug('Socket not initialized; skipping notification emit');
      await recordDeliveryLog({
        notificationId: notification._id,
        tenantId: notification.tenantId,
        subscriptionId: subscription?._id,
        channel: 'in_app',
        status: 'failed',
        attempt,
        event,
        target,
        nextAttemptAt: attempt < notificationMaxAttempts ? getNextNotificationRetryAt(attempt, new Date()) : undefined,
        errorMessage: (err as Error)?.message,
      });
      return 'failed';
    }
  }

  if (normalized === 'email') {
    if (!isNotificationEmailEnabled()) {
      await recordDeliveryLog({
        notificationId: notification._id,
        tenantId: notification.tenantId,
        subscriptionId: subscription?._id,
        channel: 'email',
        status: 'failed',
        attempt,
        event,
        target,
        nextAttemptAt: attempt < notificationMaxAttempts ? getNextNotificationRetryAt(attempt, new Date()) : undefined,
        errorMessage: 'Email delivery disabled',
      });
      return 'failed';
    }
    if (!target) {
      await recordDeliveryLog({
        notificationId: notification._id,
        tenantId: notification.tenantId,
        subscriptionId: subscription?._id,
        channel: 'email',
        status: 'failed',
        attempt,
        event,
        target,
        nextAttemptAt: attempt < notificationMaxAttempts ? getNextNotificationRetryAt(attempt, new Date()) : undefined,
        errorMessage: 'Email not configured',
      });
      return 'failed';
    }
    if (!process.env.SMTP_HOST || !(process.env.SMTP_FROM || process.env.SMTP_USER)) {
      await recordDeliveryLog({
        notificationId: notification._id,
        tenantId: notification.tenantId,
        subscriptionId: subscription?._id,
        channel: 'email',
        status: 'failed',
        attempt,
        event,
        target,
        nextAttemptAt: attempt < notificationMaxAttempts ? getNextNotificationRetryAt(attempt, new Date()) : undefined,
        errorMessage: 'SMTP not configured',
      });
      return 'failed';
    }
    assertEmail(target);
    const content = await resolveTemplate(
      notification.tenantId as Types.ObjectId,
      event,
      'email',
      { title: notification.title, message: notification.message },
      context,
    );
    try {
      await sendEmail(target, content.title, content.message, 'smtp');
      await recordDeliveryLog({
        notificationId: notification._id,
        tenantId: notification.tenantId,
        subscriptionId: subscription?._id,
        channel: 'email',
        status: 'sent',
        attempt,
        event,
        target,
      });
      return 'sent';
    } catch (err) {
      await recordDeliveryLog({
        notificationId: notification._id,
        tenantId: notification.tenantId,
        subscriptionId: subscription?._id,
        channel: 'email',
        status: 'failed',
        attempt,
        event,
        target,
        nextAttemptAt: attempt < notificationMaxAttempts ? getNextNotificationRetryAt(attempt, new Date()) : undefined,
        errorMessage: (err as Error)?.message,
      });
      return 'failed';
    }
  }

  if (normalized === 'outlook') {
    if (!isNotificationEmailEnabled()) {
      await recordDeliveryLog({
        notificationId: notification._id,
        tenantId: notification.tenantId,
        subscriptionId: subscription?._id,
        channel: 'outlook',
        status: 'failed',
        attempt,
        event,
        target,
        nextAttemptAt: attempt < notificationMaxAttempts ? getNextNotificationRetryAt(attempt, new Date()) : undefined,
        errorMessage: 'Outlook delivery disabled',
      });
      return 'failed';
    }
    if (!target) {
      await recordDeliveryLog({
        notificationId: notification._id,
        tenantId: notification.tenantId,
        subscriptionId: subscription?._id,
        channel: 'outlook',
        status: 'failed',
        attempt,
        event,
        target,
        nextAttemptAt: attempt < notificationMaxAttempts ? getNextNotificationRetryAt(attempt, new Date()) : undefined,
        errorMessage: 'Outlook email not configured',
      });
      return 'failed';
    }
    assertEmail(target);
    const content = await resolveTemplate(
      notification.tenantId as Types.ObjectId,
      event,
      'outlook',
      { title: notification.title, message: notification.message },
      context,
    );
    try {
      await sendEmail(target, content.title, content.message, 'outlook');
      await recordDeliveryLog({
        notificationId: notification._id,
        tenantId: notification.tenantId,
        subscriptionId: subscription?._id,
        channel: 'outlook',
        status: 'sent',
        attempt,
        event,
        target,
      });
      return 'sent';
    } catch (err) {
      await recordDeliveryLog({
        notificationId: notification._id,
        tenantId: notification.tenantId,
        subscriptionId: subscription?._id,
        channel: 'outlook',
        status: 'failed',
        attempt,
        event,
        target,
        nextAttemptAt: attempt < notificationMaxAttempts ? getNextNotificationRetryAt(attempt, new Date()) : undefined,
        errorMessage: (err as Error)?.message,
      });
      return 'failed';
    }
  }

  if (normalized === 'push') {
    const status = target ? 'sent' : 'failed';
    await recordDeliveryLog({
      notificationId: notification._id,
      tenantId: notification.tenantId,
      subscriptionId: subscription?._id,
      channel: 'push',
      status,
      attempt,
      event,
      target,
      nextAttemptAt:
        status === 'failed' && attempt < notificationMaxAttempts
          ? getNextNotificationRetryAt(attempt, new Date())
          : undefined,
      errorMessage: target ? undefined : 'Missing push token',
    });
    return status;
  }

  if (normalized === 'webhook') {
    const webhookPayload = {
      title: notification.title,
      message: notification.message,
      category: notification.category,
      createdAt: notification.createdAt,
    };
    const webhookTargets = (metadata?.webhookUrls as string[] | undefined) ?? buildWebhookTargets();
    if (webhookTargets.length === 0) {
      await recordDeliveryLog({
        notificationId: notification._id,
        tenantId: notification.tenantId,
        subscriptionId: subscription?._id,
        channel: 'webhook',
        status: 'failed',
        attempt,
        event,
        target,
        nextAttemptAt: attempt < notificationMaxAttempts ? getNextNotificationRetryAt(attempt, new Date()) : undefined,
        errorMessage: 'Webhook not configured',
      });
      return 'failed';
    }

    try {
      for (const url of webhookTargets) {
        if (url.includes('hooks.slack.com')) {
          await postWebhook(url, { text: `*[${notification.category}]* ${notification.title}\n${notification.message}` });
        } else if (url.includes('webhook.office.com')) {
          await postWebhook(url, { text: `${notification.title}: ${notification.message}` });
        } else {
          await postWebhook(url, webhookPayload);
        }
      }
      await recordDeliveryLog({
        notificationId: notification._id,
        tenantId: notification.tenantId,
        subscriptionId: subscription?._id,
        channel: 'webhook',
        status: 'sent',
        attempt,
        event,
        target,
        metadata: { webhookUrls: webhookTargets },
      });
      return 'sent';
    } catch (err) {
      await recordDeliveryLog({
        notificationId: notification._id,
        tenantId: notification.tenantId,
        subscriptionId: subscription?._id,
        channel: 'webhook',
        status: 'failed',
        attempt,
        event,
        target,
        nextAttemptAt: attempt < notificationMaxAttempts ? getNextNotificationRetryAt(attempt, new Date()) : undefined,
        metadata: { webhookUrls: webhookTargets },
        errorMessage: (err as Error)?.message,
      });
      return 'failed';
    }
  }

  if (normalized === 'teams') {
    const teamsUrl = target || (metadata?.teamsWebhookUrl as string | undefined) || process.env.TEAMS_WEBHOOK_URL;
    if (!teamsUrl) {
      await recordDeliveryLog({
        notificationId: notification._id,
        tenantId: notification.tenantId,
        subscriptionId: subscription?._id,
        channel: 'teams',
        status: 'failed',
        attempt,
        event,
        target,
        nextAttemptAt: attempt < notificationMaxAttempts ? getNextNotificationRetryAt(attempt, new Date()) : undefined,
        errorMessage: 'Teams webhook not configured',
      });
      return 'failed';
    }

    try {
      await postWebhook(teamsUrl, { text: `${notification.title}: ${notification.message}` });
      await recordDeliveryLog({
        notificationId: notification._id,
        tenantId: notification.tenantId,
        subscriptionId: subscription?._id,
        channel: 'teams',
        status: 'sent',
        attempt,
        event,
        target: teamsUrl,
      });
      return 'sent';
    } catch (err) {
      await recordDeliveryLog({
        notificationId: notification._id,
        tenantId: notification.tenantId,
        subscriptionId: subscription?._id,
        channel: 'teams',
        status: 'failed',
        attempt,
        event,
        target: teamsUrl,
        nextAttemptAt: attempt < notificationMaxAttempts ? getNextNotificationRetryAt(attempt, new Date()) : undefined,
        errorMessage: (err as Error)?.message,
      });
      return 'failed';
    }
  }

  return 'failed';
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
  const channelsToSend =
    options?.channelsToSend ??
    ([
      'in_app',
      ...(channels?.email ? (['email'] as NotificationChannel[]) : []),
      ...(channels?.outlookEmail ? (['outlook'] as NotificationChannel[]) : []),
      ...(channels?.webhookUrl || channels?.slackWebhookUrl ? (['webhook'] as NotificationChannel[]) : []),
      ...(channels?.teamsWebhookUrl ? (['teams'] as NotificationChannel[]) : []),
    ] as NotificationChannel[]);
  const results: ('sent' | 'failed')[] = [];
  const webhookTargets = buildWebhookTargets(channels);

  for (const channel of channelsToSend) {
    const normalized = normalizeChannel(channel);
    if (normalized === 'email' || normalized === 'outlook') {
      const target = normalized === 'outlook' ? channels?.outlookEmail ?? channels?.email : channels?.email;
      let success = false;
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        const result = await deliverNotificationChannel({
          notification,
          channel: normalized,
          target,
          event: options?.event,
          context: options?.context,
          subscription: options?.subscription,
          attempt,
        });
        if (result === 'sent') {
          success = true;
          break;
        }
      }
      results.push(success ? 'sent' : 'failed');
      continue;
    }

    if (normalized === 'webhook') {
      const result = await deliverNotificationChannel({
        notification,
        channel: 'webhook',
        target: channels?.webhookUrl,
        event: options?.event,
        context: options?.context,
        subscription: options?.subscription,
        metadata: { webhookUrls: webhookTargets },
      });
      results.push(result);
      continue;
    }

    if (normalized === 'teams') {
      const result = await deliverNotificationChannel({
        notification,
        channel: 'teams',
        target: channels?.teamsWebhookUrl,
        event: options?.event,
        context: options?.context,
        subscription: options?.subscription,
        metadata: { teamsWebhookUrl: channels?.teamsWebhookUrl ?? process.env.TEAMS_WEBHOOK_URL },
      });
      results.push(result);
      continue;
    }

    const target = normalized === 'push' ? channels?.pushToken : notification.user?.toString();

    const result = await deliverNotificationChannel({
      notification,
      channel: normalized,
      target,
      event: options?.event,
      context: options?.context,
      subscription: options?.subscription,
    });
    results.push(result);
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
  const preference = input.userId
    ? await NotificationPreference.findOne({ tenantId: input.tenantId, userId: input.userId }).lean()
    : null;
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
          await queueDigest(doc, subscription, channel, eventKey, now);
        }
      } else {
        for (const channel of subscription.channels) {
          await recordDeliveryLog({
            notificationId: doc._id,
            tenantId: doc.tenantId,
            subscriptionId: subscription._id,
            channel,
            status: 'queued',
            event: eventKey,
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
    const allowOutlook = preference?.channels?.outlook !== false;
    const allowTeams = Boolean(preference?.channels?.teams);
    const channels: NotificationChannels = { ...input.channels };
    if (user?.email && allowEmail) {
      channels.email = user.email;
    }
    if (allowOutlook && (preference?.outlookEmail || user?.email)) {
      channels.outlookEmail = preference?.outlookEmail || user?.email || undefined;
    }
    const maybePhone = (user as unknown as { phone?: string })?.phone;
    if (maybePhone && allowSms) {
      channels.sms = maybePhone;
    }
    if (allowTeams && (preference?.teamsWebhookUrl || input.channels?.teamsWebhookUrl || process.env.TEAMS_WEBHOOK_URL)) {
      channels.teamsWebhookUrl =
        preference?.teamsWebhookUrl || input.channels?.teamsWebhookUrl || process.env.TEAMS_WEBHOOK_URL;
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

export const retryFailedDeliveries = async (now = new Date()) => {
  const failedLogs = await NotificationDeliveryLog.find({
    status: 'failed',
    $or: [{ nextAttemptAt: { $exists: false } }, { nextAttemptAt: null }, { nextAttemptAt: { $lte: now } }],
  })
    .sort({ createdAt: 1 })
    .lean();

  for (const log of failedLogs) {
    const notification = await Notification.findById(log.notificationId);
    if (!notification) {
      continue;
    }

    const nextAttempt = (log.attempt ?? 1) + 1;
    await NotificationDeliveryLog.create({
      notificationId: log.notificationId,
      tenantId: log.tenantId,
      subscriptionId: log.subscriptionId,
      channel: log.channel,
      attempt: nextAttempt,
      status: 'sent',
      event: log.event,
      target: log.target,
      metadata: { retriedFromLogId: log._id.toString() },
    });

    notification.deliveryState = 'sent';
    await notification.save();
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
