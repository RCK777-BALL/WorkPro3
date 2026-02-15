/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';
import type { WebhookSubscription } from './types';

interface WebhookSubscriptionsPanelProps {
  apiBase?: string;
}

export default function WebhookSubscriptionsPanel({ apiBase = '/api/webhooks/v2' }: WebhookSubscriptionsPanelProps) {
  const [hooks, setHooks] = useState<WebhookSubscription[]>([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState('');
  const [newSecret, setNewSecret] = useState<string | null>(null);

  const loadHooks = () => {
    fetch(`${apiBase}/subscriptions`)
      .then((res) => res.json())
      .then((res) => setHooks(Array.isArray(res?.data) ? res.data : []));
  };

  useEffect(() => {
    loadHooks();
  }, [apiBase]);

  const createHook = async () => {
    const payload = {
      name,
      url,
      events: events
        .split(',')
        .map((event) => event.trim())
        .filter(Boolean),
    };
    const res = await fetch(`${apiBase}/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (json?.data?.subscription) {
      setHooks([json.data.subscription, ...hooks]);
      setNewSecret(json.data.secret ?? null);
      setName('');
      setUrl('');
      setEvents('');
    }
  };

  const deleteHook = async (id: string) => {
    const res = await fetch(`${apiBase}/subscriptions/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setHooks(hooks.filter((hook) => hook._id !== id));
    }
  };

  return (
    <section>
      <h2>Webhook Subscriptions</h2>
      <div>
        <input
          placeholder="Webhook name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <input
          placeholder="Webhook URL"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
        <input
          placeholder="Events (comma separated)"
          value={events}
          onChange={(event) => setEvents(event.target.value)}
        />
        <button type="button" onClick={createHook} disabled={!name.trim() || !url.trim()}>
          Create webhook
        </button>
      </div>
      {newSecret ? (
        <p>
          New webhook secret: <strong>{newSecret}</strong>
        </p>
      ) : null}
      <ul>
        {hooks.map((hook) => (
          <li key={hook._id}>
            {hook.name} - {hook.url} ({Array.isArray(hook.events) ? hook.events.join(', ') : ''})
            <button type="button" onClick={() => deleteHook(hook._id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
