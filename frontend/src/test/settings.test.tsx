/*
 * SPDX-License-Identifier: MIT
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';


vi.mock('../components/documentation/DocumentUploader', () => ({
  default: () => <div />,
}));

vi.mock('../components/documentation/DocumentViewer', () => ({
  default: () => <div />,
}));

const { mockParseDocument, mockAddToast } = vi.hoisted(() => ({
  mockParseDocument: vi.fn(),
  mockAddToast: vi.fn(),
}));

vi.mock('../utils/documentation', () => ({
  parseDocument: mockParseDocument,
  downloadDocument: vi.fn(),
  getMimeTypeForType: vi.fn(() => 'application/pdf'),
}));

vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock('../lib/http', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    defaults: { baseURL: 'http://localhost:5010/api' },
  },
}));

import http from '@/lib/http';
import Settings from '@/pages/Settings';
import { ThemeProvider } from '@/context/ThemeContext';

const renderSettings = () =>
  render(
    <ThemeProvider>
      <Settings />
    </ThemeProvider>,
  );

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi
      .fn()
      .mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
  });
});

describe('Settings page', () => {
  beforeEach(() => {
    (http.post as any).mockReset();
    (http.get as any).mockReset();
    (http.delete as any).mockReset();
    mockAddToast.mockReset();
    (http.get as any).mockImplementation(async (url: string) => {
      if (url === '/documents') {
        return { data: [] };
      }

      return {
        data: {
          general: {
            companyName: 'Acme Industries',
          },
          notifications: {},
          email: {},
          theme: { mode: 'light', colorScheme: 'default' },
        },
      };
    });
  });

  it('saves settings successfully', async () => {
    (http.post as any).mockResolvedValueOnce({ data: {} });
    renderSettings();
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
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderSettings();
    await waitFor(() => expect(http.get).toHaveBeenCalled());
    const [saveButton] = screen.getAllByRole('button', { name: /save changes/i });
    await userEvent.click(saveButton);
    expect(mockAddToast).toHaveBeenCalledWith('Unauthorized', 'error');
    errorSpy.mockRestore();
  });

  it('falls back to defaults when the settings endpoint is missing', async () => {
    (http.get as any).mockImplementation((url: string) => {
      if (url === '/documents') {
        return Promise.resolve({ data: [] });
      }

      const error = new Error('Not Found') as Error & { response?: { status?: number } };
      error.response = { status: 404 };
      return Promise.reject(error);
    });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    renderSettings();

    await waitFor(() => {
      expect(screen.queryByText(/loading your saved settings/i)).not.toBeInTheDocument();
    });

    expect(mockAddToast).not.toHaveBeenCalledWith('Failed to load settings', 'error');
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('clears the loading state when the settings request fails', async () => {
    (http.get as any).mockImplementation((url: string) => {
      if (url === '/documents') {
        return Promise.resolve({ data: [] });
      }

      const error = new Error('Internal Server Error') as Error & {
        response?: { status?: number };
      };
      error.response = { status: 500 };
      return Promise.reject(error);
    });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderSettings();

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith('Failed to load settings', 'error');
      expect(screen.queryByText(/loading your saved settings/i)).not.toBeInTheDocument();
    });
    errorSpy.mockRestore();
  });
});
