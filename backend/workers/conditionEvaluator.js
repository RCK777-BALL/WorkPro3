import ConditionRule from '../models/ConditionRule';
import WorkOrder from '../models/WorkOrder';
function compare(value, operator, threshold) {
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
export async function evaluateCondition(reading) {
    const rules = await ConditionRule.find({
        asset: reading.asset,
        metric: reading.metric,
        tenantId: reading.tenantId,
        active: true,
    });
    for (const rule of rules) {
        if (compare(reading.value, rule.operator, rule.threshold)) {
            await WorkOrder.create({
                title: rule.workOrderTitle,
                description: rule.workOrderDescription,
                asset: reading.asset,
                tenantId: reading.tenantId,
            });
        }
    }
}
export default { evaluateCondition };
