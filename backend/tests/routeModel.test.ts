import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import Route from '../models/Route';

describe('Route model', () => {
  it('preserves task order', () => {
    const tenantId = new mongoose.Types.ObjectId();
    const route = new Route({
      name: 'Route A',
      tenantId,
      stationTasks: [
        { station: new mongoose.Types.ObjectId(), task: 'Inspect', order: 1 },
        { station: new mongoose.Types.ObjectId(), task: 'Clean', order: 2 },
      ],
    });

    expect(route.stationTasks[0].order).toBe(1);
    expect(route.stationTasks[1].order).toBe(2);
  });
});
