/*
 * SPDX-License-Identifier: MIT
 */

import mongoose from 'mongoose';
import Notification, { NotificationDocument } from '../models/Notifications';
import User from '../models/User';
import nodemailer from 'nodemailer';

import { assertEmail } from '../utils/assert';
import type { AuthedRequestHandler } from '../types/http';
import type { ParamsDictionary } from 'express-serve-static-core';
import { writeAuditLog } from '../utils/audit';

type IdParams = { id: string };

export const getAllNotifications: AuthedRequestHandler<
  ParamsDictionary,
  NotificationDocument[] | { message: string }
> = async (
  req: { tenantId: any; },
  res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: { message: string; }): void; new(): any; }; }; json: (arg0: (mongoose.Document<unknown, {}, NotificationDocument, {}, {}> & NotificationDocument & Required<{ _id: mongoose.Types.ObjectId; }> & { __v: number; })[]) => void; },
  next: (arg0: unknown) => void,
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(400).json({ message: 'Tenant ID required' });
      return;
    }
    const items = await Notification.find({ tenantId });
 
    res.json(items);
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
  req: { tenantId: any; params: { id: any; }; },
  res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: { message: string; }): void; new(): any; }; }; json: (arg0: mongoose.Document<unknown, {}, NotificationDocument, {}, {}> & NotificationDocument & Required<{ _id: mongoose.Types.ObjectId; }> & { __v: number; }) => void; },
  next: (arg0: unknown) => void,
) => {

  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(400).json({ message: 'Tenant ID required' });
      return;
    }
    const item = await Notification.findOne({ _id: req.params.id, tenantId });
    if (!item) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json(item);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const createNotification: AuthedRequestHandler<
  ParamsDictionary,
  NotificationDocument | { message: string }
> = async (
  req: { tenantId: any; body: any; user: any; app: { get: (arg0: string) => any; }; },
  res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: NotificationDocument): void; new(): any; }; }; },
  next: (arg0: unknown) => void,
) => {

  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(400).json({ message: 'Tenant ID required' });
      return;
    }
    const newItem = new Notification({ ...req.body, tenantId });
    const saved = (await newItem.save()) as NotificationDocument;
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId,
      action: 'create',
      entityType: 'Notification',
      entityId: saved._id,
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
          await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: user.email,
            subject: 'New Notification',
            text: saved.message || '',
          });
        }
      }
    }

    res.status(201).json(saved);
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
  req: { params: { id: string | number | mongoose.mongo.BSON.ObjectId | Uint8Array<ArrayBufferLike> | mongoose.mongo.BSON.ObjectIdLike; }; tenantId: any; user: any; },
  res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: { message: string; }): void; new(): any; }; }; json: (arg0: mongoose.Document<unknown, {}, NotificationDocument, {}, {}> & NotificationDocument & Required<{ _id: mongoose.Types.ObjectId; }> & { __v: number; }) => void; },
  next: (arg0: unknown) => void,
) => {

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ message: 'Invalid ID' });
    return;
  }

  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(400).json({ message: 'Tenant ID required' });
      return;
    }
    const updated = await Notification.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { read: true },
      { new: true },
    );
    if (!updated) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId,
      action: 'markRead',
      entityType: 'Notification',
      entityId: req.params.id,
      before: null,
      after: updated.toObject(),
    });
    res.json(updated);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const updateNotification: AuthedRequestHandler<
  IdParams,
  NotificationDocument | { message: string }
> = async (
  req: { params: { id: string | number | mongoose.mongo.BSON.ObjectId | Uint8Array<ArrayBufferLike> | mongoose.mongo.BSON.ObjectIdLike; }; tenantId: any; user: any; body: mongoose.UpdateQuery<NotificationDocument> | undefined; },
  res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: { message: string; }): void; new(): any; }; }; json: (arg0: (mongoose.Document<unknown, {}, NotificationDocument, {}, {}> & NotificationDocument & Required<{ _id: mongoose.Types.ObjectId; }> & { __v: number; }) | null) => void; },
  next: (arg0: unknown) => void,
) => {

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ message: 'Invalid ID' });
    return;
  }
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(400).json({ message: 'Tenant ID required' });
      return;
    }
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const existing = await Notification.findOne({ _id: req.params.id, tenantId });
    if (!existing) {
      res.status(404).json({ message: 'Not found' });
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
      entityId: req.params.id,
      before: existing.toObject(),
      after: updated?.toObject(),
    });
    res.json(updated);
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
  req: { params: { id: string | number | mongoose.mongo.BSON.ObjectId | Uint8Array<ArrayBufferLike> | mongoose.mongo.BSON.ObjectIdLike; }; tenantId: any; user: any; },
  res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: { message: string; }): void; new(): any; }; }; json: (arg0: { message: string; }) => void; },
  next: (arg0: unknown) => void,
) => {

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ message: 'Invalid ID' });
    return;
  }
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(400).json({ message: 'Tenant ID required' });
      return;
    }
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const deleted = await Notification.findOneAndDelete({ _id: req.params.id, tenantId });
    if (!deleted) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    await writeAuditLog({
      tenantId,
      userId,
      action: 'delete',
      entityType: 'Notification',
      entityId: req.params.id,
      before: deleted.toObject(),
    });
    res.json({ message: 'Deleted successfully' });
    return;
  } catch (err) {
    next(err);
    return;
  }
};

