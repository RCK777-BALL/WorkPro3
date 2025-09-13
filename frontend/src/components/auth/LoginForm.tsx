/*
 * SPDX-License-Identifier: MIT
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';


const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const { addToast } = useToast();

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    try {
      await authLogin(email, password);
      navigate('/dashboard');
    } catch (err) {
      if (err instanceof Error && err.message === 'Invalid credentials') {
        setError(err.message);
      } else {
        setError('Server error. Please try again.');
        addToast('Server error. Please try again.', 'error');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto mt-10 space-y-4">
      <h2 className="text-xl font-bold">Login</h2>
      <label htmlFor="email" className="block">
        <span className="sr-only">Email</span>
        <input
          id="email"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          className="w-full p-2 border rounded"
          autoComplete="email"
        />
      </label>
      <label htmlFor="password" className="block">
        <span className="sr-only">Password</span>
        <input
          id="password"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          className="w-full p-2 border rounded"
          autoComplete="current-password"
        />
      </label>
      {error && <div className="text-red-500">{error}</div>}
      <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded">
        Login
      </button>
    </form>
  );
};

export default LoginForm;
