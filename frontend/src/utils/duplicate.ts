import type { Asset, WorkOrder, MaintenanceSchedule } from '../types';

export const duplicateAsset = (asset: Asset): Asset => {
  const newAsset = {
    ...asset,
    id: `${asset.id}-copy`,
    name: `${asset.name} (Copy)`,
    serialNumber: `${asset.serialNumber}-COPY`,
    createdAt: new Date().toISOString(),
  };
  
  delete newAsset.lastServiced;
  delete newAsset.warrantyExpiry;
  
  return newAsset;
};

export const duplicateWorkOrder = (workOrder: WorkOrder): WorkOrder => {
  const newWorkOrder = {
    ...workOrder,
    id: `${workOrder.id}-copy`,
    title: `${workOrder.title} (Copy)`,
    status: 'open',
    createdAt: new Date().toISOString(),
    scheduledDate: new Date().toISOString().split('T')[0],
  };
  
  delete newWorkOrder.completedAt;
  delete newWorkOrder.completedBy;
  
  return newWorkOrder;
};

export const duplicatePM = (schedule: MaintenanceSchedule): MaintenanceSchedule => {
  const newSchedule = {
    ...schedule,
    id: `${schedule.id}-copy`,
    title: `${schedule.title} (Copy)`,
    nextDue: new Date().toISOString().split('T')[0],
  };
  
  delete newSchedule.lastCompleted;
  delete newSchedule.lastCompletedBy;
  
  return newSchedule;
};
