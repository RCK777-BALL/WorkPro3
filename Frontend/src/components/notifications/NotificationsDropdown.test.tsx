 
import { render, screen, fireEvent } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import SocketMock from 'socket.io-mock';
import { describe, it, expect, vi } from 'vitest';

import NotificationsDropdown from './NotificationsDropdown';
import type { NotificationType } from '../../types';
import { markNotificationRead } from '../../utils/api';

let socketClient: any;
 vi.mock('../../utils/chatSocket', () => ({
 
  getChatSocket: () => socketClient,
}));

vi.mock('../../utils/api', () => ({
  markNotificationRead: vi.fn().mockResolvedValue(undefined),
}));

const sample: NotificationType = {
  id: '1',
  message: 'hi',
  type: 'info',
  read: false,
  title: '',
  createdAt: ''
};

const setup = (notifications: NotificationType[] = []) => {
  const socketServer = new SocketMock();
  socketClient = socketServer.socketClient as any;
  const onMarkRead = vi.fn();

  render(
    <MemoryRouter>
      <NotificationsDropdown
        isOpen
        notifications={notifications}
        onClose={vi.fn()}
        onMarkRead={onMarkRead}
      />
    </MemoryRouter>,
  );

  return { socketServer, onMarkRead };
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
});

