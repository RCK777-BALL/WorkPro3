import mongoose from 'mongoose';
import Notification, { NotificationDocument } from '../models/Notifications';
import User from '../models/User';
import nodemailer from 'nodemailer';
 
import { assertEmail } from '../utils/assert';
import { Request, Response, NextFunction } from 'express';

type IdParams = { id: string };

 export const getAllNotifications: AuthedRequestHandler<unknown, NotificationDocument[]> = async (
  req: AuthedRequest<unknown, NotificationDocument[]>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ message: 'Tenant ID required' });
    const items = await Notification.find({ tenantId });
 
    res.json(items);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

 export const getNotificationById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
 
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ message: 'Tenant ID required' });
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

 export const createNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
 
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ message: 'Tenant ID required' });
    const newItem = new Notification({ ...req.body, tenantId });
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

 export const markNotificationRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
 
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ message: 'Invalid ID' });
    return;
  }

  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ message: 'Tenant ID required' });
    const updated = await Notification.findOneAndUpdate(
      { _id: req.params.id, tenantId },
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

 export const updateNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
 
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ message: 'Invalid ID' });
    return;
  }
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ message: 'Tenant ID required' });
    const updated = await Notification.findOneAndUpdate(
      { _id: req.params.id, tenantId },
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

 export const deleteNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
 
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ message: 'Invalid ID' });
    return;
  }
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ message: 'Tenant ID required' });
    const deleted = await Notification.findOneAndDelete({ _id: req.params.id, tenantId });
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

