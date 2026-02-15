/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';
import type { ApiKey } from './types';

interface ApiKeysPanelProps {
  apiBase?: string;
}

export default function ApiKeysPanel({ apiBase = '/api/integrations/v2' }: ApiKeysPanelProps) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState('');
  const [rateLimitMax, setRateLimitMax] = useState('');
  const [newToken, setNewToken] = useState<string | null>(null);
  const [availableScopes, setAvailableScopes] = useState<string[]>([]);
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);

  const loadKeys = () => {
    fetch(`${apiBase}/api-keys`)
      .then((res) => res.json())
      .then((res) => setKeys(Array.isArray(res?.data) ? res.data : []));
  };

  useEffect(() => {
    loadKeys();
    fetch(`${apiBase}/api-keys/scopes`)
      .then((res) => res.json())
      .then((res) => setAvailableScopes(Array.isArray(res?.data) ? res.data : []));
  }, [apiBase]);

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((item) => item !== scope) : [...prev, scope],
    );
  };

  const scopesSummary = useMemo(() => {
    if (selectedScopes.length === 0) {
      return 'All permissions';
    }
    return selectedScopes.join(', ');
  }, [selectedScopes]);

  const createKey = async () => {
    const payload: { name: string; rateLimitMax?: number; scopes?: string[] } = { name };
    if (rateLimitMax) {
      payload.rateLimitMax = Number(rateLimitMax);
    }
    if (selectedScopes.length > 0) {
      payload.scopes = selectedScopes;
    }
    const res = await fetch(`${apiBase}/api-keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (json?.data?.apiKey) {
      setKeys([json.data.apiKey, ...keys]);
      setNewToken(json.data.token);
      setName('');
      setRateLimitMax('');
      setSelectedScopes([]);
    }
  };

  const revokeKey = async (id: string) => {
    const res = await fetch(`${apiBase}/api-keys/${id}/revoke`, { method: 'POST' });
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
        {availableScopes.length > 0 ? (
          <div>
            <p>Scopes: {scopesSummary}</p>
            <div>
              {availableScopes.map((scope) => (
                <label key={scope}>
                  <input
                    type="checkbox"
                    checked={selectedScopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                  />
                  {scope}
                </label>
              ))}
            </div>
          </div>
        ) : null}
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
            {key.scopes && key.scopes.length > 0 ? ` [${key.scopes.join(', ')}]` : ' [all scopes]'}
            <button type="button" onClick={() => revokeKey(key._id)} disabled={Boolean(key.revokedAt)}>
              Revoke
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
