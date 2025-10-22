/*
 * SPDX-License-Identifier: MIT
 */

import mongoose from 'mongoose';
import Notification from '../models/Notifications';
import User from '../models/User';
import nodemailer from 'nodemailer';
import { assertEmail } from './assert';
import logger from './logger';
import { enqueueEmailRetry } from './emailQueue';

export const notifyUser = async (userId: mongoose.Types.ObjectId, message: string) => {
  if (!userId) return;

  const user = await User.findById(userId);
  if (!user) return;

  await Notification.create({ tenantId: user.tenantId, user: userId, message });

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    if (user.email) {
      assertEmail(user.email);
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: user.email,
        subject: 'WorkPro Notification',
        text: message,
      };

      try {
        await transporter.sendMail(mailOptions);
      } catch (err) {
        logger.error('Failed to send notification email', err);
        void enqueueEmailRetry(mailOptions);
      }
    }
  }
};
export default notifyUser;
