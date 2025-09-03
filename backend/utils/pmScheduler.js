// utils/pmScheduler.ts
import * as cron from 'node-cron';
import path from 'path';
const scheduled = new Map();
export const startPMScheduler = (id, opts = {}) => {
    // default: every 5 minutes in dev; allow env overrides
    const cronExpr = opts.cronExpr && opts.cronExpr.trim() !== ''
        ? opts.cronExpr
        : process.env.PM_SCHEDULER_CRON || '*/5 * * * *';
    // Resolve task module; allow relative path from project root OR from this file
    const rel = opts.taskModulePath || process.env.PM_SCHEDULER_TASK || './tasks/pmSchedulerTask';
    const resolved = resolveTaskPath(rel);
    console.log(`[PM Scheduler] Using cron "${cronExpr}" and task module "${resolved}"`);
    // Validate cron
    if (!cron.validate(cronExpr)) {
        console.error(`[PM Scheduler] Invalid CRON expression "${cronExpr}". Scheduler disabled.`);
        return;
    }
    // Cancel any existing schedule with the same id
    if (scheduled.has(id)) {
        scheduled.get(id).stop();
        scheduled.delete(id);
    }
    const task = cron.schedule(cronExpr, async () => {
        try {
            const taskModule = await import(resolved);
            const fn = typeof taskModule.default === 'function'
                ? taskModule.default
                : typeof taskModule.run === 'function'
                    ? taskModule.run
                    : null;
            if (!fn) {
                throw new Error('Task module missing default or named `run` function.');
            }
            await fn();
        }
        catch (err) {
            console.error('Error running PM Scheduler task:', err);
        }
    });
    // node-cron schedules start automatically
    scheduled.set(id, task);
};
export const stopPMScheduler = (id) => {
    if (id) {
        const task = scheduled.get(id);
        if (task) {
            task.stop();
            scheduled.delete(id);
            console.log(`[PM Scheduler] Stopped schedule "${id}".`);
        }
        return;
    }
    for (const [key, task] of scheduled) {
        task.stop();
        console.log(`[PM Scheduler] Stopped schedule "${key}".`);
    }
    scheduled.clear();
};
function resolveTaskPath(rel) {
    // __dirname = /Backend/utils at runtime
    // Try first relative to process.cwd() (project root when running `npm run dev`)
    const fromCwd = path.resolve(process.cwd(), rel);
    try {
        require.resolve(fromCwd);
        return fromCwd;
    }
    catch {
        // ignore
    }
    // Fall back to relative to this file
    return path.resolve(__dirname, '..', rel);
}
