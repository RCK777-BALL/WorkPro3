/*
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';

const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock('@/lib/http', () => ({
  default: {
    get: getMock,
    post: postMock,
  },
}));

import CommentThread from '../CommentThread';

describe('CommentThread', () => {
  it('renders existing comments and matches snapshot', async () => {
    getMock.mockImplementation((url: string) => {
      if (url.startsWith('/comments')) {
        return Promise.resolve({
          data: {
            items: [
              {
                id: 'c1',
                threadId: 'WO:wo-1',
                content: 'Hello @{Jane Doe|507f1f77bcf86cd799439011}',
                mentions: ['507f1f77bcf86cd799439011'],
                createdAt: '2024-01-01T00:00:00.000Z',
                user: { id: 'u1', name: 'Author', email: 'author@example.com' },
              },
            ],
            total: 1,
            page: 1,
            pageSize: 10,
          },
        });
      }
      return Promise.resolve({ data: [] });
    });
    postMock.mockResolvedValue({
      data: {
        id: 'c2',
        threadId: 'WO:wo-1',
        content: 'New comment',
        mentions: [],
        createdAt: '2024-01-02T00:00:00.000Z',
      },
    });

    const { container } = render(<CommentThread entityType="WO" entityId="wo-1" />);

    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument();
    });

    expect(container).toMatchSnapshot();
  });
});
