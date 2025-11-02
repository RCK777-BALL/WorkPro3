/*
 * SPDX-License-Identifier: MIT
 */

import React, { useState } from 'react';
import type { IntegrationHook } from './types';

interface Props {
  onCreated: (hook: IntegrationHook) => void;
}

export default function HookForm({ onCreated }: Props) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/integrations/hooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type: 'webhook', url, events: ['ping'] }),
    });
    const data = (await res.json()) as IntegrationHook;
    onCreated(data);
    setName('');
    setUrl('');
  };

  return (
    <form onSubmit={submit}>
      <input placeholder="name" value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} />
      <input placeholder="url" value={url} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)} />
      <button type="submit">Register</button>
    </form>
  );
}
