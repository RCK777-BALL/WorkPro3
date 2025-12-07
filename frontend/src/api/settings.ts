/*
 * SPDX-License-Identifier: MIT
 */

import { api } from './client';

export const updateNotificationPreferences = async (payload: { notifyByEmail?: boolean; notifyBySms?: boolean }) => {
  const { data } = await api.post('/api/settings/notifications/preferences', payload);
  return data?.data;
};

