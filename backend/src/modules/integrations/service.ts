/*
 * SPDX-License-Identifier: MIT
 */

import { IncomingWebhook } from '@slack/webhook';
import nodemailer from 'nodemailer';
import twilio, { type Twilio } from 'twilio';

import logger from '../../../utils/logger';

export type NotificationProvider = 'twilio' | 'smtp' | 'slack' | 'teams';

export interface NotificationTestInput {
  provider: NotificationProvider;
  to?: string;
  subject?: string;
  message: string;
  webhookUrl?: string;
}

export interface ProviderStatus {
  id: NotificationProvider;
  label: string;
  configured: boolean;
  supportsTarget: boolean;
  docsUrl: string;
}

export interface NotificationResult {
  provider: NotificationProvider;
  deliveredAt: string;
  target?: string;
}

export class IntegrationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'IntegrationError';
    this.status = status;
  }
}

const ensureValue = (value: string | undefined, label: string, status = 400): string => {
  if (!value) {
    throw new IntegrationError(`${label} is not configured`, status);
  }
  return value;
};

const providerMeta: Record<NotificationProvider, { label: string; docsUrl: string; supportsTarget: boolean }> = {
  twilio: {
    label: 'Twilio SMS',
    docsUrl: 'https://www.twilio.com/docs/sms',
    supportsTarget: true,
  },
  smtp: {
    label: 'SMTP email',
    docsUrl: 'https://nodemailer.com/smtp/',
    supportsTarget: true,
  },
  slack: {
    label: 'Slack webhook',
    docsUrl: 'https://api.slack.com/messaging/webhooks',
    supportsTarget: false,
  },
  teams: {
    label: 'Microsoft Teams webhook',
    docsUrl: 'https://learn.microsoft.com/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook',
    supportsTarget: false,
  },
};

let cachedTwilio: Twilio | null = null;
let cachedTwilioSid: string | null = null;
let cachedTwilioToken: string | null = null;

const getTwilioClient = (sid: string, token: string): Twilio => {
  if (!cachedTwilio || cachedTwilioSid !== sid || cachedTwilioToken !== token) {
    cachedTwilio = twilio(sid, token);
    cachedTwilioSid = sid;
    cachedTwilioToken = token;
  }
  return cachedTwilio;
};

const sendViaTwilio = async (input: NotificationTestInput): Promise<NotificationResult> => {
  const to = input.to?.trim();
  if (!to) {
    throw new IntegrationError('Destination phone number is required for Twilio notifications');
  }
  const sid = ensureValue(process.env.TWILIO_ACCOUNT_SID, 'TWILIO_ACCOUNT_SID');
  const token = ensureValue(process.env.TWILIO_AUTH_TOKEN, 'TWILIO_AUTH_TOKEN');
  const from = ensureValue(process.env.TWILIO_FROM_NUMBER, 'TWILIO_FROM_NUMBER');
  const client = getTwilioClient(sid, token);
  await client.messages.create({ to, from, body: input.message });
  logger.info('Sent Twilio notification to %s', to);
  return { provider: 'twilio', deliveredAt: new Date().toISOString(), target: to };
};

const sendViaSmtp = async (input: NotificationTestInput): Promise<NotificationResult> => {
  const to = input.to?.trim();
  if (!to) {
    throw new IntegrationError('Destination email is required for SMTP notifications');
  }
  const host = ensureValue(process.env.SMTP_HOST, 'SMTP_HOST');
  const port = Number(process.env.SMTP_PORT ?? '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = ensureValue(process.env.SMTP_FROM ?? user, 'SMTP_FROM', 500);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });
  await transporter.sendMail({
    from,
    to,
    subject: input.subject ?? 'CMMS notification',
    text: input.message,
  });
  logger.info('Sent SMTP notification to %s', to);
  return { provider: 'smtp', deliveredAt: new Date().toISOString(), target: to };
};

const buildWebhookPayload = (input: NotificationTestInput) => {
  if (input.subject) {
    return `*${input.subject}*\n${input.message}`;
  }
  return input.message;
};

const sendViaSlack = async (input: NotificationTestInput): Promise<NotificationResult> => {
  const url = input.webhookUrl ?? process.env.SLACK_WEBHOOK_URL;
  if (!url) {
    throw new IntegrationError('Slack webhook URL is not configured');
  }
  const webhook = new IncomingWebhook(url);
  await webhook.send({ text: buildWebhookPayload(input) });
  logger.info('Sent Slack notification');
  return { provider: 'slack', deliveredAt: new Date().toISOString() };
};

const sendViaTeams = async (input: NotificationTestInput): Promise<NotificationResult> => {
  const url = input.webhookUrl ?? process.env.TEAMS_WEBHOOK_URL;
  if (!url) {
    throw new IntegrationError('Teams webhook URL is not configured');
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: buildWebhookPayload(input) }),
  });
  if (!response.ok) {
    throw new IntegrationError(`Teams webhook responded with status ${response.status}`, 502);
  }
  logger.info('Sent Teams notification');
  return { provider: 'teams', deliveredAt: new Date().toISOString() };
};

export const sendNotificationTest = async (
  input: NotificationTestInput,
): Promise<NotificationResult> => {
  switch (input.provider) {
    case 'twilio':
      return sendViaTwilio(input);
    case 'smtp':
      return sendViaSmtp(input);
    case 'slack':
      return sendViaSlack(input);
    case 'teams':
      return sendViaTeams(input);
    default:
      throw new IntegrationError('Unsupported provider');
  }
};

const hasAll = (...values: Array<string | undefined>) => values.every((value) => Boolean(value));

export const listNotificationProviders = (): ProviderStatus[] => [
  {
    id: 'twilio',
    label: providerMeta.twilio.label,
    docsUrl: providerMeta.twilio.docsUrl,
    supportsTarget: providerMeta.twilio.supportsTarget,
    configured: hasAll(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
      process.env.TWILIO_FROM_NUMBER,
    ),
  },
  {
    id: 'smtp',
    label: providerMeta.smtp.label,
    docsUrl: providerMeta.smtp.docsUrl,
    supportsTarget: providerMeta.smtp.supportsTarget,
    configured: Boolean(process.env.SMTP_HOST && (process.env.SMTP_FROM || process.env.SMTP_USER)),
  },
  {
    id: 'slack',
    label: providerMeta.slack.label,
    docsUrl: providerMeta.slack.docsUrl,
    supportsTarget: providerMeta.slack.supportsTarget,
    configured: Boolean(process.env.SLACK_WEBHOOK_URL),
  },
  {
    id: 'teams',
    label: providerMeta.teams.label,
    docsUrl: providerMeta.teams.docsUrl,
    supportsTarget: providerMeta.teams.supportsTarget,
    configured: Boolean(process.env.TEAMS_WEBHOOK_URL),
  },
];
