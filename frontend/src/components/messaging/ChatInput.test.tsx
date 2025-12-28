/*
 * SPDX-License-Identifier: MIT
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, vi } from 'vitest';

import ChatInput from './ChatInput';

const mockAddToast = vi.fn();

type EmojiSelection = { native: string };

vi.mock('@emoji-mart/react', () => {
  return {
    __esModule: true,
    default: ({ onEmojiSelect }: { onEmojiSelect: (emoji: EmojiSelection) => void }) => (
      <button data-testid="picker" onClick={() => onEmojiSelect({ native: '😀' })} />
    ),
  };
});

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

beforeEach(() => {
  mockAddToast.mockReset();
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      categories: [],
      emojis: {},
      aliases: {},
      sheet: { cols: 1, rows: 1 },
    }),
  });
  vi.stubGlobal('fetch', fetchMock);
});

describe('ChatInput', () => {
  it('adds emoji to message on selection', async () => {
    render(<ChatInput onSendMessage={() => {}} onUploadFiles={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /insert emoji/i }));
    await waitFor(() => expect(screen.getByTestId('picker')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('picker'));
    expect(screen.getByPlaceholderText('Type a message')).toHaveValue('😀');
  });
});
