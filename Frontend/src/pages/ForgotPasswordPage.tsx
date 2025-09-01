import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    try {
      await api.post('/auth/password/reset', { email });
      setMessage('If the email is registered, a reset link has been sent.');
    } catch (err) {
      console.error(err);
      setMessage('Failed to send reset email');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="max-w-md w-full space-y-4">
        <h2 className="text-xl font-bold">Reset Password</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border rounded"
          autoComplete="email"
        />
        {message && <div className="text-green-600">{message}</div>}
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded w-full">
          Send Reset Link
        </button>
        <p className="text-sm text-center">
          <Link to="/login" className="text-blue-600">Back to Login</Link>
        </p>
      </form>
    </div>
  );
};

export default ForgotPasswordPage;
