import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Notification from '../models/Notification';
import User from '../models/User';
import nodemailer from 'nodemailer';
import { AuthedRequestHandler } from '../types/AuthedRequestHandler';

export const getNotifications: AuthedRequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const items = await Notification.find({ tenantId: req.tenantId })
      .select('message read type -_id')
      .lean();
    res.json(items);
  } catch (err) {
    next(err);
  }
};

export const getAllNotifications: AuthedRequestHandler = async (req, res, next) => {
  try {
    const items = await Notification.find({ tenantId: req.tenantId });
    res.json(items);
  } catch (err) {
    next(err);
  }
};

export const getNotificationById: AuthedRequestHandler = async (req, res, next) => {
  try {
    const item = await Notification.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
};

export const createNotification: AuthedRequestHandler = async (req, res, next) => {
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

export const markNotificationRead: AuthedRequestHandler = async (req, res, next) => {
 
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

export const updateNotification: AuthedRequestHandler = async (req, res, next) => {
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

export const deleteNotification: AuthedRequestHandler = async (req, res, next) => {
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
