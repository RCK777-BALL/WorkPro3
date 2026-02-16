/*
 * SPDX-License-Identifier: MIT
 */

import { IncomingWebhook } from '@slack/webhook';
import nodemailer from 'nodemailer';
import twilio from 'twilio';

import ApiKey from '../../../models/ApiKey';
import logger from '../../../utils/logger';
import { generateApiKey } from '../../../utils/apiKeys';
import type { Permission } from '../../../shared/permissions';

export type NotificationProvider = 'twilio' | 'smtp' | 'outlook' | 'slack' | 'teams';
export type AccountingProvider = 'quickbooks' | 'xero';

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

export interface AccountingSyncResult {
  provider: AccountingProvider;
  target: 'vendors' | 'purchaseOrders' | 'costs';
  status: 'stubbed';
  itemsProcessed: number;
  message: string;
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
  outlook: {
    label: 'Outlook email',
    docsUrl: 'https://learn.microsoft.com/exchange/clients-and-mobile-in-exchange-online/authenticated-client-smtp-submission',
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

type TwilioClient = ReturnType<typeof twilio>;

let cachedTwilio: TwilioClient | null = null;
let cachedTwilioSid: string | null = null;
let cachedTwilioToken: string | null = null;

const getTwilioClient = (sid: string, token: string): TwilioClient => {
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

const sendViaOutlook = async (input: NotificationTestInput): Promise<NotificationResult> => {
  const to = input.to?.trim();
  if (!to) {
    throw new IntegrationError('Destination email is required for Outlook notifications');
  }
  const host = process.env.OUTLOOK_SMTP_HOST || 'smtp.office365.com';
  const port = Number(process.env.OUTLOOK_SMTP_PORT ?? '587');
  const user = process.env.OUTLOOK_SMTP_USER ?? process.env.SMTP_USER;
  const pass = process.env.OUTLOOK_SMTP_PASS ?? process.env.SMTP_PASS;
  const from = process.env.OUTLOOK_SMTP_FROM ?? process.env.SMTP_FROM ?? user;
  if (!from) {
    throw new IntegrationError('OUTLOOK_SMTP_FROM is not configured', 500);
  }
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
  logger.info('Sent Outlook notification to %s', to);
  return { provider: 'outlook', deliveredAt: new Date().toISOString(), target: to };
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
    case 'outlook':
      return sendViaOutlook(input);
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
    id: 'outlook',
    label: providerMeta.outlook.label,
    docsUrl: providerMeta.outlook.docsUrl,
    supportsTarget: providerMeta.outlook.supportsTarget,
    configured: Boolean(
      (process.env.OUTLOOK_SMTP_FROM || process.env.OUTLOOK_SMTP_USER || process.env.SMTP_FROM || process.env.SMTP_USER) &&
        (process.env.OUTLOOK_SMTP_HOST || process.env.SMTP_HOST),
    ),
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

export interface ApiKeyCreateInput {
  tenantId: string;
  name: string;
  createdBy?: string;
  rateLimitMax?: number;
  scopes?: Permission[];
}

export const listApiKeys = async (tenantId: string) =>
  ApiKey.find({ tenantId }).sort({ createdAt: -1 }).lean();

export const createApiKey = async ({
  tenantId,
  name,
  createdBy,
  rateLimitMax,
  scopes,
}: ApiKeyCreateInput): Promise<{ apiKey: Record<string, unknown>; token: string }> => {
  const generated = generateApiKey();
  const key = await ApiKey.create({
    name,
    keyHash: generated.keyHash,
    prefix: generated.prefix,
    tenantId,
    createdBy,
    rateLimitMax,
    scopes,
  });
  const keyPayload = key.toObject() as unknown as Record<string, unknown>;
  delete (keyPayload as { keyHash?: string }).keyHash;
  return {
    apiKey: keyPayload,
    token: generated.key,
  };
};

export const revokeApiKey = async (tenantId: string, id: string) =>
  ApiKey.findOneAndUpdate({ _id: id, tenantId }, { revokedAt: new Date() }, { returnDocument: 'after' });

const buildAccountingResult = (
  provider: AccountingProvider,
  target: AccountingSyncResult['target'],
  payload?: unknown,
): AccountingSyncResult => {
  const itemsProcessed = Array.isArray((payload as any)?.items)
    ? (payload as any).items.length
    : Array.isArray(payload)
      ? payload.length
      : 0;

  const message =
    target === 'vendors'
      ? 'Vendor sync stub executed'
      : target === 'purchaseOrders'
        ? 'Purchase order sync stub executed'
        : 'Cost sync stub executed';

  logger.info('[Integrations] %s %s sync stub invoked', provider, target);
  return {
    provider,
    target,
    status: 'stubbed',
    itemsProcessed,
    message,
  };
};

export const syncVendorsWithAccounting = (
  provider: AccountingProvider,
  payload?: unknown,
): AccountingSyncResult => buildAccountingResult(provider, 'vendors', payload);

export const syncPurchaseOrdersWithAccounting = (
  provider: AccountingProvider,
  payload?: unknown,
): AccountingSyncResult => buildAccountingResult(provider, 'purchaseOrders', payload);

export const syncCostsWithAccounting = (
  provider: AccountingProvider,
  payload?: unknown,
): AccountingSyncResult => buildAccountingResult(provider, 'costs', payload);
