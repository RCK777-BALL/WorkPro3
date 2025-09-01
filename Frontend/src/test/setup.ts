import '@testing-library/jest-dom';
import { vi, expect } from 'vitest';
import { toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

// Mock environment variables
vi.mock('../utils/env', () => ({
  config: {
    apiUrl: 'http://localhost:3000',
  },
}));

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
}));
