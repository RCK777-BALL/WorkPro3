/*
 * SPDX-License-Identifier: MIT
 */

import cron from 'node-cron';
import cronParser from 'cron-parser';
import nodemailer from 'nodemailer';

import ExecutiveReportSchedule, {
  type ExecutiveReportScheduleDoc,
} from '../models/ExecutiveReportSchedule';
import logger from '../utils/logger';
import { enqueueEmailRetry } from '../utils/emailQueue';
import {
  renderExecutiveReportPdf,
  DEFAULT_EXECUTIVE_CRON,
  type ExecutiveReportArtifact,
} from '../src/modules/executive/service';

const DEFAULT_JOB_CRON = '0 * * * *'; // hourly check

let scheduledJob: ReturnType<typeof cron.schedule> | null = null;

const shouldSendReport = (
  schedule: Pick<ExecutiveReportScheduleDoc, 'cron' | 'lastRunAt' | 'timezone'>,
  now: Date,
): boolean => {
  const cronExpr = schedule.cron || DEFAULT_EXECUTIVE_CRON;
  try {
    const interval = cronParser.parseExpression(cronExpr, {
      currentDate: schedule.lastRunAt ?? new Date(0),
      tz: schedule.timezone ?? undefined,
    });
    const nextDate = interval.next().toDate();
    return nextDate.getTime() <= now.getTime();
  } catch (err) {
    logger.warn(`[Executive] invalid cron expression "${cronExpr}": ${(err as Error).message}`);
    return false;
  }
};

const getTransport = () => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    return null;
  }
  const port = Number(process.env.SMTP_PORT ?? '587');
  const secure = process.env.SMTP_SECURE === 'true';
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
};

const deliverReport = async (
  schedule: ExecutiveReportScheduleDoc,
  artifact: ExecutiveReportArtifact,
): Promise<'success' | 'queued'> => {
  if (!schedule.recipients?.length) {
    return 'queued';
  }
  const subject = `Executive performance report (${artifact.generatedAt.toISOString().slice(0, 10)})`;
  const highlights = artifact.narrative.highlights.map((line) => `- ${line}`).join('\n');
  const text = `${artifact.narrative.summary}\n\n${highlights ? `Highlights:\n${highlights}\n\n` : ''}Full details are attached.`;
  const to = schedule.recipients.join(', ');

  const transporter = getTransport();
  if (!transporter) {
    await enqueueEmailRetry({
      to,
      subject,
      text,
    });
    return 'queued';
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    attachments: [
      {
        filename: artifact.filename,
        content: artifact.buffer,
        contentType: artifact.mimeType,
      },
    ],
  });
  return 'success';
};

export async function runExecutiveReportJob(): Promise<void> {
  const now = new Date();
  const schedules = await ExecutiveReportSchedule.find({ enabled: true });
  if (!schedules.length) {
    return;
  }

  await Promise.all(
    schedules.map(async (schedule) => {
      if (!schedule.recipients?.length) {
        return;
      }
      if (!shouldSendReport(schedule, now)) {
        return;
      }
      try {
        const artifact = await renderExecutiveReportPdf(schedule.tenantId, 12);
        const status = await deliverReport(schedule, artifact);
        await ExecutiveReportSchedule.updateOne(
          { _id: schedule._id },
          {
            $set: {
              lastRunAt: new Date(),
              lastRunStatus: status === 'success' ? 'success' : 'error',
              lastRunError: status === 'success' ? undefined : 'Report delivery queued',
            },
          },
        );
      } catch (err) {
        logger.error('[Executive] failed to generate scheduled report', err);
        await ExecutiveReportSchedule.updateOne(
          { _id: schedule._id },
          {
            $set: {
              lastRunAt: new Date(),
              lastRunStatus: 'error' as const,
              lastRunError: (err as Error).message,
            },
          },
        );
      }
    }),
  );
}

export function startExecutiveReportScheduler(cronExpr = process.env.EXECUTIVE_REPORT_CRON || DEFAULT_JOB_CRON): void {
  if (!cron.validate(cronExpr)) {
    logger.warn(`[Executive] Invalid scheduler cron expression "${cronExpr}". Job disabled.`);
    return;
  }
  if (scheduledJob) {
    scheduledJob.stop();
    scheduledJob = null;
  }
  scheduledJob = cron.schedule(cronExpr, () => {
    runExecutiveReportJob().catch((err) => {
      logger.error('[Executive] monthly report job failed', err);
    });
  });
  logger.info(`[Executive] report scheduler started (${cronExpr}).`);
}

export function stopExecutiveReportScheduler(): void {
  if (scheduledJob) {
    scheduledJob.stop();
    scheduledJob = null;
  }
}

