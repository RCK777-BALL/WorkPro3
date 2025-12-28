/*
 * SPDX-License-Identifier: MIT
 */

import type { Types } from 'mongoose';

import Notification from '../../../models/Notification';
import NotificationDeliveryLog from '../../../models/NotificationDeliveryLog';
import NotificationSubscription from '../../../models/NotificationSubscription';
import User from '../../../models/User';
import type { NotificationSubscriptionDocument } from '../../../models/NotificationSubscription';
import type { NotificationChannel } from '../../../models/NotificationTemplate';
import {
  deliverNotificationChannel,
  getNextNotificationRetryAt,
  notificationMaxAttempts,
} from '../../../services/notificationService';
import { logger } from '../../../utils';
import type { NotificationSubscriptionInput } from './schemas';

const resolveSubscriptionTarget = async (
  subscription: NotificationSubscriptionDocument | null,
  channel: NotificationChannel,
) => {
  if (!subscription?.userId) return undefined;
  const user = await User.findById(subscription.userId).select('email');
  if (channel === 'email') {
    return user?.email ?? undefined;
  }
  return undefined;
};

export const listUserSubscriptions = async (tenantId: Types.ObjectId, userId: Types.ObjectId) =>
  NotificationSubscription.find({ tenantId, userId }).sort({ createdAt: -1 });

export const upsertUserSubscription = async (
  tenantId: Types.ObjectId,
  userId: Types.ObjectId,
  payload: NotificationSubscriptionInput,
) =>
  NotificationSubscription.findOneAndUpdate(
    { tenantId, userId },
    {
      tenantId,
      userId,
      events: payload.events,
      channels: payload.channels,
      quietHours: payload.quietHours,
      digest: payload.digest,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
  );

export const deleteUserSubscription = async (tenantId: Types.ObjectId, userId: Types.ObjectId, id: string) =>
  NotificationSubscription.findOneAndDelete({ _id: id, tenantId, userId });

export const retryFailedDeliveries = async (now = new Date()) => {
  const failedLogs = await NotificationDeliveryLog.find({
    status: 'failed',
    attempt: { $lt: notificationMaxAttempts },
  }).sort({ createdAt: 1 });

  for (const log of failedLogs) {
    const retryAt = getNextNotificationRetryAt(log.attempt, log.createdAt);
    if (retryAt > now) continue;

    const notification = await Notification.findById(log.notificationId);
    if (!notification) continue;

    const subscription = log.subscriptionId
      ? await NotificationSubscription.findById(log.subscriptionId)
      : null;

    const target = log.target ?? (await resolveSubscriptionTarget(subscription, log.channel));
    const result = await deliverNotificationChannel({
      notification,
      channel: log.channel,
      target,
      event: log.event ?? notification.category,
      subscription: subscription ?? undefined,
      attempt: log.attempt + 1,
      metadata: log.metadata ?? undefined,
    });

    if (result === 'sent') {
      notification.deliveryState = 'sent';
      await notification.save();
      continue;
    }

    if (log.attempt + 1 >= notificationMaxAttempts) {
      notification.deliveryState = 'failed';
      await notification.save();
    }
  }

  logger.info('Notification retry cycle completed', { checked: failedLogs.length });
};
