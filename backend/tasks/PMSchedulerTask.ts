/*
 * SPDX-License-Identifier: MIT
 */

import { runPMScheduler, calcNextDue } from '../services/PMScheduler';
import logger from '../utils/logger';

export default async function runPMSchedulerTask() {
  logger.info('[PM Scheduler Task] Running PM evaluations...');
  await runPMScheduler();
}

export { runPMScheduler, calcNextDue };
