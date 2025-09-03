// tasks/pmSchedulerTask.ts
import PMTask from '../models/PMTask';
import WorkOrder from '../models/WorkOrder';
/**
 * Runs once per scheduler interval.
 * 1. Find active PM tasks that are due (`nextDue` <= now).
 * 2. Create Work Orders for them.
 * 3. Advance `nextDue` based on task frequency (simple example).
 */
export default async function runPmSchedulerTask() {
    console.log('[PM Scheduler Task] Checking for due PM tasks...');
    const now = new Date();
    // Only fetch active + due
    const dueTasks = await PMTask.find({
        isActive: true,
        nextDue: { $lte: now },
    }).select('tenantId title notes asset department nextDue frequency lastRun');
    if (!dueTasks.length) {
        console.log('[PM Scheduler Task] No tasks due.');
        return;
    }
    for (const task of dueTasks) {
        try {
            if (!task.tenantId) {
                console.warn(`[PM Scheduler Task] Task "${task.title}" has no tenantId; skipping.`);
                continue;
            }
            await WorkOrder.create({
                title: `PM: ${task.title}`,
                description: task.notes || '',
                status: 'open',
                asset: task.asset,
                pmTask: task._id,
                department: task.department,
                dueDate: task.nextDue,
                priority: 'medium',
                tenantId: task.tenantId,
            });
            // Advance nextDue (demo logic; replace w/ real frequency calc)
            const next = calcNextDue(task.nextDue || now, task.frequency);
            task.lastRun = now;
            task.nextDue = next;
            await task.save();
            console.log(`Created WO for PM "${task.title}" -> next due ${next.toISOString()}`);
        }
        catch (err) {
            console.error(`[PM Scheduler Task] Failed to process "${task.title}":`, err);
        }
    }
}
export function calcNextDue(from, freq) {
    const d = new Date(from.getTime());
    if (freq) {
        // Support patterns like "every 3 days", "every 2 weeks", "every 6 months"
        const match = /^every\s+(\d+)\s*(day|week|month|year)s?$/i.exec(freq.trim());
        if (match) {
            const amount = parseInt(match[1], 10);
            const unit = match[2].toLowerCase();
            switch (unit) {
                case 'day':
                    d.setUTCDate(d.getUTCDate() + amount);
                    return d;
                case 'week':
                    d.setUTCDate(d.getUTCDate() + amount * 7);
                    return d;
                case 'month':
                    d.setUTCMonth(d.getUTCMonth() + amount);
                    return d;
                case 'year':
                    d.setUTCFullYear(d.getUTCFullYear() + amount);
                    return d;
            }
        }
    }
    switch (freq) {
        case 'daily':
            d.setUTCDate(d.getUTCDate() + 1);
            break;
        case 'weekly':
            d.setUTCDate(d.getUTCDate() + 7);
            break;
        case 'monthly':
            d.setUTCMonth(d.getUTCMonth() + 1);
            break;
        case 'quarterly':
            d.setUTCMonth(d.getUTCMonth() + 3);
            break;
        case 'biannually':
            d.setUTCMonth(d.getUTCMonth() + 6);
            break;
        case 'annually':
        case 'yearly':
            d.setUTCFullYear(d.getUTCFullYear() + 1);
            break;
        default:
            d.setUTCDate(d.getUTCDate() + 30);
    }
    return d;
}
