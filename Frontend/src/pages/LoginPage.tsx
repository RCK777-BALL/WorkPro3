import React from 'react';
import { Link } from 'react-router-dom';
import LoginForm from '../components/auth/LoginForm';

const LoginPage: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-100">
    <div className="space-y-4">
      <LoginForm />
      <div className="flex justify-between text-sm">
        <Link to="/register" className="text-blue-600">Register</Link>
        <Link to="/forgot-password" className="text-blue-600">Forgot Password?</Link>
      </div>
    </div>
  </div>
);

export default LoginPage;
