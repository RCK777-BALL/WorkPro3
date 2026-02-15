/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import Login from '@/pages/Login';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ErrorFallback from '@/components/common/ErrorFallback';
import i18n from '@/i18n';

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    login: async () => ({ user: { id: 'u1', role: 'tech' }, token: 't' }),
    setUser: () => undefined,
  }),
}));

describe('i18n integration', () => {
  it('renders Login controls', async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </I18nextProvider>
    );

    expect(screen.getByRole('button', { name: /Sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Google Workspace/i })).toBeInTheDocument();
  });

  it('renders ForgotPasswordPage translations', async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <ForgotPasswordPage />
        </MemoryRouter>
      </I18nextProvider>
    );

    expect(screen.getByText('Reset Password')).toBeInTheDocument();
    i18n.changeLanguage('es');
    expect(await screen.findByText('Restablecer contraseña')).toBeInTheDocument();
    i18n.changeLanguage('en');
  });

  it('renders ErrorFallback translations', async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <ErrorFallback error={new Error('Boom')} resetErrorBoundary={() => {}} />
      </I18nextProvider>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    i18n.changeLanguage('es');
    expect(await screen.findByText('Algo salió mal')).toBeInTheDocument();
    i18n.changeLanguage('en');
  });
});

