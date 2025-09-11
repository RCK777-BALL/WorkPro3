import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';


vi.mock('../lib/http', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import http from '@/lib/http';
import VendorsPage from '@/pages/VendorsPage';

describe('VendorsPage', () => {
  beforeEach(() => {
    (http.get as any).mockReset();
    (http.post as any).mockReset();
    (http.put as any).mockReset();
    (http.delete as any).mockReset();
  });

  it('loads and displays vendors', async () => {
    (http.get as any).mockResolvedValueOnce({ data: [{ id: '1', name: 'Vendor A', contact: 'c' }] });
    render(<VendorsPage />);
    expect(await screen.findByText('Vendor A')).toBeInTheDocument();
  });

  it('deletes vendor', async () => {
    (http.get as any).mockResolvedValueOnce({ data: [{ id: '1', name: 'Vendor A', contact: 'c' }] });
    (http.delete as any).mockResolvedValueOnce({});
    render(<VendorsPage />);
    await screen.findByText('Vendor A');
    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(http.delete).toHaveBeenCalledWith('/vendors/1');
  });
});
