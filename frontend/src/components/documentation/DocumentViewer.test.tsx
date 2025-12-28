/*
 * SPDX-License-Identifier: MIT
 */

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import DocumentViewer from './DocumentViewer';

type NavigatorWithShare = Omit<Navigator, 'share' | 'clipboard'> & {
  share?: (data: ShareData) => Promise<void>;
  clipboard?: Navigator['clipboard'] & { writeText?: (text: string) => Promise<void> };
};

type ShareData = {
  title?: string;
  text?: string;
  url?: string;
};

const mockAddToast = vi.fn();

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

describe('DocumentViewer share flow', () => {
  const originalShare = (navigator as NavigatorWithShare).share;
  const originalClipboard = (navigator as NavigatorWithShare).clipboard;

  beforeEach(() => {
    mockAddToast.mockReset();
  });

  afterEach(() => {
    cleanup();
    const nav = navigator as NavigatorWithShare;
    if (originalShare) {
      Object.defineProperty(nav, 'share', {
        configurable: true,
        value: originalShare,
      });
    } else {
      delete nav.share;
    }

    if (originalClipboard) {
      Object.defineProperty(nav, 'clipboard', {
        configurable: true,
        value: originalClipboard,
      });
    } else {
      delete nav.clipboard;
    }
  });

  const defaultProps = {
    content: 'Document content',
    metadata: {
      title: 'Test Document',
      type: 'pdf' as const,
      mimeType: 'application/pdf',
      size: 1024,
      lastModified: new Date(),
    },
    onDownload: vi.fn(),
    onDelete: vi.fn(),
  };

  it('invokes Web Share API when available', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: shareMock,
    });

    render(<DocumentViewer {...defaultProps} />);
    await userEvent.click(screen.getByRole('button', { name: /share document/i }));

    await waitFor(() => {
      expect(shareMock).toHaveBeenCalledWith(expect.objectContaining({
        title: defaultProps.metadata.title,
      }));
      expect(mockAddToast).toHaveBeenCalledWith('Share dialog opened', 'success');
    });
  });

  it('copies share link when Web Share API is unavailable', async () => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: undefined,
    });
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: writeTextMock },
    });

    render(<DocumentViewer {...defaultProps} />);
    await userEvent.click(screen.getByRole('button', { name: /share document/i }));

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(expect.stringMatching(/documentation$/));
      expect(mockAddToast).toHaveBeenCalledWith('Share link copied to clipboard', 'success');
    });
  });
});
