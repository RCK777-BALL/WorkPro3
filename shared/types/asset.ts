export interface Asset {
  id: string;
  tenantId: string;
  siteId?: string;
  plantId?: string;
  name: string;
  type?: 'Electrical' | 'Mechanical' | 'Tooling' | 'Interface';
  qrCode?: string;
  location?: string;
  notes?: string;
  department?: string;
  category?: string;
  status?: 'Active' | 'Offline' | 'In Repair';
  description?: string;
  image?: string;
  serialNumber?: string;
  modelName?: string;
  manufacturer?: string;
  purchaseDate?: string;
  installationDate?: string;
  line?: string;
  station?: string;
  /** Identifier of the station the asset belongs to */
  stationId?: string;
  criticality?: 'high' | 'medium' | 'low';
  lastPmDate?: string;
  lastServiced?: string;
  warrantyExpiry?: string;
  documents?: string[];
  createdAt?: string;
  updatedAt?: string;
}
