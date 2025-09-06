import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../components/layout/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../lib/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import api from '../lib/api';
import VendorsPage from '../pages/VendorsPage';

describe('VendorsPage', () => {
  beforeEach(() => {
    (api.get as any).mockReset();
    (api.post as any).mockReset();
    (api.put as any).mockReset();
    (api.delete as any).mockReset();
  });

  it('loads and displays vendors', async () => {
    (api.get as any).mockResolvedValueOnce({ data: [{ id: '1', name: 'Vendor A', contact: 'c' }] });
    render(<VendorsPage />);
    expect(await screen.findByText('Vendor A')).toBeInTheDocument();
  });

  it('deletes vendor', async () => {
    (api.get as any).mockResolvedValueOnce({ data: [{ id: '1', name: 'Vendor A', contact: 'c' }] });
    (api.delete as any).mockResolvedValueOnce({});
    render(<VendorsPage />);
    await screen.findByText('Vendor A');
    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(api.delete).toHaveBeenCalledWith('/vendors/1');
  });
});
