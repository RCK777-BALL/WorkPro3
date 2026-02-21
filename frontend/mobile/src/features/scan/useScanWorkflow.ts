/*
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useEffect, useState } from 'react';
import http from '../../lib/http';

type ScanStep = 'scan' | 'asset' | 'workorder' | 'complete';

type ScanHistoryItem = {
  id: string;
  rawValue: string;
  decodedType?: string | null;
  decodedId?: string | null;
  decodedLabel?: string | null;
  navigationTarget?: string | null;
  outcome: string;
  errorMessage?: string | null;
  createdAt?: string | null;
};

type QrPayload = { type: 'asset' | 'part'; id: string };

export const parseQrValue = (value: string): QrPayload | null => {
  try {
    const parsed = JSON.parse(value) as Partial<QrPayload>;
    if (!parsed.id || !parsed.type) return null;
    if (parsed.type !== 'asset' && parsed.type !== 'part') return null;
    return { type: parsed.type, id: parsed.id };
  } catch {
    return null;
  }
};

export const useScanWorkflow = () => {
  const [step, setStep] = useState<ScanStep>('scan');
  const [asset, setAsset] = useState<Record<string, any> | null>(null);
  const [workOrderId, setWorkOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<ScanHistoryItem[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const res = await http.get('/mobile/v1/scans', { params: { limit: 10 } });
      const payload = res.data as { items?: ScanHistoryItem[] };
      setRecentScans(payload.items ?? []);
      setHistoryError(null);
    } catch (err) {
      setHistoryError('Unable to load recent scans');
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const recordScan = useCallback(
    async (payload: {
      rawValue: string;
      decodedType?: string;
      decodedId?: string;
      decodedLabel?: string;
      navigationTarget?: string | null;
      outcome: 'resolved' | 'missing' | 'invalid' | 'error';
      errorMessage?: string | null;
    }) => {
      try {
        await http.post('/mobile/v1/scans', {
          rawValue: payload.rawValue,
          decodedEntity: {
            type: payload.decodedType,
            id: payload.decodedId,
            label: payload.decodedLabel,
          },
          navigationTarget: payload.navigationTarget,
          outcome: payload.outcome,
          errorMessage: payload.errorMessage,
        });
        await loadHistory();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Unable to record scan', err);
      }
    },
    [loadHistory],
  );

  const startFromQr = useCallback(async (qrValue: string) => {
    setAsset(null);
    setWorkOrderId(null);
    const parsed = parseQrValue(qrValue);
    if (!parsed || parsed.type !== 'asset') {
      setError('QR code is not linked to an asset');
      await recordScan({
        rawValue: qrValue,
        outcome: 'invalid',
        errorMessage: 'QR code is not linked to an asset',
      });
      return;
    }

    try {
      const res = await http.get(`/assets/${parsed.id}`);
      setAsset(res.data as Record<string, any>);
      setError(null);
      setStep('asset');
      await recordScan({
        rawValue: qrValue,
        decodedType: 'Asset',
        decodedId: parsed.id,
        decodedLabel: (res.data as any)?.name,
        navigationTarget: `/assets/${parsed.id}`,
        outcome: 'resolved',
      });
    } catch (err) {
      setError('Asset not found or unavailable');
      await recordScan({
        rawValue: qrValue,
        decodedType: 'Asset',
        decodedId: parsed.id,
        navigationTarget: `/assets/${parsed.id}`,
        outcome: 'missing',
        errorMessage: err instanceof Error ? err.message : 'Lookup failed',
      });
    }
  }, [recordScan]);

  const createWorkOrder = useCallback(
    async ({ title, description }: { title: string; description?: string }) => {
      if (!asset?.id && !asset?._id) {
        setError('Asset must be loaded before creating a work order');
        return;
      }
      const assetId = asset.id ?? asset._id;
      const res = await http.post('/workorders', {
        title,
        description,
        asset: assetId,
        priority: 'medium',
      });
      const nextId = (res.data as any)?._id ?? (res.data as any)?.id ?? null;
      setWorkOrderId(nextId);
      setStep('workorder');
    },
    [asset],
  );

  const completeWorkOrder = useCallback(async () => {
    if (!workOrderId) {
      setError('No work order to complete');
      return;
    }
    await http.post(`/workorders/${workOrderId}/complete`, {});
    setStep('complete');
  }, [workOrderId]);

  const reopenScan = useCallback(
    async (rawValue: string) => {
      await startFromQr(rawValue);
    },
    [startFromQr],
  );

  return {
    step,
    asset,
    workOrderId,
    error,
    recentScans,
    historyError,
    isLoadingHistory,
    startFromQr,
    createWorkOrder,
    completeWorkOrder,
    reloadHistory: loadHistory,
    reopenScan,
  } as const;
};

