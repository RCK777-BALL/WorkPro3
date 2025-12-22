/*
 * SPDX-License-Identifier: MIT
 */

export const formatDate = (value?: string | Date): string => {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
};
