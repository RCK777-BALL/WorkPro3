import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../components/layout/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../components/documentation/DocumentUploader', () => ({
  default: () => <div />,
}));

vi.mock('../components/documentation/DocumentViewer', () => ({
  default: () => <div />,
}));

const mockAddToast = vi.fn();
vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock('../lib/http', () => ({
  default: { post: vi.fn() },
}));

import http from '../lib/http';
import Settings from '../pages/Settings';

describe('Settings page', () => {
  beforeEach(() => {
    (http.post as any).mockReset();
    mockAddToast.mockReset();
  });

  it('saves settings successfully', async () => {
    (http.post as any).mockResolvedValueOnce({ data: {} });
    render(<Settings />);
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));
    expect(http.post).toHaveBeenCalledWith('/settings', expect.any(Object));
    expect(mockAddToast).toHaveBeenCalledWith('Settings saved', 'success');
  });

  it('handles unauthorized errors', async () => {
    (http.post as any).mockRejectedValueOnce({ response: { status: 401 } });
    render(<Settings />);
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));
    expect(mockAddToast).toHaveBeenCalledWith('Unauthorized', 'error');
  });
});
