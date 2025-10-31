/*
 * SPDX-License-Identifier: MIT
 */

import nodemailer from 'nodemailer';

const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

const isEmailConfigured = Boolean(smtpUser && smtpPass);

const transporter = isEmailConfigured
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })
  : null;

export async function sendAlertEmail(to: string, subject: string, body: string) {
  if (!transporter) {
    return;
  }
  await transporter.sendMail({
    from: `WorkPro AI Alerts <${smtpUser}>`,
    to,
    subject,
    html: body,
  });
}
