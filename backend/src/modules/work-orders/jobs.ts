/*
 * SPDX-License-Identifier: MIT
 */

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
        await notifyUser(wo.assignedTo.toString(), {
          title: 'SLA deadline approaching',
          body: `${wo.title} is approaching its SLA window`,
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
