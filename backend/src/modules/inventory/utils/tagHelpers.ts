/*
 * SPDX-License-Identifier: MIT
 */

export const normalizeTags = (tags?: string[] | null): string[] => {
  if (!tags || tags.length === 0) return [];

  const normalized = tags
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length > 0);

  return Array.from(new Set(normalized));
};

export default normalizeTags;
