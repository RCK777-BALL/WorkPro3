import mongoose from 'mongoose';
import Notification, { NotificationDocument } from '../models/Notifications';
import User from '../models/User';
import nodemailer from 'nodemailer';
import { Response, NextFunction } from 'express';
import { assertEmail } from '../utils/assert';

type IdParams = { id: string };

export const getAllNotifications: AuthedRequestHandler<unknown, NotificationDocument[]> = async (
  req: AuthedRequest<unknown, NotificationDocument[]>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const items = await Notification.find({ tenantId: req.tenantId });
    res.json(items);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const getNotificationById: AuthedRequestHandler<IdParams, NotificationDocument> = async (
  req: AuthedRequest<IdParams, NotificationDocument>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const item = await Notification.findOne({ _id: req.params.id, tenantId: req.tenantId });
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

export const createNotification: AuthedRequestHandler<unknown, NotificationDocument, any> = async (
  req: AuthedRequest<unknown, NotificationDocument, any>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const newItem = new Notification({ ...req.body, tenantId: req.tenantId });
    const saved = (await newItem.save()) as NotificationDocument;

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

export const markNotificationRead: AuthedRequestHandler<IdParams, NotificationDocument> = async (
  req: AuthedRequest<IdParams, NotificationDocument>,
  res: Response,
  next: NextFunction,
) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ message: 'Invalid ID' });
    return;
  }

  try {
    const updated = await Notification.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { read: true },
      { new: true },
    );
    if (!updated) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json(updated);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const updateNotification: AuthedRequestHandler<
  IdParams,
  NotificationDocument,
  mongoose.UpdateQuery<NotificationDocument>
> = async (
  req: AuthedRequest<IdParams, NotificationDocument, mongoose.UpdateQuery<NotificationDocument>>,
  res: Response,
  next: NextFunction,
) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ message: 'Invalid ID' });
    return;
  }
  try {
    const updated = await Notification.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );
    if (!updated) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json(updated);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const deleteNotification: AuthedRequestHandler<IdParams, { message: string }> = async (
  req: AuthedRequest<IdParams, { message: string }>,
  res: Response,
  next: NextFunction,
) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ message: 'Invalid ID' });
    return;
  }
  try {
    const deleted = await Notification.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!deleted) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json({ message: 'Deleted successfully' });
    return;
  } catch (err) {
    next(err);
    return;
  }
};

