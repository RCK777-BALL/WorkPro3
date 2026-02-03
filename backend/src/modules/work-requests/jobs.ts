/*
 * SPDX-License-Identifier: MIT
 */

import mongoose from 'mongoose';
import WorkRequest from '../../../models/WorkRequest';
import { notifyUser } from '../../../utils';
import { runWithJobLock } from '../../../utils/jobLock';

const POLL_INTERVAL_MS = 5 * 60 * 1000;
const UPCOMING_WINDOW_MINUTES = 30;

const notifyUpcomingDeadlines = async () => {
  const now = Date.now();
  const windowEnd = new Date(now + UPCOMING_WINDOW_MINUTES * 60 * 1000);
  const items = await WorkRequest.find({
    $or: [
      { slaResponseDueAt: { $lte: windowEnd }, slaRespondedAt: { $exists: false } },
      { slaResolveDueAt: { $lte: windowEnd }, slaResolvedAt: { $exists: false } },
    ],
  }).limit(100);

  await Promise.all(
    items.map(async (request) => {
      const { approvalSteps, currentApprovalStep } = request;
      if (approvalSteps?.length) {
        const active = approvalSteps.find((step) => step.step === currentApprovalStep);
        if (active?.approver) {
          await notifyUser(active.approver, `${request.title} needs approval`, {
            title: 'Request approval needed',
          }).catch(() => undefined);
        }
      }

      const owners = (request.slaEscalations ?? [])
        .flatMap((rule) => rule.escalateTo ?? [])
        .filter(Boolean)
        .map((id) => (typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id));

      await Promise.all(
        owners.map((userId) =>
          notifyUser(userId, `${request.title} is nearing its SLA window`, { title: 'SLA deadline approaching' }).catch(() =>
            undefined,
          ),
        ),
      );
    }),
  );
};

export const startWorkRequestReminderJobs = () => {
  setInterval(() => {
    const ttlMs = parseInt(process.env.REMINDER_JOB_LOCK_TTL_MS ?? process.env.JOB_LOCK_TTL_MS ?? '600000', 10);
    runWithJobLock('work-requests-reminders', ttlMs, async () => {
      await notifyUpcomingDeadlines();
    }).catch(() => undefined);
  }, POLL_INTERVAL_MS);
};
