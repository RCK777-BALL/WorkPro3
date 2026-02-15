import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});
const toastSuccess = vi.fn();
const toastError = vi.fn();
const toastPlain = vi.fn();
vi.mock('react-hot-toast', () => ({
  default: Object.assign(toastPlain, {
    success: toastSuccess,
    error: toastError,
  }),
}));

const authLoginMock = vi.fn();
const setUserMock = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    login: authLoginMock,
    setUser: setUserMock,
  }),
}));

import Login from '../pages/Login';
import { MemoryRouter } from 'react-router-dom';

const renderLogin = () =>
  render(
    <MemoryRouter initialEntries={["/login"]}>
      <Login />
    </MemoryRouter>
  );

beforeEach(() => {
  authLoginMock.mockReset();
  toastPlain.mockReset();
  toastSuccess.mockReset();
  toastError.mockReset();
  mockNavigate.mockReset();
});

describe('Login MFA flow', () => {
  it('prompts for MFA when required', async () => {
    authLoginMock.mockResolvedValueOnce({ mfaRequired: true, userId: 'u1' });

    renderLogin();

    await userEvent.type(screen.getByPlaceholderText(/Email/i), 'user@example.com');
    await userEvent.type(screen.getByPlaceholderText(/Password/i), 'pass');
    await userEvent.click(screen.getByRole('button', { name: /Sign in/i }));

    expect(toastPlain).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates on successful login', async () => {
    authLoginMock.mockResolvedValueOnce({
      user: { id: 'u1', email: 'user@example.com', role: 'tech' },
      token: 't',
    });

    renderLogin();
    await userEvent.type(screen.getByPlaceholderText(/Email/i), 'user@example.com');
    await userEvent.type(screen.getByPlaceholderText(/Password/i), 'pass');
    await userEvent.click(screen.getByRole('button', { name: /Sign in/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('shows error on invalid credentials', async () => {
    authLoginMock.mockRejectedValueOnce(new Error('Invalid credentials'));

    renderLogin();
    await userEvent.type(screen.getByPlaceholderText(/Email/i), 'user@example.com');
    await userEvent.type(screen.getByPlaceholderText(/Password/i), 'pass');
    await userEvent.click(screen.getByRole('button', { name: /Sign in/i }));

    expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/invalid credentials/i));
  });

  it('shows error on network failure during login', async () => {
    authLoginMock.mockRejectedValueOnce({ code: 'ERR_NETWORK', message: 'Network Error' });

    renderLogin();
    await userEvent.type(screen.getByPlaceholderText(/Email/i), 'user@example.com');
    await userEvent.type(screen.getByPlaceholderText(/Password/i), 'pass');
    await userEvent.click(screen.getByRole('button', { name: /Sign in/i }));

    expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/network error/i));
  });
});

