/*
 * SPDX-License-Identifier: MIT
 */

import type { PurchaseOrder } from '@/api/purchasing';

export interface VendorContact {
  id: string;
  name: string;
  role?: string;
  email?: string;
  phone?: string;
}

export interface VendorAttachment {
  id: string;
  name: string;
  url?: string;
  uploadedBy?: string;
  uploadedAt?: string;
}

export interface VendorNote {
  id: string;
  body: string;
  author?: string;
  createdAt?: string;
}

export interface Vendor {
  id: string;
  _id?: string;
  tenantId?: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  status?: 'active' | 'inactive';
  address?: {
    street?: string;
    city?: string;
    province?: string;
    country?: string;
  };
  leadTimeDays?: number;
  spendToDate?: number;
  contacts?: VendorContact[];
  attachments?: VendorAttachment[];
  notes?: VendorNote[];
  relatedPurchaseOrders?: PurchaseOrder[];
}
