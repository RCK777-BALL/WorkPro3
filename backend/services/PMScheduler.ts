/*
 * SPDX-License-Identifier: MIT
 */

import PMTask from '../models/PMTask';
import WorkOrder from '../models/WorkOrder';
import Meter from '../models/Meter';
import ConditionRule from '../models/ConditionRule';
import SensorReading from '../models/SensorReading';
import logger from '../utils/logger';

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

export function nextCronOccurrenceWithin(
  cronExpr: string,
  from: Date,
  days: number,
): Date | null {
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length < 5) return null;
  const [minStr, hourStr, domStr, monthStr, dowStr] = parts;
  const min = minStr === '*' ? null : parseInt(minStr, 10);
  const hour = hourStr === '*' ? null : parseInt(hourStr, 10);
  const dom = domStr === '*' ? null : parseInt(domStr, 10);
  const month = monthStr === '*' ? null : parseInt(monthStr, 10);
  const dow = dowStr === '*' ? null : parseInt(dowStr, 10);
  for (let i = 0; i <= days; i++) {
    const d = new Date(from.getTime());
    d.setSeconds(0, 0);
    d.setDate(d.getDate() + i);
    if (
      (dom === null || dom === d.getDate()) &&
      (month === null || month === d.getMonth() + 1) &&
      (dow === null || dow === d.getDay())
    ) {
      d.setHours(hour ?? 0, min ?? 0, 0, 0);
      if (d > from) return d;
    }
  }
  return null;
}

export async function runPMScheduler(): Promise<void> {
  const now = new Date();

  const tasks = await PMTask.find({ active: true });
  for (const task of tasks) {
    try {
      if (task.rule?.type === 'calendar' && task.rule.cron) {
        const next = nextCronOccurrenceWithin(task.rule.cron, now, 7);
        if (next) {
          await WorkOrder.create({
            title: `PM: ${task.title}`,
            description: task.notes || '',
            status: 'open',
            asset: task.asset,
            pmTask: task._id,
            department: task.department,
            dueDate: next,
            priority: 'medium',
            tenantId: task.tenantId,
          });
          task.lastGeneratedAt = now;
          await task.save();
        }
      } else if (task.rule?.type === 'meter' && task.rule.meterName) {
        const meter = await Meter.findOne({
          name: task.rule.meterName,
          tenantId: task.tenantId,
        });
        if (!meter) continue;
        const sinceLast = meter.currentValue - (meter.lastWOValue || 0);
        if (sinceLast >= (task.rule.threshold || 0)) {
          await WorkOrder.create({
            title: `Meter PM: ${task.title}`,
            description: task.notes || '',
            status: 'open',
            asset: meter.asset,
            pmTask: task._id,
            department: task.department,
            dueDate: now,
            priority: 'medium',
            tenantId: task.tenantId,
          });
          meter.lastWOValue = meter.currentValue;
          await meter.save();
          task.lastGeneratedAt = now;
          await task.save();
        }
      }
    } catch (err) {
      logger.error('[PM Scheduler] Failed task', err);
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
      logger.error('[PM Scheduler] Failed condition rule', err);
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
