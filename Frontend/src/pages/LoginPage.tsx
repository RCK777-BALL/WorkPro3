import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [mfaUser, setMfaUser] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data.mfaRequired) {
        setMfaUser(data.userId);
        return;
      }
      setUser({ ...data.user, token: data.token });
      navigate('/dashboard');
    } catch {
      setError('Login failed');
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaUser) return;
    try {
      const { data } = await api.post('/auth/mfa/verify', {
        userId: mfaUser,
        token: code,
      });
      setUser({ ...data.user, token: data.token });
      navigate('/dashboard');
    } catch {
      setError('Invalid code');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="space-y-4">
        {!mfaUser ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <h2 className="text-xl font-bold">Login</h2>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded"
              autoComplete="email"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded"
              autoComplete="current-password"
            />
            {error && <div className="text-red-500">{error}</div>}
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
              Login
            </button>
            <div className="flex flex-col space-y-2">
              <a href="/api/auth/oauth/google" className="text-blue-600">Login with Google</a>
              <a href="/api/auth/oauth/github" className="text-blue-600">Login with GitHub</a>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <h2 className="text-xl font-bold">MFA Verification</h2>
            <input
              type="text"
              placeholder="One-time code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full p-2 border rounded"
            />
            {error && <div className="text-red-500">{error}</div>}
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
              Verify
            </button>
          </form>
        )}
        <div className="flex justify-between text-sm">
          <Link to="/register" className="text-blue-600">
            Register
          </Link>
          <Link to="/forgot-password" className="text-blue-600">
            Forgot Password?
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
