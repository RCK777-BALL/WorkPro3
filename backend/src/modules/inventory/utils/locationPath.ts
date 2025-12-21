/*
 * SPDX-License-Identifier: MIT
 */

import type { StockLocationDocument } from '../models/StockLocation';

export const buildMaterializedPath = (code: string, parentPath?: string | null): string => {
  const normalizedCode = code.trim();
  if (parentPath && parentPath.length > 0) {
    return `${parentPath}/${normalizedCode}`;
  }
  return normalizedCode;
};

export const applyMaterializedPath = (
  location: Pick<StockLocationDocument, 'code' | 'materialized_path' | 'depth'>,
  parent?: Pick<StockLocationDocument, 'materialized_path' | 'depth'> | null,
): void => {
  const parentPath = parent?.materialized_path ?? null;
  location.materialized_path = buildMaterializedPath(location.code, parentPath);
  location.depth = (parent?.depth ?? 0) + (parentPath ? 1 : 0);
};

export default { buildMaterializedPath, applyMaterializedPath };
