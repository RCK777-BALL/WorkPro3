/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import GlobalSearch from '@/components/GlobalSearch';

function Wrapper() {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  return (
    <MemoryRouter>
      <GlobalSearch open={open} onOpenChange={setOpen} />
    </MemoryRouter>
  );
}

describe('GlobalSearch', () => {
  it('opens with keyboard and performs search', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ json: async () => [{ id: 'a1', name: 'Pump' }] })
      .mockResolvedValueOnce({ json: async () => [{ id: 'w1', title: 'Fix Pump' }] });

    render(<Wrapper />);

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    const input = await screen.findByPlaceholderText('Search...');
    await user.type(input, 'pump');

    expect(fetch).toHaveBeenCalledWith('/api/assets?search=pump');
    expect(fetch).toHaveBeenCalledWith('/api/workorders?search=pump');

    expect(await screen.findByText('Pump')).toBeInTheDocument();
    expect(await screen.findByText('Fix Pump')).toBeInTheDocument();
  });
});
