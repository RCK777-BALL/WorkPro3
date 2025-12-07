/*
 * SPDX-License-Identifier: MIT
 */

import mongoose from 'mongoose';
import WorkOrder from '../../../models/WorkOrder';
import { notifyUser } from '../../../utils';
import { escalateIfNeeded } from './service';

const UPCOMING_WINDOW_MINUTES = 30;
const POLL_INTERVAL_MS = 5 * 60 * 1000;

const notifyUpcomingDeadlines = async () => {
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
      await escalateIfNeeded(wo);
    }),
  );
};

export const startWorkOrderReminderJobs = () => {
  setInterval(() => {
    notifyUpcomingDeadlines().catch(() => undefined);
  }, POLL_INTERVAL_MS);
};
