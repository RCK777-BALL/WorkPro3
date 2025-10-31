/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect } from 'react';
import http from '@/lib/http';
import { socket } from '@/utils/socket';
import { useAlertStore, type Alert } from '@/store/alertStore';

const normalizeAlert = (alert: Alert | (Alert & { _id?: string })) => ({
  ...alert,
  _id: (alert._id ?? (alert as any)._id)?.toString?.() ?? String(alert._id),
  plant: alert.plant?.toString?.() ?? alert.plant,
});

export function useAlerts() {
  const alerts = useAlertStore((state) => state.alerts);
  const initialized = useAlertStore((state) => state.initialized);
  const setAlerts = useAlertStore((state) => state.setAlerts);
  const addAlert = useAlertStore((state) => state.addAlert);
  const setInitialized = useAlertStore((state) => state.setInitialized);

  useEffect(() => {
    if (initialized) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await http.get<Alert[]>('/alerts');
        if (!cancelled) {
          setAlerts(response.data.map(normalizeAlert));
          setInitialized();
        }
      } catch (err) {
        console.error('Failed to load alerts', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialized, setAlerts, setInitialized]);

  useEffect(() => {
    const handleNewAlert = (incoming: Alert) => {
      addAlert(normalizeAlert(incoming));
    };
    socket.on('alert:new', handleNewAlert);
    return () => {
      socket.off('alert:new', handleNewAlert);
    };
  }, [addAlert]);

  return alerts;
}
