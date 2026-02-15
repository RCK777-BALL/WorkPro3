/*
 * SPDX-License-Identifier: MIT
 */

import ConditionRule from '../models/ConditionRule';
import WorkOrder from '../models/WorkOrder';

export interface ConditionReading {
  asset: string;
  metric: string;
  value: number;
  tenantId: string;
}

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

export async function evaluateCondition(reading: ConditionReading): Promise<void> {
  const rules = await ConditionRule.find({
    asset: reading.asset,
    metric: reading.metric,
    tenantId: reading.tenantId,
    active: true,
  });

  for (const rule of rules) {
    if (compare(reading.value, rule.operator, rule.threshold)) {
      const title = (rule.workOrderTitle ?? '').trim() || `Condition alert: ${reading.metric}`;
      const description =
        (rule.workOrderDescription ?? '').trim() ||
        `Metric ${reading.metric} crossed threshold ${rule.operator} ${rule.threshold}. Current value: ${reading.value}.`;

      await WorkOrder.create({
        title,
        description,
        assetId: reading.asset,
        tenantId: reading.tenantId,
        status: 'requested',
        type: 'corrective',
      });
    }
  }
}

export default { evaluateCondition };
