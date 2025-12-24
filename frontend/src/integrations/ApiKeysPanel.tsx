/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';
import type { ApiKey } from './types';

export default function ApiKeysPanel() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState('');
  const [rateLimitMax, setRateLimitMax] = useState('');
  const [newToken, setNewToken] = useState<string | null>(null);

  const loadKeys = () => {
    fetch('/api/integrations/api-keys')
      .then((res) => res.json())
      .then((res) => setKeys(res.data ?? []));
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const createKey = async () => {
    const payload: { name: string; rateLimitMax?: number } = { name };
    if (rateLimitMax) {
      payload.rateLimitMax = Number(rateLimitMax);
    }
    const res = await fetch('/api/integrations/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (json?.data) {
      setKeys([json.data, ...keys]);
      setNewToken(json.token);
      setName('');
      setRateLimitMax('');
    }
  };

  const revokeKey = async (id: string) => {
    const res = await fetch(`/api/integrations/api-keys/${id}/revoke`, { method: 'POST' });
    const json = await res.json();
    if (json?.data) {
      setKeys(keys.map((key) => (key._id === id ? json.data : key)));
    }
  };

  return (
    <section>
      <h2>API Keys</h2>
      <div>
        <input
          placeholder="Key name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <input
          placeholder="Rate limit max"
          value={rateLimitMax}
          onChange={(event) => setRateLimitMax(event.target.value)}
        />
        <button type="button" onClick={createKey} disabled={!name.trim()}>
          Create key
        </button>
      </div>
      {newToken ? (
        <p>
          New key token: <strong>{newToken}</strong>
        </p>
      ) : null}
      <ul>
        {keys.map((key) => (
          <li key={key._id}>
            {key.name} ({key.prefix}...) - {key.revokedAt ? 'Revoked' : 'Active'}
            <button type="button" onClick={() => revokeKey(key._id)} disabled={Boolean(key.revokedAt)}>
              Revoke
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
