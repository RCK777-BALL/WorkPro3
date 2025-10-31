/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { safeLocalStorage } from '@/utils/safeLocalStorage';

export default function VendorLogin() {
  const [token, setToken] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    safeLocalStorage.setItem('vendorToken', token.trim());
    navigate('/vendor/pos');
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl mb-4">Vendor Login</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          type="text"
          className="input input-bordered"
          placeholder="Access token"
          value={token}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setToken(e.target.value)}
        />
        <button type="submit" className="btn-primary">
          Login
        </button>
      </form>
    </div>
  );
}

