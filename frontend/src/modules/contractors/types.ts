/*
 * SPDX-License-Identifier: MIT
 */

export interface VendorContact {
  name: string;
  contactName: string;
  phone: string;
  email: string;
}

export interface Eligibility {
  eligible: boolean;
  blockers: string[];
  warnings: string[];
}

export interface ContractorRosterEntry {
  id: string;
  name: string;
  role: string;
  vendor?: VendorContact | null;
  onboarding: { status: string };
  approvals: { safety: boolean; insurance: boolean; operations: boolean };
  eligibility: Eligibility;
  credentials?: { type: string; status: string; expiresOn?: string }[];
  assignmentHistory?: { workOrderId: string; status: string }[];
}
