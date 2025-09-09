import { runPmScheduler, calcNextDue } from '../services/pmScheduler';

export default async function runPmSchedulerTask() {
  console.log('[PM Scheduler Task] Running PM evaluations...');
  await runPmScheduler();
}

export { calcNextDue };
