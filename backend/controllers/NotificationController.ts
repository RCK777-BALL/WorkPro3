/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';
import Notification, { NotificationDocument } from '../models/Notifications';
import User from '../models/User';
import nodemailer from 'nodemailer';

import { assertEmail } from '../utils/assert';
import type { AuthedRequestHandler } from '../types/http';
import type { ParamsDictionary } from 'express-serve-static-core';
import { writeAuditLog } from '../utils/audit';
import { toEntityId } from '../utils/ids';
import logger from '../utils/logger';
import { enqueueEmailRetry } from '../utils/emailQueue';
import { sendResponse } from '../utils/sendResponse';

type IdParams = { id: string };

export const getAllNotifications: AuthedRequestHandler<
  ParamsDictionary,
  NotificationDocument[] | { message: string }
> = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const items = await Notification.find({ tenantId });

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
> = async (req, res, next) => {

  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const item = await Notification.findOne({ _id: req.params.id, tenantId });
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
  NotificationDocument | { message: string }
> = async (req, res, next) => {

  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const { title, message, type, assetId, user, read } = req.body;
    const saved = await Notification.create({
      title,
      message,
      type,
      tenantId: tenantId as unknown as Types.ObjectId,
      ...(assetId ? { assetId } : {}),
      ...(user ? { user } : {}),
      ...(read !== undefined ? { read } : {}),
    });
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId,
      action: 'create',
      entityType: 'Notification',
      entityId: toEntityId(saved._id),
      after: saved.toObject(),
    });

    const io = req.app.get('io');
    io?.emit('notification', saved);

    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      if (saved.user) {
        const user = await User.findById(saved.user);
        if (user?.email) {
          assertEmail(user.email);
          const mailOptions = {
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: user.email,
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
> = async (req, res, next) => {

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    sendResponse(res, null, 'Invalid ID', 400);
    return;
  }

  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const updated = await Notification.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { read: true },
      { new: true },
    );
    if (!updated) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId,
      action: 'markRead',
      entityType: 'Notification',
      entityId: toEntityId(new Types.ObjectId(req.params.id)),
      before: null,
      after: updated.toObject(),
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
  NotificationDocument | { message: string }
> = async (req, res, next) => {

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    sendResponse(res, null, 'Invalid ID', 400);
    return;
  }
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const existing = await Notification.findOne({ _id: req.params.id, tenantId });
    if (!existing) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const updated = await Notification.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );
    await writeAuditLog({
      tenantId,
      userId,
      action: 'update',
      entityType: 'Notification',
      entityId: toEntityId(new Types.ObjectId(req.params.id)),
      before: existing.toObject(),
      after: updated?.toObject(),
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
> = async (req, res, next) => {

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    sendResponse(res, null, 'Invalid ID', 400);
    return;
  }
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const deleted = await Notification.findOneAndDelete({ _id: req.params.id, tenantId });
    if (!deleted) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    await writeAuditLog({
      tenantId,
      userId,
      action: 'delete',
      entityType: 'Notification',
      entityId: toEntityId(new Types.ObjectId(req.params.id)),
      before: deleted.toObject(),
    });
    sendResponse(res, { message: 'Deleted successfully' });
    return;
  } catch (err) {
    next(err);
    return;
  }
};

