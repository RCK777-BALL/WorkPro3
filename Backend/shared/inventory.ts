// shared/inventory.ts

export interface InventoryAdjustmentPayload {
  partId: string;
  locationId?: string | undefined;
  quantityDelta: number;
  reason?: string | undefined;
  workOrderId?: string | undefined;
  note?: string | undefined;
}
