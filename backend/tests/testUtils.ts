import { z } from 'zod';
import { vi } from 'vitest';

// Generic helper to cast fixtures to a desired type
export function castFixture<T>(data: unknown): T {
  return data as T;
}

// Schema and creator for work order fixtures
export const workOrderFixtureSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
});

export type WorkOrderFixture = z.infer<typeof workOrderFixtureSchema>;

export function createWorkOrderFixture(data: unknown): WorkOrderFixture {
  return workOrderFixtureSchema.parse(data);
}

// Interface for mocking socket.io instance
export interface MockIO {
  emit: ReturnType<typeof vi.fn>;
}
