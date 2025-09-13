import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});
vi.mock('../lib/http', () => ({
  default: { post: vi.fn(), get: vi.fn().mockResolvedValue({ data: null }) },
}));

import Login from '../pages/Login';
import { AuthProvider } from '../context/AuthContext';
import http from '../lib/http';
import { MemoryRouter } from 'react-router-dom';

const mockedPost = http.post as unknown as Mock;

const renderLogin = () =>
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/login"]}>
        <Login />
      </MemoryRouter>
    </AuthProvider>
  );

beforeEach(() => {
  mockedPost.mockReset();
  mockNavigate.mockReset();
});

describe('Login MFA flow', () => {
  it('prompts for MFA when required', async () => {
    mockedPost.mockResolvedValueOnce({ data: { mfaRequired: true, userId: 'u1' } });

    renderLogin();

    await userEvent.type(screen.getByPlaceholderText(/Email/i), 'user@example.com');
    await userEvent.type(screen.getByPlaceholderText(/Password/i), 'pass');
    await userEvent.click(screen.getByRole('button', { name: /Login/i }));

    expect(await screen.findByText(/MFA Verification/i)).toBeInTheDocument();
  });

  it('verifies MFA code and navigates on success', async () => {
    mockedPost.mockImplementation((url: string) => {
      if (url === '/auth/login') {
        return Promise.resolve({ data: { mfaRequired: true, userId: 'u1' } });
      }
      if (url === '/auth/mfa/verify') {
        return Promise.resolve({
          data: { user: { id: 'u1', email: 'user@example.com', role: 'viewer' }, token: 't' },
        });
      }
      return Promise.reject(new Error('unknown'));
    });

    renderLogin();
    await userEvent.type(screen.getByPlaceholderText(/Email/i), 'user@example.com');
    await userEvent.type(screen.getByPlaceholderText(/Password/i), 'pass');
    await userEvent.click(screen.getByRole('button', { name: /Login/i }));
    await screen.findByText(/MFA Verification/i);

    await userEvent.type(screen.getByPlaceholderText(/One-time code/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /Verify/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('shows error on invalid MFA code', async () => {
    mockedPost.mockImplementation((url: string) => {
      if (url === '/auth/login') {
        return Promise.resolve({ data: { mfaRequired: true, userId: 'u1' } });
      }
      if (url === '/auth/mfa/verify') {
        return Promise.reject(new Error('invalid'));
      }
      return Promise.reject(new Error('unknown'));
    });

    renderLogin();
    await userEvent.type(screen.getByPlaceholderText(/Email/i), 'user@example.com');
    await userEvent.type(screen.getByPlaceholderText(/Password/i), 'pass');
    await userEvent.click(screen.getByRole('button', { name: /Login/i }));
    await screen.findByText(/MFA Verification/i);

    await userEvent.type(screen.getByPlaceholderText(/One-time code/i), '000000');
    await userEvent.click(screen.getByRole('button', { name: /Verify/i }));

    expect(await screen.findByText(/Invalid code/i)).toBeInTheDocument();
  });

  it('shows error on network failure during MFA verify', async () => {
    mockedPost.mockImplementation((url: string) => {
      if (url === '/auth/login') {
        return Promise.resolve({ data: { mfaRequired: true, userId: 'u1' } });
      }
      if (url === '/auth/mfa/verify') {
        return Promise.reject({ code: 'ERR_NETWORK', message: 'Network Error' });
      }
      return Promise.reject(new Error('unknown'));
    });

    renderLogin();
    await userEvent.type(screen.getByPlaceholderText(/Email/i), 'user@example.com');
    await userEvent.type(screen.getByPlaceholderText(/Password/i), 'pass');
    await userEvent.click(screen.getByRole('button', { name: /Login/i }));
    await screen.findByText(/MFA Verification/i);

    await userEvent.type(screen.getByPlaceholderText(/One-time code/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /Verify/i }));

    expect(await screen.findByText(/Invalid code/i)).toBeInTheDocument();
  });
});

