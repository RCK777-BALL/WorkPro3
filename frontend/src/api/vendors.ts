/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';
import type { Vendor } from '@/types/vendor';

const BASE_PATH = '/vendors';

type VendorListPayload =
  | Vendor[]
  | {
      data: Vendor[];
      page?: number;
      pageSize?: number;
      total?: number;
      totalPages?: number;
    };

export const fetchVendors = async (): Promise<Vendor[]> => {
  const res = await http.get<VendorListPayload>(BASE_PATH);
  if (Array.isArray(res.data)) {
    return res.data;
  }
  return res.data?.data ?? [];
};

export const fetchVendor = async (vendorId: string): Promise<Vendor> => {
  const res = await http.get<Vendor>(`${BASE_PATH}/${vendorId}`);
  return res.data;
};

export const saveVendor = async (payload: Partial<Vendor> & { name: string; id?: string }): Promise<Vendor> => {
  if (payload.id) {
    const res = await http.put<Vendor>(`${BASE_PATH}/${payload.id}`, payload);
    return res.data;
  }
  const res = await http.post<Vendor>(BASE_PATH, payload);
  return res.data;
};

export const deleteVendor = async (vendorId: string): Promise<void> => {
  await http.delete(`${BASE_PATH}/${vendorId}`);
};
