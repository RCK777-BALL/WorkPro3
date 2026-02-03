/*
 * SPDX-License-Identifier: MIT
 */

import mongoose from 'mongoose';
import WorkOrder from '../../../models/WorkOrder';
import { notifyUser } from '../../../utils';
import { evaluateSla, markSlaBreach } from './service';
import { runWithJobLock } from '../../../utils/jobLock';

const UPCOMING_WINDOW_MINUTES = 30;
const POLL_INTERVAL_MS = 5 * 60 * 1000;

export const detectUpcomingDeadlines = async () => {
  const now = Date.now();
  const windowEnd = new Date(now + UPCOMING_WINDOW_MINUTES * 60 * 1000);

  const workOrders = await WorkOrder.find({
    $or: [
      { slaResponseDueAt: { $lte: windowEnd }, slaRespondedAt: { $exists: false } },
      { slaResolveDueAt: { $lte: windowEnd }, status: { $ne: 'completed' } },
    ],
  }).limit(100);

  await Promise.all(
    workOrders.map(async (wo) => {
      if (wo.assignedTo) {
        const assignedToId =
          typeof wo.assignedTo === 'string'
            ? new mongoose.Types.ObjectId(wo.assignedTo)
            : wo.assignedTo;

        await notifyUser(assignedToId, `${wo.title} is approaching its SLA window`, {
          title: 'SLA deadline approaching',
        }).catch(() => undefined);
      }
    }),
  );
};

export const processBreachedSlas = async () => {
  const now = new Date();

  const breached = await WorkOrder.find({
    $or: [
      { slaResponseDueAt: { $lte: now }, slaRespondedAt: { $exists: false } },
      { slaResolveDueAt: { $lte: now }, slaResolvedAt: { $exists: false }, status: { $ne: 'completed' } },
    ],
  }).limit(100);

  await Promise.all(
    breached.map(async (wo) => {
      const evaluation = evaluateSla(wo, now);
      if (!evaluation.trigger) return;
      await markSlaBreach(wo, evaluation.trigger);
    }),
  );
};

export const startWorkOrderReminderJobs = () => {
  setInterval(() => {
    const ttlMs = parseInt(process.env.REMINDER_JOB_LOCK_TTL_MS ?? process.env.JOB_LOCK_TTL_MS ?? '600000', 10);
    runWithJobLock('work-orders-reminders', ttlMs, async () => {
      await detectUpcomingDeadlines();
      await processBreachedSlas();
    }).catch(() => undefined);
  }, POLL_INTERVAL_MS);
};
