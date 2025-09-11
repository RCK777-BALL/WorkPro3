/*
 * SPDX-License-Identifier: MIT
 */

import IntegrationHook from '../models/IntegrationHook';

export async function registerHook(data: {
  name: string;
  type: 'webhook' | 'sap' | 'powerbi';
  url?: string;
  events: string[];
}) {
  return IntegrationHook.create(data);
}

export async function dispatchEvent(event: string, payload: unknown) {
  const hooks = await IntegrationHook.find({ events: event });
  for (const hook of hooks) {
    if (hook.type === 'webhook' && hook.url) {
      await fetch(hook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, payload }),
      });
    } else if (hook.type === 'sap') {
      await sendToSap(event, payload);
    } else if (hook.type === 'powerbi') {
      await sendToPowerBi(event, payload);
    }
  }
}

export async function sendToSap(event: string, payload: unknown) {
  // stub connector
  return { event, payload };
}

export async function sendToPowerBi(event: string, payload: unknown) {
  // stub connector
  return { event, payload };
}
