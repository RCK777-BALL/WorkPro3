// shared/inventory.ts

export interface InventoryAdjustmentPayload {
  partId: string;
  locationId?: string;
  quantityDelta: number;
  reason?: string;
  workOrderId?: string;
  note?: string;
}
