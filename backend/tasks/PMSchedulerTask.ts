import { runPMScheduler, calcNextDue } from '../services/PMScheduler';

export default async function runPMSchedulerTask() {
  console.log('[PM Scheduler Task] Running PM evaluations...');
  await runPMScheduler();
}

export { calcNextDue };
