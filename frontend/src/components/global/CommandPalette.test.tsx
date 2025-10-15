/*
 * SPDX-License-Identifier: MIT
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CommandPalette from './CommandPalette';
import http from '@/lib/http';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/http');

const mockedGet = http.get as unknown as ReturnType<typeof vi.fn>;

describe('CommandPalette', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('opens, searches and navigates', async () => {
    mockedGet.mockResolvedValue({
      data: [{ id: '1', name: 'Pump', type: 'asset', url: '/assets/1' }],
    });
    const navigate = vi.fn();
    render(
      <MemoryRouter>
        <CommandPalette onNavigate={navigate} />
      </MemoryRouter>,
    );

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const input = await screen.findByPlaceholderText('Search...');
    await userEvent.type(input, 'pump');

    await waitFor(() => {
      expect(mockedGet).toHaveBeenCalledWith('/search', {
        params: { q: 'pump' },
        signal: expect.any(AbortSignal),
      });
    });

    await userEvent.keyboard('{Enter}');
    expect(navigate).toHaveBeenCalledWith('/assets/1');
  });
});
