/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { useMQTTStore } from '../store/mqttStore';

const MQTTConfig: React.FC = () => {
  const { url, username, password, setConfig } = useMQTTStore();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig({ [name]: value } as any);
  };

  return (
    <form className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700">Broker URL</label>
        <input
          name="url"
          value={url}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-neutral-300 rounded-md"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700">Username</label>
        <input
          name="username"
          value={username}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-neutral-300 rounded-md"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700">Password</label>
        <input
          type="password"
          name="password"
          value={password}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-neutral-300 rounded-md"
        />
      </div>
    </form>
  );
};

export default MQTTConfig;
