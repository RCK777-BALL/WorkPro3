import crypto from 'crypto';
import Webhook from '../models/Webhook';

export const RETRY_DELAY_MS = 1000;
const MAX_RETRIES = 3;

async function sendWithRetry(
  url: string,
  body: unknown,
  secret: string,
  attempt = 0,
): Promise<void> {
  const payload = JSON.stringify(body);
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
      },
      body: payload,
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
  } catch (_err) {
    if (attempt < MAX_RETRIES) {
      setTimeout(() => {
        void sendWithRetry(url, body, secret, attempt + 1);
      }, RETRY_DELAY_MS);
    }
  }
}

export async function dispatchEvent(event: string, data: any): Promise<void> {
  const hooks = await Webhook.find({ event }).lean();
  const body = { event, data };
  await Promise.all(hooks.map((h) => sendWithRetry(h.url, body, h.secret)));
}
