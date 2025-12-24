/*
 * SPDX-License-Identifier: MIT
 */

import crypto from 'crypto';
import WebhookSubscription from '../models/WebhookSubscription';
import WebhookDeliveryLog, { type WebhookDeliveryLogDocument } from '../models/WebhookDeliveryLog';

export const RETRY_DELAY_MS = 1000;
const MAX_RETRIES = 3;

const signPayload = (secret: string, payload: string, timestamp: string): string =>
  crypto.createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');

async function attemptDelivery({
  url,
  secret,
  body,
  attempt,
  maxAttempts,
  logId,
}: {
  url: string;
  secret: string;
  body: unknown;
  attempt: number;
  maxAttempts: number;
  logId: WebhookDeliveryLogDocument['_id'];
}): Promise<void> {
  const payload = JSON.stringify(body);
  const timestamp = new Date().toISOString();
  const signature = signPayload(secret, payload, timestamp);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Timestamp': timestamp,
        'X-Webhook-Signature': signature,
      },
      body: payload,
    });
    if (!res.ok) {
      throw new Error(`status ${res.status}`);
    }
    await WebhookDeliveryLog.findByIdAndUpdate(logId, {
      $set: {
        status: 'delivered',
        responseStatus: res.status,
        deliveredAt: new Date(),
        attempt,
      },
    });
  } catch (err) {
    const nextAttempt = attempt + 1;
    const retryable = nextAttempt <= maxAttempts;
    await WebhookDeliveryLog.findByIdAndUpdate(logId, {
      $set: {
        status: retryable ? 'retrying' : 'failed',
        responseStatus: err instanceof Error && err.message.startsWith('status ')
          ? Number(err.message.replace('status ', ''))
          : undefined,
        error: err instanceof Error ? err.message : String(err),
        attempt,
        nextAttemptAt: retryable ? new Date(Date.now() + RETRY_DELAY_MS * 2 ** (attempt - 1)) : undefined,
      },
    });

    if (retryable) {
      const delay = RETRY_DELAY_MS * 2 ** (attempt - 1);
      setTimeout(() => {
        void attemptDelivery({
          url,
          secret,
          body,
          attempt: nextAttempt,
          maxAttempts,
          logId,
        });
      }, delay);
    }
  }
}

export async function dispatchEvent<T>(event: string, data: T): Promise<void> {
  const hooks = await WebhookSubscription.find({ events: event, active: true }).lean();
  const body = { event, data };
  await Promise.all(
    hooks.map(async (hook) => {
      const log = await WebhookDeliveryLog.create({
        subscriptionId: hook._id,
        event,
        payload: body as Record<string, unknown>,
        attempt: 0,
        status: 'pending',
      });
      await attemptDelivery({
        url: hook.url,
        secret: hook.secret,
        body,
        attempt: 1,
        maxAttempts: hook.maxAttempts ?? MAX_RETRIES,
        logId: log._id,
      });
    }),
  );
}
