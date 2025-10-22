/*
 * SPDX-License-Identifier: MIT
 */

import logger from './logger';

interface EmailJob {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function enqueueEmailRetry(job: EmailJob): Promise<void> {
  logger.warn('Email queued for retry', job);
}
