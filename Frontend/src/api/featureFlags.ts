/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';

export type FeatureFlagStatus = {
  key: string;
  enabled: boolean;
};

export const fetchFeatureFlagStatus = async (key: string): Promise<FeatureFlagStatus> => {
  const response = await http.get<FeatureFlagStatus>(`/feature-flags/status/${key}`);
  return response.data;
};
