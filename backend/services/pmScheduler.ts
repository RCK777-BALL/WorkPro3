import PMTask from '../models/PMTask';
import WorkOrder from '../models/WorkOrder';
import Meter from '../models/Meter';
import ConditionRule from '../models/ConditionRule';
import SensorReading from '../models/SensorReading';

function compare(value: number, operator: string, threshold: number): boolean {
  switch (operator) {
    case '>':
      return value > threshold;
    case '<':
      return value < threshold;
    case '>=':
      return value >= threshold;
    case '<=':
      return value <= threshold;
    case '==':
      return value === threshold;
    default:
      return false;
  }
}

export async function runPmScheduler(): Promise<void> {
  const now = new Date();

  // Time-based PM tasks
  const dueTasks = await PMTask.find({
    isActive: true,
    nextDue: { $lte: now },
  }).select('tenantId title notes asset department nextDue frequency lastRun');

  for (const task of dueTasks) {
    try {
      if (!task.tenantId) continue;
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

      const next = calcNextDue(task.nextDue || now, task.frequency);
      task.lastRun = now;
      task.nextDue = next;
      await task.save();
    } catch (err) {
      console.error('[PM Scheduler] Failed time task', err);
    }
  }

  // Meter-based triggers
  const meters = await Meter.find({}).select('asset currentValue pmInterval lastWOValue tenantId name');
  for (const meter of meters) {
    try {
      if (!meter.tenantId) continue;
      const sinceLast = meter.currentValue - (meter.lastWOValue || 0);
      if (sinceLast >= meter.pmInterval) {
        await WorkOrder.create({
          title: `Meter PM: ${meter.name}`,
          description: `Generated from meter ${meter.name}`,
          status: 'open',
          asset: meter.asset,
          dueDate: now,
          priority: 'medium',
          tenantId: meter.tenantId,
        });
        meter.lastWOValue = meter.currentValue;
        await meter.save();
      }
    } catch (err) {
      console.error('[PM Scheduler] Failed meter', err);
    }
  }

  // Condition-based triggers
  const rules = await ConditionRule.find({ active: true });
  for (const rule of rules) {
    try {
      const reading = await SensorReading.findOne({
        asset: rule.asset,
        metric: rule.metric,
        tenantId: rule.tenantId,
      })
        .sort({ timestamp: -1 })
        .lean();
      if (reading && compare(reading.value, rule.operator, rule.threshold)) {
        await WorkOrder.create({
          title: rule.workOrderTitle,
          description: rule.workOrderDescription,
          asset: rule.asset,
          tenantId: rule.tenantId,
        });
      }
    } catch (err) {
      console.error('[PM Scheduler] Failed condition rule', err);
    }
  }
}

export function calcNextDue(from: Date, freq?: string): Date {
  const d = new Date(from.getTime());

  if (freq) {
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
