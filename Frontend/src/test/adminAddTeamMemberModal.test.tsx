/*
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import AdminAddTeamMemberModal from '@/components/teams/AdminAddTeamMemberModal';

describe('AdminAddTeamMemberModal', () => {
  it('renders required fields and enables submit when form is valid', async () => {
    render(
      <AdminAddTeamMemberModal
        open
        canChooseRole
        inviteEnabled
        user={null}
        onClose={vi.fn()}
        onCreate={vi.fn().mockResolvedValue(undefined)}
        onEdit={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    const submit = screen.getByRole('button', { name: /create member/i });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Test Person' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/employee #/i), { target: { value: 'E-001' } });
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2026-02-18' } });
    fireEvent.change(screen.getByPlaceholderText(/temporary password/i), { target: { value: 'StrongTemp123' } });

    expect(submit).not.toBeDisabled();
  });
});

