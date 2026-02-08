/*
 * SPDX-License-Identifier: MIT
 */

import type { AxiosRequestConfig } from 'axios';

import type { Asset } from '../types';

export interface AssetRequestClient {
  post: (url: string, data?: unknown, config?: AxiosRequestConfig) => Promise<{ data: any }>;
  put: (url: string, data?: unknown, config?: AxiosRequestConfig) => Promise<{ data: any }>;
}

export interface SubmitAssetRequestOptions {
  asset: Asset | null;
  files: Array<File | Blob>;
  payload: Record<string, unknown>;
  httpClient: AssetRequestClient;
  requestConfig?: AxiosRequestConfig;
}

export const submitAssetRequest = async ({
  asset,
  files,
  payload,
  httpClient,
  requestConfig,
}: SubmitAssetRequestOptions): Promise<unknown> => {
  const isEdit = Boolean(asset?.id);
  const targetId = asset?.id?.trim?.() ?? '';
  const endpoint = isEdit && targetId ? `/assets/${targetId}` : '/assets';

  if (files.length > 0) {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      formData.append(key, value as string | Blob);
    });
    files.forEach((file) => {
      formData.append('files', file);
    });

    const config: AxiosRequestConfig = {
      ...(requestConfig ?? {}),
      headers: {
        ...(requestConfig?.headers ?? {}),
        'Content-Type': 'multipart/form-data',
      },
    };
    if (isEdit && targetId) {
      const response = await httpClient.put(endpoint, formData, config);
      return response.data;
    }
    const response = await httpClient.post(endpoint, formData, config);
    return response.data;
  }

  if (isEdit && targetId) {
    const response = await httpClient.put(endpoint, payload, requestConfig);
    return response.data;
  }

  const response = await httpClient.post(endpoint, payload, requestConfig);
  return response.data;
};

export const normalizeAssetData = (
  raw: unknown,
  fallback: Partial<Asset> = {},
): Asset => {
  const base: Partial<Asset> = { ...fallback };
  const record = (raw && typeof raw === 'object') ? (raw as Record<string, any>) : {};
  const { _id, id: rawId, name: rawName, ...rest } = record;

  const resolvedId =
    (typeof _id === 'string' && _id.trim().length > 0 && _id) ||
    (typeof rawId === 'string' && rawId.trim().length > 0 && rawId) ||
    base.id ||
    '';

  const resolvedName =
    (typeof rawName === 'string' && rawName.trim().length > 0 && rawName) ||
    (typeof base.name === 'string' && base.name.trim().length > 0 && base.name) ||
    'Unnamed Asset';

  const normalized: Asset = {
    ...(base as Asset),
    ...(rest as Partial<Asset>),
    id: resolvedId,
    name: resolvedName,
  };

  return normalized;
};
