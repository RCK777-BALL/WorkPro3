/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import BootstrapSetupPage from '@/modules/admin/setup';

vi.mock('@/lib/api', () => ({
  api: { post: vi.fn().mockResolvedValue({ data: { rotated: true } }) },
  getErrorMessage: () => 'error',
}));

const routerFuture = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;

describe('BootstrapSetupPage', () => {
  it('renders secret and submits rotation payload', async () => {
    render(
      <MemoryRouter
        future={routerFuture}
        initialEntries={[{ pathname: '/admin/setup', state: { rotationToken: 'token-1', mfaSecret: 'SECRET123' } }]}
      >
        <Routes>
          <Route path="/admin/setup" element={<BootstrapSetupPage />} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Rotate default credentials/i)).toBeInTheDocument();
    expect(screen.getByText(/SECRET123/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/New password/i), { target: { value: 'StrongPass!1234' } });
    fireEvent.change(screen.getByLabelText(/Confirm password/i), { target: { value: 'StrongPass!1234' } });
    fireEvent.change(screen.getByLabelText(/MFA code/i), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Complete rotation/i }));

    await waitFor(() => {
      expect(screen.getByText(/Login page/i)).toBeInTheDocument();
    });
  });
});

