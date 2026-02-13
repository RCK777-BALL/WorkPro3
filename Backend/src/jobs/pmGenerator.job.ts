/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';
import PreventiveMaintenance from '../models/PreventiveMaintenance';
import WorkOrder from '../models/WorkOrder';
import { runJob } from './jobRunner';

const parseCadenceDays = (cron?: string): number | null => {
  if (!cron) return null;
  const match = cron.match(/\*\/([0-9]+)/);
  if (!match) return null;
  return Number(match[1]);
};

const computeNextDue = (current: Date, cron?: string): Date | null => {
  const cadenceDays = parseCadenceDays(cron);
  if (!cadenceDays) return null;
  const next = new Date(current);
  next.setDate(next.getDate() + cadenceDays);
  return next;
};

export const generatePmWorkOrders = async (): Promise<number> => {
  const now = new Date();
  let generated = 0;

  const tasks = await PreventiveMaintenance.find({ active: true }).lean();

  for (const task of tasks) {
    const assignments = task.assignments ?? [];
    for (const assignment of assignments) {
      if (!assignment.nextDue || assignment.nextDue > now) continue;
      if (assignment.lastGeneratedAt && assignment.lastGeneratedAt >= assignment.nextDue) continue;

      const existing = await WorkOrder.findOne({
        tenantId: task.tenantId,
        pmTask: task._id,
        assetId: assignment.asset,
        dueDate: assignment.nextDue,
      }).lean();

      if (existing) continue;

      await WorkOrder.create({
        tenantId: task.tenantId,
        title: `PM: ${task.title}`,
        status: 'assigned',
        priority: 'medium',
        type: 'preventive',
        assetId: assignment.asset,
        pmTask: task._id,
        dueDate: assignment.nextDue,
      });

      await PreventiveMaintenance.updateOne(
        { _id: task._id, 'assignments._id': assignment._id },
        {
          $set: {
            'assignments.$.lastGeneratedAt': now,
            'assignments.$.nextDue': computeNextDue(assignment.nextDue, task.rule?.cron ?? undefined),
          },
        },
      );

      generated += 1;
    }
  }

  return generated;
};

export const runPmGeneratorJob = async (): Promise<number | null> =>
  runJob('pm-generator', generatePmWorkOrders, 60_000);
