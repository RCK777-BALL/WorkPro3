import WorkOrder from '../models/WorkOrder';

export interface KPIResult {
  mttr: number; // Mean time to repair in hours
  mtbf: number; // Mean time between failures in hours
  backlog: number; // Number of open work orders
}

function calculateMTTR(workOrders: { createdAt: Date; completedAt?: Date | null }[]): number {
  const completed = workOrders.filter((w) => w.completedAt);
  if (completed.length === 0) return 0;
  const total = completed.reduce((sum, w) => {
    const end = w.completedAt!.getTime();
    const start = w.createdAt.getTime();
    return sum + (end - start);
  }, 0);
  return total / completed.length / 36e5; // ms to hours
}

function calculateMTBF(workOrders: { completedAt?: Date | null }[]): number {
  const failures = workOrders
    .filter((w) => w.completedAt)
    .sort((a, b) => a.completedAt!.getTime() - b.completedAt!.getTime());
  if (failures.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < failures.length; i++) {
    total += failures[i].completedAt!.getTime() - failures[i - 1].completedAt!.getTime();
  }
  return total / (failures.length - 1) / 36e5; // ms to hours
}

function calculateBacklog(workOrders: { status: string }[]): number {
  return workOrders.filter((w) => w.status !== 'completed').length;
}

export async function getKPIs(tenantId: string): Promise<KPIResult> {
  const workOrders = await WorkOrder.find({ tenantId }).select('createdAt completedAt status').lean();
  return {
    mttr: calculateMTTR(workOrders),
    mtbf: calculateMTBF(workOrders),
    backlog: calculateBacklog(workOrders),
  };
}

export default {
  getKPIs,
};

