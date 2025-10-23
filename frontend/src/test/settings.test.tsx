/*
 * SPDX-License-Identifier: MIT
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';


vi.mock('../components/documentation/DocumentUploader', () => ({
  default: () => <div />,
}));

vi.mock('../components/documentation/DocumentViewer', () => ({
  default: () => <div />,
}));

vi.mock('../utils/documentation', () => ({
  parseDocument: vi.fn(),
  downloadDocument: vi.fn(),
}));

const mockAddToast = vi.fn();
vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock('../lib/http', () => ({
  default: { post: vi.fn(), get: vi.fn() },
}));

import http from '@/lib/http';
import Settings from '@/pages/Settings';

describe('Settings page', () => {
  beforeEach(() => {
    (http.post as any).mockReset();
    (http.get as any).mockReset();
    mockAddToast.mockReset();
    (http.get as any).mockResolvedValue({
      data: {
        general: {
          companyName: 'Acme Industries',
        },
        notifications: {},
        email: {},
        theme: { mode: 'light', colorScheme: 'default' },
      },
    });
  });

  it('saves settings successfully', async () => {
    (http.post as any).mockResolvedValueOnce({ data: {} });
    render(<Settings />);
    await waitFor(() => expect(http.get).toHaveBeenCalled());
    const [saveButton] = screen.getAllByRole('button', { name: /save changes/i });
    await userEvent.click(saveButton);
    expect(http.post).toHaveBeenCalledWith(
      '/settings',
      expect.objectContaining({
        general: expect.any(Object),
        notifications: expect.any(Object),
        email: expect.any(Object),
        theme: expect.objectContaining({ mode: expect.any(String) }),
      }),
    );
    expect(mockAddToast).toHaveBeenCalledWith('Settings saved', 'success');
  });

  it('handles unauthorized errors', async () => {
    (http.post as any).mockRejectedValueOnce({ response: { status: 401 } });
    render(<Settings />);
    await waitFor(() => expect(http.get).toHaveBeenCalled());
    const [saveButton] = screen.getAllByRole('button', { name: /save changes/i });
    await userEvent.click(saveButton);
    expect(mockAddToast).toHaveBeenCalledWith('Unauthorized', 'error');
  });
});
