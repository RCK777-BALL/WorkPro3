import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    tenantId: '',
    employeeId: '',
  });
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/register', form);
      navigate('/login');
    } catch (err) {
      console.error(err);
      setError(t('auth.registrationFailed'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="max-w-md w-full space-y-4">
        <h2 className="text-xl font-bold">{t('auth.register')}</h2>
        <input
          type="text"
          name="name"
          placeholder={t('auth.name')}
          value={form.name}
          onChange={handleChange}
          className="w-full p-2 border rounded"
        />
        <input
          type="email"
          name="email"
          placeholder={t('auth.email')}
          value={form.email}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          autoComplete="email"
        />
        <input
          type="password"
          name="password"
          placeholder={t('auth.password')}
          value={form.password}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          autoComplete="new-password"
        />
        <input
          type="text"
          name="tenantId"
          placeholder={t('auth.tenantId')}
          value={form.tenantId}
          onChange={handleChange}
          className="w-full p-2 border rounded"
        />
        <input
          type="text"
          name="employeeId"
          placeholder={t('auth.employeeId')}
          value={form.employeeId}
          onChange={handleChange}
          className="w-full p-2 border rounded"
        />
        {error && <div className="text-red-500">{error}</div>}
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded w-full">
          {t('auth.register')}
        </button>
        <p className="text-sm text-center">
          {t('auth.alreadyHaveAccount')}{' '}
          <Link to="/login" className="text-blue-600">{t('auth.login')}</Link>
        </p>
      </form>
    </div>
  );
};

export default RegisterPage;
