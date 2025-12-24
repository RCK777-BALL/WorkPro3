/*
 * SPDX-License-Identifier: MIT
 */

 
import { render, screen, fireEvent } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import SocketMock from 'socket.io-mock';
import { describe, it, expect, vi } from 'vitest';

import NotificationsDropdown from './NotificationsDropdown';
import type { NotificationType } from '@/types';
import { markNotificationRead } from '@/api/notifications';

let socketClient: any;

vi.mock('../../utils/notificationsSocket', () => ({
  getNotificationsSocket: () => socketClient,
}));

vi.mock('../../api/notifications', () => ({
  markNotificationRead: vi.fn().mockResolvedValue(undefined),
}));

const sample: NotificationType = {
  id: '1',
  message: 'hi',
  type: 'info',
  read: false,
  title: '',
  createdAt: '',
  category: 'updated',
  deliveryState: 'pending',
};

const setup = (
  notifications: NotificationType[] = [],
  props: Record<string, unknown> = {},
) => {
  const socketServer = new SocketMock();
  socketClient = socketServer.socketClient as any;
  const onMarkRead = vi.fn();

  const utils = render(
    <MemoryRouter>
      <NotificationsDropdown
        isOpen
        notifications={notifications}
        onClose={vi.fn()}
        onMarkRead={onMarkRead}
        {...props}
      />
    </MemoryRouter>,
  );

  return { socketServer, onMarkRead, ...utils };
};

describe('NotificationsDropdown', () => {
  it('shows unread count and marks notifications as read', () => {
    const { onMarkRead } = setup([sample]);
    expect(screen.getByTestId('unread-count').textContent).toBe('1');
    fireEvent.click(screen.getByTestId('notification'));
    expect(onMarkRead).toHaveBeenCalledWith('1');
  });

  it('reverts read state if API call fails', async () => {
    (markNotificationRead as any).mockRejectedValueOnce(new Error('fail'));
    setup([sample]);
    const notif = screen.getByTestId('notification');
    await act(async () => {
      fireEvent.click(notif);
    });
    expect(screen.getByTestId('unread-count').textContent).toBe('1');
  });

  it('updates when new notification arrives via socket', () => {
    const { socketServer } = setup();
    expect(screen.getByTestId('unread-count').textContent).toBe('0');
    act(() => {
      socketServer.emit('notification', {
        id: '2',
        message: 'new',
        type: 'info',
        read: false,
      });
    });
    expect(screen.getByTestId('unread-count').textContent).toBe('1');
  });

  it('does not subscribe when liveData is false', () => {
    const { socketServer } = setup([], { liveData: false });
    act(() => {
      socketServer.emit('notification', {
        id: '3',
        message: 'ignored',
        type: 'info',
        read: false,
      });
    });
    expect(screen.getByTestId('unread-count').textContent).toBe('0');
  });
});
