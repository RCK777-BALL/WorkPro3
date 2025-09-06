import mongoose from 'mongoose';
import Notification, { NotificationDocument } from '../models/Notification';
import User from '../models/User';
import nodemailer from 'nodemailer';
import { Response, NextFunction } from 'express';
import { AuthedRequest, AuthedRequestHandler } from '../types/http';

type IdParams = { id: string };

export const getAllNotifications: AuthedRequestHandler = async (req: { tenantId: any; }, res: { json: (arg0: (mongoose.Document<unknown, {}, NotificationDocument, {}, {}> & NotificationDocument & Required<{ _id: mongoose.Types.ObjectId; }> & { __v: number; })[]) => void; }, next: (arg0: any) => void) => {
  try {
    const items = await Notification.find({ tenantId: req.tenantId });
    res.json(items);
  } catch (err) {
    next(err);
  }
};

export const getNotificationById: AuthedRequestHandler<IdParams> = async (
  req: AuthedRequest<IdParams>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const item = await Notification.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
};

export const createNotification: AuthedRequestHandler = async (req: { body: any; tenantId: any; app: { get: (arg0: string) => any; }; }, res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: any): void; new(): any; }; }; }, next: (arg0: any) => void) => {
  try {
    const newItem = new Notification({ ...req.body, tenantId: req.tenantId });
    const saved = (await newItem.save()) as any;

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
  } catch (err) {
    next(err);
  }
};

export const markNotificationRead: AuthedRequestHandler = async (req: { params: { id: string | number | mongoose.mongo.BSON.ObjectId | Uint8Array<ArrayBufferLike> | mongoose.mongo.BSON.ObjectIdLike; }; tenantId: any; }, res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: { message: string; }): any; new(): any; }; }; json: (arg0: mongoose.Document<unknown, {}, NotificationDocument, {}, {}> & NotificationDocument & Required<{ _id: mongoose.Types.ObjectId; }> & { __v: number; }) => void; }, next: (arg0: any) => void) => {
 
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid ID' });
  }
 
  try {
    const updated = await Notification.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { read: true },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const updateNotification: AuthedRequestHandler = async (req: { params: { id: string | number | mongoose.mongo.BSON.ObjectId | Uint8Array<ArrayBufferLike> | mongoose.mongo.BSON.ObjectIdLike; }; tenantId: any; body: mongoose.UpdateQuery<NotificationDocument>; }, res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: { message: string; }): any; new(): any; }; }; json: (arg0: mongoose.Document<unknown, {}, NotificationDocument, {}, {}> & NotificationDocument & Required<{ _id: mongoose.Types.ObjectId; }> & { __v: number; }) => void; }, next: (arg0: any) => void) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid ID' });
  }
  try {
    const updated = await Notification.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const deleteNotification: AuthedRequestHandler = async (req: { params: { id: string | number | mongoose.mongo.BSON.ObjectId | Uint8Array<ArrayBufferLike> | mongoose.mongo.BSON.ObjectIdLike; }; tenantId: any; }, res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: { message: string; }): any; new(): any; }; }; json: (arg0: { message: string; }) => void; }, next: (arg0: any) => void) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid ID' });
  }
  try {
    const deleted = await Notification.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};
