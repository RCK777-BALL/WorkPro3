/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';
import HookForm from './HookForm';
import type { IntegrationHook } from './types';
import ApiKeysPanel from './ApiKeysPanel';
import WebhookSubscriptionsPanel from './WebhookSubscriptionsPanel';
import ExportsPanel from './ExportsPanel';

export default function Integrations() {
  const [hooks, setHooks] = useState<IntegrationHook[]>([]);

  useEffect(() => {
    fetch('/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ integrationHooks { _id name type } }' }),
    })
      .then((res) => res.json())
      .then((res) => {
        const hooksData = res?.data?.integrationHooks;
        setHooks(Array.isArray(hooksData) ? (hooksData as IntegrationHook[]) : []);
      });
  }, []);

  return (
    <div>
      <h1>Integrations</h1>
      <ApiKeysPanel />
      <WebhookSubscriptionsPanel />
      <ExportsPanel />
      <section>
        <h2>Integration Hooks</h2>
        <HookForm onCreated={(hook) => setHooks([...hooks, hook])} />
        <ul>
          {hooks.map((h) => (
            <li key={h._id}>
              {h.name} - {h.type}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
