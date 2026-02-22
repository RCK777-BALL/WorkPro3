/*
 * SPDX-License-Identifier: MIT
 */

import { Types, type HydratedDocument } from 'mongoose';
import Notification, {
  NotificationCategory,
  NotificationDeliveryState,
  NotificationDocument,
  NotificationType,
} from '../models/Notification';
import User from '../models/User';
import nodemailer from 'nodemailer';

import type { AuthedRequest, AuthedRequestHandler } from '../types/http';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import type { Response, NextFunction } from 'express';
import { sendResponse, assertEmail, writeAuditLog, toEntityId, logger, enqueueEmailRetry } from '../utils';
import * as featureFlags from '../config/featureFlags';

type IdParams = { id: string };

interface NotificationCreateBody {
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  assetId?: string;
  user?: string;
  workOrderId?: string;
  inventoryItemId?: string;
  pmTaskId?: string;
  deliveryState?: NotificationDeliveryState;
  read?: boolean;
}

type NotificationUpdateBody = Partial<NotificationCreateBody>;

interface NotificationInboxQuery extends ParsedQs {
  page?: string;
  limit?: string;
  read?: string;
  category?: NotificationCategory;
}

type NotificationInboxResponse = {
  items: NotificationDocument[];
  page: number;
  limit: number;
  total: number;
  unreadCount: number;
};

const toPlainObject = (
  value: unknown,
): Record<string, unknown> | undefined => {
  if (!value) return undefined;
  if (typeof value === 'object' && typeof (value as any).toObject === 'function') {
    return (value as any).toObject();
  }
  if (typeof value === 'object') {
    return value as Record<string, unknown>;
  }
  return undefined;
};

const parseNumber = (value: unknown, fallback: number) => {
  if (typeof value !== 'string') return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const resolveUserScope = (tenantId: Types.ObjectId, userId?: Types.ObjectId | string) => {
  if (userId && Types.ObjectId.isValid(userId)) {
    const normalized = new Types.ObjectId(userId);
    return {
      tenantId,
      $or: [{ user: normalized }, { user: { $exists: false } }, { user: null }],
    };
  }
  return { tenantId };
};

export const getNotificationInbox: AuthedRequestHandler<
  ParamsDictionary,
  NotificationInboxResponse | { message: string },
  unknown,
  NotificationInboxQuery
> = async (
  req,
  res: Response,
  next: NextFunction,
) => {
    const authedReq = req as AuthedRequest<
      ParamsDictionary,
      NotificationInboxResponse | { message: string },
      unknown,
      NotificationInboxQuery
    >;

    try {
      const tenantId = authedReq.tenantId;
      if (!tenantId) {
        sendResponse(res, null, 'Tenant ID required', 400);
        return;
      }
      if (!Types.ObjectId.isValid(tenantId)) {
        sendResponse(res, null, 'Invalid tenant ID', 400);
        return;
      }
      const tenantObjectId = new Types.ObjectId(tenantId);
      const page = Math.max(parseNumber(authedReq.query.page, 1), 1);
      const limit = Math.min(Math.max(parseNumber(authedReq.query.limit, 20), 1), 100);
      const skip = (page - 1) * limit;
      const read = authedReq.query.read;
      const category = authedReq.query.category;
      const userIdRaw = toEntityId((authedReq.user as any)?._id ?? (authedReq.user as any)?.id);
      const userId = Array.isArray(userIdRaw) ? userIdRaw[0] : userIdRaw;
      const baseFilter = resolveUserScope(tenantObjectId, userId);
      const filter = {
        ...baseFilter,
        ...(read === 'true' ? { read: true } : {}),
        ...(read === 'false' ? { read: false } : {}),
        ...(category ? { category } : {}),
      };

      const [items, total, unreadCount] = await Promise.all([
        Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Notification.countDocuments(filter),
        Notification.countDocuments({ ...baseFilter, read: false }),
      ]);

      sendResponse(res, { items, page, limit, total, unreadCount });
      return;
    } catch (err) {
      next(err);
      return;
    }
  };

export const markAllNotificationsRead: AuthedRequestHandler<
  ParamsDictionary,
  { updated: number } | { message: string }
> = async (
  req,
  res: Response,
  next: NextFunction,
) => {
    const authedReq = req as AuthedRequest<
      ParamsDictionary,
      { updated: number } | { message: string }
    >;

    try {
      const tenantId = authedReq.tenantId;
      if (!tenantId) {
        sendResponse(res, null, 'Tenant ID required', 400);
        return;
      }
      if (!Types.ObjectId.isValid(tenantId)) {
        sendResponse(res, null, 'Invalid tenant ID', 400);
        return;
      }
      const tenantObjectId = new Types.ObjectId(tenantId);
      const userIdRaw = (authedReq.user as any)?.id;
      const userId = Array.isArray(userIdRaw) ? userIdRaw[0] : userIdRaw;
      const filter = resolveUserScope(tenantObjectId, userId);
      const result = await Notification.updateMany(
        { ...filter, read: false },
        { $set: { read: true } },
      );
      sendResponse(res, { updated: result.modifiedCount });
      return;
    } catch (err) {
      next(err);
      return;
    }
  };

export const getAllNotifications: AuthedRequestHandler<
  ParamsDictionary,
  NotificationDocument[] | { message: string }
> = async (
  req,
  res: Response,
  next: NextFunction,
) => {
    const authedReq = req as AuthedRequest<
      ParamsDictionary,
      NotificationDocument[] | { message: string }
    >;
    try {
      const tenantId = authedReq.tenantId;
      if (!tenantId) {
        sendResponse(res, null, 'Tenant ID required', 400);
        return;
      }
      if (!Types.ObjectId.isValid(tenantId)) {
        sendResponse(res, null, 'Invalid tenant ID', 400);
        return;
      }
      const tenantObjectId = new Types.ObjectId(tenantId);
      const items = await Notification.find({ tenantId: tenantObjectId });
      sendResponse(res, items);
      return;
    } catch (err) {
      next(err);
      return;
    }
  };

export const getNotificationById: AuthedRequestHandler<
  IdParams,
  NotificationDocument | { message: string }
> = async (
  req,
  res: Response,
  next: NextFunction,
) => {
    const authedReq = req as AuthedRequest<
      IdParams,
      NotificationDocument | { message: string }
    >;

    try {
      const tenantId = authedReq.tenantId;
      if (!tenantId) {
        sendResponse(res, null, 'Tenant ID required', 400);
        return;
      }
      if (!Types.ObjectId.isValid(tenantId)) {
        sendResponse(res, null, 'Invalid tenant ID', 400);
        return;
      }
      const tenantObjectId = new Types.ObjectId(tenantId);
      const item = await Notification.findOne({
        _id: authedReq.params.id,
        tenantId: tenantObjectId,
      });
      if (!item) {
        sendResponse(res, null, 'Not found', 404);
        return;
      }
      sendResponse(res, item);
      return;
    } catch (err) {
      next(err);
      return;
    }
  };

export const createNotification: AuthedRequestHandler<
  ParamsDictionary,
  NotificationDocument | { message: string },
  NotificationCreateBody
> = async (
  req,
  res: Response,
  next: NextFunction,
) => {
    const authedReq = req as AuthedRequest<
      ParamsDictionary,
      NotificationDocument | { message: string },
      NotificationCreateBody
    >;

    try {
      const tenantId = authedReq.tenantId;
      if (!tenantId) {
        sendResponse(res, null, 'Tenant ID required', 400);
        return;
      }
      if (!Types.ObjectId.isValid(tenantId)) {
        sendResponse(res, null, 'Invalid tenant ID', 400);
        return;
      }
      const tenantObjectId = new Types.ObjectId(tenantId);
      const { title, message, type, category, assetId, user, workOrderId, inventoryItemId, pmTaskId, deliveryState, read } =
        authedReq.body;
      const saved = (await Notification.create({
        title,
        message,
        type,
        category,
        tenantId: tenantObjectId,
        ...(assetId ? { assetId } : {}),
        ...(user ? { user } : {}),
        ...(workOrderId ? { workOrderId } : {}),
        ...(inventoryItemId ? { inventoryItemId } : {}),
        ...(pmTaskId ? { pmTaskId } : {}),
        ...(deliveryState ? { deliveryState } : {}),
        ...(read !== undefined ? { read } : {}),
      })) as HydratedDocument<NotificationDocument>;
      const userId = toEntityId((authedReq.user as any)?._id ?? (authedReq.user as any)?.id);
      await writeAuditLog({
        tenantId: tenantObjectId,
        ...(userId ? { userId } : {}),
        action: 'create',
        entityType: 'Notification',
        entityId: toEntityId(saved._id),
        after: toPlainObject(saved),
      });

      const io = authedReq.app.get('io');
      io?.emit('notification', saved);

      if ((featureFlags as any).isNotificationEmailEnabled?.() && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        {
          const savedUserId = (saved as any).user;
          if (savedUserId) {
            const userRecord = await User.findById(savedUserId);
            if (userRecord?.email) {
              assertEmail(userRecord.email);
              const mailOptions = {
                from: process.env.SMTP_FROM || process.env.SMTP_USER,
                to: userRecord.email,
                subject: 'New Notification',
                text: saved.message || '',
              };
              try {
                await transporter.sendMail(mailOptions);
              } catch (err) {
                logger.error('Failed to send notification email', err);
                void enqueueEmailRetry(mailOptions);
              }
            }
          }
        }
      }

      sendResponse(res, saved, null, 201);
      return;
    } catch (err) {
      next(err);
      return;
    }
  };

export const markNotificationRead: AuthedRequestHandler<
  IdParams,
  NotificationDocument | { message: string }
> = async (
  req,
  res: Response,
  next: NextFunction,
) => {
    const authedReq = req as AuthedRequest<
      IdParams,
      NotificationDocument | { message: string }
    >;

    if (!Types.ObjectId.isValid(authedReq.params.id)) {
      sendResponse(res, null, 'Invalid ID', 400);
      return;
    }

    try {
      const tenantId = authedReq.tenantId;
      if (!tenantId) {
        sendResponse(res, null, 'Tenant ID required', 400);
        return;
      }
      if (!Types.ObjectId.isValid(tenantId)) {
        sendResponse(res, null, 'Invalid tenant ID', 400);
        return;
      }
      const tenantObjectId = new Types.ObjectId(tenantId);
      const updated = await Notification.findOneAndUpdate(
        { _id: authedReq.params.id, tenantId: tenantObjectId },
        { read: true },
        { returnDocument: 'after' },
      ).exec();
      if (!updated) {
        sendResponse(res, null, 'Not found', 404);
        return;
      }
      const userId = toEntityId((authedReq.user as any)?._id ?? (authedReq.user as any)?.id);
      await writeAuditLog({
        tenantId: tenantObjectId,
        ...(userId ? { userId } : {}),
        action: 'markRead',
        entityType: 'Notification',
        entityId: toEntityId(new Types.ObjectId(authedReq.params.id)),
        before: null,
        after: toPlainObject(updated),
      });
      sendResponse(res, updated);
      return;
    } catch (err) {
      next(err);
      return;
    }
  };

export const updateNotification: AuthedRequestHandler<
  IdParams,
  NotificationDocument | { message: string },
  NotificationUpdateBody
> = async (
  req,
  res: Response,
  next: NextFunction,
) => {
    const authedReq = req as AuthedRequest<
      IdParams,
      NotificationDocument | { message: string },
      NotificationUpdateBody
    >;

    if (!Types.ObjectId.isValid(authedReq.params.id)) {
      sendResponse(res, null, 'Invalid ID', 400);
      return;
    }
    try {
      const tenantId = authedReq.tenantId;
      if (!tenantId) {
        sendResponse(res, null, 'Tenant ID required', 400);
        return;
      }
      if (!Types.ObjectId.isValid(tenantId)) {
        sendResponse(res, null, 'Invalid tenant ID', 400);
        return;
      }
      const tenantObjectId = new Types.ObjectId(tenantId);
      const userId = toEntityId((authedReq.user as any)?._id ?? (authedReq.user as any)?.id);
      const existing = await Notification.findOne({
        _id: authedReq.params.id,
        tenantId: tenantObjectId,
      });
      if (!existing) {
        sendResponse(res, null, 'Not found', 404);
        return;
      }
      const updated = await Notification.findOneAndUpdate(
        { _id: authedReq.params.id, tenantId: tenantObjectId },
        authedReq.body ?? {},
        {
          returnDocument: 'after',
          runValidators: true,
        },
      ).exec();
      const before = toPlainObject(existing);
      const after = toPlainObject(updated);
      await writeAuditLog({
        tenantId: tenantObjectId,
        ...(userId ? { userId } : {}),
        action: 'update',
        entityType: 'Notification',
        entityId: toEntityId(new Types.ObjectId(authedReq.params.id)),
        before,
        after,
      });
      sendResponse(res, updated);
      return;
    } catch (err) {
      next(err);
      return;
    }
  };

export const deleteNotification: AuthedRequestHandler<
  IdParams,
  { message: string }
> = async (
  req,
  res: Response,
  next: NextFunction,
) => {
    const authedReq = req as AuthedRequest<IdParams, { message: string }>;

    if (!Types.ObjectId.isValid(authedReq.params.id)) {
      sendResponse(res, null, 'Invalid ID', 400);
      return;
    }
    try {
      const tenantId = authedReq.tenantId;
      if (!tenantId) {
        sendResponse(res, null, 'Tenant ID required', 400);
        return;
      }
      if (!Types.ObjectId.isValid(tenantId)) {
        sendResponse(res, null, 'Invalid tenant ID', 400);
        return;
      }
      const tenantObjectId = new Types.ObjectId(tenantId);
      const userId = toEntityId((authedReq.user as any)?._id ?? (authedReq.user as any)?.id);
      const deleted = await Notification.findOneAndDelete({
        _id: authedReq.params.id,
        tenantId: tenantObjectId,
      });
      if (!deleted) {
        sendResponse(res, null, 'Not found', 404);
        return;
      }
      await writeAuditLog({
        tenantId: tenantObjectId,
        ...(userId ? { userId } : {}),
        action: 'delete',
        entityType: 'Notification',
        entityId: toEntityId(new Types.ObjectId(authedReq.params.id)),
        before: toPlainObject(deleted),
      });
      sendResponse(res, { message: 'Deleted successfully' });
      return;
    } catch (err) {
      next(err);
      return;
    }
  };
