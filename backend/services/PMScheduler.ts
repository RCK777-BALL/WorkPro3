/*
 * SPDX-License-Identifier: MIT
 */

import PMTask, { type PMTaskAssignmentDocument, type PMTaskDocument } from '../models/PMTask';
import WorkOrder from '../models/WorkOrder';
import Meter from '../models/Meter';
import MeterReading from '../models/MeterReading';
import ConditionRule from '../models/ConditionRule';
import SensorReading from '../models/SensorReading';
import ProductionRecord from '../models/ProductionRecord';
import WorkOrderTemplateModel from '../src/modules/work-orders/templateModel';
import { notifyPmDue } from './notificationService';
import { logger } from '../utils';
import { resolveProcedureChecklist } from './procedureTemplateService';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const buildTemplatePayload = async (task: PMTaskDocument) => {
  if (!task.workOrderTemplateId) {
    return { templateId: undefined, templateVersion: task.templateVersion, checklists: undefined, status: 'not_required' as const };
  }

  const template = await WorkOrderTemplateModel.findOne({
    _id: task.workOrderTemplateId,
    tenantId: task.tenantId,
  }).lean();

  const checklists = template?.defaults?.checklists?.map((item) => ({
    text: item.text,
    done: false,
    status: 'not_started' as const,
  }));

  return {
    templateId: template?._id,
    templateVersion: template?.version ?? task.templateVersion,
    checklists,
    status: checklists?.length ? ('pending' as const) : ('not_required' as const),
  };
};

const buildProcedurePayload = async (task: PMTaskDocument) => {
  if (!task.procedureTemplateId) {
    return { procedureChecklist: undefined, procedureSnapshot: undefined };
  }
  const { snapshot, checklist } = await resolveProcedureChecklist(
    task.tenantId.toString(),
    task.procedureTemplateId,
  );
  return {
    procedureChecklist: checklist,
    procedureSnapshot: snapshot,
  };
};

const mergePartsUsed = (
  assignmentParts?: { partId: any; quantity?: number }[],
  procedureParts?: { partId: any; quantity: number }[],
) => {
  const combined = new Map<string, { partId: any; qty: number; cost: number }>();
  (assignmentParts ?? []).forEach((part) => {
    if (!part.partId) return;
    const key = part.partId.toString();
    const existing = combined.get(key);
    const qty = part.quantity ?? 1;
    combined.set(key, {
      partId: part.partId,
      qty: (existing?.qty ?? 0) + qty,
      cost: 0,
    });
  });
  (procedureParts ?? []).forEach((part) => {
    const key = part.partId.toString();
    const existing = combined.get(key);
    combined.set(key, {
      partId: part.partId,
      qty: (existing?.qty ?? 0) + part.quantity,
      cost: 0,
    });
  });
  return Array.from(combined.values());
};

const mergeChecklists = (
  assignment: PMTaskAssignmentDocument,
  templateChecklists?: { text: string; done: boolean; status: 'not_started' }[],
) => {
  const assignmentChecklists = assignment.checklist?.map((item) => ({
    description: item.description,
    done: false,
  }));

  return [
    ...(templateChecklists ?? []),
    ...(assignmentChecklists?.map((item) => ({ text: item.description, done: item.done ?? false })) ?? []),
  ];
};

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
      const templateDefaults = await buildTemplatePayload(task);
      const procedurePayload = await buildProcedurePayload(task);
      if (Array.isArray(task.assignments) && task.assignments.length > 0) {
        let touched = false;
        for (const assignment of task.assignments) {
          const triggerType = assignment.trigger?.type ?? 'time';

          if (triggerType === 'meter') {
            const threshold = assignment.trigger?.meterThreshold;
            if (!threshold) {
              continue;
            }
            const meter = await Meter.findOne({ asset: assignment.asset, tenantId: task.tenantId });
            if (!meter) {
              continue;
            }
            const latestReading = await MeterReading.findOne({ meter: meter._id, tenantId: task.tenantId })
              .sort({ timestamp: -1 })
              .lean();
            const currentValue = latestReading?.value ?? meter.currentValue ?? 0;
            const sinceLast = currentValue - (meter.lastWOValue || 0);

            if (sinceLast >= threshold) {
              const checklists = mergeChecklists(assignment, templateDefaults.checklists);
              const partsUsed = mergePartsUsed(
                assignment.requiredParts as unknown as { partId: any; quantity?: number }[],
                procedurePayload.procedureSnapshot?.requiredParts,
              );
              await WorkOrder.create({
                title: `PM: ${task.title}`,
                description: task.notes || '',
                status: 'requested',
                asset: assignment.asset,
                pmTask: task._id,
                department: task.department,
                dueDate: now,
                priority: 'medium',
                tenantId: task.tenantId,
                checklists,
                ...(procedurePayload.procedureChecklist ? { checklist: procedurePayload.procedureChecklist } : {}),
                ...(procedurePayload.procedureSnapshot
                  ? {
                      procedureTemplateId: procedurePayload.procedureSnapshot.templateId,
                      procedureTemplateVersionId: procedurePayload.procedureSnapshot.versionId,
                    }
                  : {}),
                ...(templateDefaults.templateId ? { workOrderTemplateId: templateDefaults.templateId } : {}),
                ...(templateDefaults.templateVersion ? { templateVersion: templateDefaults.templateVersion } : {}),
                complianceStatus: checklists.length ? 'pending' : templateDefaults.status,
                ...(checklists.length === 0 && templateDefaults.status === 'not_required'
                  ? { complianceCompletedAt: new Date() }
                  : {}),
                partsUsed,
              });
              meter.lastWOValue = currentValue;
              await meter.save();
              assignment.lastGeneratedAt = now;
              task.lastGeneratedAt = now;
              touched = true;
            }
            continue;
          }

          const interval = assignment.interval;
          if (!interval) {
            continue;
          }
          if (!assignment.nextDue) {
            assignment.nextDue = calcNextDue(now, interval);
            touched = true;
          }
          if (assignment.usageMetric && assignment.usageTarget) {
            const usageDue = await projectUsageDrivenDueDate(assignment, now);
            if (usageDue && (!assignment.nextDue || usageDue < assignment.nextDue)) {
              assignment.nextDue = usageDue;
              touched = true;
            }
          }
          if (assignment.nextDue && assignment.nextDue <= now) {
            const checklists = mergeChecklists(assignment, templateDefaults.checklists);
            const partsUsed = mergePartsUsed(
              assignment.requiredParts as unknown as { partId: any; quantity?: number }[],
              procedurePayload.procedureSnapshot?.requiredParts,
            );
            await WorkOrder.create({
              title: `PM: ${task.title}`,
              description: task.notes || '',
              status: 'requested',
              asset: assignment.asset,
              pmTask: task._id,
              department: task.department,
              dueDate: assignment.nextDue,
              priority: 'medium',
              tenantId: task.tenantId,
              checklists,
              ...(procedurePayload.procedureChecklist ? { checklist: procedurePayload.procedureChecklist } : {}),
              ...(procedurePayload.procedureSnapshot
                ? {
                    procedureTemplateId: procedurePayload.procedureSnapshot.templateId,
                    procedureTemplateVersionId: procedurePayload.procedureSnapshot.versionId,
                  }
                : {}),
              ...(templateDefaults.templateId ? { workOrderTemplateId: templateDefaults.templateId } : {}),
              ...(templateDefaults.templateVersion ? { templateVersion: templateDefaults.templateVersion } : {}),
              complianceStatus: checklists.length ? 'pending' : templateDefaults.status,
              ...(checklists.length === 0 && templateDefaults.status === 'not_required'
                ? { complianceCompletedAt: new Date() }
                : {}),
              partsUsed,
            });
            if (assignment.nextDue) {
              await notifyPmDue(task, assignment.nextDue);
            }
            assignment.lastGeneratedAt = now;
            assignment.nextDue = calcNextDue(now, interval);
            task.lastGeneratedAt = now;
            touched = true;
          }
        }
        if (touched) {
          await task.save();
        }
        continue;
      }

      if (task.rule?.type === 'calendar' && task.rule.cron) {
        const next = nextCronOccurrenceWithin(task.rule.cron, now, 7);
        if (next) {
          const partsUsed = mergePartsUsed(undefined, procedurePayload.procedureSnapshot?.requiredParts);
          await WorkOrder.create({
            title: `PM: ${task.title}`,
            description: task.notes || '',
            status: 'requested',
            asset: task.asset,
            pmTask: task._id,
            department: task.department,
            dueDate: next,
            priority: 'medium',
            tenantId: task.tenantId,
            ...(procedurePayload.procedureChecklist ? { checklist: procedurePayload.procedureChecklist } : {}),
            ...(procedurePayload.procedureSnapshot
              ? {
                  procedureTemplateId: procedurePayload.procedureSnapshot.templateId,
                  procedureTemplateVersionId: procedurePayload.procedureSnapshot.versionId,
                }
              : {}),
            ...(partsUsed.length ? { partsUsed } : {}),
          });
          await notifyPmDue(task, next);
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
          const partsUsed = mergePartsUsed(undefined, procedurePayload.procedureSnapshot?.requiredParts);
          await WorkOrder.create({
            title: `Meter PM: ${task.title}`,
            description: task.notes || '',
            status: 'requested',
            asset: meter.asset,
            pmTask: task._id,
            department: task.department,
            dueDate: now,
            priority: 'medium',
            tenantId: task.tenantId,
            ...(procedurePayload.procedureChecklist ? { checklist: procedurePayload.procedureChecklist } : {}),
            ...(procedurePayload.procedureSnapshot
              ? {
                  procedureTemplateId: procedurePayload.procedureSnapshot.templateId,
                  procedureTemplateVersionId: procedurePayload.procedureSnapshot.versionId,
                }
              : {}),
            ...(partsUsed.length ? { partsUsed } : {}),
          });
          await notifyPmDue(task, now);
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

async function projectUsageDrivenDueDate(
  assignment: PMTaskAssignmentDocument,
  now: Date,
): Promise<Date | null> {
  if (!assignment.usageMetric || !assignment.usageTarget || !assignment.asset) {
    return null;
  }
  const lookbackDays = assignment.usageLookbackDays && assignment.usageLookbackDays > 0
    ? assignment.usageLookbackDays
    : 30;
  const fallbackStart = new Date(now.getTime() - lookbackDays * DAY_IN_MS);
  const since =
    assignment.lastGeneratedAt && assignment.lastGeneratedAt > fallbackStart
      ? assignment.lastGeneratedAt
      : fallbackStart;

  const records = await ProductionRecord.find({
    asset: assignment.asset,
    recordedAt: { $gte: since },
  })
    .select('recordedAt runTimeMinutes actualUnits')
    .sort({ recordedAt: 1 })
    .lean();

  if (!records.length) {
    return null;
  }

  const usageConsumed = records.reduce((total, record) => {
    if (!assignment.usageMetric) return total;
    return total + extractUsageValue(record, assignment.usageMetric);
  }, 0);

  if (usageConsumed >= assignment.usageTarget) {
    return now;
  }

  const firstTimestamp = records[0].recordedAt
    ? new Date(records[0].recordedAt)
    : since;
  const windowMs = Math.max(now.getTime() - firstTimestamp.getTime(), DAY_IN_MS);
  const usagePerMs = usageConsumed / windowMs;
  if (!Number.isFinite(usagePerMs) || usagePerMs <= 0) {
    return null;
  }

  const remaining = assignment.usageTarget - usageConsumed;
  const additionalMs = remaining / usagePerMs;
  if (!Number.isFinite(additionalMs) || additionalMs < 0) {
    return now;
  }
  return new Date(now.getTime() + additionalMs);
}

function extractUsageValue(
  record: { runTimeMinutes?: number | null; actualUnits?: number | null },
  metric: 'runHours' | 'cycles',
): number {
  if (metric === 'runHours') {
    return (record.runTimeMinutes ?? 0) / 60;
  }
  return record.actualUnits ?? 0;
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
