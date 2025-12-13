import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import http from '../../../../src/lib/http';
import { parseQrValue, useScanWorkflow } from './useScanWorkflow';

describe('parseQrValue', () => {
  it('parses supported asset payloads', () => {
    expect(parseQrValue('{"type":"asset","id":"A-1"}')).toEqual({ type: 'asset', id: 'A-1' });
  });

  it('parses supported part payloads', () => {
    expect(parseQrValue('{"type":"part","id":"P-1"}')).toEqual({ type: 'part', id: 'P-1' });
  });

  it('returns null for malformed payloads', () => {
    expect(parseQrValue('not-json')).toBeNull();
    expect(parseQrValue('{"type":"asset"}')).toBeNull();
    expect(parseQrValue('{"type":"unknown","id":"X"}')).toBeNull();
  });
});

describe('useScanWorkflow', () => {
  const httpMock = http as unknown as { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> };

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('handles invalid and unsupported QR payloads', async () => {
    const { result } = renderHook(() => useScanWorkflow());

    await act(async () => {
      await result.current.startFromQr('not-json');
    });
    expect(result.current.error).toMatch(/Unable to read QR code/);

    await act(async () => {
      await result.current.startFromQr('{"type":"part","id":"P-1"}');
    });
    expect(result.current.error).toMatch(/not supported/);
  });

  it('loads assets from QR codes and advances workflow', async () => {
    httpMock.get = vi.fn().mockResolvedValue({ data: { _id: 'A-1', name: 'Pump' } });
    const { result } = renderHook(() => useScanWorkflow());

    await act(async () => {
      await result.current.startFromQr('{"type":"asset","id":"A-1"}');
    });

    expect(httpMock.get).toHaveBeenCalledWith('/assets/A-1');
    expect(result.current.asset?.id).toBe('A-1');
    expect(result.current.step).toBe('asset');
    expect(result.current.error).toBeNull();
  });

  it('guards when asset lookup fails or returns incomplete data', async () => {
    httpMock.get = vi.fn().mockResolvedValue({ data: {} });
    const { result, rerender } = renderHook(() => useScanWorkflow());

    await act(async () => {
      await result.current.startFromQr('{"type":"asset","id":"missing"}');
    });
    expect(result.current.step).toBe('scan');
    expect(result.current.error).toMatch(/not found/);

    httpMock.get = vi.fn().mockRejectedValue(new Error('offline'));
    rerender();
    await act(async () => {
      await result.current.startFromQr('{"type":"asset","id":"missing"}');
    });
    expect(result.current.step).toBe('scan');
    expect(result.current.error).toMatch(/Unable to load asset/);
  });

  it('requires an asset before creating a work order', async () => {
    const { result } = renderHook(() => useScanWorkflow());
    await act(async () => {
      await result.current.createWorkOrder({ title: 'Test', description: 'Desc' });
    });
    expect(result.current.error).toMatch(/Asset must be loaded/);
  });

  it('creates and completes work orders after scanning', async () => {
    httpMock.get = vi.fn().mockResolvedValue({ data: { id: 'A-2', name: 'Pump' } });
    httpMock.post = vi.fn()
      // create work order
      .mockResolvedValueOnce({ data: { _id: 'WO-1' } })
      // complete work order
      .mockResolvedValueOnce({ data: {} });

    const { result } = renderHook(() => useScanWorkflow());

    await act(async () => {
      await result.current.startFromQr('{"type":"asset","id":"A-2"}');
    });

    await act(async () => {
      await result.current.createWorkOrder({ title: 'Fix', description: 'Leak' });
    });
    expect(httpMock.post).toHaveBeenCalledWith('/workorders', {
      title: 'Fix',
      description: 'Leak',
      asset: 'A-2',
      priority: 'medium',
    });
    expect(result.current.workOrderId).toBe('WO-1');
    expect(result.current.step).toBe('workorder');

    await act(async () => {
      await result.current.completeWorkOrder();
    });
    expect(httpMock.post).toHaveBeenCalledWith('/workorders/WO-1/complete', {});
    expect(result.current.step).toBe('complete');
  });

  it('blocks completion without a work order id', async () => {
    const { result } = renderHook(() => useScanWorkflow());
    await act(async () => {
      await result.current.completeWorkOrder();
    });
    expect(result.current.error).toMatch(/No work order/);
  });
});
