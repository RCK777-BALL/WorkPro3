/*
 * SPDX-License-Identifier: MIT
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import type { Emoji } from '@emoji-mart/react';

import ChatInput from './ChatInput';

vi.mock('@emoji-mart/react', () => {
  return {
    __esModule: true,
    default: ({ onEmojiSelect }: { onEmojiSelect: (emoji: Emoji) => void }) => (
      <button data-testid="picker" onClick={() => onEmojiSelect({ native: '😀' } as Emoji)} />
    ),
  };
});

describe('ChatInput', () => {
  it('adds emoji to message on selection', () => {
    render(<ChatInput onSendMessage={() => {}} onUploadFiles={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /insert emoji/i }));
    fireEvent.click(screen.getByTestId('picker'));
    expect(screen.getByPlaceholderText('Type a message...')).toHaveValue('😀');
  });
});

