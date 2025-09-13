export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  reorderThreshold?: number;
  reorderPoint?: number;
}

export interface InventoryUpdatePayload {
  _id: string;
  tenantId?: string;
  name: string;
  quantity: number;
}
