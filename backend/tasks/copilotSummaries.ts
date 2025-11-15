/*
 * SPDX-License-Identifier: MIT
 */

import cron from 'node-cron';
import WorkOrder from '../models/WorkOrder';
import WorkHistory from '../models/WorkHistory';
import logger from '../utils/logger';
import { detectFailureModes, mergeFailureModes, summarizeComments } from '../services/copilotRag';

const DEFAULT_CRON = '*/30 * * * *';
const BATCH_SIZE = Number(process.env.COPILOT_SUMMARY_BATCH ?? '15');

let scheduled: ReturnType<typeof cron.schedule> | null = null;

export async function runCopilotSummaryJob(): Promise<void> {
  const match = {
    $or: [
      { copilotSummary: { $exists: false } },
      { copilotSummary: '' },
      { failureModeTags: { $exists: false } },
      { failureModeTags: { $size: 0 } },
    ],
  };

  const pending = await WorkOrder.find(match)
    .sort({ updatedAt: -1 })
    .limit(BATCH_SIZE)
    .select('title description failureCode copilotSummary failureModeTags tenantId assetId');

  if (!pending.length) {
    return;
  }

  await Promise.all(
    pending.map(async (order) => {
      const histories = await WorkHistory.find({ workOrder: order._id })
        .select('recentWork actions')
        .lean();

      const comments: string[] = [];
      if (order.description) {
        comments.push(order.description);
      }
      histories.forEach((history) => {
        if (history.actions) {
          comments.push(history.actions);
        }
        history.recentWork?.forEach((entry) => {
          if (entry.notes) {
            comments.push(entry.notes);
          } else if (entry.title) {
            comments.push(`${entry.title} (${entry.status})`);
          }
        });
      });

      const summary = summarizeComments(comments, order.title);
      const detected = detectFailureModes(comments.join(' '), order.failureCode ?? undefined);
      const mergedTags = mergeFailureModes(
        order.failureModeTags?.map((tag) => tag.toString()) ?? [],
        detected,
      );

      const update: Record<string, unknown> = {};
      if (summary && summary !== order.copilotSummary) {
        update.copilotSummary = summary;
        update.copilotSummaryUpdatedAt = new Date();
      }
      const existingTags = order.failureModeTags?.map((tag) => tag.toString()) ?? [];
      if (mergedTags.length && hasTagChanges(existingTags, mergedTags)) {
        update.failureModeTags = mergedTags;
      }

      if (Object.keys(update).length) {
        await WorkOrder.updateOne({ _id: order._id }, { $set: update }).exec();
      }
    }),
  );
}

export function startCopilotSummaryJob(): void {
  const cronExpr = process.env.COPILOT_SUMMARY_CRON || DEFAULT_CRON;
  if (!cron.validate(cronExpr)) {
    logger.warn(`[Copilot] Invalid CRON expression "${cronExpr}". Job disabled.`);
    return;
  }
  if (scheduled) {
    scheduled.stop();
    scheduled = null;
  }
  scheduled = cron.schedule(cronExpr, () => {
    runCopilotSummaryJob().catch((err) => {
      logger.error('[Copilot] summary job failed', err);
    });
  });
  logger.info(`[Copilot] summary job scheduled (${cronExpr}).`);
}

export function stopCopilotSummaryJob(): void {
  if (scheduled) {
    scheduled.stop();
    scheduled = null;
  }
}

function hasTagChanges(existing: string[], incoming: string[]): boolean {
  if (existing.length !== incoming.length) {
    return true;
  }
  return existing.some((tag, index) => tag !== incoming[index]);
}
