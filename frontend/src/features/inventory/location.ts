/*
 * SPDX-License-Identifier: MIT
 */

export const formatInventoryLocation = (location?: { store?: string; room?: string; bin?: string }) => {
  if (!location) return 'Unassigned';
  const parts = [location.store, location.room, location.bin].filter(Boolean);
  return parts.length ? parts.join(' • ') : 'Unassigned';
};

