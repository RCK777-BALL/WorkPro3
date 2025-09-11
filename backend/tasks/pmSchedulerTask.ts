/*
 * SPDX-License-Identifier: MIT
 */

import { runPmScheduler, calcNextDue } from '../services/pmScheduler';
import logger from '../utils/logger';

export default async function runPmSchedulerTask() {
  logger.info('[PM Scheduler Task] Running PM evaluations...');
  await runPmScheduler();
}

export { calcNextDue };
