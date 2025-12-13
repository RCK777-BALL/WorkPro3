/*
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useState } from 'react';
import http from '../../../../src/lib/http';

type ScanStep = 'scan' | 'asset' | 'workorder' | 'complete';

export type QrPayload = { type: 'asset' | 'part'; id: string };

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

  const startFromQr = useCallback(async (qrValue: string) => {
    const parsed = parseQrValue(qrValue);
    if (!parsed) {
      setError('Unable to read QR code. Try again or enter the code manually.');
      return;
    }
    if (parsed.type !== 'asset') {
      setError(`QR code type "${parsed.type}" is not supported for this workflow.`);
      return;
    }

    try {
      const res = await http.get(`/assets/${parsed.id}`);
      const record = res.data as Record<string, any> | null;
      const recordId = (record as any)?.id ?? (record as any)?._id;
      if (!record || !recordId) {
        setError('Asset record not found or missing required fields.');
        setAsset(null);
        setStep('scan');
        return;
      }
      setAsset({ ...record, id: recordId });
      setError(null);
      setStep('asset');
    } catch (err) {
      console.error(err);
      setError('Unable to load asset from QR code. Check connectivity or try again.');
      setAsset(null);
      setStep('scan');
    }
  }, []);

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

  return { step, asset, workOrderId, error, startFromQr, createWorkOrder, completeWorkOrder } as const;
};

