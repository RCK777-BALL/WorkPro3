import type { TenantScoped } from './http';

export interface Asset extends TenantScoped {
  id: string;
  tenantId: string;
  siteId?: string | undefined;
  plantId?: string | undefined;
  name: string;
  type?: 'Electrical' | 'Mechanical' | 'Tooling' | 'Interface' | undefined;
  qrCode?: string | undefined;
  location?: string | undefined;
  notes?: string | undefined;
  department?: string | undefined;
  departmentId?: string | undefined;
  lineId?: string | undefined;
  category?: string | undefined;
  status?: 'Active' | 'Offline' | 'In Repair' | undefined;
  description?: string | undefined;
  image?: string | undefined;
  serialNumber?: string | undefined;
  modelName?: string | undefined;
  manufacturer?: string | undefined;
  purchaseDate?: string | undefined;
  warrantyStart?: string | undefined;
  warrantyEnd?: string | undefined;
  purchaseCost?: number | undefined;
  expectedLifeMonths?: number | undefined;
  replacementDate?: string | undefined;
  installationDate?: string | undefined;
  line?: string | undefined;
  station?: string | undefined;
  /** Identifier of the station the asset belongs to */
  stationId?: string | undefined;
  criticality?: 'high' | 'medium' | 'low' | undefined;
  lastPmDate?: string | undefined;
  lastServiced?: string | undefined;
  warrantyExpiry?: string | undefined;
  documents?: string[] | undefined;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
  assignee?: string | undefined;
  assignedTo?: string | undefined;
  nextPmDate?: string | undefined;
  keyMeters?:
    | Array<{
        name: string;
        value?: number | string;
        unit?: string;
      }>
    | undefined;
}
