/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useState } from 'react';
import HookForm from './HookForm';

interface Hook {
  _id: string;
  name: string;
  type: string;
}

export default function Integrations() {
  const [hooks, setHooks] = useState<Hook[]>([]);

  useEffect(() => {
    fetch('/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ integrationHooks { _id name type } }' }),
    })
      .then((res) => res.json())
      .then((res) => setHooks(res.data.integrationHooks));
  }, []);

  return (
    <div>
      <h1>Integrations</h1>
      <HookForm onCreated={(hook) => setHooks([...hooks, hook])} />
      <ul>
        {hooks.map((h) => (
          <li key={h._id}>
            {h.name} - {h.type}
          </li>
        ))}
      </ul>
    </div>
  );
}
