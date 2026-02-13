/*
 * SPDX-License-Identifier: MIT
 */

import { useQuery } from 'react-query';

import { fetchFeatureFlagStatus } from '@/api/featureFlags';

export const useFeatureFlagStatus = (key: string) =>
  useQuery({
    queryKey: ['feature-flag', key],
    queryFn: () => fetchFeatureFlagStatus(key),
    staleTime: 60_000,
  });
